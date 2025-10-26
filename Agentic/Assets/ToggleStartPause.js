// @input Component.Text buttonText
// @input Component.MaterialMeshVisual sphereVisual
// @input Asset.Material startMaterial     // green
// @input Asset.Material pauseMaterial     // gray / normal

var isStarted = false;
var baseScale;
var pulseEvent;

// smooth pulse settings
var pulseSpeed = 0.9;     // slower = smoother breathing rhythm
var pulseAmount = 0.15;   // how large the sphere expands
var easeStrength = 0.15;  // smaller = softer easing (0.1–0.2 is natural)

// ---- Helpers ----

// Apply current material/text
function applyState() {
    if (!script.buttonText || !script.sphereVisual) return;

    if (isStarted) {
        script.buttonText.text = "Pause";
        script.buttonText.textFill.color = new vec4(1, 1, 1, 1);
        script.sphereVisual.clearMaterials();
        script.sphereVisual.addMaterial(script.pauseMaterial);
    } else {
        script.buttonText.text = "Start";
        script.buttonText.textFill.color = new vec4(1, 1, 1, 1);
        script.sphereVisual.clearMaterials();
        script.sphereVisual.addMaterial(script.startMaterial);
    }
}

// Breathing pulse loop (smooth sinusoidal)
function pulseLoop(eventData) {
    if (!baseScale) return;

    var time = getTime() * pulseSpeed;
    var sine = (Math.sin(time) + 1.0) / 2.0; // 0–1 range
    var eased = sine * sine * (3 - 2 * sine); // smoothstep easing

    var offset = pulseAmount * (eased - 0.5); // symmetric pulse around base
    var newScale = new vec3(
        baseScale.x * (1 + offset),
        baseScale.y * (1 + offset),
        baseScale.z * (1 + offset)
    );
    script.getSceneObject().getTransform().setLocalScale(newScale);
}

// Quick “pop” when toggled
function popAnimation() {
    var tform = script.getSceneObject().getTransform();
    var cur = tform.getLocalScale();
    var target = new vec3(cur.x * 1.3, cur.y * 1.3, cur.z * 1.3); // stronger pop

    var duration = 0.25;
    var time = 0;
    var popEvent = script.createEvent("UpdateEvent");

    popEvent.bind(function(e) {
        time += e.getDeltaTime();
        var t = Math.min(time / duration, 1.0);
        var easeOut = 1 - Math.pow(1 - t, 3);
        var newScale = vec3.lerp(cur, target, easeOut);
        tform.setLocalScale(newScale);

        if (t >= 1.0) {
            script.removeEvent(popEvent);
            // return to base scale smoothly
            var resetEvent = script.createEvent("UpdateEvent");
            var resetTime = 0;
            resetEvent.bind(function(e2) {
                resetTime += e2.getDeltaTime();
                var r = Math.min(resetTime / duration, 1.0);
                var back = 1 - Math.pow(1 - r, 3);
                tform.setLocalScale(vec3.lerp(target, baseScale, back));
                if (r >= 1.0) script.removeEvent(resetEvent);
            });
        }
    });
}

// Tap handler
function onTap() {
    if (!script.buttonText || !script.sphereVisual) return;

    script.removeEvent(pulseEvent); // temporarily stop pulsing
    popAnimation();

    var delayed = script.createEvent("DelayedCallbackEvent");
    delayed.bind(function() {
        isStarted = !isStarted;
        applyState();
        pulseEvent = script.createEvent("UpdateEvent");
        pulseEvent.bind(pulseLoop); // resume pulse
    });
    delayed.reset(1.0);
}

// Initialize
function init() {
    baseScale = script.getSceneObject().getTransform().getLocalScale();
    applyState();

    var interaction = script.getSceneObject().getComponent("Component.InteractionComponent");
    if (interaction) interaction.onTap.add(onTap);

    pulseEvent = script.createEvent("UpdateEvent");
    pulseEvent.bind(pulseLoop);
}

script.createEvent("OnStartEvent").bind(init);
