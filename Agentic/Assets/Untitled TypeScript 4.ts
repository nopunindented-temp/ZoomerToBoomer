@component
export class NewScript extends BaseScriptComponent {
    @input
    textAfterClick: Text;
    
    @input
    panelWelcome: SceneObject; 
    
    @input
    panelLanding: SceneObject; 
    
    onAwake() {
        
        if (this.textAfterClick) {
            this.textAfterClick.enabled = false;
        }
        
        
        if (this.panelLanding) {
            this.panelLanding.enabled = false;
        }
        
        
        const interaction = this.getSceneObject().getComponent("Component.InteractionComponent");
        
        if (interaction) {
            interaction.onTap.add(() => {
                this.showText();
            });
        }
    }
    
    showText() {
        if (this.textAfterClick) {
            this.textAfterClick.enabled = true;
        }
        
        
        const delayedEvent = this.createEvent("DelayedCallbackEvent");
        delayedEvent.bind(() => {
            this.showNextScene();
        });
        delayedEvent.reset(10.0); 
    }
    
    showNextScene() {
        
        if (this.panelWelcome) {
            this.panelWelcome.enabled = false;
        }
        
        
        if (this.panelLanding) {
            this.panelLanding.enabled = true;
        }
    }
}