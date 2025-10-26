import { PinchButton } from "SpectaclesInteractionKit.lspkg/Components/UI/PinchButton/PinchButton";
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";
import { LSTween } from "LSTween.lspkg/LSTween";

@component
export class AgeGroupButtons extends BaseScriptComponent {
    @input
    private zoomerButton: PinchButton;
    @input
    private millennialButton: PinchButton;
    @input
    private genXButton: PinchButton;
    @input
    private boomerButton: PinchButton;
    @input
    private backButton: PinchButton;
    @input
    private enableDebugLogging: boolean = true;

    private ageGroups: Record<AgeGroupKey, AgeGroup> = {
        zoomer: { name: "Gen Z", button: null, selected: false, textObject: null },
        millennial: { name: "Millennial", button: null, selected: false, textObject: null },
        genX: { name: "Gen X", button: null, selected: false, textObject: null },
        boomer: { name: "Boomer", button: null, selected: false, textObject: null }
    };

    private buttonsHidden: boolean = false;

    // Events
    public onAgeGroupSelected: Event<string> = new Event<string>();
    public onButtonsHidden: Event<void> = new Event<void>();
    public onButtonsShown: Event<void> = new Event<void>();

    onAwake(): void {
        this.createEvent("OnStartEvent").bind(this.initialize.bind(this));
        
        if (this.enableDebugLogging) {
            print("AgeGroupButtons: 🎯 Age Group Button Controller awakened");
        }
    }

    private initialize(): void {
        this.setupButtons();
        this.setupUI();
        this.setupGlobalController();
        
        if (this.enableDebugLogging) {
            print("AgeGroupButtons: ✅ Initialized successfully");
        }
    }

    private setupButtons(): void {
        this.ageGroups.zoomer.button = this.zoomerButton?.getSceneObject() || null;
        this.ageGroups.millennial.button = this.millennialButton?.getSceneObject() || null;
        this.ageGroups.genX.button = this.genXButton?.getSceneObject() || null;
        this.ageGroups.boomer.button = this.boomerButton?.getSceneObject() || null;
        
        if (this.enableDebugLogging) {
            print(`AgeGroupButtons: 🔗 Buttons linked: Z=${!!this.zoomerButton}, M=${!!this.millennialButton}, X=${!!this.genXButton}, B=${!!this.boomerButton}`);
        }
    }

    private setupGlobalController(): void {
        (global as any).ageGroupController = {
            getSelected: () => this.getSelectedAgeGroup(),
            ageGroups: this.ageGroups,
            selectZoomer: () => this.selectAgeGroup('zoomer'),
            selectMillennial: () => this.selectAgeGroup('millennial'),
            selectGenX: () => this.selectAgeGroup('genX'),
            selectBoomer: () => this.selectAgeGroup('boomer'),
            hideButtons: () => this.hideAllButtons(),
            showButtons: () => this.showAllButtons(),
            goBack: () => this.goBack()
        };
    }

    private setupUI(): void {
        this.createTextLabels();
        
        if (this.zoomerButton) {
            this.zoomerButton.onButtonPinched.add(() => this.selectAgeGroup('zoomer'));
            if (this.enableDebugLogging) print(":dart: Zoomer button configured");
        }
        
        if (this.millennialButton) {
            this.millennialButton.onButtonPinched.add(() => this.selectAgeGroup('millennial'));
            if (this.enableDebugLogging) print(":dart: Millennial button configured");
        }
        
        if (this.genXButton) {
            this.genXButton.onButtonPinched.add(() => this.selectAgeGroup('genX'));
            if (this.enableDebugLogging) print(":dart: GenX button configured");
        }
        
        if (this.boomerButton) {
            this.boomerButton.onButtonPinched.add(() => this.selectAgeGroup('boomer'));
            if (this.enableDebugLogging) print(":dart: Boomer button configured");
        }
        
        if (this.backButton) {
            this.backButton.getSceneObject().enabled = false;
            this.backButton.onButtonPinched.add(() => this.goBack());
            if (this.enableDebugLogging) print(":dart: Back button configured");
        }
    }

    public selectAgeGroup(group: AgeGroupKey): void {
        // Clear all selections
        Object.keys(this.ageGroups).forEach((key: string) => {
            this.ageGroups[key as AgeGroupKey].selected = false;
        });
        
        // Set the selected group
        this.ageGroups[group].selected = true;
        
        if (this.enableDebugLogging) {
            print(`AgeGroupButtons: ✅ Selected: ${this.ageGroups[group].name}`);
        }
        
        // Trigger events
        this.onAgeGroupSelected.invoke(this.ageGroups[group].name);
        
        // Hide all buttons with animation
        this.hideAllButtons();
    }

    public goBack(): void {
        // Clear selection
        Object.keys(this.ageGroups).forEach((key: string) => {
            this.ageGroups[key as AgeGroupKey].selected = false;
        });
        
        // Show all buttons again
        this.showAllButtons();
        
        if (this.enableDebugLogging) {
            print("AgeGroupButtons: ⬅️ Returned to selection screen");
        }
    }



    public getSelectedAgeGroup(): string | null {
        for (const key in this.ageGroups) {
            if (this.ageGroups[key as AgeGroupKey].selected) {
                return this.ageGroups[key as AgeGroupKey].name;
            }
        }
        return null;
    }
    
    public isUIReady(): boolean {
        return !!(this.zoomerButton && this.millennialButton && this.genXButton && this.boomerButton);
    }
    
    public areButtonsHidden(): boolean {
        return this.buttonsHidden;
    }

    private createTextLabels(): void {
        Object.keys(this.ageGroups).forEach((key: string) => {
            const ageKey = key as AgeGroupKey;
            const button = this.ageGroups[ageKey].button;
            
            if (button) {
                // Create text object as child of button
                const textObject = global.scene.createSceneObject(`${ageKey}Text`);
                textObject.setParent(button);
                
                // Position text above the button
                const textTransform = textObject.getTransform();
                textTransform.setLocalPosition(new vec3(0, 1, 0));
                
                // Add text component
                const textComponent = textObject.createComponent("Component.Text");
                textComponent.text = this.ageGroups[ageKey].name;
                textComponent.size = 20;
                
                this.ageGroups[ageKey].textObject = textObject;
                print(`[AgeGroupButtons.ts] Created text label for ${ageKey}`);
            }
        });
    }

    private updateTextLabels(): void {
        Object.keys(this.ageGroups).forEach((key: string) => {
            const ageKey = key as AgeGroupKey;
            const ageGroup = this.ageGroups[ageKey];
            
            if (ageGroup.textObject) {
                const textComponent = ageGroup.textObject.getComponent("Component.Text");
                if (textComponent) {
                    const prefix = ageGroup.selected ? "[SELECTED] " : "";
                    textComponent.text = prefix + ageGroup.name;
                }
            }
        });
    }

    private hideAllButtons(): void {
        if (this.enableDebugLogging) {
            print("AgeGroupButtons: 🫥 Hiding all buttons");
        }
        
        Object.keys(this.ageGroups).forEach((key: string) => {
            const ageKey = key as AgeGroupKey;
            const ageGroup = this.ageGroups[ageKey];
            
            // Animate button disappearance
            if (ageGroup.button) {
                this.animateButtonHide(ageGroup.button);
            }
            
            // Animate text disappearance
            if (ageGroup.textObject) {
                this.animateButtonHide(ageGroup.textObject);
            }
        });
        
        this.buttonsHidden = true;
        this.onButtonsHidden.invoke();
        
        // Show back button after hiding age group buttons
        if (this.backButton) {
            this.animateButtonShow(this.backButton.getSceneObject());
        }
    }
    
    private showAllButtons(): void {
        if (this.enableDebugLogging) {
            print("AgeGroupButtons: 👁️ Showing all buttons");
        }
        
        Object.keys(this.ageGroups).forEach((key: string) => {
            const ageKey = key as AgeGroupKey;
            const ageGroup = this.ageGroups[ageKey];
            
            // Animate button appearance
            if (ageGroup.button) {
                this.animateButtonShow(ageGroup.button);
            }
            
            // Animate text appearance
            if (ageGroup.textObject) {
                this.animateButtonShow(ageGroup.textObject);
            }
        });
        
        // Hide back button
        if (this.backButton) {
            this.animateButtonHide(this.backButton.getSceneObject());
        }
        
        this.buttonsHidden = false;
        this.onButtonsShown.invoke();
    }
    
    private animateButtonHide(sceneObject: SceneObject): void {
        const transform = sceneObject.getTransform();
        
        LSTween.rawTween(500)
            .onUpdate((data) => {
                const t = 1 - (data.t as number); // Reverse for fade out
                transform.setLocalScale(new vec3(t, t, t));
            })
            .onComplete(() => {
                sceneObject.enabled = false;
            })
            .start();
    }
    
    private animateButtonShow(sceneObject: SceneObject): void {
        sceneObject.enabled = true;
        const transform = sceneObject.getTransform();
        transform.setLocalScale(new vec3(0, 0, 0)); // Start from 0
        
        LSTween.rawTween(500)
            .onUpdate((data) => {
                const t = data.t as number;
                transform.setLocalScale(new vec3(t, t, t));
            })
            .start();
    }


}

interface AgeGroup {
    name: string;
    button: SceneObject | null;
    selected: boolean;
    textObject: SceneObject | null;
}

type AgeGroupKey = 'zoomer' | 'millennial' | 'genX' | 'boomer';