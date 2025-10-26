// var startTime = 0;
// var transitionDone = false;

// script.createEvent("OnStartEvent").bind(function() {
//     startTime = getTime();

//     // Start state
//     if (script.landingPage) script.landingPage.enabled = true;
//     if (script.ageRangePage) script.ageRangePage.enabled = false;

//     print("Landing page fade sequence started...");
// });

// script.createEvent("UpdateEvent").bind(function() {
//     var elapsed = getTime() - startTime;

//     // --- Fade group 1: Welcome + Names ---
//     if (elapsed >= script.group1Delay) {
//         var t1 = Math.min((elapsed - script.group1Delay) / script.fadeDuration, 1.0);
//         fadeText(script.welcomeText, 1.0 - t1);
//         fadeText(script.namesText, 1.0 - t1);

//         if (t1 >= 1.0) {
//             disableText(script.welcomeText);
//             disableText(script.namesText);
//         }
//     }

//     // --- Fade group 2: One-liner ---
//     if (elapsed >= script.oneLinerDelay) {
//         var t2 = Math.min((elapsed - script.oneLinerDelay) / script.fadeDuration, 1.0);
//         fadeText(script.oneLinerText, 1.0 - t2);

//         // ✅ When fade complete → switch to Age Range Page
//         if (t2 >= 1.0 && !transitionDone) {
//             disableText(script.oneLinerText);
//             transitionDone = true;

//             if (script.landingPage) script.landingPage.enabled = false;
//             if (script.ageRangePage) script.ageRangePage.enabled = true;

//             print("✅ Transition complete — now showing Age Range Page");
//         }
//     }
// });

// // --------------------
// // Helper: fade 2D Text (2D Screen Text only)
// // --------------------
// function fadeText(txt, alpha) {
//     if (!txt) return;
//     try {
//         var color = txt.textFill.color;
//         txt.textFill.color = new vec4(color.x, color.y, color.z, alpha);
//     } catch (e) {
//         // Safe fallback
//     }
// }

// function disableText(txt) {
//     if (txt) txt.enabled = false;
// }

// ------------------------------ div

// --------------------
// Page Flow Controller (Full App Sequence)
// --------------------
//
// @input SceneObject landingPage
// @input SceneObject ageRangePage
// @input SceneObject microphonePage
// @input SceneObject lingoVocabPage
// @input SceneObject resultsPage
//
// @input Component.Text landing_welcomeText
// @input Component.Text landing_namesText
// @input Component.Text landing_oneLinerText
//
// @input float fadeDuration = 1.5
// @input float delayLanding = 4.5      // total time before landing fades
// @input float delayAgeRange = 3.0     // show age page this long before fade
// @input float delayMicrophone = 3.0
// @input float delayLingoVocab = 3.0

// var startTime = 0;
// var phase = 0; // 0 = landing, 1 = age range, 2 = mic, 3 = vocab, 4 = results
// var fadeStartTime = 0;
// var fading = false;

// script.createEvent("OnStartEvent").bind(function() {
//     startTime = getTime();

//     enableOnly(script.landingPage);
//     print("✅ Page flow started (Landing Page active).");
// });

// script.createEvent("UpdateEvent").bind(function() {
//     var now = getTime();

//     // --- PHASE 0: Landing Page ---
//     if (phase === 0 && now - startTime >= script.delayLanding) {
//         fadeText(script.landing_welcomeText, 0);
//         fadeText(script.landing_namesText, 0);
//         fadeText(script.landing_oneLinerText, 0);
//         nextPage(script.ageRangePage);
//     }

//     // --- PHASE 1: Age Range ---
//     if (phase === 1 && now - fadeStartTime >= script.delayAgeRange) {
//         nextPage(script.microphonePage);
//     }

//     // --- PHASE 2: Microphone ---
//     if (phase === 2 && now - fadeStartTime >= script.delayMicrophone) {
//         nextPage(script.lingoVocabPage);
//     }

//     // --- PHASE 3: LingoVocab ---
//     if (phase === 3 && now - fadeStartTime >= script.delayLingoVocab) {
//         nextPage(script.resultsPage);
//     }

//     // --- PHASE 4: Results ---
//     if (phase === 4) {
//         // End of sequence — do nothing or keep results visible
//     }
// });

// // --- Helper: Enable one page, disable others ---
// function enableOnly(obj) {
//     if (!obj) return;

//     if (script.landingPage) script.landingPage.enabled = (obj === script.landingPage);
//     if (script.ageRangePage) script.ageRangePage.enabled = (obj === script.ageRangePage);
//     if (script.microphonePage) script.microphonePage.enabled = (obj === script.microphonePage);
//     if (script.lingoVocabPage) script.lingoVocabPage.enabled = (obj === script.lingoVocabPage);
//     if (script.resultsPage) script.resultsPage.enabled = (obj === script.resultsPage);

//     fadeStartTime = getTime();
//     print("→ Switched to page: " + obj.name);
// }

// // --- Helper: Go to next phase/page ---
// function nextPage(nextObj) {
//     phase++;
//     enableOnly(nextObj);
// }

// // --- Helper: Fade 2D Text instantly or later ---
// function fadeText(txt, alpha) {
//     if (!txt) return;
//     try {
//         var c = txt.textFill.color;
//         txt.textFill.color = new vec4(c.x, c.y, c.z, alpha);
//     } catch (e) {
//         // ignore safely
//     }
// }
// ------------------------------ div

// --------------------
// Full App Flow Controller
// --------------------
// Linear sequence through all pages with timed transitions.
// Works cleanly with 2D Screen Text fade on landing.
//
// FLOW:
// Landing → AgeRange → Microphone → LingoVocab → Results → Rewards
//
// @input SceneObject landingPage
// @input SceneObject ageRangePage
// @input SceneObject microphonePage
// @input SceneObject lingoVocabPage
// @input SceneObject resultsPage
// @input SceneObject rewardsPage
//
// @input Component.Text landing_welcomeText
// @input Component.Text landing_namesText
// @input Component.Text landing_oneLinerText
//
// @input float fadeDuration = 1.5
// @input float delayLanding = 4.5      // seconds before leaving landing
// @input float delayAgeRange = 3.0
// @input float delayMicrophone = 3.0
// @input float delayLingoVocab = 3.0
// @input float delayResults = 3.0      // show results this long before rewards

var phase = 0;
var phaseStart = 0;

// --- Initialization ---
script.createEvent("OnStartEvent").bind(function() {
    enableOnly(script.landingPage);
    phaseStart = getTime();
    print("✅ Flow started: Landing Page active");
});

script.createEvent("UpdateEvent").bind(function() {
    var elapsed = getTime() - phaseStart;

    switch (phase) {
        // ---------- LANDING ----------
        case 0:
            if (elapsed >= script.delayLanding) {
                fadeText(script.landing_welcomeText, 0);
                fadeText(script.landing_namesText, 0);
                fadeText(script.landing_oneLinerText, 0);
                goToNext(script.ageRangePage);
            }
            break;

        // ---------- AGE RANGE ----------
        case 1:
            if (elapsed >= script.delayAgeRange) {
                goToNext(script.microphonePage);
            }
            break;

        // ---------- MICROPHONE ----------
        case 2:
            if (elapsed >= script.delayMicrophone) {
                goToNext(script.lingoVocabPage);
            }
            break;

        // ---------- LINGOVOCAB ----------
        case 3:
            if (elapsed >= script.delayLingoVocab) {
                goToNext(script.resultsPage);
            }
            break;

        // ---------- RESULTS ----------
        case 4:
            if (elapsed >= script.delayResults) {
                goToNext(script.rewardsPage);
            }
            break;

        // ---------- REWARDS ----------
        case 5:
            // End of flow — stay on rewards
            break;
    }
});

// --- Helpers ---
function goToNext(nextObj) {
    phase++;
    enableOnly(nextObj);
    phaseStart = getTime();
    print("→ Switched to: " + nextObj.name);
}

function enableOnly(obj) {
    if (!obj) return;
    var all = [
        script.landingPage,
        script.ageRangePage,
        script.microphonePage,
        script.lingoVocabPage,
        script.resultsPage,
        script.rewardsPage
    ];
    for (var i = 0; i < all.length; i++) {
        if (all[i]) all[i].enabled = (all[i] === obj);
    }
}

// --- Fade helper (2D text only) ---
function fadeText(txt, alpha) {
    if (!txt) return;
    try {
        var c = txt.textFill.color;
        txt.textFill.color = new vec4(c.x, c.y, c.z, alpha);
    } catch (e) { /* ignore safely */ }
}

