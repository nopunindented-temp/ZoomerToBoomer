@component
export class TypewriterEffect extends BaseScriptComponent {
    @input
    textComponent: Text;
    
    @input
    line1: string = "The ultimate tool to help bridge";
    
    @input
    line2: string = "generation gaps in conversation";
    
    @input
    typingSpeed: number = 0.1;
    
    private fullText: string = "";
    private currentIndex: number = 0;
    private updateEvent: SceneEvent;
    private lastTime: number = 0;
    
    onAwake() {
        if (this.textComponent) {
            this.fullText = this.line1 + "\n" + this.line2;
            this.textComponent.text = "";
            this.startTyping();
        }
    }
    
    startTyping() {
        this.updateEvent = this.createEvent("UpdateEvent");
        this.updateEvent.bind(() => {
            this.typeNextCharacter();
        });
    }
    
    typeNextCharacter() {
        const currentTime = getTime();
        
        if (this.lastTime === 0) {
            this.lastTime = currentTime;
        }
        
        if (currentTime - this.lastTime >= this.typingSpeed) {
            if (this.currentIndex < this.fullText.length) {
                this.textComponent.text = this.fullText.substring(0, this.currentIndex + 1);
                this.currentIndex++;
                this.lastTime = currentTime;
            } else {
                if (this.updateEvent) {
                    this.updateEvent.enabled = false;
                }
            }
        }
    }
}