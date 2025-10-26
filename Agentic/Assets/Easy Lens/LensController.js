// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent mainText
//@input Component.ScriptComponent touchEvents


try {

// Array of texts to cycle through when the interactable is clicked
const texts = [
    "Welcome to my Lens!",
    "Tap again to see more.",
    "Have a great day!",
    "Enjoy exploring AR!",
    "You clicked the interactable!"
];

let textIndex = 0;

// Set the initial text
script.mainText.text = texts[textIndex];

// Change text on tap
script.touchEvents.onTap.add(function() {
    textIndex = (textIndex + 1) % texts.length;
    script.mainText.text = texts[textIndex];
});

} catch(e) {
  print("error in controller");
  print(e);
}
