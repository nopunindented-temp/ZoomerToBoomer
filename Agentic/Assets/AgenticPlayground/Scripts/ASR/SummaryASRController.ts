import { SummaryStorage } from "../Storage/SummaryStorage";
import { PinchButton } from "SpectaclesInteractionKit.lspkg/Components/UI/PinchButton/PinchButton";
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";
import { LSTween } from "LSTween.lspkg/LSTween";



declare class HttpRequest {
  constructor(url: string);
  method: string;
  body: string;
  setHeader(key: string, value: string): void;
  send(callback: (response: string) => void): void;
}

declare const XMLHttpRequest: any;
@component
export class SummaryASRController extends BaseScriptComponent {

  @input private card1Text: Text;
  @input private card1Desc: Text;
  @input private card2Text: Text;
  @input private card2Desc: Text;
  @input private card3Text: Text;
  @input private card3Desc: Text;
  @input private card4Text: Text;
  @input private card4Desc: Text;
  
  @input
  private summaryStorage: SummaryStorage;
  @input
  private micButton: PinchButton;
  @input
  private activityIndicator: RenderMeshVisual;
  @input
  private enableDebugLogging: boolean = true;
  @input
  private autoStartRecording: boolean = false;
  @input
  private maxSessionDuration: number = 3600;
  private asrModule: AsrModule = require("LensStudio:AsrModule");
  private isRecording = false;
  private sessionStartTime = 0;
  private accumulatedText = "";
  private currentTranscription = "";
  // --- Groq API setup ---
  private bufferedText = "";
  private lastSpeechTime = 0;
  private lastSendTime = 0;
  private readonly PAUSE_TIMEOUT = 3000; // send if ~3s of silence
  private readonly SEND_INTERVAL = 10000; // or every 10s if nonstop talking
  private readonly API_URL = "https://zoomer-to-boomer.vercel.app/api/process-summary";
  private readonly GENERATION = "Gen Alpha";
  private activityMaterial: Material;
  public onTextAccumulated: Event<string> = new Event<string>();
  public onSessionStarted: Event<void> = new Event<void>();
  public onSessionEnded: Event<void> = new Event<void>();
  public onMaxDurationReached: Event<void> = new Event<void>();
  onAwake() {
    this.createEvent("OnStartEvent").bind(this.initialize.bind(this));
    this.createEvent("UpdateEvent").bind(this.checkSessionDuration.bind(this));
    this.createEvent("UpdateEvent").bind(this.checkGroqSendTrigger.bind(this));
    if (this.enableDebugLogging) print("SummaryASRController: :microphone: Controller awakened");
  }
  
  private initialize(): void {
  if (!this.summaryStorage) {
    print("SummaryASRController: :x: SummaryStorage not assigned");
    return;
  }
  this.setupUI();

  // 👇 Add this block here:
  const cards = [
    this.card1Text,
    this.card2Text,
    this.card3Text,
    this.card4Text,
  ];
  cards.forEach(card => {
    if (card && card.getSceneObject()) {
      const parent = card.getSceneObject().getParent();
      if (parent) parent.enabled = false;
    }
  });

  if (this.autoStartRecording) this.startRecordingSession();
  if (this.enableDebugLogging)
    print("SummaryASRController: :white_check_mark: Initialized successfully");
}

  private setupUI(): void {
    if (this.activityIndicator) {
      this.activityMaterial = this.activityIndicator.mainMaterial.clone();
      this.activityIndicator.mainMaterial = this.activityMaterial;
      this.activityMaterial.mainPass.in_out = 0;
    }
    if (this.micButton) {
      this.micButton.onButtonPinched.add(() => this.toggleRecordingSession());
      if (this.enableDebugLogging) print(":dart: Mic button configured");
    }
  }
  public toggleRecordingSession(): void {
    if (this.isRecording) this.stopRecordingSession();
    else this.startRecordingSession();
  }
  public startRecordingSession(): void {
    if (this.isRecording) return;
    this.isRecording = true;
    this.sessionStartTime = Date.now();
    this.accumulatedText = "";
    this.currentTranscription = "";
    this.bufferedText = "";
    this.lastSendTime = Date.now();
    this.animateActivityIndicator(true);
    this.asrModule.startTranscribing(this.createASROptions());
    this.onSessionStarted.invoke();
    if (this.enableDebugLogging) print(":clapper: Recording session started");
  }
  public stopRecordingSession(): void {
    if (!this.isRecording) return;
    this.isRecording = false;
    this.asrModule.stopTranscribing();
    this.animateActivityIndicator(false);
    if (this.accumulatedText.trim().length > 0 && this.summaryStorage) {
      this.summaryStorage.storeText(this.accumulatedText);
      print(`:memo: Final text stored (${this.accumulatedText.length} chars)`);
    }
    // Flush any remaining buffered text
    if (this.bufferedText.length > 0) {
      this.sendToGroq(this.bufferedText);
      this.bufferedText = "";
    }
    this.onSessionEnded.invoke();
    print(":checkered_flag: Recording stopped manually");
  }
  private animateActivityIndicator(on: boolean): void {
    if (!this.activityMaterial) return;
    LSTween.rawTween(250)
      .onUpdate((data) => {
        const t = data.t as number;
        this.activityMaterial.mainPass.in_out = on ? t : 1 - t;
      })
      .start();
  }
  private createASROptions(): any {
    const options = AsrModule.AsrTranscriptionOptions.create();
    options.mode = AsrModule.AsrMode.HighAccuracy;
    options.silenceUntilTerminationMs = 1000000;
    options.onTranscriptionUpdateEvent.add((asrOutput) =>
      this.handleTranscriptionUpdate(asrOutput)
    );
    options.onTranscriptionErrorEvent.add((errorCode) =>
      this.handleTranscriptionError(errorCode)
    );
    return options;
  }
  private handleTranscriptionUpdate(asrOutput: any): void {
    const text = asrOutput.text ? asrOutput.text.trim() : "";
    if (!text) return;
    this.currentTranscription = text;
    this.lastSpeechTime = Date.now();
    if (this.enableDebugLogging)
      print(`:studio_microphone: Live transcription: "${text.substring(0, 60)}..."`);
    // Append text to accumulated + buffer
    this.accumulatedText += (this.accumulatedText ? " " : "") + text;
    this.bufferedText += (this.bufferedText ? " " : "") + text;
    // Store intermediate text for live display
    if (text.length > 60 && this.summaryStorage) {
      this.summaryStorage.storeText(text);
    }
    this.onTextAccumulated.invoke(this.accumulatedText);
  }
  private handleTranscriptionError(errorCode: any): void {
    print(`:x: ASR error: ${errorCode}`);
    this.animateActivityIndicator(false);
    this.stopRecordingSession();
  }
  private checkSessionDuration(): void {
    if (!this.isRecording) return;
    const dur = (Date.now() - this.sessionStartTime) / 1000;
    if (dur > this.maxSessionDuration) {
      print(":alarm_clock: Max duration reached, stopping session");
      this.stopRecordingSession();
    }
  }

  // transition

  private updateCard(title: Text, desc: Text, newTitle: string, newDesc: string): void {
  if (!title || !desc) return;

  // Fade out: reduce alpha over 300ms
  LSTween.rawTween(300)
    .onUpdate((data) => {
      const t = data.t as number;
      title.textFill.color.a = 1 - t;
      desc.textFill.color.a = 1 - t;
    })
    .onComplete(() => {
      // Update the actual content once faded out
      title.text = newTitle;
      desc.text = newDesc;

      // Fade back in
      LSTween.rawTween(300)
        .onUpdate((data2) => {
          const t2 = data2.t as number;
          title.textFill.color.a = t2;
          desc.textFill.color.a = t2;
        })
        .start();
    })
    .start();
}

// === GROQ / BACKEND CALLING ===
private async sendToGroq(text: string): Promise<void> {
  if (!text || text.trim().length === 0) return;
  print(`:rocket: Sending ${text.length} chars to Groq API...`);

  const payload = {
    text: text.trim(),
    generation: this.GENERATION,
  };

  const internetModule = require("LensStudio:InternetModule");

  const request = new Request(this.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  try {
    const response = await internetModule.fetch(request);
    const responseText = await response.text();
    print(`:white_check_mark: Groq response: ${responseText}`);

    const parsed = JSON.parse(responseText);
    let inner = parsed.result;

    // Try to parse nested JSON string if needed
    if (typeof inner === "string") {
      try {
        inner = JSON.parse(inner);
      } catch (e) {
        print(`:warning: Failed to parse inner JSON — using raw string: ${e}`);
      }
    }

    print(`:bookmark_tabs: Parsed inner JSON → ${JSON.stringify(inner, null, 2)}`);

    // Extract slang explanations
    const slangMap = inner.slang_explanations || {};
    const slangEntries = Object.entries(slangMap) as [string, string][];

    // Gather card references
    const cardTitles = [this.card1Text, this.card2Text, this.card3Text, this.card4Text];
    const cardDescs = [this.card1Desc, this.card2Desc, this.card3Desc, this.card4Desc];
    const cardObjs = cardTitles.map((title, i) => ({
      title,
      desc: cardDescs[i],
      parent: title ? title.getSceneObject().getParent() : null,
    }));

    // No results → hide all
    if (slangEntries.length === 0) {
      cardObjs.forEach((card) => {
        if (card.parent) card.parent.enabled = false;
      });
      print(":sleeping: No slang terms found in Groq response");
      return;
    }

    // === Selective update logic with quick fade-in ===
    for (let i = 0; i < cardObjs.length; i++) {
      const card = cardObjs[i];
      const entry = slangEntries[i];

      if (!card.title || !card.desc || !card.parent) continue;

      if (entry) {
        const [slang, meaning] = entry;
        const wasHidden = !card.parent.enabled;

        // Enable card only if hidden
        if (wasHidden) {
          card.parent.enabled = true;
          card.title.textFill.color.a = 0;
          card.desc.textFill.color.a = 0;

          // quick fade-in (100–150ms)
          LSTween.rawTween(120)
            .onUpdate((data) => {
              const t = data.t as number;
              card.title.textFill.color.a = t;
              card.desc.textFill.color.a = t;
            })
            .start();
        }

        // Only update if content actually changed
        if (card.title.text !== slang || card.desc.text !== meaning) {
          this.updateCard(card.title, card.desc, slang, meaning);
        }
      } else {
        // Hide unused cards (no flicker)
        card.parent.enabled = false;
      }
    }
  } catch (err) {
    print(`:x: Groq request or parsing failed: ${err}`);
  }
}





  private checkGroqSendTrigger(): void {
    if (!this.isRecording) return;
    const now = Date.now();
    // Pause-based send
    if (this.bufferedText.length > 0 && now - this.lastSpeechTime > this.PAUSE_TIMEOUT) {
      print(":zzz: Pause detected — sending buffered text to Groq");
      this.sendToGroq(this.bufferedText);
      this.bufferedText = "";
      this.lastSendTime = now;
      return;
    }
    // Timer-based send
    if (this.bufferedText.length > 0 && now - this.lastSendTime > this.SEND_INTERVAL) {
      print(":stopwatch: Interval reached — sending buffered text to Groq");
      this.sendToGroq(this.bufferedText);
      this.bufferedText = "";
      this.lastSendTime = now;
    }
  }
  public getSessionStatus() {
    const duration = this.isRecording
      ? (Date.now() - this.sessionStartTime) / 1000
      : 0;
    return {
      isRecording: this.isRecording,
      duration: duration,
      textLength: this.accumulatedText.length,
      currentTranscription: this.currentTranscription,
    };
  }
  public clearAccumulatedText(): void {
    this.accumulatedText = "";
    this.currentTranscription = "";
    if (this.enableDebugLogging) print(":wastebasket: Cleared accumulated text");
  }
  public isUIReady(): boolean {
    return !!(this.micButton && this.activityIndicator);
  }
}
