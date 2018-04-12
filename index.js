(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.PanelSlider = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./speedo"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var speedo_1 = require("./speedo");
    var NONE = 0;
    var MOUSE = 1;
    var TOUCH = 2;
    var DEVICE_DELAY = 300;
    var DEFAULT_DRAG_THRESHOLD = 12;
    var DEFAULT_DRAG_RATIO = 1.5;
    /**
     * Given a dom element, sends back horizontal 'drag' events.
     */
    function Dragger(el, _a) {
        var _b = _a === void 0 ? {} : _a, ondragstart = _b.ondragstart, ondragmove = _b.ondragmove, ondragend = _b.ondragend, ondragcancel = _b.ondragcancel, ondevicepress = _b.ondevicepress, ondevicerelease = _b.ondevicerelease, _c = _b.dragThreshold, dragThreshold = _c === void 0 ? DEFAULT_DRAG_THRESHOLD : _c, _d = _b.dragRatio, dragRatio = _d === void 0 ? DEFAULT_DRAG_RATIO : _d, devices = _b.devices, maxLeft = _b.maxLeft, maxRight = _b.maxRight;
        applyIOSHack();
        var speedo = speedo_1.default();
        var device = NONE;
        /** Flag to prevent dragging while some child element is scrolling */
        var isScrolling = false;
        /** Touch/Mouse is down */
        var pressed = false;
        /** Indicates drag threshold crossed and we're in "dragging" mode */
        var isDragging = false;
        var dragStart = { x: 0, y: 0 };
        function onMouseDown(e) {
            if (device === TOUCH)
                return;
            cancelPress();
            if (e.button !== 0)
                return;
            device = MOUSE;
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            onPress(e.clientX, e.clientY, e);
        }
        function onMouseMove(e) {
            onMove(e.clientX, e.clientY, e);
        }
        function onMouseUp(e) {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            onRelease(e.clientX, e.clientY, e);
        }
        function onTouchStart(e) {
            if (device === MOUSE)
                return;
            cancelPress();
            device = TOUCH;
            el.addEventListener('touchmove', onTouchMove);
            el.addEventListener('touchend', onTouchEnd);
            var t = e.changedTouches[0];
            onPress(t.clientX, t.clientY, e);
        }
        function onTouchMove(e) {
            var t = e.changedTouches[0];
            onMove(t.clientX, t.clientY, e);
        }
        function onTouchEnd(e) {
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
            var t = e.changedTouches[0];
            onRelease(t.clientX, t.clientY, e);
        }
        function onPress(x, y, e) {
            isScrolling = false;
            pressed = true;
            dragStart.x = x;
            dragStart.y = y;
            speedo.start(0, Date.now() / 1000);
            document.addEventListener('scroll', onScroll, true);
            ondevicepress && ondevicepress(e);
        }
        function onMove(x, y, e) {
            if (!pressed)
                return;
            var dx = x - dragStart.x;
            if (maxLeft != null) {
                dx = Math.max(dx, maxLeft());
            }
            if (maxRight != null) {
                dx = Math.min(dx, maxRight());
            }
            var dy = y - dragStart.y;
            speedo.addSample(dx, Date.now() / 1000);
            if (!isDragging) {
                var ratio = dy !== 0 ? Math.abs(dx / dy) : 1000000000.0;
                if (Math.abs(dx) < dragThreshold || ratio < dragRatio) {
                    // Still not dragging. Bail out.
                    return;
                }
                // Distance threshold crossed - init drag state
                isDragging = true;
                ondragstart && ondragstart(dx);
            }
            e.preventDefault();
            ondragmove && ondragmove(dx, speedo.getVel());
        }
        function onRelease(x, y, e) {
            document.removeEventListener('scroll', onScroll, true);
            pressed = false;
            if (!isDragging) {
                // Never crossed drag start threshold, bail out now.
                return;
            }
            isDragging = false;
            var dx = x - dragStart.x;
            speedo.addSample(dx, Date.now() / 1000);
            setTimeout(function () {
                if (!pressed)
                    device = NONE;
            }, DEVICE_DELAY);
            ondevicerelease && ondevicerelease(e);
            ondragend && ondragend(dx, speedo.getVel());
        }
        function onScroll(e) {
            isScrolling = true;
            cancelPress();
        }
        function cancelPress() {
            if (!pressed)
                return;
            if (device === MOUSE) {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            }
            else if (device === TOUCH) {
                el.removeEventListener('touchmove', onTouchMove);
                el.removeEventListener('touchend', onTouchEnd);
            }
            document.removeEventListener('scroll', onScroll, true);
            pressed = false;
            if (isDragging) {
                isDragging = false;
                ondragcancel && ondragcancel();
            }
        }
        function destroy() {
            el.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('mousemove', onMouseMove);
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchend', onTouchEnd);
            el.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('scroll', onScroll, true);
        }
        if (!devices || devices.indexOf('mouse') >= 0) {
            el.addEventListener('mousedown', onMouseDown);
        }
        if (!devices || devices.indexOf('touch') >= 0) {
            el.addEventListener('touchstart', onTouchStart);
        }
        return {
            isDragging: function () { return isDragging; },
            destroy: destroy
        };
    }
    exports.default = Dragger;
    // Workaround for webkit bug where event.preventDefault
    // within touchmove handler fails to prevent scrolling.
    var isIOS = !!navigator.userAgent.match(/iPhone|iPad|iPod/i);
    var iOSHackApplied = false;
    function applyIOSHack() {
        // Only apply this hack if iOS, haven't yet applied it,
        // and only if a component is actually created
        if (!isIOS || iOSHackApplied)
            return;
        window.addEventListener('touchmove', function () { });
        iOSHackApplied = true;
    }
});

},{"./speedo":4}],2:[function(require,module,exports){
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./dragger", "./transform", "./math"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dragger_1 = require("./dragger");
    var transform_1 = require("./transform");
    var math_1 = require("./math");
    var DEFAULT_SLIDE_DURATION = 500;
    /**
     * Default animation interpolation function
     * @param x0 Start coordinate
     * @param x1 End coordinate
     * @param t Time (0..1)
     */
    function terpFn(x0, x1, t) {
        var r = (Math.PI / 2.0) * t;
        var s = Math.sin(r);
        var si = 1.0 - s;
        return (x0 * si + x1 * s);
    }
    exports.terpFn = terpFn;
    /**
     * Drags an element horizontally between sections.
     */
    function PanelSlider(_a) {
        var element = _a.element, numPanels = _a.numPanels, _b = _a.initialPanel, initialPanel = _b === void 0 ? 0 : _b, _c = _a.slideDuration, slideDuration = _c === void 0 ? DEFAULT_SLIDE_DURATION : _c, dragThreshold = _a.dragThreshold, dragRatio = _a.dragRatio, devices = _a.devices, _d = _a.terp, terp = _d === void 0 ? terpFn : _d;
        var emitters = {
            dragstart: [],
            drag: [],
            dragend: [],
            dragcancel: [],
            animate: [],
            animationstatechange: [],
            panelchange: []
        };
        // Will be computed on resize
        var fullWidth = numPanels;
        var panelWidth = 1;
        var curPanel = initialPanel;
        var curPosX = 0;
        var isAnimating = false;
        resize();
        var dragger = dragger_1.default(element, {
            dragThreshold: dragThreshold, dragRatio: dragRatio,
            devices: devices,
            ondragstart: function (dx) {
                emit('dragstart', { x: dx, v: 0 });
            },
            ondragmove: function (dx, dvx) {
                var ox = -curPanel * panelWidth;
                curPosX = Math.round(math_1.clamp(ox + dx, -(fullWidth - panelWidth), 0));
                transform_1.setX(element, curPosX);
                emit('animate', -curPosX / panelWidth);
                emit('drag', { x: dx, v: dvx });
            },
            ondragcancel: function () {
                emit('dragcancel', { x: curPosX, v: 0 });
                swipeAnim(0, function (pid) { emit('panelchange', pid); });
            },
            ondragend: function (dx, dvx) {
                var ox = -curPanel * panelWidth;
                curPosX = Math.round(math_1.clamp(ox + dx, -(fullWidth - panelWidth), 0));
                transform_1.setX(element, curPosX);
                swipeAnim(dvx, function (pid) { emit('panelchange', pid); });
                emit('animate', -curPosX / panelWidth);
                emit('dragend', { x: dx, v: dvx });
            },
            ondevicepress: function () {
                // Ensure we have up-to-date dimensions whenever a drag action
                // may start in case we missed a stealth window resize.
                resize();
            }
        });
        function emit(n, value) {
            var arr = emitters[n];
            for (var i = 0; i < arr.length; ++i) {
                arr[i](value);
            }
        }
        function swipeAnim(xvel, done) {
            var x = curPosX + xvel * 0.5;
            var destination = math_1.clamp(Math.round(-x / panelWidth), 0, numPanels - 1);
            var p0 = curPanel;
            if (destination - p0 > 1)
                destination = p0 + 1;
            else if (p0 - destination > 1)
                destination = p0 - 1;
            var dur = math_1.clamp(slideDuration - (slideDuration * (Math.abs(xvel / 10.0) / panelWidth)), 17, slideDuration);
            animateTo(destination, dur, done);
        }
        /** Animate panels to the specified panelId */
        function animateTo(destPanel, dur, done) {
            if (dur === void 0) { dur = slideDuration; }
            if (isAnimating) {
                console.warn("Cannot animateTo - already animating");
                return;
            }
            if (dragger.isDragging()) {
                console.warn("Cannot animateTo - currently dragging");
                return;
            }
            isAnimating = true;
            var startX = curPosX;
            var destX = -destPanel * panelWidth;
            function finish() {
                curPanel = destPanel;
                isAnimating = false;
                emit('animationstatechange', false);
                done && done(curPanel);
            }
            function loop() {
                var t = Date.now();
                var destX = -destPanel * panelWidth;
                var totalT = t - startT;
                var animT = Math.min(totalT, dur);
                curPosX = terp(startX, destX, animT / dur);
                transform_1.setX(element, curPosX);
                emit('animate', -curPosX / panelWidth);
                if (totalT < dur) {
                    requestAnimationFrame(loop);
                }
                else {
                    finish();
                }
            }
            if (destX === startX) {
                requestAnimationFrame(finish);
                emit('animationstatechange', true);
                return;
            }
            var startT = Date.now();
            requestAnimationFrame(loop);
            emit('animationstatechange', true);
        }
        /** Update our full width and panel width on resize */
        function resize() {
            var rc = element.getBoundingClientRect();
            panelWidth = rc.width;
            fullWidth = panelWidth * numPanels;
            curPosX = -curPanel * panelWidth;
            transform_1.setX(element, curPosX);
        }
        ///////////////////////////////////////////////////////
        // Public
        /** Add an event listener */
        function on(n, fn) {
            var arr = emitters[n];
            if (arr.indexOf(fn) === -1) {
                arr.push(fn);
            }
        }
        /** Remove an event listener */
        function off(n, fn) {
            var arr = emitters[n];
            var i = arr.indexOf(fn);
            if (i >= 0) {
                arr.splice(i, 1);
            }
        }
        /** Returns current panel index */
        function getPanel() {
            return curPanel;
        }
        /** Sets current panel index, animates to position */
        function setPanel(panelId, done) {
            if (panelId === curPanel)
                return;
            animateTo(panelId, slideDuration, done);
        }
        /** Remove all event handlers, cleanup streams etc. */
        function destroy() {
            // Remove event listeners
            window.removeEventListener('resize', resize);
            dragger.destroy();
            Object.keys(emitters).forEach(function (k) {
                emitters[k].length = 0;
            });
            element = undefined;
        }
        window.addEventListener('resize', resize);
        return {
            on: on,
            off: off,
            getPanel: getPanel,
            setPanel: setPanel,
            getSizes: function () { return ({ fullWidth: fullWidth, panelWidth: panelWidth }); },
            isDragging: dragger.isDragging,
            isAnimating: function () { return isAnimating; },
            destroy: destroy,
        };
    }
    exports.default = PanelSlider;
});

},{"./dragger":1,"./math":3,"./transform":5}],3:[function(require,module,exports){
// Math utils
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /** Clamp n to range */
    function clamp(n, min, max) {
        return Math.min(Math.max(n, min), max);
    }
    exports.clamp = clamp;
    /**  Always positive modulus */
    function pmod(n, m) {
        return ((n % m + m) % m);
    }
    exports.pmod = pmod;
});

},{}],4:[function(require,module,exports){
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./math"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var math_1 = require("./math");
    var DEFAULT_SAMPLES = 4;
    /**
     * Computes speed (delta x over time)
     */
    function createSpeedo(numSamples) {
        if (numSamples === void 0) { numSamples = DEFAULT_SAMPLES; }
        var index = 0;
        var count = 0;
        var samples = new Array(numSamples);
        for (var i = 0; i < numSamples; ++i) {
            samples[i] = { x: 0, t: 0 };
        }
        function start(x, t) {
            index = 0;
            count = 0;
            samples[index].x = x;
            samples[index].t = t;
            index = 1;
            count = 1;
        }
        function addSample(x, t) {
            samples[index].x = x;
            samples[index].t = t;
            index = (index + 1) % numSamples;
            count += 1;
        }
        function getVel() {
            if (count < 1)
                return 0;
            var n = count > numSamples ? numSamples : count;
            var iLast = math_1.pmod(index - 1, numSamples);
            var iFirst = math_1.pmod(index - n, numSamples);
            var deltaT = samples[iLast].t - samples[iFirst].t;
            var dx = samples[iLast].x - samples[iFirst].x;
            return dx / deltaT;
        }
        return {
            start: start,
            addSample: addSample,
            getVel: getVel
        };
    }
    exports.default = createSpeedo;
});

},{"./math":3}],5:[function(require,module,exports){
// Determine style names (if prefix required)
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
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
        if (styleAttrLc.indexOf('transform') === 0)
            return '' // current, yay.
            ;
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
    function setX(el, x) {
        el.style[exports.transform] = "translate3d(" + x + "px,0,0)";
    }
    exports.setX = setX;
    function setXY(el, x, y) {
        el.style[exports.transform] = "translate3d(" + x + "px," + y + "px,0)";
    }
    exports.setXY = setXY;
});

},{}]},{},[2])(2)
});
