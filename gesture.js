"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var math_1 = require("./math");
/**
 * Compute "throw" from swipe
 */
function swipe(_a) {
    var panelId = _a.panelId, x = _a.x, xv = _a.xv, panelWidth = _a.panelWidth, maxSwipePanels = _a.maxSwipePanels, totalPanels = _a.totalPanels, unitDuration = _a.unitDuration;
    /** Minimum duration of animation */
    var MIN_DUR_MS = 17;
    /** Max throw velocity */
    var MAX_VEL = 10000;
    /* max distance we can travel */
    //const MAX_DIST = maxSwipePanels
    /** swipe velocity in px/s clamped to sane range */
    var xvel = math_1.clamp(xv, -MAX_VEL, MAX_VEL);
    /** Destination position */
    var destX = x + xvel * 0.5;
    /** Current index panel (where it is currently dragged to, not its resting position) */
    var p0 = Math.floor(-x / panelWidth);
    /** Destination panel index */
    var destPanel = Math.round(-destX / panelWidth);
    if (destPanel - p0 > maxSwipePanels) {
        destPanel = p0 + maxSwipePanels;
    }
    else if (p0 - destPanel > maxSwipePanels) {
        destPanel = p0 - maxSwipePanels;
    }
    destPanel = math_1.clamp(destPanel, Math.max(0, panelId - maxSwipePanels), Math.min(totalPanels - 1, panelId + maxSwipePanels));
    /** How many panels (incl. fractions) are we travelling across */
    var unitDist = (destPanel * panelWidth - (-x)) / panelWidth;
    var absUnitDist = Math.abs(unitDist);
    /** Duration of the animation */
    var dur = 0;
    if (absUnitDist > 1) {
        // Compute a duration suitable for travelling multiple panels
        dur = Math.max(MIN_DUR_MS, unitDuration * Math.pow(absUnitDist, 0.25) * 1.0);
    }
    else {
        // Compute a duration suitable for 1 or less panel travel
        dur = Math.max(MIN_DUR_MS, unitDuration * absUnitDist); //(absUnitDist * cfg.visiblePanels))
        if (Math.sign(unitDist) === -Math.sign(xvel)) {
            // Swipe in same direction of travel - speed up animation relative to swipe speed
            var timeScale = Math.max(Math.abs(xvel / 1000), 1);
            dur = Math.max(MIN_DUR_MS, dur / timeScale);
        }
        else {
            // Swipe in opposite direction -- TODO: anything?
        }
    }
    return { panelId: destPanel, duration: dur };
}
exports.swipe = swipe;
