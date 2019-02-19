"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Speedo_1 = require("./Speedo");
var NONE = 0;
var MOUSE = 1;
var TOUCH = 2;
var DEVICE_DELAY = 300;
var DEFAULT_DRAG_THRESHOLD = 12;
var DEFAULT_DRAG_RATIO = 1.5;
var DraggerEvent = /** @class */ (function () {
    function DraggerEvent(type) {
        this.type = type;
    }
    return DraggerEvent;
}());
exports.DraggerEvent = DraggerEvent;
var DraggerDragEvent = /** @class */ (function (_super) {
    __extends(DraggerDragEvent, _super);
    function DraggerDragEvent(type, x, xv) {
        var _this = _super.call(this, type) || this;
        _this.x = x;
        _this.xv = xv;
        return _this;
    }
    return DraggerDragEvent;
}(DraggerEvent));
exports.DraggerDragEvent = DraggerDragEvent;
/**
 * Given a dom element, emit 'drag' events that occur along the horizontal axis
 */
function Dragger(el, _a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.on, on = _c === void 0 ? {} : _c, _d = _b.dragThreshold, dragThreshold = _d === void 0 ? DEFAULT_DRAG_THRESHOLD : _d, _e = _b.dragRatio, dragRatio = _e === void 0 ? DEFAULT_DRAG_RATIO : _e, devices = _b.devices, maxLeft = _b.maxLeft, maxRight = _b.maxRight;
    applyIOSHack();
    var speedo = Speedo_1.default();
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
        el.addEventListener('scroll', onScroll, true);
        on.devicepress && on.devicepress(e);
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
            on.dragstart && on.dragstart(new DraggerDragEvent('dragstart', dx, 0));
        }
        e.preventDefault();
        on.dragmove && on.dragmove(new DraggerDragEvent('dragmove', dx, speedo.getVel()));
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
        on.devicerelease && on.devicerelease(e);
        on.dragend && on.dragend(new DraggerDragEvent('dragend', dx, speedo.getVel()));
    }
    /** Received scroll event - dragging should be cancelled. */
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
        el.removeEventListener('scroll', onScroll, true);
        pressed = false;
        if (isDragging) {
            isDragging = false;
            on.dragcancel && on.dragcancel(new DraggerEvent('dragcancel'));
        }
    }
    function destroy() {
        el.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('mousemove', onMouseMove);
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchend', onTouchEnd);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('scroll', onScroll, true);
    }
    // Initialize the input listeners we want
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
