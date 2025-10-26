//@input Component.ScreenTransform cardTransform
//@input Component.Text text
//@input Component.Text desc

var defaultScale = cardTransform.scale;
var expandedScale = defaultScale.uniformScale(1.2);

var defaultTextSize = text.size;
var expandedTextSize = defaultTextSize * 1.2;

var defaultDescSize = desc.size;
var expandedDescSize = defaultDescSize * 1.2;

function expand() {
    animate(expandedScale, expandedTextSize, expandedDescSize);
}

function shrink() {
    animate(defaultScale, defaultTextSize, defaultDescSize);
}

function animate(toScale, toTextSize, toDescSize) {
    var duration = 0.15;
    var startScale = cardTransform.scale;
    var startTextSize = text.size;
    var startDescSize = desc.size;
    var startTime = getTime();

    var event = script.createEvent("UpdateEvent");
    event.bind(function() {
        var t = Math.min(1, (getTime() - startTime) / duration);
        cardTransform.scale = vec3.lerp(startScale, toScale, t);
        text.size = startTextSize + (toTextSize - startTextSize) * t;
        desc.size = startDescSize + (toDescSize - startDescSize) * t;
        if (t >= 1) script.removeEvent(event);
    });
}

// --- hover and touch events ---
var hoverStart = script.createEvent("CursorHoverStartEvent");
hoverStart.bind(expand);

var hoverEnd = script.createEvent("CursorHoverEndEvent");
hoverEnd.bind(shrink);

var touchStart = script.createEvent("TouchStartEvent");
touchStart.bind(expand);

var touchEnd = script.createEvent("TouchEndEvent");
touchEnd.bind(shrink);
