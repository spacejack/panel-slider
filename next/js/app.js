(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mithril_1 = __importDefault(require("mithril"));
const stream_1 = __importDefault(require("mithril/stream"));
const array_1 = require("../../../src/array");
const math_1 = require("../../../src/math");
const src_1 = __importDefault(require("../../../src"));
const content = __importStar(require("../content"));
const Nav_1 = __importDefault(require("./Nav"));
const Configuration_1 = __importDefault(require("./Configuration"));
const Stats_1 = __importDefault(require("./Stats"));
const render_1 = require("../render");
const NUM_PANELS = 101;
const MIN_PANEL_WIDTH = 360;
const SLIDE_DURATION = 400;
const NAV_ITEMS = array_1.range(0, NUM_PANELS, 10).map(i => String(i));
/**
 * Main application component.
 * Stateful component that manages a PanelSlider instance.
 */
function App() {
    const panelId = stream_1.default(0);
    const panelPosition = stream_1.default(0);
    let slider;
    let dom;
    let numVisiblePanels = 1;
    let configOpen = false;
    let userConfig = {
        slideDuration: SLIDE_DURATION,
        swipeForce: 1,
        contentSize: '3',
        maxSwipePanels: undefined
    };
    /**
     * (Re)Create & configure a PanelSlider instance
     */
    function initPanelSlider(visiblePanels) {
        let initialPanel = 0;
        if (slider != null) {
            initialPanel = slider.getPanel();
            slider.destroy();
        }
        slider = src_1.default({
            dom: document.querySelector('.panel-set'),
            totalPanels: NUM_PANELS,
            visiblePanels,
            initialPanel,
            swipeForce: userConfig.swipeForce,
            maxSwipePanels: userConfig.maxSwipePanels != null
                ? userConfig.maxSwipePanels
                : visiblePanels === 1 ? 1 : 4 * visiblePanels,
            slideDuration: userConfig.slideDuration,
            panelClassName: 'panel',
            dragThreshold: 1,
            // Callback that gets invoked when the PanelSlider needs
            // to render this panel.
            renderContent: (e) => {
                if (e.panelId === 0) {
                    render_1.renderIntro(e.dom);
                    return src_1.default.RENDERED;
                }
                if (e.panelId === NUM_PANELS - 1) {
                    render_1.renderOutro(e.dom);
                    return src_1.default.RENDERED;
                }
                // Try to get 'ready' content for this panel
                let c = content.peek(e.panelId);
                // If it's ready to use, we got an array of strings
                if (Array.isArray(c)) {
                    // Content is available now - render it:
                    render_1.renderPanelContent(e.dom, e.panelId, c);
                    // Indicate did render
                    return src_1.default.RENDERED;
                }
                else if (e.type === 'render') {
                    // Content not available yet - fetch
                    c = c || content.get(e.panelId);
                    c.then(() => {
                        // Request PanelSlider to re-render this panel when the content promise
                        // resolves. It's possible this panel is no longer bound to this ID by
                        // then so the render request may be ignored.
                        slider.render(e.panelId);
                    });
                    // Do a fast render while waiting
                    render_1.preRenderPanelContent(e.dom, e.panelId, 'loading...');
                    return src_1.default.FETCHING;
                }
                else {
                    // Content not available but this is a 'fast' render so
                    // don't bother fetching anything.
                    // We could render some 'loading' or low-res content here...
                    render_1.preRenderPanelContent(e.dom, e.panelId, '...');
                    return src_1.default.PRERENDERED;
                }
            },
            on: {
                panelchange: e => {
                    panelId(e.panelId);
                },
                animate: e => {
                    panelPosition(e.panelFraction);
                }
            }
        });
    }
    /** Compute how many panel widths fit in the container */
    function calcVisiblePanels() {
        const w = dom.getBoundingClientRect().width;
        return Math.max(Math.floor(w / MIN_PANEL_WIDTH), 1);
    }
    /** Handle nav page button click */
    function onNavChange(e) {
        if (e.type === 'config') {
            configOpen = !configOpen;
            return;
        }
        const pid0 = slider.getPanel();
        let pid = pid0;
        if (e.type === 'goto') {
            pid = e.id * 10;
        }
        else if (e.type === 'skip') {
            const skip = Math.abs(e.id) <= 1
                ? e.id
                : Math.sign(e.id) * numVisiblePanels;
            pid += skip;
        }
        pid = math_1.clamp(pid, 0, NUM_PANELS - numVisiblePanels);
        const duration = SLIDE_DURATION * Math.pow(Math.max(Math.abs(pid - pid0), 1), 0.25);
        // User clicked a nav button for this panel ID.
        // Fetch content immediately if it's not already available...
        content.get(pid);
        // Send the PanelSlider there
        slider.setPanel(pid, duration).then(panelId);
    }
    function resize() {
        const n = calcVisiblePanels();
        if (n !== numVisiblePanels) {
            numVisiblePanels = n;
            initPanelSlider(numVisiblePanels);
        }
    }
    return {
        oncreate: vnode => {
            dom = vnode.dom;
            // Defer PanelSlider init until document has loaded
            // to ensure that CSS styles have been applied.
            window.addEventListener('load', () => {
                numVisiblePanels = calcVisiblePanels();
                initPanelSlider(numVisiblePanels);
                window.addEventListener('resize', resize);
            });
        },
        onremove: () => {
            window.removeEventListener('resize', resize);
            if (slider) {
                slider.destroy();
            }
        },
        view: () => mithril_1.default('.container', mithril_1.default('.panel-set'), mithril_1.default(Stats_1.default, {
            panelId: panelId,
            position: panelPosition
        }), mithril_1.default(Nav_1.default, {
            items: NAV_ITEMS,
            onNav: onNavChange
        }), configOpen && mithril_1.default(Configuration_1.default, {
            config: userConfig,
            onChange: (c) => {
                console.log('Updating settings to:', c);
                Object.assign(userConfig, c);
                render_1.contentSize(userConfig.contentSize);
                configOpen = false;
                initPanelSlider(numVisiblePanels);
            },
            onClose: () => {
                configOpen = false;
            }
        }))
    };
}
exports.default = App;

},{"../../../src":18,"../../../src/array":16,"../../../src/math":19,"../content":5,"../render":7,"./Configuration":2,"./Nav":3,"./Stats":4,"mithril":8,"mithril/stream":9}],2:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mithril_1 = __importDefault(require("mithril"));
const SIZES = { '1': 'small', '2': 'medium', '3': 'large' };
function Configuration() {
    let auto = false;
    return {
        oninit: ({ attrs }) => {
            auto = !attrs.config.maxSwipePanels;
        },
        oncreate: ({ attrs, dom }) => {
            setTimeout(() => {
                const i = dom.querySelector('input');
                i.focus();
            }, 100);
        },
        view: ({ attrs: { config: c, onChange, onClose } }) => mithril_1.default('.configuration', mithril_1.default('h3', 'Settings'), mithril_1.default('form', {
            onsubmit: (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                onChange({
                    slideDuration: Number(form.slideDuration.value),
                    swipeForce: Number(form.swipeForce.value),
                    contentSize: form.contentSize.value,
                    maxSwipePanels: form.autoSwipePanels.checked
                        ? undefined
                        : Number(form.maxSwipePanels.value) || 1,
                });
            }
        }, mithril_1.default('table.cfg', mithril_1.default('tr', mithril_1.default('td', 'Slide Duration:'), mithril_1.default('td', mithril_1.default('input', {
            type: 'number',
            min: 50, max: 1000,
            style: 'width: 4em',
            required: true,
            name: 'slideDuration',
            value: c.slideDuration
        }))), mithril_1.default('tr', mithril_1.default('td', 'Swipe Force Multiplier:'), mithril_1.default('td', mithril_1.default('input', {
            type: 'number',
            min: 0.1, max: 10, step: 0.01,
            style: 'width: 4em',
            required: true,
            name: 'swipeForce',
            value: c.swipeForce
        }))), mithril_1.default('tr', mithril_1.default('td', { colspan: 2 }, mithril_1.default('input', {
            id: 'autoSwipePanels',
            type: 'checkbox',
            name: 'autoSwipePanels',
            checked: auto,
            onclick: (e) => {
                auto = !auto;
            }
        }), mithril_1.default('label', { for: 'autoSwipePanels' }, ' Auto Swipe Travel'))), mithril_1.default('tr', mithril_1.default('td', { style: `opacity: ${auto ? '0.5' : '1'}` }, 'Max Swipe Travel:'), mithril_1.default('td', mithril_1.default('input', {
            type: 'number',
            disabled: auto,
            required: !auto,
            min: 1, max: 100,
            style: 'width: 4em',
            name: 'maxSwipePanels',
            value: auto ? ''
                : c.maxSwipePanels != null ? c.maxSwipePanels : '1'
        }))), mithril_1.default('tr', mithril_1.default('td', 'Content Size:'), mithril_1.default('td', mithril_1.default('select', {
            //style: 'width: 4em',
            name: 'contentSize',
            value: c.contentSize
        }, Object.keys(SIZES).map(s => mithril_1.default('option', { value: s }, SIZES[s]))))), mithril_1.default('tr', mithril_1.default('td', { colspan: 2, style: 'text-align: center' }, mithril_1.default('button.btn-cfg', { type: 'button', onclick: onClose }, 'Cancel'), ' ', mithril_1.default('button.btn-cfg', { type: 'submit' }, 'Update'))))))
    };
}
exports.default = Configuration;

},{"mithril":8}],3:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mithril_1 = __importDefault(require("mithril"));
class NavEvent {
    constructor(type, i) {
        this.type = type;
        this.id = i;
    }
}
exports.NavEvent = NavEvent;
const Nav = {
    view: ({ attrs }) => mithril_1.default('nav', 
    // Skip buttons
    mithril_1.default('.group.mq-md', mithril_1.default('button.btn-pg.mq-lp', {
        type: 'button',
        onclick: () => {
            attrs.onNav({ type: 'skip', id: -2 });
        }
    }, '⏪'), mithril_1.default('button.btn-pg', {
        type: 'button',
        onclick: () => {
            attrs.onNav({ type: 'skip', id: -1 });
        }
    }, '◀️'), mithril_1.default('button.btn-pg', {
        type: 'button',
        onclick: () => {
            attrs.onNav({ type: 'skip', id: 1 });
        }
    }, '▶️'), mithril_1.default('button.btn-pg.mq-lp', {
        type: 'button',
        onclick: () => {
            attrs.onNav({ type: 'skip', id: 2 });
        }
    }, '⏩')), 
    // Page numbered buttons
    mithril_1.default('.group', attrs.items.map((item, i) => mithril_1.default('button.btn-pg', {
        type: 'button',
        onclick: () => {
            attrs.onNav({ type: 'goto', id: i });
        }
    }, item))), mithril_1.default('.group', mithril_1.default('button.btn-pg', {
        type: 'button',
        onclick: () => {
            attrs.onNav({ type: 'config', id: 0 });
        }
    }, '⚙' //'☰'
    )))
};
exports.default = Nav;

},{"mithril":8}],4:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mithril_1 = __importDefault(require("mithril"));
const Stats = {
    oncreate: ({ attrs, dom }) => {
        // These values change rapidly, so write them directly to the DOM
        const elPos = dom.querySelector('#panel-position');
        attrs.position.map(p => elPos.textContent = p.toFixed(2));
        const elId = dom.querySelector('#panel-id');
        attrs.panelId.map(id => elId.textContent = String(id));
    },
    view: ({ attrs }) => mithril_1.default('.stats', mithril_1.default('table', mithril_1.default('tr', mithril_1.default('td', 'Panel:'), mithril_1.default('td#panel-id', attrs.panelId)), mithril_1.default('tr', mithril_1.default('td', 'Position:'), mithril_1.default('td#panel-position', attrs.position().toFixed(2)))))
};
exports.default = Stats;

},{"mithril":8}],5:[function(require,module,exports){
"use strict";
// This is a placeholder module that generates example content
// from some public APIs.
// This is used to demonstrate panels having async content.
Object.defineProperty(exports, "__esModule", { value: true });
const cache = new Map();
/**
 * Return what's available for this panel but don't initiate any fetch.
 */
function peek(panelId) {
    return cache.get(panelId);
}
exports.peek = peek;
/**
 * Return content if ready as an array.
 * Otherwise return a promise; initiate a fetch
 * or return an already pending promise.
 */
function get(id) {
    if (!cache.has(id)) {
        // Entry doesn't exist - start with a promise
        console.log('fetching panel: ' + id);
        // Use BaconIpsum.com to generate some content for each panel
        cache.set(id, fetch('https://baconipsum.com/api/?type=meat-and-filler').then(response => response.json()).then(texts => {
            // When resolved, replace the promise with the
            // unwrapped value in the Map
            cache.set(id, texts);
            return texts;
        }).catch(err => {
            cache.delete(id);
            throw new Error(`Failed to fetch content for panel ${id}: ${err.message}`);
        }));
    }
    return cache.get(id);
}
exports.get = get;

},{}],6:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mithril_1 = __importDefault(require("mithril"));
const App_1 = __importDefault(require("./components/App"));
mithril_1.default.mount(document.body, App_1.default);

},{"./components/App":1,"mithril":8}],7:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mithril_1 = __importDefault(require("mithril"));
const stream_1 = __importDefault(require("mithril/stream"));
exports.contentSize = stream_1.default('3');
// Panel content rendering
const picsumOffset = Math.floor(Math.random() * 1000);
/** Render panel content. Returns DOM tree. */
function renderPanelContent(dom, pid, texts) {
    const sz = exports.contentSize();
    mithril_1.default.render(dom, mithril_1.default('div', mithril_1.default('h2', `${pid}. ${texts[1].substr(0, 10 + pid % 10).trim()}`), sz >= '2' && mithril_1.default('p', mithril_1.default('img', {
        style: 'width: 300px; height: 200px',
        src: `https://picsum.photos/300/200?image=${picsumOffset + pid}`
    })), sz === '3'
        ? texts.map(text => mithril_1.default('p', text))
        : texts[0].substr(0, 2 * (10 + pid % 10)).trim()));
}
exports.renderPanelContent = renderPanelContent;
/** Pre-render (fast) */
function preRenderPanelContent(dom, pid, text) {
    const sz = exports.contentSize();
    mithril_1.default.render(dom, mithril_1.default('div', mithril_1.default('h2', `${pid}. ...`), sz >= '2' && mithril_1.default('p', mithril_1.default('div', {
        style: 'width: 300px; height: 200px; background-color: #DDD',
    })), mithril_1.default('p', { style: 'font-style: italic' }, text)));
}
exports.preRenderPanelContent = preRenderPanelContent;
function renderIntro(dom) {
    mithril_1.default.render(dom, mithril_1.default('.intro', mithril_1.default('h2.center', 'Panel-Slider'), mithril_1.default('.small', mithril_1.default('.center.lg-lt', '➔'), mithril_1.default('p', 'Swipe left or right to navigate. Click the ⚙ button to adjust settings.'), mithril_1.default('p', 'Panel content is loaded asynchronously. '
        + 'On a desktop you can resize the window width to change the number of panels. '
        + 'Mobile devices may show more panels in landscape orientation.'), mithril_1.default('p', 'Docs and source: ', mithril_1.default('a', { href: 'http://github.com/spacejack/panel-slider' }, 'Github Repo')))));
}
exports.renderIntro = renderIntro;
function renderOutro(dom) {
    mithril_1.default.render(dom, mithril_1.default('.intro.center', mithril_1.default('h2', 'Panel-Slider'), mithril_1.default('.lg-lt', { style: 'transform: rotate(180deg)' }, '➔'), mithril_1.default('p', 'Swipe left or right to navigate.'), mithril_1.default('p', '© 2019 by Mike Linkovich | ', mithril_1.default('a', { href: 'https://github.com/spacejack' }, 'Github'))));
}
exports.renderOutro = renderOutro;

},{"mithril":8,"mithril/stream":9}],8:[function(require,module,exports){
(function (global,setImmediate){
;(function() {
"use strict"
function Vnode(tag, key, attrs0, children, text, dom) {
	return {tag: tag, key: key, attrs: attrs0, children: children, text: text, dom: dom, domSize: undefined, state: undefined, _state: undefined, events: undefined, instance: undefined, skip: false}
}
Vnode.normalize = function(node) {
	if (Array.isArray(node)) return Vnode("[", undefined, undefined, Vnode.normalizeChildren(node), undefined, undefined)
	if (node != null && typeof node !== "object") return Vnode("#", undefined, undefined, node === false ? "" : node, undefined, undefined)
	return node
}
Vnode.normalizeChildren = function normalizeChildren(children) {
	for (var i = 0; i < children.length; i++) {
		children[i] = Vnode.normalize(children[i])
	}
	return children
}
var selectorParser = /(?:(^|#|\.)([^#\.\[\]]+))|(\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\5)?\])/g
var selectorCache = {}
var hasOwn = {}.hasOwnProperty
function isEmpty(object) {
	for (var key in object) if (hasOwn.call(object, key)) return false
	return true
}
function compileSelector(selector) {
	var match, tag = "div", classes = [], attrs = {}
	while (match = selectorParser.exec(selector)) {
		var type = match[1], value = match[2]
		if (type === "" && value !== "") tag = value
		else if (type === "#") attrs.id = value
		else if (type === ".") classes.push(value)
		else if (match[3][0] === "[") {
			var attrValue = match[6]
			if (attrValue) attrValue = attrValue.replace(/\\(["'])/g, "$1").replace(/\\\\/g, "\\")
			if (match[4] === "class") classes.push(attrValue)
			else attrs[match[4]] = attrValue === "" ? attrValue : attrValue || true
		}
	}
	if (classes.length > 0) attrs.className = classes.join(" ")
	return selectorCache[selector] = {tag: tag, attrs: attrs}
}
function execSelector(state, attrs, children) {
	var hasAttrs = false, childList, text
	var className = attrs.className || attrs.class
	if (!isEmpty(state.attrs) && !isEmpty(attrs)) {
		var newAttrs = {}
		for(var key in attrs) {
			if (hasOwn.call(attrs, key)) {
				newAttrs[key] = attrs[key]
			}
		}
		attrs = newAttrs
	}
	for (var key in state.attrs) {
		if (hasOwn.call(state.attrs, key)) {
			attrs[key] = state.attrs[key]
		}
	}
	if (className !== undefined) {
		if (attrs.class !== undefined) {
			attrs.class = undefined
			attrs.className = className
		}
		if (state.attrs.className != null) {
			attrs.className = state.attrs.className + " " + className
		}
	}
	for (var key in attrs) {
		if (hasOwn.call(attrs, key) && key !== "key") {
			hasAttrs = true
			break
		}
	}
	if (Array.isArray(children) && children.length === 1 && children[0] != null && children[0].tag === "#") {
		text = children[0].children
	} else {
		childList = children
	}
	return Vnode(state.tag, attrs.key, hasAttrs ? attrs : undefined, childList, text)
}
function hyperscript(selector) {
	// Because sloppy mode sucks
	var attrs = arguments[1], start = 2, children
	if (selector == null || typeof selector !== "string" && typeof selector !== "function" && typeof selector.view !== "function") {
		throw Error("The selector must be either a string or a component.");
	}
	if (typeof selector === "string") {
		var cached = selectorCache[selector] || compileSelector(selector)
	}
	if (attrs == null) {
		attrs = {}
	} else if (typeof attrs !== "object" || attrs.tag != null || Array.isArray(attrs)) {
		attrs = {}
		start = 1
	}
	if (arguments.length === start + 1) {
		children = arguments[start]
		if (!Array.isArray(children)) children = [children]
	} else {
		children = []
		while (start < arguments.length) children.push(arguments[start++])
	}
	var normalized = Vnode.normalizeChildren(children)
	if (typeof selector === "string") {
		return execSelector(cached, attrs, normalized)
	} else {
		return Vnode(selector, attrs.key, attrs, normalized)
	}
}
hyperscript.trust = function(html) {
	if (html == null) html = ""
	return Vnode("<", undefined, undefined, html, undefined, undefined)
}
hyperscript.fragment = function(attrs1, children) {
	return Vnode("[", attrs1.key, attrs1, Vnode.normalizeChildren(children), undefined, undefined)
}
var m = hyperscript
/** @constructor */
var PromisePolyfill = function(executor) {
	if (!(this instanceof PromisePolyfill)) throw new Error("Promise must be called with `new`")
	if (typeof executor !== "function") throw new TypeError("executor must be a function")
	var self = this, resolvers = [], rejectors = [], resolveCurrent = handler(resolvers, true), rejectCurrent = handler(rejectors, false)
	var instance = self._instance = {resolvers: resolvers, rejectors: rejectors}
	var callAsync = typeof setImmediate === "function" ? setImmediate : setTimeout
	function handler(list, shouldAbsorb) {
		return function execute(value) {
			var then
			try {
				if (shouldAbsorb && value != null && (typeof value === "object" || typeof value === "function") && typeof (then = value.then) === "function") {
					if (value === self) throw new TypeError("Promise can't be resolved w/ itself")
					executeOnce(then.bind(value))
				}
				else {
					callAsync(function() {
						if (!shouldAbsorb && list.length === 0) console.error("Possible unhandled promise rejection:", value)
						for (var i = 0; i < list.length; i++) list[i](value)
						resolvers.length = 0, rejectors.length = 0
						instance.state = shouldAbsorb
						instance.retry = function() {execute(value)}
					})
				}
			}
			catch (e) {
				rejectCurrent(e)
			}
		}
	}
	function executeOnce(then) {
		var runs = 0
		function run(fn) {
			return function(value) {
				if (runs++ > 0) return
				fn(value)
			}
		}
		var onerror = run(rejectCurrent)
		try {then(run(resolveCurrent), onerror)} catch (e) {onerror(e)}
	}
	executeOnce(executor)
}
PromisePolyfill.prototype.then = function(onFulfilled, onRejection) {
	var self = this, instance = self._instance
	function handle(callback, list, next, state) {
		list.push(function(value) {
			if (typeof callback !== "function") next(value)
			else try {resolveNext(callback(value))} catch (e) {if (rejectNext) rejectNext(e)}
		})
		if (typeof instance.retry === "function" && state === instance.state) instance.retry()
	}
	var resolveNext, rejectNext
	var promise = new PromisePolyfill(function(resolve, reject) {resolveNext = resolve, rejectNext = reject})
	handle(onFulfilled, instance.resolvers, resolveNext, true), handle(onRejection, instance.rejectors, rejectNext, false)
	return promise
}
PromisePolyfill.prototype.catch = function(onRejection) {
	return this.then(null, onRejection)
}
PromisePolyfill.resolve = function(value) {
	if (value instanceof PromisePolyfill) return value
	return new PromisePolyfill(function(resolve) {resolve(value)})
}
PromisePolyfill.reject = function(value) {
	return new PromisePolyfill(function(resolve, reject) {reject(value)})
}
PromisePolyfill.all = function(list) {
	return new PromisePolyfill(function(resolve, reject) {
		var total = list.length, count = 0, values = []
		if (list.length === 0) resolve([])
		else for (var i = 0; i < list.length; i++) {
			(function(i) {
				function consume(value) {
					count++
					values[i] = value
					if (count === total) resolve(values)
				}
				if (list[i] != null && (typeof list[i] === "object" || typeof list[i] === "function") && typeof list[i].then === "function") {
					list[i].then(consume, reject)
				}
				else consume(list[i])
			})(i)
		}
	})
}
PromisePolyfill.race = function(list) {
	return new PromisePolyfill(function(resolve, reject) {
		for (var i = 0; i < list.length; i++) {
			list[i].then(resolve, reject)
		}
	})
}
if (typeof window !== "undefined") {
	if (typeof window.Promise === "undefined") window.Promise = PromisePolyfill
	var PromisePolyfill = window.Promise
} else if (typeof global !== "undefined") {
	if (typeof global.Promise === "undefined") global.Promise = PromisePolyfill
	var PromisePolyfill = global.Promise
} else {
}
var buildQueryString = function(object) {
	if (Object.prototype.toString.call(object) !== "[object Object]") return ""
	var args = []
	for (var key0 in object) {
		destructure(key0, object[key0])
	}
	return args.join("&")
	function destructure(key0, value) {
		if (Array.isArray(value)) {
			for (var i = 0; i < value.length; i++) {
				destructure(key0 + "[" + i + "]", value[i])
			}
		}
		else if (Object.prototype.toString.call(value) === "[object Object]") {
			for (var i in value) {
				destructure(key0 + "[" + i + "]", value[i])
			}
		}
		else args.push(encodeURIComponent(key0) + (value != null && value !== "" ? "=" + encodeURIComponent(value) : ""))
	}
}
var FILE_PROTOCOL_REGEX = new RegExp("^file://", "i")
var _8 = function($window, Promise) {
	var callbackCount = 0
	var oncompletion
	function setCompletionCallback(callback) {oncompletion = callback}
	function finalizer() {
		var count = 0
		function complete() {if (--count === 0 && typeof oncompletion === "function") oncompletion()}
		return function finalize(promise0) {
			var then0 = promise0.then
			promise0.then = function() {
				count++
				var next = then0.apply(promise0, arguments)
				next.then(complete, function(e) {
					complete()
					if (count === 0) throw e
				})
				return finalize(next)
			}
			return promise0
		}
	}
	function normalize(args, extra) {
		if (typeof args === "string") {
			var url = args
			args = extra || {}
			if (args.url == null) args.url = url
		}
		return args
	}
	function request(args, extra) {
		var finalize = finalizer()
		args = normalize(args, extra)
		var promise0 = new Promise(function(resolve, reject) {
			if (args.method == null) args.method = "GET"
			args.method = args.method.toUpperCase()
			var useBody = (args.method === "GET" || args.method === "TRACE") ? false : (typeof args.useBody === "boolean" ? args.useBody : true)
			if (typeof args.serialize !== "function") args.serialize = typeof FormData !== "undefined" && args.data instanceof FormData ? function(value) {return value} : JSON.stringify
			if (typeof args.deserialize !== "function") args.deserialize = deserialize
			if (typeof args.extract !== "function") args.extract = extract
			args.url = interpolate(args.url, args.data)
			if (useBody) args.data = args.serialize(args.data)
			else args.url = assemble(args.url, args.data)
			var xhr = new $window.XMLHttpRequest(),
				aborted = false,
				_abort = xhr.abort
			xhr.abort = function abort() {
				aborted = true
				_abort.call(xhr)
			}
			xhr.open(args.method, args.url, typeof args.async === "boolean" ? args.async : true, typeof args.user === "string" ? args.user : undefined, typeof args.password === "string" ? args.password : undefined)
			if (args.serialize === JSON.stringify && useBody && !(args.headers && args.headers.hasOwnProperty("Content-Type"))) {
				xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8")
			}
			if (args.deserialize === deserialize && !(args.headers && args.headers.hasOwnProperty("Accept"))) {
				xhr.setRequestHeader("Accept", "application/json, text/*")
			}
			if (args.withCredentials) xhr.withCredentials = args.withCredentials
			for (var key in args.headers) if ({}.hasOwnProperty.call(args.headers, key)) {
				xhr.setRequestHeader(key, args.headers[key])
			}
			if (typeof args.config === "function") xhr = args.config(xhr, args) || xhr
			xhr.onreadystatechange = function() {
				// Don't throw errors on xhr.abort().
				if(aborted) return
				if (xhr.readyState === 4) {
					try {
						var response = (args.extract !== extract) ? args.extract(xhr, args) : args.deserialize(args.extract(xhr, args))
						if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304 || FILE_PROTOCOL_REGEX.test(args.url)) {
							resolve(cast(args.type, response))
						}
						else {
							var error = new Error(xhr.responseText)
							for (var key in response) error[key] = response[key]
							reject(error)
						}
					}
					catch (e) {
						reject(e)
					}
				}
			}
			if (useBody && (args.data != null)) xhr.send(args.data)
			else xhr.send()
		})
		return args.background === true ? promise0 : finalize(promise0)
	}
	function jsonp(args, extra) {
		var finalize = finalizer()
		args = normalize(args, extra)
		var promise0 = new Promise(function(resolve, reject) {
			var callbackName = args.callbackName || "_mithril_" + Math.round(Math.random() * 1e16) + "_" + callbackCount++
			var script = $window.document.createElement("script")
			$window[callbackName] = function(data) {
				script.parentNode.removeChild(script)
				resolve(cast(args.type, data))
				delete $window[callbackName]
			}
			script.onerror = function() {
				script.parentNode.removeChild(script)
				reject(new Error("JSONP request failed"))
				delete $window[callbackName]
			}
			if (args.data == null) args.data = {}
			args.url = interpolate(args.url, args.data)
			args.data[args.callbackKey || "callback"] = callbackName
			script.src = assemble(args.url, args.data)
			$window.document.documentElement.appendChild(script)
		})
		return args.background === true? promise0 : finalize(promise0)
	}
	function interpolate(url, data) {
		if (data == null) return url
		var tokens = url.match(/:[^\/]+/gi) || []
		for (var i = 0; i < tokens.length; i++) {
			var key = tokens[i].slice(1)
			if (data[key] != null) {
				url = url.replace(tokens[i], data[key])
			}
		}
		return url
	}
	function assemble(url, data) {
		var querystring = buildQueryString(data)
		if (querystring !== "") {
			var prefix = url.indexOf("?") < 0 ? "?" : "&"
			url += prefix + querystring
		}
		return url
	}
	function deserialize(data) {
		try {return data !== "" ? JSON.parse(data) : null}
		catch (e) {throw new Error(data)}
	}
	function extract(xhr) {return xhr.responseText}
	function cast(type0, data) {
		if (typeof type0 === "function") {
			if (Array.isArray(data)) {
				for (var i = 0; i < data.length; i++) {
					data[i] = new type0(data[i])
				}
			}
			else return new type0(data)
		}
		return data
	}
	return {request: request, jsonp: jsonp, setCompletionCallback: setCompletionCallback}
}
var requestService = _8(window, PromisePolyfill)
var coreRenderer = function($window) {
	var $doc = $window.document
	var $emptyFragment = $doc.createDocumentFragment()
	var nameSpace = {
		svg: "http://www.w3.org/2000/svg",
		math: "http://www.w3.org/1998/Math/MathML"
	}
	var onevent
	function setEventCallback(callback) {return onevent = callback}
	function getNameSpace(vnode) {
		return vnode.attrs && vnode.attrs.xmlns || nameSpace[vnode.tag]
	}
	//create
	function createNodes(parent, vnodes, start, end, hooks, nextSibling, ns) {
		for (var i = start; i < end; i++) {
			var vnode = vnodes[i]
			if (vnode != null) {
				createNode(parent, vnode, hooks, ns, nextSibling)
			}
		}
	}
	function createNode(parent, vnode, hooks, ns, nextSibling) {
		var tag = vnode.tag
		if (typeof tag === "string") {
			vnode.state = {}
			if (vnode.attrs != null) initLifecycle(vnode.attrs, vnode, hooks)
			switch (tag) {
				case "#": return createText(parent, vnode, nextSibling)
				case "<": return createHTML(parent, vnode, nextSibling)
				case "[": return createFragment(parent, vnode, hooks, ns, nextSibling)
				default: return createElement(parent, vnode, hooks, ns, nextSibling)
			}
		}
		else return createComponent(parent, vnode, hooks, ns, nextSibling)
	}
	function createText(parent, vnode, nextSibling) {
		vnode.dom = $doc.createTextNode(vnode.children)
		insertNode(parent, vnode.dom, nextSibling)
		return vnode.dom
	}
	function createHTML(parent, vnode, nextSibling) {
		var match1 = vnode.children.match(/^\s*?<(\w+)/im) || []
		var parent1 = {caption: "table", thead: "table", tbody: "table", tfoot: "table", tr: "tbody", th: "tr", td: "tr", colgroup: "table", col: "colgroup"}[match1[1]] || "div"
		var temp = $doc.createElement(parent1)
		temp.innerHTML = vnode.children
		vnode.dom = temp.firstChild
		vnode.domSize = temp.childNodes.length
		var fragment = $doc.createDocumentFragment()
		var child
		while (child = temp.firstChild) {
			fragment.appendChild(child)
		}
		insertNode(parent, fragment, nextSibling)
		return fragment
	}
	function createFragment(parent, vnode, hooks, ns, nextSibling) {
		var fragment = $doc.createDocumentFragment()
		if (vnode.children != null) {
			var children = vnode.children
			createNodes(fragment, children, 0, children.length, hooks, null, ns)
		}
		vnode.dom = fragment.firstChild
		vnode.domSize = fragment.childNodes.length
		insertNode(parent, fragment, nextSibling)
		return fragment
	}
	function createElement(parent, vnode, hooks, ns, nextSibling) {
		var tag = vnode.tag
		var attrs2 = vnode.attrs
		var is = attrs2 && attrs2.is
		ns = getNameSpace(vnode) || ns
		var element = ns ?
			is ? $doc.createElementNS(ns, tag, {is: is}) : $doc.createElementNS(ns, tag) :
			is ? $doc.createElement(tag, {is: is}) : $doc.createElement(tag)
		vnode.dom = element
		if (attrs2 != null) {
			setAttrs(vnode, attrs2, ns)
		}
		insertNode(parent, element, nextSibling)
		if (vnode.attrs != null && vnode.attrs.contenteditable != null) {
			setContentEditable(vnode)
		}
		else {
			if (vnode.text != null) {
				if (vnode.text !== "") element.textContent = vnode.text
				else vnode.children = [Vnode("#", undefined, undefined, vnode.text, undefined, undefined)]
			}
			if (vnode.children != null) {
				var children = vnode.children
				createNodes(element, children, 0, children.length, hooks, null, ns)
				setLateAttrs(vnode)
			}
		}
		return element
	}
	function initComponent(vnode, hooks) {
		var sentinel
		if (typeof vnode.tag.view === "function") {
			vnode.state = Object.create(vnode.tag)
			sentinel = vnode.state.view
			if (sentinel.$$reentrantLock$$ != null) return $emptyFragment
			sentinel.$$reentrantLock$$ = true
		} else {
			vnode.state = void 0
			sentinel = vnode.tag
			if (sentinel.$$reentrantLock$$ != null) return $emptyFragment
			sentinel.$$reentrantLock$$ = true
			vnode.state = (vnode.tag.prototype != null && typeof vnode.tag.prototype.view === "function") ? new vnode.tag(vnode) : vnode.tag(vnode)
		}
		vnode._state = vnode.state
		if (vnode.attrs != null) initLifecycle(vnode.attrs, vnode, hooks)
		initLifecycle(vnode._state, vnode, hooks)
		vnode.instance = Vnode.normalize(vnode._state.view.call(vnode.state, vnode))
		if (vnode.instance === vnode) throw Error("A view cannot return the vnode it received as argument")
		sentinel.$$reentrantLock$$ = null
	}
	function createComponent(parent, vnode, hooks, ns, nextSibling) {
		initComponent(vnode, hooks)
		if (vnode.instance != null) {
			var element = createNode(parent, vnode.instance, hooks, ns, nextSibling)
			vnode.dom = vnode.instance.dom
			vnode.domSize = vnode.dom != null ? vnode.instance.domSize : 0
			insertNode(parent, element, nextSibling)
			return element
		}
		else {
			vnode.domSize = 0
			return $emptyFragment
		}
	}
	//update
	function updateNodes(parent, old, vnodes, recycling, hooks, nextSibling, ns) {
		if (old === vnodes || old == null && vnodes == null) return
		else if (old == null) createNodes(parent, vnodes, 0, vnodes.length, hooks, nextSibling, ns)
		else if (vnodes == null) removeNodes(old, 0, old.length, vnodes)
		else {
			if (old.length === vnodes.length) {
				var isUnkeyed = false
				for (var i = 0; i < vnodes.length; i++) {
					if (vnodes[i] != null && old[i] != null) {
						isUnkeyed = vnodes[i].key == null && old[i].key == null
						break
					}
				}
				if (isUnkeyed) {
					for (var i = 0; i < old.length; i++) {
						if (old[i] === vnodes[i]) continue
						else if (old[i] == null && vnodes[i] != null) createNode(parent, vnodes[i], hooks, ns, getNextSibling(old, i + 1, nextSibling))
						else if (vnodes[i] == null) removeNodes(old, i, i + 1, vnodes)
						else updateNode(parent, old[i], vnodes[i], hooks, getNextSibling(old, i + 1, nextSibling), recycling, ns)
					}
					return
				}
			}
			recycling = recycling || isRecyclable(old, vnodes)
			if (recycling) {
				var pool = old.pool
				old = old.concat(old.pool)
			}
			var oldStart = 0, start = 0, oldEnd = old.length - 1, end = vnodes.length - 1, map
			while (oldEnd >= oldStart && end >= start) {
				var o = old[oldStart], v = vnodes[start]
				if (o === v && !recycling) oldStart++, start++
				else if (o == null) oldStart++
				else if (v == null) start++
				else if (o.key === v.key) {
					var shouldRecycle = (pool != null && oldStart >= old.length - pool.length) || ((pool == null) && recycling)
					oldStart++, start++
					updateNode(parent, o, v, hooks, getNextSibling(old, oldStart, nextSibling), shouldRecycle, ns)
					if (recycling && o.tag === v.tag) insertNode(parent, toFragment(o), nextSibling)
				}
				else {
					var o = old[oldEnd]
					if (o === v && !recycling) oldEnd--, start++
					else if (o == null) oldEnd--
					else if (v == null) start++
					else if (o.key === v.key) {
						var shouldRecycle = (pool != null && oldEnd >= old.length - pool.length) || ((pool == null) && recycling)
						updateNode(parent, o, v, hooks, getNextSibling(old, oldEnd + 1, nextSibling), shouldRecycle, ns)
						if (recycling || start < end) insertNode(parent, toFragment(o), getNextSibling(old, oldStart, nextSibling))
						oldEnd--, start++
					}
					else break
				}
			}
			while (oldEnd >= oldStart && end >= start) {
				var o = old[oldEnd], v = vnodes[end]
				if (o === v && !recycling) oldEnd--, end--
				else if (o == null) oldEnd--
				else if (v == null) end--
				else if (o.key === v.key) {
					var shouldRecycle = (pool != null && oldEnd >= old.length - pool.length) || ((pool == null) && recycling)
					updateNode(parent, o, v, hooks, getNextSibling(old, oldEnd + 1, nextSibling), shouldRecycle, ns)
					if (recycling && o.tag === v.tag) insertNode(parent, toFragment(o), nextSibling)
					if (o.dom != null) nextSibling = o.dom
					oldEnd--, end--
				}
				else {
					if (!map) map = getKeyMap(old, oldEnd)
					if (v != null) {
						var oldIndex = map[v.key]
						if (oldIndex != null) {
							var movable = old[oldIndex]
							var shouldRecycle = (pool != null && oldIndex >= old.length - pool.length) || ((pool == null) && recycling)
							updateNode(parent, movable, v, hooks, getNextSibling(old, oldEnd + 1, nextSibling), recycling, ns)
							insertNode(parent, toFragment(movable), nextSibling)
							old[oldIndex].skip = true
							if (movable.dom != null) nextSibling = movable.dom
						}
						else {
							var dom = createNode(parent, v, hooks, ns, nextSibling)
							nextSibling = dom
						}
					}
					end--
				}
				if (end < start) break
			}
			createNodes(parent, vnodes, start, end + 1, hooks, nextSibling, ns)
			removeNodes(old, oldStart, oldEnd + 1, vnodes)
		}
	}
	function updateNode(parent, old, vnode, hooks, nextSibling, recycling, ns) {
		var oldTag = old.tag, tag = vnode.tag
		if (oldTag === tag) {
			vnode.state = old.state
			vnode._state = old._state
			vnode.events = old.events
			if (!recycling && shouldNotUpdate(vnode, old)) return
			if (typeof oldTag === "string") {
				if (vnode.attrs != null) {
					if (recycling) {
						vnode.state = {}
						initLifecycle(vnode.attrs, vnode, hooks)
					}
					else updateLifecycle(vnode.attrs, vnode, hooks)
				}
				switch (oldTag) {
					case "#": updateText(old, vnode); break
					case "<": updateHTML(parent, old, vnode, nextSibling); break
					case "[": updateFragment(parent, old, vnode, recycling, hooks, nextSibling, ns); break
					default: updateElement(old, vnode, recycling, hooks, ns)
				}
			}
			else updateComponent(parent, old, vnode, hooks, nextSibling, recycling, ns)
		}
		else {
			removeNode(old, null)
			createNode(parent, vnode, hooks, ns, nextSibling)
		}
	}
	function updateText(old, vnode) {
		if (old.children.toString() !== vnode.children.toString()) {
			old.dom.nodeValue = vnode.children
		}
		vnode.dom = old.dom
	}
	function updateHTML(parent, old, vnode, nextSibling) {
		if (old.children !== vnode.children) {
			toFragment(old)
			createHTML(parent, vnode, nextSibling)
		}
		else vnode.dom = old.dom, vnode.domSize = old.domSize
	}
	function updateFragment(parent, old, vnode, recycling, hooks, nextSibling, ns) {
		updateNodes(parent, old.children, vnode.children, recycling, hooks, nextSibling, ns)
		var domSize = 0, children = vnode.children
		vnode.dom = null
		if (children != null) {
			for (var i = 0; i < children.length; i++) {
				var child = children[i]
				if (child != null && child.dom != null) {
					if (vnode.dom == null) vnode.dom = child.dom
					domSize += child.domSize || 1
				}
			}
			if (domSize !== 1) vnode.domSize = domSize
		}
	}
	function updateElement(old, vnode, recycling, hooks, ns) {
		var element = vnode.dom = old.dom
		ns = getNameSpace(vnode) || ns
		if (vnode.tag === "textarea") {
			if (vnode.attrs == null) vnode.attrs = {}
			if (vnode.text != null) {
				vnode.attrs.value = vnode.text //FIXME handle0 multiple children
				vnode.text = undefined
			}
		}
		updateAttrs(vnode, old.attrs, vnode.attrs, ns)
		if (vnode.attrs != null && vnode.attrs.contenteditable != null) {
			setContentEditable(vnode)
		}
		else if (old.text != null && vnode.text != null && vnode.text !== "") {
			if (old.text.toString() !== vnode.text.toString()) old.dom.firstChild.nodeValue = vnode.text
		}
		else {
			if (old.text != null) old.children = [Vnode("#", undefined, undefined, old.text, undefined, old.dom.firstChild)]
			if (vnode.text != null) vnode.children = [Vnode("#", undefined, undefined, vnode.text, undefined, undefined)]
			updateNodes(element, old.children, vnode.children, recycling, hooks, null, ns)
		}
	}
	function updateComponent(parent, old, vnode, hooks, nextSibling, recycling, ns) {
		if (recycling) {
			initComponent(vnode, hooks)
		} else {
			vnode.instance = Vnode.normalize(vnode._state.view.call(vnode.state, vnode))
			if (vnode.instance === vnode) throw Error("A view cannot return the vnode it received as argument")
			if (vnode.attrs != null) updateLifecycle(vnode.attrs, vnode, hooks)
			updateLifecycle(vnode._state, vnode, hooks)
		}
		if (vnode.instance != null) {
			if (old.instance == null) createNode(parent, vnode.instance, hooks, ns, nextSibling)
			else updateNode(parent, old.instance, vnode.instance, hooks, nextSibling, recycling, ns)
			vnode.dom = vnode.instance.dom
			vnode.domSize = vnode.instance.domSize
		}
		else if (old.instance != null) {
			removeNode(old.instance, null)
			vnode.dom = undefined
			vnode.domSize = 0
		}
		else {
			vnode.dom = old.dom
			vnode.domSize = old.domSize
		}
	}
	function isRecyclable(old, vnodes) {
		if (old.pool != null && Math.abs(old.pool.length - vnodes.length) <= Math.abs(old.length - vnodes.length)) {
			var oldChildrenLength = old[0] && old[0].children && old[0].children.length || 0
			var poolChildrenLength = old.pool[0] && old.pool[0].children && old.pool[0].children.length || 0
			var vnodesChildrenLength = vnodes[0] && vnodes[0].children && vnodes[0].children.length || 0
			if (Math.abs(poolChildrenLength - vnodesChildrenLength) <= Math.abs(oldChildrenLength - vnodesChildrenLength)) {
				return true
			}
		}
		return false
	}
	function getKeyMap(vnodes, end) {
		var map = {}, i = 0
		for (var i = 0; i < end; i++) {
			var vnode = vnodes[i]
			if (vnode != null) {
				var key2 = vnode.key
				if (key2 != null) map[key2] = i
			}
		}
		return map
	}
	function toFragment(vnode) {
		var count0 = vnode.domSize
		if (count0 != null || vnode.dom == null) {
			var fragment = $doc.createDocumentFragment()
			if (count0 > 0) {
				var dom = vnode.dom
				while (--count0) fragment.appendChild(dom.nextSibling)
				fragment.insertBefore(dom, fragment.firstChild)
			}
			return fragment
		}
		else return vnode.dom
	}
	function getNextSibling(vnodes, i, nextSibling) {
		for (; i < vnodes.length; i++) {
			if (vnodes[i] != null && vnodes[i].dom != null) return vnodes[i].dom
		}
		return nextSibling
	}
	function insertNode(parent, dom, nextSibling) {
		if (nextSibling && nextSibling.parentNode) parent.insertBefore(dom, nextSibling)
		else parent.appendChild(dom)
	}
	function setContentEditable(vnode) {
		var children = vnode.children
		if (children != null && children.length === 1 && children[0].tag === "<") {
			var content = children[0].children
			if (vnode.dom.innerHTML !== content) vnode.dom.innerHTML = content
		}
		else if (vnode.text != null || children != null && children.length !== 0) throw new Error("Child node of a contenteditable must be trusted")
	}
	//remove
	function removeNodes(vnodes, start, end, context) {
		for (var i = start; i < end; i++) {
			var vnode = vnodes[i]
			if (vnode != null) {
				if (vnode.skip) vnode.skip = false
				else removeNode(vnode, context)
			}
		}
	}
	function removeNode(vnode, context) {
		var expected = 1, called = 0
		if (vnode.attrs && typeof vnode.attrs.onbeforeremove === "function") {
			var result = vnode.attrs.onbeforeremove.call(vnode.state, vnode)
			if (result != null && typeof result.then === "function") {
				expected++
				result.then(continuation, continuation)
			}
		}
		if (typeof vnode.tag !== "string" && typeof vnode._state.onbeforeremove === "function") {
			var result = vnode._state.onbeforeremove.call(vnode.state, vnode)
			if (result != null && typeof result.then === "function") {
				expected++
				result.then(continuation, continuation)
			}
		}
		continuation()
		function continuation() {
			if (++called === expected) {
				onremove(vnode)
				if (vnode.dom) {
					var count0 = vnode.domSize || 1
					if (count0 > 1) {
						var dom = vnode.dom
						while (--count0) {
							removeNodeFromDOM(dom.nextSibling)
						}
					}
					removeNodeFromDOM(vnode.dom)
					if (context != null && vnode.domSize == null && !hasIntegrationMethods(vnode.attrs) && typeof vnode.tag === "string") { //TODO test custom elements
						if (!context.pool) context.pool = [vnode]
						else context.pool.push(vnode)
					}
				}
			}
		}
	}
	function removeNodeFromDOM(node) {
		var parent = node.parentNode
		if (parent != null) parent.removeChild(node)
	}
	function onremove(vnode) {
		if (vnode.attrs && typeof vnode.attrs.onremove === "function") vnode.attrs.onremove.call(vnode.state, vnode)
		if (typeof vnode.tag !== "string") {
			if (typeof vnode._state.onremove === "function") vnode._state.onremove.call(vnode.state, vnode)
			if (vnode.instance != null) onremove(vnode.instance)
		} else {
			var children = vnode.children
			if (Array.isArray(children)) {
				for (var i = 0; i < children.length; i++) {
					var child = children[i]
					if (child != null) onremove(child)
				}
			}
		}
	}
	//attrs2
	function setAttrs(vnode, attrs2, ns) {
		for (var key2 in attrs2) {
			setAttr(vnode, key2, null, attrs2[key2], ns)
		}
	}
	function setAttr(vnode, key2, old, value, ns) {
		var element = vnode.dom
		if (key2 === "key" || key2 === "is" || (old === value && !isFormAttribute(vnode, key2)) && typeof value !== "object" || typeof value === "undefined" || isLifecycleMethod(key2)) return
		var nsLastIndex = key2.indexOf(":")
		if (nsLastIndex > -1 && key2.substr(0, nsLastIndex) === "xlink") {
			element.setAttributeNS("http://www.w3.org/1999/xlink", key2.slice(nsLastIndex + 1), value)
		}
		else if (key2[0] === "o" && key2[1] === "n" && typeof value === "function") updateEvent(vnode, key2, value)
		else if (key2 === "style") updateStyle(element, old, value)
		else if (key2 in element && !isAttribute(key2) && ns === undefined && !isCustomElement(vnode)) {
			if (key2 === "value") {
				var normalized0 = "" + value // eslint-disable-line no-implicit-coercion
				//setting input[value] to same value by typing on focused element moves cursor to end in Chrome
				if ((vnode.tag === "input" || vnode.tag === "textarea") && vnode.dom.value === normalized0 && vnode.dom === $doc.activeElement) return
				//setting select[value] to same value while having select open blinks select dropdown in Chrome
				if (vnode.tag === "select") {
					if (value === null) {
						if (vnode.dom.selectedIndex === -1 && vnode.dom === $doc.activeElement) return
					} else {
						if (old !== null && vnode.dom.value === normalized0 && vnode.dom === $doc.activeElement) return
					}
				}
				//setting option[value] to same value while having select open blinks select dropdown in Chrome
				if (vnode.tag === "option" && old != null && vnode.dom.value === normalized0) return
			}
			// If you assign an input type1 that is not supported by IE 11 with an assignment expression, an error0 will occur.
			if (vnode.tag === "input" && key2 === "type") {
				element.setAttribute(key2, value)
				return
			}
			element[key2] = value
		}
		else {
			if (typeof value === "boolean") {
				if (value) element.setAttribute(key2, "")
				else element.removeAttribute(key2)
			}
			else element.setAttribute(key2 === "className" ? "class" : key2, value)
		}
	}
	function setLateAttrs(vnode) {
		var attrs2 = vnode.attrs
		if (vnode.tag === "select" && attrs2 != null) {
			if ("value" in attrs2) setAttr(vnode, "value", null, attrs2.value, undefined)
			if ("selectedIndex" in attrs2) setAttr(vnode, "selectedIndex", null, attrs2.selectedIndex, undefined)
		}
	}
	function updateAttrs(vnode, old, attrs2, ns) {
		if (attrs2 != null) {
			for (var key2 in attrs2) {
				setAttr(vnode, key2, old && old[key2], attrs2[key2], ns)
			}
		}
		if (old != null) {
			for (var key2 in old) {
				if (attrs2 == null || !(key2 in attrs2)) {
					if (key2 === "className") key2 = "class"
					if (key2[0] === "o" && key2[1] === "n" && !isLifecycleMethod(key2)) updateEvent(vnode, key2, undefined)
					else if (key2 !== "key") vnode.dom.removeAttribute(key2)
				}
			}
		}
	}
	function isFormAttribute(vnode, attr) {
		return attr === "value" || attr === "checked" || attr === "selectedIndex" || attr === "selected" && vnode.dom === $doc.activeElement
	}
	function isLifecycleMethod(attr) {
		return attr === "oninit" || attr === "oncreate" || attr === "onupdate" || attr === "onremove" || attr === "onbeforeremove" || attr === "onbeforeupdate"
	}
	function isAttribute(attr) {
		return attr === "href" || attr === "list" || attr === "form" || attr === "width" || attr === "height"// || attr === "type"
	}
	function isCustomElement(vnode){
		return vnode.attrs.is || vnode.tag.indexOf("-") > -1
	}
	function hasIntegrationMethods(source) {
		return source != null && (source.oncreate || source.onupdate || source.onbeforeremove || source.onremove)
	}
	//style
	function updateStyle(element, old, style) {
		if (old === style) element.style.cssText = "", old = null
		if (style == null) element.style.cssText = ""
		else if (typeof style === "string") element.style.cssText = style
		else {
			if (typeof old === "string") element.style.cssText = ""
			for (var key2 in style) {
				element.style[key2] = style[key2]
			}
			if (old != null && typeof old !== "string") {
				for (var key2 in old) {
					if (!(key2 in style)) element.style[key2] = ""
				}
			}
		}
	}
	//event
	function updateEvent(vnode, key2, value) {
		var element = vnode.dom
		var callback = typeof onevent !== "function" ? value : function(e) {
			var result = value.call(element, e)
			onevent.call(element, e)
			return result
		}
		if (key2 in element) element[key2] = typeof value === "function" ? callback : null
		else {
			var eventName = key2.slice(2)
			if (vnode.events === undefined) vnode.events = {}
			if (vnode.events[key2] === callback) return
			if (vnode.events[key2] != null) element.removeEventListener(eventName, vnode.events[key2], false)
			if (typeof value === "function") {
				vnode.events[key2] = callback
				element.addEventListener(eventName, vnode.events[key2], false)
			}
		}
	}
	//lifecycle
	function initLifecycle(source, vnode, hooks) {
		if (typeof source.oninit === "function") source.oninit.call(vnode.state, vnode)
		if (typeof source.oncreate === "function") hooks.push(source.oncreate.bind(vnode.state, vnode))
	}
	function updateLifecycle(source, vnode, hooks) {
		if (typeof source.onupdate === "function") hooks.push(source.onupdate.bind(vnode.state, vnode))
	}
	function shouldNotUpdate(vnode, old) {
		var forceVnodeUpdate, forceComponentUpdate
		if (vnode.attrs != null && typeof vnode.attrs.onbeforeupdate === "function") forceVnodeUpdate = vnode.attrs.onbeforeupdate.call(vnode.state, vnode, old)
		if (typeof vnode.tag !== "string" && typeof vnode._state.onbeforeupdate === "function") forceComponentUpdate = vnode._state.onbeforeupdate.call(vnode.state, vnode, old)
		if (!(forceVnodeUpdate === undefined && forceComponentUpdate === undefined) && !forceVnodeUpdate && !forceComponentUpdate) {
			vnode.dom = old.dom
			vnode.domSize = old.domSize
			vnode.instance = old.instance
			return true
		}
		return false
	}
	function render(dom, vnodes) {
		if (!dom) throw new Error("Ensure the DOM element being passed to m.route/m.mount/m.render is not undefined.")
		var hooks = []
		var active = $doc.activeElement
		var namespace = dom.namespaceURI
		// First time0 rendering into a node clears it out
		if (dom.vnodes == null) dom.textContent = ""
		if (!Array.isArray(vnodes)) vnodes = [vnodes]
		updateNodes(dom, dom.vnodes, Vnode.normalizeChildren(vnodes), false, hooks, null, namespace === "http://www.w3.org/1999/xhtml" ? undefined : namespace)
		dom.vnodes = vnodes
		// document.activeElement can return null in IE https://developer.mozilla.org/en-US/docs/Web/API/Document/activeElement
		if (active != null && $doc.activeElement !== active) active.focus()
		for (var i = 0; i < hooks.length; i++) hooks[i]()
	}
	return {render: render, setEventCallback: setEventCallback}
}
function throttle(callback) {
	//60fps translates to 16.6ms, round it down since setTimeout requires int
	var time = 16
	var last = 0, pending = null
	var timeout = typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout
	return function() {
		var now = Date.now()
		if (last === 0 || now - last >= time) {
			last = now
			callback()
		}
		else if (pending === null) {
			pending = timeout(function() {
				pending = null
				callback()
				last = Date.now()
			}, time - (now - last))
		}
	}
}
var _11 = function($window) {
	var renderService = coreRenderer($window)
	renderService.setEventCallback(function(e) {
		if (e.redraw === false) e.redraw = undefined
		else redraw()
	})
	var callbacks = []
	function subscribe(key1, callback) {
		unsubscribe(key1)
		callbacks.push(key1, throttle(callback))
	}
	function unsubscribe(key1) {
		var index = callbacks.indexOf(key1)
		if (index > -1) callbacks.splice(index, 2)
	}
	function redraw() {
		for (var i = 1; i < callbacks.length; i += 2) {
			callbacks[i]()
		}
	}
	return {subscribe: subscribe, unsubscribe: unsubscribe, redraw: redraw, render: renderService.render}
}
var redrawService = _11(window)
requestService.setCompletionCallback(redrawService.redraw)
var _16 = function(redrawService0) {
	return function(root, component) {
		if (component === null) {
			redrawService0.render(root, [])
			redrawService0.unsubscribe(root)
			return
		}
		
		if (component.view == null && typeof component !== "function") throw new Error("m.mount(element, component) expects a component, not a vnode")
		
		var run0 = function() {
			redrawService0.render(root, Vnode(component))
		}
		redrawService0.subscribe(root, run0)
		redrawService0.redraw()
	}
}
m.mount = _16(redrawService)
var Promise = PromisePolyfill
var parseQueryString = function(string) {
	if (string === "" || string == null) return {}
	if (string.charAt(0) === "?") string = string.slice(1)
	var entries = string.split("&"), data0 = {}, counters = {}
	for (var i = 0; i < entries.length; i++) {
		var entry = entries[i].split("=")
		var key5 = decodeURIComponent(entry[0])
		var value = entry.length === 2 ? decodeURIComponent(entry[1]) : ""
		if (value === "true") value = true
		else if (value === "false") value = false
		var levels = key5.split(/\]\[?|\[/)
		var cursor = data0
		if (key5.indexOf("[") > -1) levels.pop()
		for (var j = 0; j < levels.length; j++) {
			var level = levels[j], nextLevel = levels[j + 1]
			var isNumber = nextLevel == "" || !isNaN(parseInt(nextLevel, 10))
			var isValue = j === levels.length - 1
			if (level === "") {
				var key5 = levels.slice(0, j).join()
				if (counters[key5] == null) counters[key5] = 0
				level = counters[key5]++
			}
			if (cursor[level] == null) {
				cursor[level] = isValue ? value : isNumber ? [] : {}
			}
			cursor = cursor[level]
		}
	}
	return data0
}
var coreRouter = function($window) {
	var supportsPushState = typeof $window.history.pushState === "function"
	var callAsync0 = typeof setImmediate === "function" ? setImmediate : setTimeout
	function normalize1(fragment0) {
		var data = $window.location[fragment0].replace(/(?:%[a-f89][a-f0-9])+/gim, decodeURIComponent)
		if (fragment0 === "pathname" && data[0] !== "/") data = "/" + data
		return data
	}
	var asyncId
	function debounceAsync(callback0) {
		return function() {
			if (asyncId != null) return
			asyncId = callAsync0(function() {
				asyncId = null
				callback0()
			})
		}
	}
	function parsePath(path, queryData, hashData) {
		var queryIndex = path.indexOf("?")
		var hashIndex = path.indexOf("#")
		var pathEnd = queryIndex > -1 ? queryIndex : hashIndex > -1 ? hashIndex : path.length
		if (queryIndex > -1) {
			var queryEnd = hashIndex > -1 ? hashIndex : path.length
			var queryParams = parseQueryString(path.slice(queryIndex + 1, queryEnd))
			for (var key4 in queryParams) queryData[key4] = queryParams[key4]
		}
		if (hashIndex > -1) {
			var hashParams = parseQueryString(path.slice(hashIndex + 1))
			for (var key4 in hashParams) hashData[key4] = hashParams[key4]
		}
		return path.slice(0, pathEnd)
	}
	var router = {prefix: "#!"}
	router.getPath = function() {
		var type2 = router.prefix.charAt(0)
		switch (type2) {
			case "#": return normalize1("hash").slice(router.prefix.length)
			case "?": return normalize1("search").slice(router.prefix.length) + normalize1("hash")
			default: return normalize1("pathname").slice(router.prefix.length) + normalize1("search") + normalize1("hash")
		}
	}
	router.setPath = function(path, data, options) {
		var queryData = {}, hashData = {}
		path = parsePath(path, queryData, hashData)
		if (data != null) {
			for (var key4 in data) queryData[key4] = data[key4]
			path = path.replace(/:([^\/]+)/g, function(match2, token) {
				delete queryData[token]
				return data[token]
			})
		}
		var query = buildQueryString(queryData)
		if (query) path += "?" + query
		var hash = buildQueryString(hashData)
		if (hash) path += "#" + hash
		if (supportsPushState) {
			var state = options ? options.state : null
			var title = options ? options.title : null
			$window.onpopstate()
			if (options && options.replace) $window.history.replaceState(state, title, router.prefix + path)
			else $window.history.pushState(state, title, router.prefix + path)
		}
		else $window.location.href = router.prefix + path
	}
	router.defineRoutes = function(routes, resolve, reject) {
		function resolveRoute() {
			var path = router.getPath()
			var params = {}
			var pathname = parsePath(path, params, params)
			var state = $window.history.state
			if (state != null) {
				for (var k in state) params[k] = state[k]
			}
			for (var route0 in routes) {
				var matcher = new RegExp("^" + route0.replace(/:[^\/]+?\.{3}/g, "(.*?)").replace(/:[^\/]+/g, "([^\\/]+)") + "\/?$")
				if (matcher.test(pathname)) {
					pathname.replace(matcher, function() {
						var keys = route0.match(/:[^\/]+/g) || []
						var values = [].slice.call(arguments, 1, -2)
						for (var i = 0; i < keys.length; i++) {
							params[keys[i].replace(/:|\./g, "")] = decodeURIComponent(values[i])
						}
						resolve(routes[route0], params, path, route0)
					})
					return
				}
			}
			reject(path, params)
		}
		if (supportsPushState) $window.onpopstate = debounceAsync(resolveRoute)
		else if (router.prefix.charAt(0) === "#") $window.onhashchange = resolveRoute
		resolveRoute()
	}
	return router
}
var _20 = function($window, redrawService0) {
	var routeService = coreRouter($window)
	var identity = function(v) {return v}
	var render1, component, attrs3, currentPath, lastUpdate
	var route = function(root, defaultRoute, routes) {
		if (root == null) throw new Error("Ensure the DOM element that was passed to `m.route` is not undefined")
		var run1 = function() {
			if (render1 != null) redrawService0.render(root, render1(Vnode(component, attrs3.key, attrs3)))
		}
		var bail = function(path) {
			if (path !== defaultRoute) routeService.setPath(defaultRoute, null, {replace: true})
			else throw new Error("Could not resolve default route " + defaultRoute)
		}
		routeService.defineRoutes(routes, function(payload, params, path) {
			var update = lastUpdate = function(routeResolver, comp) {
				if (update !== lastUpdate) return
				component = comp != null && (typeof comp.view === "function" || typeof comp === "function")? comp : "div"
				attrs3 = params, currentPath = path, lastUpdate = null
				render1 = (routeResolver.render || identity).bind(routeResolver)
				run1()
			}
			if (payload.view || typeof payload === "function") update({}, payload)
			else {
				if (payload.onmatch) {
					Promise.resolve(payload.onmatch(params, path)).then(function(resolved) {
						update(payload, resolved)
					}, bail)
				}
				else update(payload, "div")
			}
		}, bail)
		redrawService0.subscribe(root, run1)
	}
	route.set = function(path, data, options) {
		if (lastUpdate != null) {
			options = options || {}
			options.replace = true
		}
		lastUpdate = null
		routeService.setPath(path, data, options)
	}
	route.get = function() {return currentPath}
	route.prefix = function(prefix0) {routeService.prefix = prefix0}
	route.link = function(vnode1) {
		vnode1.dom.setAttribute("href", routeService.prefix + vnode1.attrs.href)
		vnode1.dom.onclick = function(e) {
			if (e.ctrlKey || e.metaKey || e.shiftKey || e.which === 2) return
			e.preventDefault()
			e.redraw = false
			var href = this.getAttribute("href")
			if (href.indexOf(routeService.prefix) === 0) href = href.slice(routeService.prefix.length)
			route.set(href, undefined, undefined)
		}
	}
	route.param = function(key3) {
		if(typeof attrs3 !== "undefined" && typeof key3 !== "undefined") return attrs3[key3]
		return attrs3
	}
	return route
}
m.route = _20(window, redrawService)
m.withAttr = function(attrName, callback1, context) {
	return function(e) {
		callback1.call(context || this, attrName in e.currentTarget ? e.currentTarget[attrName] : e.currentTarget.getAttribute(attrName))
	}
}
var _28 = coreRenderer(window)
m.render = _28.render
m.redraw = redrawService.redraw
m.request = requestService.request
m.jsonp = requestService.jsonp
m.parseQueryString = parseQueryString
m.buildQueryString = buildQueryString
m.version = "1.1.6"
m.vnode = Vnode
if (typeof module !== "undefined") module["exports"] = m
else window.m = m
}());
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("timers").setImmediate)
},{"timers":12}],9:[function(require,module,exports){
"use strict"

module.exports = require("./stream/stream")

},{"./stream/stream":10}],10:[function(require,module,exports){
/* eslint-disable */
;(function() {
"use strict"
/* eslint-enable */

var guid = 0, HALT = {}
function createStream() {
	function stream() {
		if (arguments.length > 0 && arguments[0] !== HALT) updateStream(stream, arguments[0])
		return stream._state.value
	}
	initStream(stream)

	if (arguments.length > 0 && arguments[0] !== HALT) updateStream(stream, arguments[0])

	return stream
}
function initStream(stream) {
	stream.constructor = createStream
	stream._state = {id: guid++, value: undefined, state: 0, derive: undefined, recover: undefined, deps: {}, parents: [], endStream: undefined, unregister: undefined}
	stream.map = stream["fantasy-land/map"] = map, stream["fantasy-land/ap"] = ap, stream["fantasy-land/of"] = createStream
	stream.valueOf = valueOf, stream.toJSON = toJSON, stream.toString = valueOf

	Object.defineProperties(stream, {
		end: {get: function() {
			if (!stream._state.endStream) {
				var endStream = createStream()
				endStream.map(function(value) {
					if (value === true) {
						unregisterStream(stream)
						endStream._state.unregister = function(){unregisterStream(endStream)}
					}
					return value
				})
				stream._state.endStream = endStream
			}
			return stream._state.endStream
		}}
	})
}
function updateStream(stream, value) {
	updateState(stream, value)
	for (var id in stream._state.deps) updateDependency(stream._state.deps[id], false)
	if (stream._state.unregister != null) stream._state.unregister()
	finalize(stream)
}
function updateState(stream, value) {
	stream._state.value = value
	stream._state.changed = true
	if (stream._state.state !== 2) stream._state.state = 1
}
function updateDependency(stream, mustSync) {
	var state = stream._state, parents = state.parents
	if (parents.length > 0 && parents.every(active) && (mustSync || parents.some(changed))) {
		var value = stream._state.derive()
		if (value === HALT) return false
		updateState(stream, value)
	}
}
function finalize(stream) {
	stream._state.changed = false
	for (var id in stream._state.deps) stream._state.deps[id]._state.changed = false
}

function combine(fn, streams) {
	if (!streams.every(valid)) throw new Error("Ensure that each item passed to stream.combine/stream.merge is a stream")
	return initDependency(createStream(), streams, function() {
		return fn.apply(this, streams.concat([streams.filter(changed)]))
	})
}

function initDependency(dep, streams, derive) {
	var state = dep._state
	state.derive = derive
	state.parents = streams.filter(notEnded)

	registerDependency(dep, state.parents)
	updateDependency(dep, true)

	return dep
}
function registerDependency(stream, parents) {
	for (var i = 0; i < parents.length; i++) {
		parents[i]._state.deps[stream._state.id] = stream
		registerDependency(stream, parents[i]._state.parents)
	}
}
function unregisterStream(stream) {
	for (var i = 0; i < stream._state.parents.length; i++) {
		var parent = stream._state.parents[i]
		delete parent._state.deps[stream._state.id]
	}
	for (var id in stream._state.deps) {
		var dependent = stream._state.deps[id]
		var index = dependent._state.parents.indexOf(stream)
		if (index > -1) dependent._state.parents.splice(index, 1)
	}
	stream._state.state = 2 //ended
	stream._state.deps = {}
}

function map(fn) {return combine(function(stream) {return fn(stream())}, [this])}
function ap(stream) {return combine(function(s1, s2) {return s1()(s2())}, [stream, this])}
function valueOf() {return this._state.value}
function toJSON() {return this._state.value != null && typeof this._state.value.toJSON === "function" ? this._state.value.toJSON() : this._state.value}

function valid(stream) {return stream._state }
function active(stream) {return stream._state.state === 1}
function changed(stream) {return stream._state.changed}
function notEnded(stream) {return stream._state.state !== 2}

function merge(streams) {
	return combine(function() {
		return streams.map(function(s) {return s()})
	}, streams)
}

function scan(reducer, seed, stream) {
	var newStream = combine(function (s) {
		return seed = reducer(seed, s._state.value)
	}, [stream])

	if (newStream._state.state === 0) newStream(seed)

	return newStream
}

function scanMerge(tuples, seed) {
	var streams = tuples.map(function(tuple) {
		var stream = tuple[0]
		if (stream._state.state === 0) stream(undefined)
		return stream
	})

	var newStream = combine(function() {
		var changed = arguments[arguments.length - 1]

		streams.forEach(function(stream, idx) {
			if (changed.indexOf(stream) > -1) {
				seed = tuples[idx][1](seed, stream._state.value)
			}
		})

		return seed
	}, streams)

	return newStream
}

createStream["fantasy-land/of"] = createStream
createStream.merge = merge
createStream.combine = combine
createStream.scan = scan
createStream.scanMerge = scanMerge
createStream.HALT = HALT

if (typeof module !== "undefined") module["exports"] = createStream
else if (typeof window.m === "function" && !("stream" in window.m)) window.m.stream = createStream
else window.m = {stream : createStream}

}());

},{}],11:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],12:[function(require,module,exports){
(function (setImmediate,clearImmediate){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":11,"timers":12}],13:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Speedo_1 = __importDefault(require("./Speedo"));
const NONE = 0;
const MOUSE = 1;
const TOUCH = 2;
const DEVICE_DELAY = 300;
const DEFAULT_DRAG_THRESHOLD = 12;
const DEFAULT_DRAG_RATIO = 1.5;
class DraggerEvent {
    constructor(type) {
        this.type = type;
    }
}
exports.DraggerEvent = DraggerEvent;
class DraggerDragEvent extends DraggerEvent {
    constructor(type, x, xv) {
        super(type);
        this.x = x;
        this.xv = xv;
    }
}
exports.DraggerDragEvent = DraggerDragEvent;
/**
 * Given a dom element, emit 'drag' events that occur along the horizontal axis
 */
function Dragger(el, { on = {}, dragThreshold = DEFAULT_DRAG_THRESHOLD, dragRatio = DEFAULT_DRAG_RATIO, devices, maxLeft, maxRight } = {}) {
    applyIOSHack();
    const speedo = Speedo_1.default();
    let device = NONE;
    /** Flag to prevent dragging while some child element is scrolling */
    let isScrolling = false;
    /** Touch/Mouse is down */
    let pressed = false;
    /** Indicates drag threshold crossed and we're in "dragging" mode */
    let isDragging = false;
    const dragStart = { x: 0, y: 0 };
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
        const t = e.changedTouches[0];
        onPress(t.clientX, t.clientY, e);
    }
    function onTouchMove(e) {
        const t = e.changedTouches[0];
        onMove(t.clientX, t.clientY, e);
    }
    function onTouchEnd(e) {
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
        const t = e.changedTouches[0];
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
        let dx = x - dragStart.x;
        if (maxLeft != null) {
            dx = Math.max(dx, maxLeft());
        }
        if (maxRight != null) {
            dx = Math.min(dx, maxRight());
        }
        const dy = y - dragStart.y;
        speedo.addSample(dx, Date.now() / 1000);
        if (!isDragging) {
            const ratio = dy !== 0 ? Math.abs(dx / dy) : 1000000000.0;
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
        const dx = x - dragStart.x;
        speedo.addSample(dx, Date.now() / 1000);
        setTimeout(() => {
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
        isDragging: () => isDragging,
        destroy
    };
}
exports.default = Dragger;
// Workaround for webkit bug where event.preventDefault
// within touchmove handler fails to prevent scrolling.
const isIOS = !!navigator.userAgent.match(/iPhone|iPad|iPod/i);
let iOSHackApplied = false;
function applyIOSHack() {
    // Only apply this hack if iOS, haven't yet applied it,
    // and only if a component is actually created
    if (!isIOS || iOSHackApplied)
        return;
    window.addEventListener('touchmove', function () { });
    iOSHackApplied = true;
}

},{"./Speedo":15}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Creates a Panel instance */
function Panel(index, widthPct, state = Panel.EMPTY, className = '') {
    const xpct = index * widthPct;
    return {
        dom: Panel.createElement(className, {
            width: `${widthPct}%`,
            transform: `translate3d(${xpct}%,0,0)`
        }),
        index,
        state
    };
}
/** Additional Panel statics */
(function (Panel) {
    Panel.EMPTY = 0;
    Panel.PRERENDERED = 1;
    Panel.FETCHING = 2;
    Panel.RENDERED = 3;
    Panel.DIRTY = -1;
    /** Creates a Panel DOM node */
    function createElement(className = '', style = {}) {
        const el = document.createElement('div');
        if (className) {
            el.className = className;
        }
        Object.assign(el.style, {
            position: 'absolute',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
            transform: 'translate3d(0,0,0)'
        }, style);
        return el;
    }
    Panel.createElement = createElement;
})(Panel || (Panel = {}));
exports.default = Panel;

},{}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const math_1 = require("./math");
const DEFAULT_SAMPLES = 4;
/**
 * Computes speed (delta x over time)
 */
function Speedo(numSamples = DEFAULT_SAMPLES) {
    const samples = [];
    let index = 0;
    let count = 0;
    for (let index = 0; index < numSamples; ++index) {
        samples.push({ x: 0, t: 0 });
    }
    index = 0;
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
        if (count < 1) {
            return 0;
        }
        const n = count > numSamples ? numSamples : count;
        const iLast = math_1.pmod(index - 1, numSamples);
        const iFirst = math_1.pmod(index - n, numSamples);
        const deltaT = samples[iLast].t - samples[iFirst].t;
        const dx = samples[iLast].x - samples[iFirst].x;
        return dx / deltaT;
    }
    return {
        start,
        addSample,
        getVel
    };
}
exports.default = Speedo;

},{"./math":19}],16:[function(require,module,exports){
"use strict";
// tslint:disable unified-signatures
Object.defineProperty(exports, "__esModule", { value: true });
function range(start, end, step) {
    step = step || 1;
    if (end == null) {
        end = start;
        start = 0;
    }
    const size = Math.ceil((end - start) / step);
    const a = [];
    for (let i = 0; i < size; ++i) {
        a.push(start + step * i);
    }
    return a;
}
exports.range = range;

},{}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const math_1 = require("./math");
/** Minimum duration of animation */
const MIN_DUR_MS = 17;
/** Max throw velocity */
const MAX_VEL = 25000;
/* max distance we can travel */
//const MAX_DIST = maxSwipePanels
/**
 * Compute "throw" from swipe
 */
function swipe({ panelId, x, xv, panelWidth, maxSwipePanels, totalPanels, unitDuration }) {
    /** swipe velocity in px/s clamped to sane range */
    const xvel = math_1.clamp(xv, -MAX_VEL, MAX_VEL);
    /** Destination position */
    const destX = x + xvel;
    /** Current index panel (where it is currently dragged to, not its resting position) */
    const p0 = Math.floor(-x / panelWidth);
    /** Destination panel index */
    let destPanel = Math.round(-destX / panelWidth);
    if (destPanel - p0 > maxSwipePanels) {
        destPanel = p0 + maxSwipePanels;
    }
    else if (p0 - destPanel > maxSwipePanels) {
        destPanel = p0 - maxSwipePanels;
    }
    destPanel = math_1.clamp(destPanel, Math.max(0, panelId - maxSwipePanels), Math.min(totalPanels - 1, panelId + maxSwipePanels));
    /** How many panels (incl. fractions) are we travelling across */
    const unitDist = (destPanel * panelWidth - (-x)) / panelWidth;
    const absUnitDist = Math.abs(unitDist);
    /** Duration of the animation */
    let dur = 0;
    if (absUnitDist > 1) {
        // Compute a duration suitable for travelling multiple panels
        dur = Math.max(MIN_DUR_MS, unitDuration * Math.pow(absUnitDist, 0.25) * 1.0);
    }
    else {
        // Compute a duration suitable for 1 or less panel travel
        dur = Math.max(MIN_DUR_MS, unitDuration * absUnitDist); //(absUnitDist * cfg.visiblePanels))
        if (Math.sign(unitDist) === -Math.sign(xvel)) {
            // Swipe in same direction of travel - speed up animation relative to swipe speed
            const timeScale = Math.max(Math.abs(xvel / 1000), 1);
            dur = Math.max(MIN_DUR_MS, dur / timeScale);
        }
        else {
            // Swipe in opposite direction -- TODO: anything?
        }
    }
    return { panelId: destPanel, duration: dur };
}
exports.swipe = swipe;

},{"./math":19}],18:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const array_1 = require("./array");
const transform_1 = require("./transform");
const Dragger_1 = __importDefault(require("./Dragger"));
const Panel_1 = __importDefault(require("./Panel"));
const gesture = __importStar(require("./gesture"));
/**
 * Creates a PanelSlider instance.
 */
function PanelSlider(cfg) {
    cfg = Object.assign({}, cfg);
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
    const emitters = {
        dragstart: [],
        drag: [],
        dragend: [],
        dragcancel: [],
        animate: [],
        animationstatechange: [],
        panelchange: [],
        panelswipe: []
    };
    for (const key of Object.keys(cfg.on)) {
        if (cfg.on[key] != null) {
            addListener(key, cfg.on[key]);
        }
    }
    const panels = array_1.range(cfg.initialPanel, cfg.initialPanel + cfg.visiblePanels * 3).map(pid => Panel_1.default(pid, 100 / cfg.visiblePanels, Panel_1.default.EMPTY, cfg.panelClassName));
    cfg.dom.innerHTML = '';
    for (const p of panels) {
        p.state = cfg.renderContent(new PanelSlider.RenderEvent('render', p.dom, p.index));
        cfg.dom.appendChild(p.dom);
    }
    // Will be computed on resize
    let fullWidth = panels.length;
    let visibleWidth = cfg.visiblePanels;
    /** Width of a panel in pixels */
    let panelWidth = 1;
    /** Current Panel index */
    let curPanel = cfg.initialPanel;
    /** Current viewport position in pixels (left edge) */
    let curPosX = 0;
    /** Indicates panel animation loop is running */
    let isAnimating = false;
    /** Overscroll */
    const overscroll = 1;
    /** Update our full width and panel width on resize */
    function resize() {
        const rc = cfg.dom.getBoundingClientRect();
        panelWidth = rc.width / cfg.visiblePanels;
        visibleWidth = panelWidth * cfg.visiblePanels;
        fullWidth = panelWidth * cfg.totalPanels;
        curPosX = -curPanel * panelWidth;
        render();
    }
    /** Applies averscroll dampening if dragged past edges */
    function applyOverscroll(x) {
        if (x > 0) {
            const xp = Math.min(1, x / (overscroll * panelWidth));
            return xp * (1 - Math.sqrt(xp / 2)) * overscroll * panelWidth;
        }
        const xMax = fullWidth - panelWidth * cfg.visiblePanels;
        if (x < -xMax) {
            const dx = Math.abs(x - (-xMax));
            const xp = Math.min(1, dx / (overscroll * panelWidth));
            return -xMax - xp * (1 - Math.sqrt(xp / 2)) * overscroll * panelWidth;
        }
        return x;
    }
    function render(fast) {
        // note that: curPosX = -curPanel * panelWidth
        const x = Math.abs(curPosX);
        /** Inclusive start/end panel indexes */
        let iStart = Math.floor(cfg.totalPanels * x / fullWidth);
        let iEnd = Math.min(Math.ceil(cfg.totalPanels * (x + panelWidth * cfg.visiblePanels) / fullWidth), cfg.totalPanels - 1);
        // Render extra panels outward from viewport edges.
        // Start on the left side then alternate.
        for (let i = 0, n = panels.length - (iEnd - iStart + 1); n > 0; ++i) {
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
        const keepPanels = Object.create(null);
        /** ids of panels that were not cached */
        const ids = [];
        // Render panels that are cached
        for (let i = iStart; i <= iEnd; ++i) {
            // Find a bound panel
            const panel = panels.find(p => p.index === i);
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
        }
        // Render panels that weren't cached
        for (const i of ids) {
            const panel = panels.find(p => !keepPanels[p.index]);
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
            const panel = panels.find(p => p.index === pid);
            if (!panel)
                return false;
            panel.state = cfg.renderContent(new PanelSlider.RenderEvent('render', panel.dom, panel.index));
            return true;
        }
        for (const panel of panels) {
            panel.state = cfg.renderContent(new PanelSlider.RenderEvent('render', panel.dom, panel.index));
        }
        return true;
    }
    function emit(e) {
        for (const cb of emitters[e.type]) {
            cb(e);
        }
    }
    resize();
    const dragger = Dragger_1.default(cfg.dom, {
        dragThreshold: cfg.dragThreshold, dragRatio: cfg.dragRatio,
        devices: cfg.devices,
        on: {
            dragstart(e) {
                emit(new PanelSlider.DragEvent('drag', e.x, 0));
            },
            dragmove(e) {
                const ox = -curPanel * panelWidth;
                //curPosX = Math.round(clamp(ox + e.x, -(fullWidth - panelWidth), 0))
                curPosX = applyOverscroll(ox + e.x);
                render();
                emit(new PanelSlider.AnimateEvent('animate', -curPosX / panelWidth));
                emit(new PanelSlider.DragEvent('drag', e.x, e.xv));
            },
            dragcancel() {
                emit(new PanelSlider.DragEvent('dragcancel', curPosX, 0));
                swipeAnim(0).then(pid => {
                    emit(new PanelSlider.ChangeEvent('panelchange', pid));
                });
            },
            dragend(e) {
                const ox = -curPanel * panelWidth;
                //curPosX = Math.round(clamp(ox + e.x, -(fullWidth - panelWidth), 0))
                curPosX = applyOverscroll(Math.round(ox + e.x));
                render();
                swipeAnim(e.xv).then(pid => {
                    emit(new PanelSlider.ChangeEvent('panelchange', pid));
                });
                emit(new PanelSlider.AnimateEvent('animate', -curPosX / panelWidth));
                emit(new PanelSlider.DragEvent('dragend', e.x, e.xv));
            },
            devicepress() {
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
        const result = gesture.swipe({
            panelId: curPanel,
            x: curPosX, xv: xVelocity * cfg.swipeForce,
            maxSwipePanels: cfg.maxSwipePanels,
            panelWidth,
            unitDuration: cfg.slideDuration,
            totalPanels: cfg.totalPanels - (cfg.visiblePanels - 1)
        });
        return animateTo(result.panelId, result.duration);
    }
    /** Animate panels to the specified panelId */
    function animateTo(destPanel, dur = cfg.slideDuration) {
        if (isAnimating) {
            // TODO: Allow redirect
            console.warn("Cannot animateTo - already animating");
            return Promise.resolve(curPanel);
        }
        if (dragger.isDragging()) {
            console.warn("Cannot animateTo - currently dragging");
            return Promise.resolve(curPanel);
        }
        return new Promise(resolve => {
            isAnimating = true;
            const startX = curPosX;
            const destX = -destPanel * panelWidth;
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
                const t = Date.now();
                const destX = -destPanel * panelWidth;
                const totalT = t - startT;
                const animT = Math.min(totalT, dur);
                curPosX = cfg.terp(startX, destX, animT / dur);
                // Use a 'fast' render unless this is the last frame of the animation
                const isLastFrame = totalT >= dur;
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
            const startT = Date.now();
            requestAnimationFrame(loop);
            emit(new PanelSlider.AnimateEvent('animate', -curPosX / panelWidth));
        });
    }
    ///////////////////////////////////////////////////////
    // Public
    /** Add an event listener */
    function addListener(n, fn) {
        const arr = emitters[n];
        if (arr.indexOf(fn) === -1) {
            arr.push(fn);
        }
    }
    /** Remove an event listener */
    function removeListener(n, fn) {
        const arr = emitters[n];
        const i = arr.indexOf(fn);
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
    function setPanel(panelId, duration = cfg.slideDuration) {
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
        Object.keys(emitters).forEach(k => {
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
        getPanel,
        setPanel,
        setPanelImmediate,
        getSizes: () => ({ fullWidth, panelWidth }),
        isDragging: dragger.isDragging,
        isAnimating: () => isAnimating,
        render: renderPanelContent,
        resize,
        destroy,
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
        const r = (Math.PI / 2.0) * t;
        const s = Math.sin(r);
        const si = 1.0 - s;
        return (x0 * si + x1 * s);
    }
    PanelSlider.terp = terp;
    /** Lightweight PanelSlider Event type */
    class Event {
        constructor(type) {
            this.type = type;
        }
    }
    PanelSlider.Event = Event;
    /** Event emitted when current panel changes */
    class ChangeEvent extends Event {
        constructor(type, panelId) {
            super(type);
            this.panelId = panelId;
        }
    }
    PanelSlider.ChangeEvent = ChangeEvent;
    /** Event emitted when current panel dragged */
    class DragEvent extends Event {
        constructor(type, x, xv) {
            super(type);
            this.x = x;
            this.xv = xv;
        }
    }
    PanelSlider.DragEvent = DragEvent;
    /** Emitted on animation start/stop */
    class AnimationEvent extends Event {
        constructor(type, animating) {
            super(type);
            this.animating = animating;
        }
    }
    PanelSlider.AnimationEvent = AnimationEvent;
    /** Emitted every frame during an animation */
    class AnimateEvent extends Event {
        constructor(type, panelFraction) {
            super(type);
            this.panelFraction = panelFraction;
        }
    }
    PanelSlider.AnimateEvent = AnimateEvent;
    /** Received by the application's `renderContent` callback */
    class RenderEvent {
        constructor(type, dom, panelId) {
            this.type = type;
            this.dom = dom;
            this.panelId = panelId;
        }
    }
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

},{"./Dragger":13,"./Panel":14,"./array":16,"./gesture":17,"./transform":20}],19:[function(require,module,exports){
"use strict";
// Math utils
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

},{}],20:[function(require,module,exports){
"use strict";
// Determine style names (if prefix required)
Object.defineProperty(exports, "__esModule", { value: true });
function toLower(s) {
    return !!s && typeof s === 'string' ? s.toLowerCase() : '';
}
exports.prefix = (function () {
    const t = 'translate3d(100px,20px,0px)'; // the transform we'll use to test
    const el = document.createElement('div'); // Make a test element
    //  Check support for current standard first
    el.style.transform = t;
    let styleAttrLc = toLower(el.getAttribute('style'));
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
function setPos3d(el, x, y = 0, z = 0) {
    el.style[exports.transform] = `translate3d(${x}px,${y}px,${z}px)`;
}
exports.setPos3d = setPos3d;

},{}]},{},[6]);
