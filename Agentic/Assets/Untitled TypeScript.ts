@component
export class NewScript extends BaseScriptComponent {
    @input
    startButton: SceneObject;
    
    @input
    textAfterClick: Text;
    
    onAwake() {
        
        if (this.textAfterClick) {
            this.textAfterClick.enabled = false;
        }
        
        
        if (this.startButton) {
            const interaction = this.startButton.getComponent("Component.InteractionComponent");
            if (interaction) {
                interaction.onTap.add(() => {
                    this.showText();
                });
            }
        }
    }
    
    showText() {
        if (this.textAfterClick) {
            this.textAfterClick.enabled = true;
        }
    }
}