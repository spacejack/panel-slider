"use strict";
// Determine style names (if prefix required)
Object.defineProperty(exports, "__esModule", { value: true });
function toLower(s) {
    return !!s && typeof s === 'string' ? s.toLowerCase() : '';
}
exports.prefix = (function () {
    var t = 'translate3d(100px,20px,0px)'; // the transform we'll use to test
    var el = document.createElement('div'); // Make a test element
    //  Check support for current standard first
    el.style.transform = t;
    var styleAttrLc = toLower(el.getAttribute('style'));
    if (styleAttrLc.indexOf('transform') === 0) {
        return ''; // current, yay.
    }
    //  Try beta names
    // tslint:disable align
    el.style.MozTransform = t // firefox
    ;
    el.style.webkitTransform = t // webkit/chrome
    ;
    el.style.msTransform = t; // IE
    styleAttrLc = toLower(el.getAttribute('style'));
    //  See which one worked, if any...
    if (styleAttrLc.indexOf('moz') !== -1) {
        return 'moz';
    }
    else if (styleAttrLc.indexOf('webkit') !== -1) {
        return 'webkit';
    }
    else if (styleAttrLc.indexOf('ms') !== -1) {
        return 'ms';
    }
    console.warn("CSS transform style not supported.");
    return '';
})();
exports.transform = exports.prefix ? exports.prefix + '-transform' : 'transform';
/**
 * Set position of element using 3d transform style
 */
function setPos3d(el, x, y, z) {
    if (y === void 0) { y = 0; }
    if (z === void 0) { z = 0; }
    el.style[exports.transform] = "translate3d(" + x + "px," + y + "px," + z + "px)";
}
exports.setPos3d = setPos3d;
