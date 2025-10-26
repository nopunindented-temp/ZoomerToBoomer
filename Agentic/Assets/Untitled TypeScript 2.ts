@component
export class NewScript extends BaseScriptComponent {
    @input
    discretePicker: any;
    
    onAwake() {
        if (this.discretePicker) {
            const generations = [
                "Alpha 1965-80",
                "Gen Z 1965-80",
                "Gen X 1965-80",
                "Boomer 1965-80",
                "Baby Boomer 1965-80"
            ];
            
            this.discretePicker.items = generations;
            
            this.discretePicker.onSelectionChanged.add((index) => {
                this.onGenerationSelected(index);
            });
        }
    }
    
    onGenerationSelected(index: number) {
        switch(index) {
            case 0: // Alpha
                break;
            case 1: // Gen Z
                break;
            case 2: // Gen X
                break;
            case 3: // Boomer
                break;
            case 4: // Baby Boomer
                break;
        }
    }
}