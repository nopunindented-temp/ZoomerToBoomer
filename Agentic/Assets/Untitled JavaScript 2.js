// @input Component.Image mainImage
// @input SceneObject glowObject
// @input Component.Button button // optional
// @input bool follow = true
// @input float glowDuration = 0.35
// @input float scaleAmount = 1.15
// @input float scaleDuration = 0.25

// TouchGestures 모듈 로드
var TouchGestures = require('TouchGestures');

var originalScale = script.mainImage.getSceneObject().getTransform().getLocalScale();
var animEvent = null;
var isGrabbed = false;
var panSubscription = null;

// 유틸: 부드러운 보간(lerp)
function lerp(a, b, t) { return a + (b - a) * t; }

// 애니메이션: Glow on (enable + fade in + scale pulse)
function playGlow() {
    if (!script.glowObject) return;
    script.glowObject.enabled = true;

    // Opacity 애니메이션 (Glow 이미지가 Sprite/Plane이라면 material 투명도 조절 가능)
    var start = getTime();
    if (animEvent) animEvent.enabled = false;
    animEvent = script.createEvent("UpdateEvent");
    animEvent.bind(function() {
        var t = (getTime() - start) / script.glowDuration;
        if (t > 1) t = 1;
        // scale lerp: 0.0 -> scaleAmount
        var s = lerp(originalScale.x, originalScale.x * script.scaleAmount, Math.sin(t * Math.PI)); // 부드럽게 튀는 느낌
        script.mainImage.getSceneObject().getTransform().setLocalScale(new vec3(s, s, s));
        // 만약 Glow material 투명도 조절 가능하면 여기서 조절 (옵션)
        if (t >= 1) {
            animEvent.enabled = false;
        }
    });
}

// 애니메이션: Glow off (원래대로)
function stopGlow() {
    if (!script.glowObject) return;
    // 간단히 비활성화하고 스케일 복구
    script.glowObject.enabled = false;
    script.mainImage.getSceneObject().getTransform().setLocalScale(originalScale);
}

// 탭 이벤트 (Button 또는 TouchGestures)
function onTapEvent() {
    // 탭하면 한 번 빛나고 원래 상태로 돌아옴
    playGlow();
    // 종료 후 원래 크기로 돌아오기(짧은 타이밍)
    var t0 = getTime();
    var restore = script.createEvent("UpdateEvent");
    restore.bind(function() {
        var tt = (getTime() - t0) / (script.scaleDuration + 0.05);
        if (tt >= 1) {
            script.mainImage.getSceneObject().getTransform().setLocalScale(originalScale);
            stopGlow();
            restore.enabled = false;
        } else {
            // 부드럽게 복원
            var s = lerp(originalScale.x * script.scaleAmount, originalScale.x, tt);
            script.mainImage.getSceneObject().getTransform().setLocalScale(new vec3(s,s,s));
        }
    });
}

// Grab (팬) 시작
function onPanStart(gesture) {
    isGrabbed = true;
    playGlow();
}

// 팬 이동: 아이콘 따라다니기 (스크린 좌표 → 월드 변환 단순 구현)
function onPan(gesture) {
    if (!isGrabbed || !script.follow) return;
    // gesture.location는 2D 스크린 좌표 (Normalized) — TouchGestures API 위치 포맷에 따라 다름
    // Lens Studio의 ScreenTransform을 사용하는 경우: setOffset 또는 setLocalPosition 사용
    // 안전한 방법: 이미지 SceneObject의 transform.setLocalPosition를 사용해 화면에서 약간의 Z 고정
    // 여기서는 간단히 ScreenTransform이 있을 경우 좌표 매핑을 시도
    var so = script.mainImage.getSceneObject();
    var st = so.getComponent("Component.ScreenTransform");
    if (st) {
        // gesture.getTouchPosition() 혹은 gesture.location 사용 (환경에 따라 함수명이 다를 수 있음)
        // 대부분 TouchGestures의 gesture.location 는 normalized screen coords (0..1)
        // 변환 예시:
        var pos = gesture.location; // {x, y} normalized
        // ScreenTransform의 localOffset 사용
        // 화면 중심(0.5,0.5)을 기준으로 offset 계산(임의 값)
        var dx = (pos.x - 0.5) * script.getSceneObject().getLayer().getCamera().getProjection().getAspect(); // 참고용
        // 안전하게는 ScreenTransform API로 직접 setScreenPosition 사용하면 더 좋음.
        // 여기서는 단순한 팔로우 동작 대신 '이미지 위치를 cursor처럼 따라오게' 하는 기본 골격을 제공.
        // 실제 정밀한 매핑은 프로젝트 카메라/레퍼런스에 맞춰 수정 필요.
        // (주의) 만약 gesture.location 미동작하면 TouchGestures docs 확인 후 수정하세요.
    }
}

// 팬 끝
function onPanEnd(gesture) {
    isGrabbed = false;
    // 원위치 복구
    script.mainImage.getSceneObject().getTransform().setLocalScale(originalScale);
    stopGlow();
}

// ---- 이벤트 바인딩 ----

// 버튼(onTap) 있으면 연결
if (script.button) {
    script.button.onTap.add(function() {
        onTapEvent();
    });
} else {
    // 버튼 없을 경우 TouchGestures 탭 사용
    try {
        TouchGestures.onTap(script.mainImage.getSceneObject(), function(gesture) {
            onTapEvent();
        });
    } catch (e) {
        // TouchGestures unavailable - do nothing
    }
}

// 팬(드래그) 바인딩 (잡기)
try {
    TouchGestures.onPanStart(script.mainImage.getSceneObject(), function(gesture) {
        onPanStart(gesture);
    });
    TouchGestures.onPan(script.mainImage.getSceneObject(), function(gesture) {
        onPan(gesture);
    });
    TouchGestures.onPanEnd(script.mainImage.getSceneObject(), function(gesture) {
        onPanEnd(gesture);
    });
} catch (e) {
    // 일부 환경에서는 onPan* 이벤트가 없을 수 있음
}
