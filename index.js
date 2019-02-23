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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var array_1 = require("./array");
var transform_1 = require("./transform");
var Dragger_1 = require("./Dragger");
var Panel_1 = require("./Panel");
var gesture = require("./gesture");
/**
 * Creates a PanelSlider instance.
 */
function PanelSlider(cfg) {
    cfg = __assign({}, cfg);
    cfg.visiblePanels = cfg.visiblePanels || 1;
    cfg.initialPanel = cfg.initialPanel || 0;
    cfg.maxSwipePanels = cfg.maxSwipePanels || cfg.visiblePanels;
    cfg.slideDuration = cfg.slideDuration || PanelSlider.DEFAULT_SLIDE_DURATION;
    cfg.swipeForce = cfg.swipeForce || 1;
    cfg.panelClassName = cfg.panelClassName || '';
    cfg.dragRatio = cfg.dragRatio || PanelSlider.DEFAULT_DRAG_RATIO;
    cfg.dragThreshold = cfg.dragThreshold || PanelSlider.DEFAULT_DRAG_THRESHOLD;
    cfg.on = cfg.on || {};
    cfg.terp = cfg.terp || PanelSlider.terp;
    var emitters = {
        dragstart: [],
        drag: [],
        dragend: [],
        dragcancel: [],
        animate: [],
        animationstatechange: [],
        panelchange: [],
        panelswipe: []
    };
    for (var _i = 0, _a = Object.keys(cfg.on); _i < _a.length; _i++) {
        var key = _a[_i];
        if (cfg.on[key] != null) {
            addListener(key, cfg.on[key]);
        }
    }
    var panels = array_1.range(cfg.initialPanel, cfg.initialPanel + cfg.visiblePanels * 3).map(function (pid) { return Panel_1.default(pid, 100 / cfg.visiblePanels, Panel_1.default.EMPTY, cfg.panelClassName); });
    cfg.dom.innerHTML = '';
    for (var _b = 0, panels_1 = panels; _b < panels_1.length; _b++) {
        var p = panels_1[_b];
        p.state = cfg.renderContent(new PanelSlider.RenderEvent('render', p.dom, p.index));
        cfg.dom.appendChild(p.dom);
    }
    // Will be computed on resize
    var fullWidth = panels.length;
    var visibleWidth = cfg.visiblePanels;
    /** Width of a panel in pixels */
    var panelWidth = 1;
    /** Current Panel index */
    var curPanel = cfg.initialPanel;
    /** Current viewport position in pixels (left edge) */
    var curPosX = 0;
    /** Indicates panel animation loop is running */
    var isAnimating = false;
    /** Overscroll */
    var overscroll = 1;
    /** Update our full width and panel width on resize */
    function resize() {
        var rc = cfg.dom.getBoundingClientRect();
        panelWidth = rc.width / cfg.visiblePanels;
        visibleWidth = panelWidth * cfg.visiblePanels;
        fullWidth = panelWidth * cfg.totalPanels;
        curPosX = -curPanel * panelWidth;
        render();
    }
    /** Applies averscroll dampening if dragged past edges */
    function applyOverscroll(x) {
        if (x > 0) {
            var xp = Math.min(1, x / (overscroll * panelWidth));
            return xp * (1 - Math.sqrt(xp / 2)) * overscroll * panelWidth;
        }
        var xMax = fullWidth - panelWidth * cfg.visiblePanels;
        if (x < -xMax) {
            var dx = Math.abs(x - (-xMax));
            var xp = Math.min(1, dx / (overscroll * panelWidth));
            return -xMax - xp * (1 - Math.sqrt(xp / 2)) * overscroll * panelWidth;
        }
        return x;
    }
    function render(fast) {
        // note that: curPosX = -curPanel * panelWidth
        var x = Math.abs(curPosX);
        /** Inclusive start/end panel indexes */
        var iStart = Math.floor(cfg.totalPanels * x / fullWidth);
        var iEnd = Math.min(Math.ceil(cfg.totalPanels * (x + panelWidth * cfg.visiblePanels) / fullWidth), cfg.totalPanels - 1);
        // Render extra panels outward from viewport edges.
        // Start on the left side then alternate.
        for (var i = 0, n = panels.length - (iEnd - iStart + 1); n > 0; ++i) {
            if (i % 2 === 0) {
                if (iStart > 0) {
                    iStart -= 1;
                    n -= 1;
                }
            }
            else {
                if (iEnd < panels.length - 1) {
                    iEnd += 1;
                    n -= 1;
                }
            }
        }
        /** Cached panels that are still valid */
        var keepPanels = Object.create(null);
        /** ids of panels that were not cached */
        var ids = [];
        var _loop_1 = function (i) {
            // Find a bound panel
            var panel = panels.find(function (p) { return p.index === i; });
            if (panel) {
                if (panel.state < Panel_1.default.PRERENDERED || (!fast && panel.state < Panel_1.default.FETCHING)) {
                    panel.state = cfg.renderContent(new PanelSlider.RenderEvent(fast ? 'preview' : 'render', panel.dom, panel.index));
                }
                transform_1.setPos3d(panel.dom, curPosX + i * panelWidth);
                keepPanels[i] = panel;
            }
            else {
                ids.push(i);
            }
        };
        // Render panels that are cached
        for (var i = iStart; i <= iEnd; ++i) {
            _loop_1(i);
        }
        // Render panels that weren't cached
        for (var _i = 0, ids_1 = ids; _i < ids_1.length; _i++) {
            var i = ids_1[_i];
            var panel = panels.find(function (p) { return !keepPanels[p.index]; });
            if (panel == null) {
                console.warn('Could not find an available panel for id:', i);
                continue;
            }
            // Panel has old content so must render
            panel.index = i;
            panel.state = cfg.renderContent(new PanelSlider.RenderEvent(fast ? 'preview' : 'render', panel.dom, panel.index));
            transform_1.setPos3d(panel.dom, curPosX - i * panelWidth);
            keepPanels[i] = panel;
        }
    }
    /** Application wants to re-render this panel (or all panels) content */
    function renderPanelContent(pid) {
        if (pid != null) {
            var panel = panels.find(function (p) { return p.index === pid; });
            if (!panel)
                return false;
            panel.state = cfg.renderContent(new PanelSlider.RenderEvent('render', panel.dom, panel.index));
            return true;
        }
        for (var _i = 0, panels_2 = panels; _i < panels_2.length; _i++) {
            var panel = panels_2[_i];
            panel.state = cfg.renderContent(new PanelSlider.RenderEvent('render', panel.dom, panel.index));
        }
        return true;
    }
    function emit(e) {
        for (var _i = 0, _a = emitters[e.type]; _i < _a.length; _i++) {
            var cb = _a[_i];
            cb(e);
        }
    }
    resize();
    var dragger = Dragger_1.default(cfg.dom, {
        dragThreshold: cfg.dragThreshold, dragRatio: cfg.dragRatio,
        devices: cfg.devices,
        on: {
            dragstart: function (e) {
                emit(new PanelSlider.DragEvent('dragstart', e.x, 0));
            },
            dragmove: function (e) {
                var ox = -curPanel * panelWidth;
                //curPosX = Math.round(clamp(ox + e.x, -(fullWidth - panelWidth), 0))
                curPosX = applyOverscroll(ox + e.x);
                render();
                emit(new PanelSlider.AnimateEvent('animate', -curPosX / panelWidth));
                emit(new PanelSlider.DragEvent('drag', e.x, e.xv));
            },
            dragcancel: function () {
                emit(new PanelSlider.DragEvent('dragcancel', curPosX, 0));
                swipeAnim(0).then(function (pid) {
                    emit(new PanelSlider.ChangeEvent('panelchange', pid));
                });
            },
            dragend: function (e) {
                var ox = -curPanel * panelWidth;
                //curPosX = Math.round(clamp(ox + e.x, -(fullWidth - panelWidth), 0))
                curPosX = applyOverscroll(Math.round(ox + e.x));
                render();
                swipeAnim(e.xv).then(function (pid) {
                    emit(new PanelSlider.ChangeEvent('panelchange', pid));
                });
                emit(new PanelSlider.AnimateEvent('animate', -curPosX / panelWidth));
                emit(new PanelSlider.DragEvent('dragend', e.x, e.xv));
            },
            devicepress: function () {
                // Ensure we have up-to-date dimensions whenever a drag action
                // may start in case we missed a stealth window resize.
                resize();
            }
        }
    });
    /**
     * @param xVelocity Speed of swipe in pixels/second
     * @param done callback when swipe ends
     */
    function swipeAnim(xVelocity) {
        var result = gesture.swipe({
            panelId: curPanel,
            x: curPosX, xv: xVelocity * cfg.swipeForce,
            maxSwipePanels: cfg.maxSwipePanels,
            panelWidth: panelWidth,
            unitDuration: cfg.slideDuration,
            totalPanels: cfg.totalPanels - (cfg.visiblePanels - 1)
        });
        return animateTo(result.panelId, result.duration);
    }
    /** Animate panels to the specified panelId */
    function animateTo(destPanel, dur) {
        if (dur === void 0) { dur = cfg.slideDuration; }
        if (isAnimating) {
            // TODO: Allow redirect
            console.warn("Cannot animateTo - already animating");
            return Promise.resolve(curPanel);
        }
        if (dragger.isDragging()) {
            console.warn("Cannot animateTo - currently dragging");
            return Promise.resolve(curPanel);
        }
        return new Promise(function (resolve) {
            isAnimating = true;
            var startX = curPosX;
            var destX = -destPanel * panelWidth;
            function finish() {
                curPanel = destPanel;
                isAnimating = false;
                emit(new PanelSlider.AnimationEvent('animationstatechange', false));
                resolve(curPanel);
            }
            function loop() {
                if (!isAnimating) {
                    // Animation has been cancelled, assume
                    // something else has changed curPanel.
                    // (eg. setPanelImmediate)
                    //emit(new PanelSlider.AnimationEvent('animationstatechange', false))
                    //resolve(curPanel)
                    return;
                }
                var t = Date.now();
                var destX = -destPanel * panelWidth;
                var totalT = t - startT;
                var animT = Math.min(totalT, dur);
                curPosX = cfg.terp(startX, destX, animT / dur);
                // Use a 'fast' render unless this is the last frame of the animation
                var isLastFrame = totalT >= dur;
                render(!isLastFrame);
                emit(new PanelSlider.AnimateEvent('animate', -curPosX / panelWidth));
                if (!isLastFrame) {
                    requestAnimationFrame(loop);
                }
                else {
                    finish();
                }
            }
            if (destX === startX) {
                requestAnimationFrame(finish);
                emit(new PanelSlider.AnimateEvent('animate', -curPosX / panelWidth));
                return;
            }
            var startT = Date.now();
            requestAnimationFrame(loop);
            emit(new PanelSlider.AnimateEvent('animate', -curPosX / panelWidth));
        });
    }
    ///////////////////////////////////////////////////////
    // Public
    /** Add an event listener */
    function addListener(n, fn) {
        var arr = emitters[n];
        if (arr.indexOf(fn) === -1) {
            arr.push(fn);
        }
    }
    /** Remove an event listener */
    function removeListener(n, fn) {
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
    /**
     * Animates to position and updates panel index.
     * The animation could be redirected or aborted,
     * so the resulting index may not be what was
     * requested. Or the promise may not resolve.
     */
    function setPanel(panelId, duration) {
        if (duration === void 0) { duration = cfg.slideDuration; }
        return panelId === curPanel
            ? Promise.resolve(panelId)
            : animateTo(panelId, duration);
    }
    /** Sets the current panel index immediately, no animation */
    function setPanelImmediate(panelId) {
        if (typeof panelId !== 'number' || !Number.isSafeInteger(panelId)
            || panelId < 0 || panelId >= cfg.totalPanels) {
            throw new Error('Invalid panel');
        }
        if (isAnimating) {
            isAnimating = false;
        }
        else if (panelId === curPanel) {
            return;
        }
        curPanel = panelId;
        curPosX = -curPanel * panelWidth;
        render();
    }
    /** Remove all event handlers, cleanup streams etc. */
    function destroy() {
        // Remove event listeners
        window.removeEventListener('resize', resize);
        dragger.destroy();
        Object.keys(emitters).forEach(function (k) {
            emitters[k].length = 0;
        });
        if (cfg.dom != null) {
            cfg.dom.innerHTML = '';
            cfg.dom = undefined;
        }
    }
    window.addEventListener('resize', resize);
    return {
        on: addListener,
        off: removeListener,
        getPanel: getPanel,
        setPanel: setPanel,
        setPanelImmediate: setPanelImmediate,
        getSizes: function () { return ({ fullWidth: fullWidth, panelWidth: panelWidth }); },
        isDragging: dragger.isDragging,
        isAnimating: function () { return isAnimating; },
        render: renderPanelContent,
        resize: resize,
        destroy: destroy,
    };
}
/**
 * PanelSlider static methods and properties.
 */
(function (PanelSlider) {
    PanelSlider.DEFAULT_SLIDE_DURATION = 500;
    PanelSlider.DEFAULT_DRAG_THRESHOLD = 12;
    PanelSlider.DEFAULT_DRAG_RATIO = 1.5;
    /**
     * Default animation interpolation function
     * @param x0 Start coordinate
     * @param x1 End coordinate
     * @param t Time (0..1)
     */
    function terp(x0, x1, t) {
        var r = (Math.PI / 2.0) * t;
        var s = Math.sin(r);
        var si = 1.0 - s;
        return (x0 * si + x1 * s);
    }
    PanelSlider.terp = terp;
    /** Lightweight PanelSlider Event type */
    var Event = /** @class */ (function () {
        function Event(type) {
            this.type = type;
        }
        return Event;
    }());
    PanelSlider.Event = Event;
    /** Event emitted when current panel changes */
    var ChangeEvent = /** @class */ (function (_super) {
        __extends(ChangeEvent, _super);
        function ChangeEvent(type, panelId) {
            var _this = _super.call(this, type) || this;
            _this.panelId = panelId;
            return _this;
        }
        return ChangeEvent;
    }(Event));
    PanelSlider.ChangeEvent = ChangeEvent;
    /** Event emitted when current panel dragged */
    var DragEvent = /** @class */ (function (_super) {
        __extends(DragEvent, _super);
        function DragEvent(type, x, xv) {
            var _this = _super.call(this, type) || this;
            _this.x = x;
            _this.xv = xv;
            return _this;
        }
        return DragEvent;
    }(Event));
    PanelSlider.DragEvent = DragEvent;
    /** Emitted on animation start/stop */
    var AnimationEvent = /** @class */ (function (_super) {
        __extends(AnimationEvent, _super);
        function AnimationEvent(type, animating) {
            var _this = _super.call(this, type) || this;
            _this.animating = animating;
            return _this;
        }
        return AnimationEvent;
    }(Event));
    PanelSlider.AnimationEvent = AnimationEvent;
    /** Emitted every frame during an animation */
    var AnimateEvent = /** @class */ (function (_super) {
        __extends(AnimateEvent, _super);
        function AnimateEvent(type, panelFraction) {
            var _this = _super.call(this, type) || this;
            _this.panelFraction = panelFraction;
            return _this;
        }
        return AnimateEvent;
    }(Event));
    PanelSlider.AnimateEvent = AnimateEvent;
    /** Received by the application's `renderContent` callback */
    var RenderEvent = /** @class */ (function () {
        function RenderEvent(type, dom, panelId) {
            this.type = type;
            this.dom = dom;
            this.panelId = panelId;
        }
        return RenderEvent;
    }());
    PanelSlider.RenderEvent = RenderEvent;
    /** Indicates the panel is empty after renderContent */
    PanelSlider.EMPTY = 0;
    /** Indicates the panel is 'pre-rendered' after renderContent */
    PanelSlider.PRERENDERED = 1;
    /** Indicates the panel is 'pre-rendered' and awaiting content after renderContent */
    PanelSlider.FETCHING = 2;
    /** Indicates the panel is fully rendered */
    PanelSlider.RENDERED = 3;
    /** Indicates the panel content is out of date and needs to re-render */
    PanelSlider.DIRTY = -1;
})(PanelSlider || (PanelSlider = {}));
exports.default = PanelSlider;
