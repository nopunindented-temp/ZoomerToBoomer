// --------------------
// Landing Page Fade Controller (Simple + Reliable)
// --------------------
// Fades 2D Screen Texts with delay timing.
//
// @input Component.Text welcomeText
// @input Component.Text namesText
// @input Component.Text oneLinerText
// @input float fadeDuration = 1.5   // how long fade lasts
// @input float group1Delay = 3.0    // delay before welcome/names fade
// @input float oneLinerDelay = 4.5  // delay before one-liner fade

var startTime = 0;

script.createEvent("OnStartEvent").bind(function() {
    startTime = getTime();
    print("Landing page fade sequence started...");
});

script.createEvent("UpdateEvent").bind(function() {
    var elapsed = getTime() - startTime;

    // --- Fade group 1: Welcome + Names ---
    if (elapsed >= script.group1Delay) {
        var t1 = Math.min((elapsed - script.group1Delay) / script.fadeDuration, 1.0);
        fadeText(script.welcomeText, 1.0 - t1);
        fadeText(script.namesText, 1.0 - t1);

        if (t1 >= 1.0) {
            disableText(script.welcomeText);
            disableText(script.namesText);
        }
    }

    // --- Fade group 2: One-liner ---
    if (elapsed >= script.oneLinerDelay) {
        var t2 = Math.min((elapsed - script.oneLinerDelay) / script.fadeDuration, 1.0);
        fadeText(script.oneLinerText, 1.0 - t2);

        if (t2 >= 1.0) {
            disableText(script.oneLinerText);
            print("✅ All text faded out cleanly.");
        }
    }
});

// --- Helper: fade 2D Text (using textFill.color only) ---
function fadeText(txt, alpha) {
    if (!txt) return;
    try {
        var color = txt.textFill.color;
        txt.textFill.color = new vec4(color.x, color.y, color.z, alpha);
    } catch (e) {
        // do nothing silently — safe
    }
}

function disableText(txt) {
    if (txt) txt.enabled = false;
}
