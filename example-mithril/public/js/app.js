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
const array_1 = require("../../src/array");
const math_1 = require("../../src/math");
const src_1 = __importDefault(require("../../src"));
const content = __importStar(require("./content"));
const Nav_1 = __importDefault(require("./Nav"));
const Stats_1 = __importDefault(require("./Stats"));
const render_1 = require("./render");
const NUM_PANELS = 101;
const MIN_PANEL_WIDTH = 360;
const SLIDE_DURATION = 400;
const NAV_ITEMS = array_1.range(0, NUM_PANELS, 10).map(i => String(i));
/**
 * Main application component.
 * Stateful component that manages a PanelSlider instance.
 */
function App() {
    let slider;
    let containerWidth = 200;
    let numVisiblePanels = 1;
    let dom;
    const panelId = stream_1.default(0);
    const panelPosition = stream_1.default(0);
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
            maxSwipePanels: visiblePanels === 1 ? 1 : 3 * visiblePanels,
            slideDuration: SLIDE_DURATION,
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
                    c = c || Promise.resolve(content.get(e.panelId));
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
        containerWidth = dom.getBoundingClientRect().width;
        return Math.max(Math.floor(containerWidth / MIN_PANEL_WIDTH), 1);
    }
    /** Handle nav page button click */
    function onNavChange(e) {
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
            numVisiblePanels = calcVisiblePanels();
            initPanelSlider(numVisiblePanels);
            window.addEventListener('resize', resize);
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
        }))
    };
}
exports.default = App;
},{"../../src":17,"../../src/array":15,"../../src/math":18,"./Nav":2,"./Stats":3,"./content":4,"./render":6,"mithril":7,"mithril/stream":8}],2:[function(require,module,exports){
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
    }, item))))
};
exports.default = Nav;
},{"mithril":7}],3:[function(require,module,exports){
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
},{"mithril":7}],4:[function(require,module,exports){
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
        console.log('fetching: ' + id);
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
},{}],5:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mithril_1 = __importDefault(require("mithril"));
const App_1 = __importDefault(require("./App"));
mithril_1.default.mount(document.body, App_1.default);
},{"./App":1,"mithril":7}],6:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mithril_1 = __importDefault(require("mithril"));
// Panel content rendering
const picsumOffset = Math.floor(Math.random() * 1000);
/** Render panel content. Returns DOM tree. */
function renderPanelContent(dom, pid, texts) {
    mithril_1.default.render(dom, mithril_1.default('div', mithril_1.default('h2', `${pid}. ${texts[1].substr(0, 10 + pid % 10).trim()}`), mithril_1.default('p', mithril_1.default('img', {
        style: 'width: 300px; height: 200px',
        src: `https://picsum.photos/300/200?image=${picsumOffset + pid}`
    })), texts.map(text => mithril_1.default('p', text))));
}
exports.renderPanelContent = renderPanelContent;
/** Pre-render (fast) */
function preRenderPanelContent(dom, pid, text) {
    mithril_1.default.render(dom, mithril_1.default('div', mithril_1.default('h2', `${pid}. ...`), mithril_1.default('p', mithril_1.default('div', {
        style: 'width: 300px; height: 200px; background-color: #DDD',
    })), mithril_1.default('p', { style: 'font-style: italic' }, text)));
}
exports.preRenderPanelContent = preRenderPanelContent;
function renderIntro(dom) {
    mithril_1.default.render(dom, mithril_1.default('.intro', mithril_1.default('h2.center', 'Panel-Slider'), mithril_1.default('.center.lg-lt', '➔'), mithril_1.default('p.center', 'Swipe left or right to navigate.'), mithril_1.default('p', 'Panel content is loaded asynchronously. '
        + 'On a desktop you can resize the window width to change the number of panels. '
        + 'Mobile devices may show more panels in landscape orientation.'), mithril_1.default('p', 'Docs and source: ', mithril_1.default('a', { href: 'http://github.com/spacejack/panel-slider' }, 'Github Repo'))));
}
exports.renderIntro = renderIntro;
function renderOutro(dom) {
    mithril_1.default.render(dom, mithril_1.default('.intro.center', mithril_1.default('h2', 'Panel-Slider'), mithril_1.default('.lg-lt', { style: 'transform: rotate(180deg)' }, '➔'), mithril_1.default('p', 'Swipe left or right to navigate.'), mithril_1.default('p', '© 2019 by Mike Linkovich | ', mithril_1.default('a', { href: 'https://github.com/spacejack' }, 'Github'))));
}
exports.renderOutro = renderOutro;
},{"mithril":7}],7:[function(require,module,exports){
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

},{"timers":11}],8:[function(require,module,exports){
"use strict"

module.exports = require("./stream/stream")

},{"./stream/stream":9}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{"process/browser.js":10,"timers":11}],12:[function(require,module,exports){
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
},{"./Speedo":14}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
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
},{"./math":18}],15:[function(require,module,exports){
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
},{}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const math_1 = require("./math");
/**
 * Compute "throw" from swipe
 */
function swipe({ panelId, x, xv, panelWidth, maxSwipePanels, totalPanels, unitDuration }) {
    /** Minimum duration of animation */
    const MIN_DUR_MS = 17;
    /** Max throw velocity */
    const MAX_VEL = 10000;
    /* max distance we can travel */
    //const MAX_DIST = maxSwipePanels
    /** swipe velocity in px/s clamped to sane range */
    const xvel = math_1.clamp(xv, -MAX_VEL, MAX_VEL);
    /** Destination position */
    const destX = x + xvel * 0.5;
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
},{"./math":18}],17:[function(require,module,exports){
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
        panelchange: []
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
            // Need to render this
            if (!fast) {
                console.log(`updating panel: ${i}`);
            }
            panel.index = i;
            panel.state = cfg.renderContent(new PanelSlider.RenderEvent('preview', panel.dom, panel.index));
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
                swipeAnim(0, pid => {
                    emit(new PanelSlider.ChangeEvent('panelchange', pid));
                });
            },
            dragend(e) {
                const ox = -curPanel * panelWidth;
                //curPosX = Math.round(clamp(ox + e.x, -(fullWidth - panelWidth), 0))
                curPosX = applyOverscroll(Math.round(ox + e.x));
                render();
                swipeAnim(e.xv, pid => {
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
    function swipeAnim(xVelocity, done) {
        const result = gesture.swipe({
            panelId: curPanel,
            x: curPosX, xv: xVelocity,
            maxSwipePanels: cfg.maxSwipePanels,
            panelWidth,
            unitDuration: cfg.slideDuration,
            totalPanels: cfg.totalPanels - (cfg.visiblePanels - 1)
        });
        animateTo(result.panelId, result.duration, done);
    }
    /** Animate panels to the specified panelId */
    function animateTo(destPanel, dur = cfg.slideDuration, done) {
        if (isAnimating) {
            // TODO: Allow redirect
            console.warn("Cannot animateTo - already animating");
            return;
        }
        if (dragger.isDragging()) {
            console.warn("Cannot animateTo - currently dragging");
            return;
        }
        isAnimating = true;
        const startX = curPosX;
        const destX = -destPanel * panelWidth;
        function finish() {
            curPanel = destPanel;
            isAnimating = false;
            emit(new PanelSlider.AnimationEvent('animationstatechange', false));
            done && done(curPanel);
        }
        function loop() {
            if (!isAnimating) {
                // Animation has been cancelled, assume
                // something else has changed curPanel.
                // (eg. setPanelImmediate)
                done && done(curPanel);
                emit(new PanelSlider.AnimationEvent('animationstatechange', false));
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
     * so the result index may not be what was
     * requested or the promise may not resolve.
     */
    function setPanel(panelId, duration = cfg.slideDuration) {
        return panelId === curPanel
            ? Promise.resolve(panelId)
            : new Promise(r => {
                animateTo(panelId, duration, r);
            });
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
},{"./Dragger":12,"./Panel":13,"./array":15,"./gesture":16,"./transform":19}],18:[function(require,module,exports){
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
},{}],19:[function(require,module,exports){
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
},{}]},{},[5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleGFtcGxlLW1pdGhyaWwvc3JjL0FwcC50cyIsImV4YW1wbGUtbWl0aHJpbC9zcmMvTmF2LnRzIiwiZXhhbXBsZS1taXRocmlsL3NyYy9TdGF0cy50cyIsImV4YW1wbGUtbWl0aHJpbC9zcmMvY29udGVudC50cyIsImV4YW1wbGUtbWl0aHJpbC9zcmMvbWFpbi50cyIsImV4YW1wbGUtbWl0aHJpbC9zcmMvcmVuZGVyLnRzIiwibm9kZV9tb2R1bGVzL21pdGhyaWwvbWl0aHJpbC5qcyIsIm5vZGVfbW9kdWxlcy9taXRocmlsL3N0cmVhbS5qcyIsIm5vZGVfbW9kdWxlcy9taXRocmlsL3N0cmVhbS9zdHJlYW0uanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3RpbWVycy1icm93c2VyaWZ5L21haW4uanMiLCJzcmMvRHJhZ2dlci50cyIsInNyYy9QYW5lbC50cyIsInNyYy9TcGVlZG8udHMiLCJzcmMvYXJyYXkudHMiLCJzcmMvZ2VzdHVyZS50cyIsInNyYy9pbmRleC50cyIsInNyYy9tYXRoLnRzIiwic3JjL3RyYW5zZm9ybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7OztBQ0FBLHNEQUF1QjtBQUN2Qiw0REFBbUM7QUFDbkMsMkNBQXFDO0FBQ3JDLHlDQUFvQztBQUNwQyxvREFBbUM7QUFDbkMsbURBQW9DO0FBQ3BDLGdEQUFtQztBQUNuQyxvREFBMkI7QUFDM0IscUNBRWlCO0FBRWpCLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQTtBQUN0QixNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUE7QUFDM0IsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFBO0FBQzFCLE1BQU0sU0FBUyxHQUFHLGFBQUssQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxD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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDeHVDQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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VyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFFL0MsbUNBQW1DO0lBQ25DLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtRQUN0QyxPQUFPLEtBQUssQ0FBQTtLQUNaO1NBQU0sSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO1FBQ2hELE9BQU8sUUFBUSxDQUFBO0tBQ2Y7U0FBTSxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7UUFDNUMsT0FBTyxJQUFJLENBQUE7S0FDWDtJQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUMsQ0FBQTtJQUNsRCxPQUFPLEVBQUUsQ0FBQTtBQUNWLENBQUMsQ0FBQyxFQUFFLENBQUE7QUFFUyxRQUFBLFNBQVMsR0FBRyxjQUFNLENBQUMsQ0FBQyxDQUFDLGNBQU0sR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQTtBQUVyRTs7R0FFRztBQUNILFNBQWdCLFFBQVEsQ0FBRSxFQUFlLEVBQUUsQ0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUM7SUFDaEUsRUFBRSxDQUFDLEtBQWEsQ0FBQyxpQkFBUyxDQUFDLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFBO0FBQ25FLENBQUM7QUFGRCw0QkFFQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsImltcG9ydCBtIGZyb20gJ21pdGhyaWwnXG5pbXBvcnQgc3RyZWFtIGZyb20gJ21pdGhyaWwvc3RyZWFtJ1xuaW1wb3J0IHtyYW5nZX0gZnJvbSAnLi4vLi4vc3JjL2FycmF5J1xuaW1wb3J0IHtjbGFtcH0gZnJvbSAnLi4vLi4vc3JjL21hdGgnXG5pbXBvcnQgUGFuZWxTbGlkZXIgZnJvbSAnLi4vLi4vc3JjJ1xuaW1wb3J0ICogYXMgY29udGVudCBmcm9tICcuL2NvbnRlbnQnXG5pbXBvcnQgTmF2LCB7TmF2RXZlbnR9IGZyb20gJy4vTmF2J1xuaW1wb3J0IFN0YXRzIGZyb20gJy4vU3RhdHMnXG5pbXBvcnQge1xuXHRyZW5kZXJJbnRybywgcmVuZGVyT3V0cm8sIHJlbmRlclBhbmVsQ29udGVudCwgcHJlUmVuZGVyUGFuZWxDb250ZW50XG59IGZyb20gJy4vcmVuZGVyJ1xuXG5jb25zdCBOVU1fUEFORUxTID0gMTAxXG5jb25zdCBNSU5fUEFORUxfV0lEVEggPSAzNjBcbmNvbnN0IFNMSURFX0RVUkFUSU9OID0gNDAwXG5jb25zdCBOQVZfSVRFTVMgPSByYW5nZSgwLCBOVU1fUEFORUxTLCAxMCkubWFwKGkgPT4gU3RyaW5nKGkpKVxuXG4vKipcbiAqIE1haW4gYXBwbGljYXRpb24gY29tcG9uZW50LlxuICogU3RhdGVmdWwgY29tcG9uZW50IHRoYXQgbWFuYWdlcyBhIFBhbmVsU2xpZGVyIGluc3RhbmNlLlxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBBcHAoKTogbS5Db21wb25lbnQge1xuXHRsZXQgc2xpZGVyOiBQYW5lbFNsaWRlclxuXHRsZXQgY29udGFpbmVyV2lkdGggPSAyMDBcblx0bGV0IG51bVZpc2libGVQYW5lbHMgPSAxXG5cdGxldCBkb206IEhUTUxFbGVtZW50XG5cdGNvbnN0IHBhbmVsSWQgPSBzdHJlYW0oMClcblx0Y29uc3QgcGFuZWxQb3NpdGlvbiA9IHN0cmVhbSgwKVxuXG5cdC8qKlxuXHQgKiAoUmUpQ3JlYXRlICYgY29uZmlndXJlIGEgUGFuZWxTbGlkZXIgaW5zdGFuY2Vcblx0ICovXG5cdGZ1bmN0aW9uIGluaXRQYW5lbFNsaWRlciAodmlzaWJsZVBhbmVsczogbnVtYmVyKSB7XG5cdFx0bGV0IGluaXRpYWxQYW5lbCA9IDBcblx0XHRpZiAoc2xpZGVyICE9IG51bGwpIHtcblx0XHRcdGluaXRpYWxQYW5lbCA9IHNsaWRlci5nZXRQYW5lbCgpXG5cdFx0XHRzbGlkZXIuZGVzdHJveSgpXG5cdFx0fVxuXHRcdHNsaWRlciA9IFBhbmVsU2xpZGVyKHtcblx0XHRcdGRvbTogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnBhbmVsLXNldCcpIGFzIEhUTUxFbGVtZW50LFxuXHRcdFx0dG90YWxQYW5lbHM6IE5VTV9QQU5FTFMsICAvLyAjIG9mIHRvdGFsIHBhbmVsc1xuXHRcdFx0dmlzaWJsZVBhbmVscywgLy8gIyBvZiBwYW5lbHMgdGhhdCBmaXQgb24gc2NyZWVuXG5cdFx0XHRpbml0aWFsUGFuZWwsXG5cdFx0XHRtYXhTd2lwZVBhbmVsczogdmlzaWJsZVBhbmVscyA9PT0gMSA/IDEgOiAzICogdmlzaWJsZVBhbmVscyxcblx0XHRcdHNsaWRlRHVyYXRpb246IFNMSURFX0RVUkFUSU9OLFxuXHRcdFx0cGFuZWxDbGFzc05hbWU6ICdwYW5lbCcsXG5cdFx0XHRkcmFnVGhyZXNob2xkOiAxLFxuXHRcdFx0Ly8gQ2FsbGJhY2sgdGhhdCBnZXRzIGludm9rZWQgd2hlbiB0aGUgUGFuZWxTbGlkZXIgbmVlZHNcblx0XHRcdC8vIHRvIHJlbmRlciB0aGlzIHBhbmVsLlxuXHRcdFx0cmVuZGVyQ29udGVudDogKGUpID0+IHtcblx0XHRcdFx0aWYgKGUucGFuZWxJZCA9PT0gMCkge1xuXHRcdFx0XHRcdHJlbmRlckludHJvKGUuZG9tKVxuXHRcdFx0XHRcdHJldHVybiBQYW5lbFNsaWRlci5SRU5ERVJFRFxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChlLnBhbmVsSWQgPT09IE5VTV9QQU5FTFMgLSAxKSB7XG5cdFx0XHRcdFx0cmVuZGVyT3V0cm8oZS5kb20pXG5cdFx0XHRcdFx0cmV0dXJuIFBhbmVsU2xpZGVyLlJFTkRFUkVEXG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gVHJ5IHRvIGdldCAncmVhZHknIGNvbnRlbnQgZm9yIHRoaXMgcGFuZWxcblx0XHRcdFx0bGV0IGMgPSBjb250ZW50LnBlZWsoZS5wYW5lbElkKVxuXHRcdFx0XHQvLyBJZiBpdCdzIHJlYWR5IHRvIHVzZSwgd2UgZ290IGFuIGFycmF5IG9mIHN0cmluZ3Ncblx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkoYykpIHtcblx0XHRcdFx0XHQvLyBDb250ZW50IGlzIGF2YWlsYWJsZSBub3cgLSByZW5kZXIgaXQ6XG5cdFx0XHRcdFx0cmVuZGVyUGFuZWxDb250ZW50KGUuZG9tLCBlLnBhbmVsSWQsIGMpXG5cdFx0XHRcdFx0Ly8gSW5kaWNhdGUgZGlkIHJlbmRlclxuXHRcdFx0XHRcdHJldHVybiBQYW5lbFNsaWRlci5SRU5ERVJFRFxuXHRcdFx0XHR9IGVsc2UgaWYgKGUudHlwZSA9PT0gJ3JlbmRlcicpIHtcblx0XHRcdFx0XHQvLyBDb250ZW50IG5vdCBhdmFpbGFibGUgeWV0IC0gZmV0Y2hcblx0XHRcdFx0XHRjID0gYyB8fCBQcm9taXNlLnJlc29sdmUoY29udGVudC5nZXQoZS5wYW5lbElkKSlcblx0XHRcdFx0XHRjLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0Ly8gUmVxdWVzdCBQYW5lbFNsaWRlciB0byByZS1yZW5kZXIgdGhpcyBwYW5lbCB3aGVuIHRoZSBjb250ZW50IHByb21pc2Vcblx0XHRcdFx0XHRcdC8vIHJlc29sdmVzLiBJdCdzIHBvc3NpYmxlIHRoaXMgcGFuZWwgaXMgbm8gbG9uZ2VyIGJvdW5kIHRvIHRoaXMgSUQgYnlcblx0XHRcdFx0XHRcdC8vIHRoZW4gc28gdGhlIHJlbmRlciByZXF1ZXN0IG1heSBiZSBpZ25vcmVkLlxuXHRcdFx0XHRcdFx0c2xpZGVyLnJlbmRlcihlLnBhbmVsSWQpXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQvLyBEbyBhIGZhc3QgcmVuZGVyIHdoaWxlIHdhaXRpbmdcblx0XHRcdFx0XHRwcmVSZW5kZXJQYW5lbENvbnRlbnQoZS5kb20sIGUucGFuZWxJZCwgJ2xvYWRpbmcuLi4nKVxuXHRcdFx0XHRcdHJldHVybiBQYW5lbFNsaWRlci5GRVRDSElOR1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIENvbnRlbnQgbm90IGF2YWlsYWJsZSBidXQgdGhpcyBpcyBhICdmYXN0JyByZW5kZXIgc29cblx0XHRcdFx0XHQvLyBkb24ndCBib3RoZXIgZmV0Y2hpbmcgYW55dGhpbmcuXG5cdFx0XHRcdFx0Ly8gV2UgY291bGQgcmVuZGVyIHNvbWUgJ2xvYWRpbmcnIG9yIGxvdy1yZXMgY29udGVudCBoZXJlLi4uXG5cdFx0XHRcdFx0cHJlUmVuZGVyUGFuZWxDb250ZW50KGUuZG9tLCBlLnBhbmVsSWQsICcuLi4nKVxuXHRcdFx0XHRcdHJldHVybiBQYW5lbFNsaWRlci5QUkVSRU5ERVJFRFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0b246IHtcblx0XHRcdFx0cGFuZWxjaGFuZ2U6IGUgPT4ge1xuXHRcdFx0XHRcdHBhbmVsSWQoZS5wYW5lbElkKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRhbmltYXRlOiBlID0+IHtcblx0XHRcdFx0XHRwYW5lbFBvc2l0aW9uKGUucGFuZWxGcmFjdGlvbilcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cdH1cblxuXHQvKiogQ29tcHV0ZSBob3cgbWFueSBwYW5lbCB3aWR0aHMgZml0IGluIHRoZSBjb250YWluZXIgKi9cblx0ZnVuY3Rpb24gY2FsY1Zpc2libGVQYW5lbHMoKSB7XG5cdFx0Y29udGFpbmVyV2lkdGggPSBkb20uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkud2lkdGhcblx0XHRyZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcihjb250YWluZXJXaWR0aCAvIE1JTl9QQU5FTF9XSURUSCksIDEpXG5cdH1cblxuXHQvKiogSGFuZGxlIG5hdiBwYWdlIGJ1dHRvbiBjbGljayAqL1xuXHRmdW5jdGlvbiBvbk5hdkNoYW5nZSAoZTogTmF2RXZlbnQpIHtcblx0XHRjb25zdCBwaWQwID0gc2xpZGVyLmdldFBhbmVsKClcblx0XHRsZXQgcGlkID0gcGlkMFxuXHRcdGlmIChlLnR5cGUgPT09ICdnb3RvJykge1xuXHRcdFx0cGlkID0gZS5pZCAqIDEwXG5cdFx0fSBlbHNlIGlmIChlLnR5cGUgPT09ICdza2lwJykge1xuXHRcdFx0Y29uc3Qgc2tpcCA9IE1hdGguYWJzKGUuaWQpIDw9IDFcblx0XHRcdFx0PyBlLmlkXG5cdFx0XHRcdDogTWF0aC5zaWduKGUuaWQpICogbnVtVmlzaWJsZVBhbmVsc1xuXHRcdFx0cGlkICs9IHNraXBcblx0XHR9XG5cdFx0cGlkID0gY2xhbXAocGlkLCAwLCBOVU1fUEFORUxTIC0gbnVtVmlzaWJsZVBhbmVscylcblx0XHRjb25zdCBkdXJhdGlvbiA9IFNMSURFX0RVUkFUSU9OICogTWF0aC5wb3coXG5cdFx0XHRNYXRoLm1heChNYXRoLmFicyhwaWQgLSBwaWQwKSwgMSksXG5cdFx0XHQwLjI1XG5cdFx0KVxuXHRcdC8vIFVzZXIgY2xpY2tlZCBhIG5hdiBidXR0b24gZm9yIHRoaXMgcGFuZWwgSUQuXG5cdFx0Ly8gRmV0Y2ggY29udGVudCBpbW1lZGlhdGVseSBpZiBpdCdzIG5vdCBhbHJlYWR5IGF2YWlsYWJsZS4uLlxuXHRcdGNvbnRlbnQuZ2V0KHBpZClcblx0XHQvLyBTZW5kIHRoZSBQYW5lbFNsaWRlciB0aGVyZVxuXHRcdHNsaWRlci5zZXRQYW5lbChwaWQsIGR1cmF0aW9uKS50aGVuKHBhbmVsSWQpXG5cdH1cblxuXHRmdW5jdGlvbiByZXNpemUoKSB7XG5cdFx0Y29uc3QgbiA9IGNhbGNWaXNpYmxlUGFuZWxzKClcblx0XHRpZiAobiAhPT0gbnVtVmlzaWJsZVBhbmVscykge1xuXHRcdFx0bnVtVmlzaWJsZVBhbmVscyA9IG5cblx0XHRcdGluaXRQYW5lbFNsaWRlcihudW1WaXNpYmxlUGFuZWxzKVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB7XG5cdFx0b25jcmVhdGU6IHZub2RlID0+IHtcblx0XHRcdGRvbSA9IHZub2RlLmRvbSBhcyBIVE1MRWxlbWVudFxuXHRcdFx0bnVtVmlzaWJsZVBhbmVscyA9IGNhbGNWaXNpYmxlUGFuZWxzKClcblx0XHRcdGluaXRQYW5lbFNsaWRlcihudW1WaXNpYmxlUGFuZWxzKVxuXHRcdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHJlc2l6ZSlcblx0XHR9LFxuXHRcdG9ucmVtb3ZlOiAoKSA9PiB7XG5cdFx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgcmVzaXplKVxuXHRcdFx0aWYgKHNsaWRlcikge1xuXHRcdFx0XHRzbGlkZXIuZGVzdHJveSgpXG5cdFx0XHR9XG5cdFx0fSxcblx0XHR2aWV3OiAoKSA9PiBtKCcuY29udGFpbmVyJyxcblx0XHRcdG0oJy5wYW5lbC1zZXQnKSxcblx0XHRcdG0oU3RhdHMsIHtcblx0XHRcdFx0cGFuZWxJZDogcGFuZWxJZCxcblx0XHRcdFx0cG9zaXRpb246IHBhbmVsUG9zaXRpb25cblx0XHRcdH0pLFxuXHRcdFx0bShOYXYsIHtcblx0XHRcdFx0aXRlbXM6IE5BVl9JVEVNUyxcblx0XHRcdFx0b25OYXY6IG9uTmF2Q2hhbmdlXG5cdFx0XHR9KVxuXHRcdClcblx0fVxufVxuIiwiaW1wb3J0IG0gZnJvbSAnbWl0aHJpbCdcblxuZXhwb3J0IGNsYXNzIE5hdkV2ZW50IHtcblx0dHlwZTogc3RyaW5nXG5cdGlkOiBudW1iZXJcblx0Y29uc3RydWN0b3IgKHR5cGU6ICdnb3RvJyB8ICdza2lwJywgaTogbnVtYmVyKSB7XG5cdFx0dGhpcy50eXBlID0gdHlwZVxuXHRcdHRoaXMuaWQgPSBpXG5cdH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBBdHRycyB7XG5cdGl0ZW1zOiBzdHJpbmdbXSxcblx0b25OYXYoZTogTmF2RXZlbnQpOiB2b2lkXG59XG5cbmNvbnN0IE5hdjogbS5Db21wb25lbnQ8QXR0cnM+ID0ge1xuXHR2aWV3OiAoe2F0dHJzfSkgPT4gbSgnbmF2Jyxcblx0XHQvLyBTa2lwIGJ1dHRvbnNcblx0XHRtKCcuZ3JvdXAubXEtbWQnLFxuXHRcdFx0bSgnYnV0dG9uLmJ0bi1wZy5tcS1scCcsXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnYnV0dG9uJyxcblx0XHRcdFx0XHRvbmNsaWNrOiAoKSA9PiB7XG5cdFx0XHRcdFx0XHRhdHRycy5vbk5hdih7dHlwZTogJ3NraXAnLCBpZDogLTJ9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0J+KPqidcblx0XHRcdCksXG5cdFx0XHRtKCdidXR0b24uYnRuLXBnJyxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdidXR0b24nLFxuXHRcdFx0XHRcdG9uY2xpY2s6ICgpID0+IHtcblx0XHRcdFx0XHRcdGF0dHJzLm9uTmF2KHt0eXBlOiAnc2tpcCcsIGlkOiAtMX0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHQn4peA77iPJ1xuXHRcdFx0KSxcblx0XHRcdG0oJ2J1dHRvbi5idG4tcGcnLFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2J1dHRvbicsXG5cdFx0XHRcdFx0b25jbGljazogKCkgPT4ge1xuXHRcdFx0XHRcdFx0YXR0cnMub25OYXYoe3R5cGU6ICdza2lwJywgaWQ6IDF9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0J+KWtu+4jydcblx0XHRcdCksXG5cdFx0XHRtKCdidXR0b24uYnRuLXBnLm1xLWxwJyxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdidXR0b24nLFxuXHRcdFx0XHRcdG9uY2xpY2s6ICgpID0+IHtcblx0XHRcdFx0XHRcdGF0dHJzLm9uTmF2KHt0eXBlOiAnc2tpcCcsIGlkOiAyfSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCfij6knXG5cdFx0XHQpXG5cdFx0KSxcblx0XHQvLyBQYWdlIG51bWJlcmVkIGJ1dHRvbnNcblx0XHRtKCcuZ3JvdXAnLFxuXHRcdFx0YXR0cnMuaXRlbXMubWFwKChpdGVtLCBpKSA9PiBtKCdidXR0b24uYnRuLXBnJyxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdidXR0b24nLFxuXHRcdFx0XHRcdG9uY2xpY2s6ICgpID0+IHtcblx0XHRcdFx0XHRcdGF0dHJzLm9uTmF2KHt0eXBlOiAnZ290bycsIGlkOiBpfSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGl0ZW1cblx0XHRcdCkpXG5cdFx0KVxuXHQpXG59XG5cbmV4cG9ydCBkZWZhdWx0IE5hdlxuIiwiaW1wb3J0IG0gZnJvbSAnbWl0aHJpbCdcbmltcG9ydCB7U3RyZWFtfSBmcm9tICdtaXRocmlsL3N0cmVhbSdcblxuZXhwb3J0IGludGVyZmFjZSBBdHRycyB7XG5cdHBhbmVsSWQ6IFN0cmVhbTxudW1iZXI+XG5cdHBvc2l0aW9uOiBTdHJlYW08bnVtYmVyPlxufVxuXG5jb25zdCBTdGF0czogbS5Db21wb25lbnQ8QXR0cnM+ID0ge1xuXHRvbmNyZWF0ZTogKHthdHRycywgZG9tfSkgPT4ge1xuXHRcdC8vIFRoZXNlIHZhbHVlcyBjaGFuZ2UgcmFwaWRseSwgc28gd3JpdGUgdGhlbSBkaXJlY3RseSB0byB0aGUgRE9NXG5cdFx0Y29uc3QgZWxQb3MgPSBkb20ucXVlcnlTZWxlY3RvcignI3BhbmVsLXBvc2l0aW9uJykgYXMgSFRNTEVsZW1lbnRcblx0XHRhdHRycy5wb3NpdGlvbi5tYXAocCA9PiBlbFBvcy50ZXh0Q29udGVudCA9IHAudG9GaXhlZCgyKSlcblx0XHRjb25zdCBlbElkID0gZG9tLnF1ZXJ5U2VsZWN0b3IoJyNwYW5lbC1pZCcpIGFzIEhUTUxFbGVtZW50XG5cdFx0YXR0cnMucGFuZWxJZC5tYXAoaWQgPT4gZWxJZC50ZXh0Q29udGVudCA9IFN0cmluZyhpZCkpXG5cdH0sXG5cdHZpZXc6ICh7YXR0cnN9KSA9PiBtKCcuc3RhdHMnLFxuXHRcdG0oJ3RhYmxlJyxcblx0XHRcdG0oJ3RyJyxcblx0XHRcdFx0bSgndGQnLCAnUGFuZWw6JyksXG5cdFx0XHRcdG0oJ3RkI3BhbmVsLWlkJywgYXR0cnMucGFuZWxJZClcblx0XHRcdCksXG5cdFx0XHRtKCd0cicsXG5cdFx0XHRcdG0oJ3RkJywgJ1Bvc2l0aW9uOicpLFxuXHRcdFx0XHRtKCd0ZCNwYW5lbC1wb3NpdGlvbicsIGF0dHJzLnBvc2l0aW9uKCkudG9GaXhlZCgyKSlcblx0XHRcdClcblx0XHQpXG5cdClcbn1cblxuZXhwb3J0IGRlZmF1bHQgU3RhdHNcbiIsIi8vIFRoaXMgaXMgYSBwbGFjZWhvbGRlciBtb2R1bGUgdGhhdCBnZW5lcmF0ZXMgZXhhbXBsZSBjb250ZW50XG4vLyBmcm9tIHNvbWUgcHVibGljIEFQSXMuXG4vLyBUaGlzIGlzIHVzZWQgdG8gZGVtb25zdHJhdGUgcGFuZWxzIGhhdmluZyBhc3luYyBjb250ZW50LlxuXG5jb25zdCBjYWNoZSA9IG5ldyBNYXA8bnVtYmVyLCBzdHJpbmdbXSB8IFByb21pc2U8c3RyaW5nW10+PigpXG5cbi8qKlxuICogUmV0dXJuIHdoYXQncyBhdmFpbGFibGUgZm9yIHRoaXMgcGFuZWwgYnV0IGRvbid0IGluaXRpYXRlIGFueSBmZXRjaC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlZWsgKHBhbmVsSWQ6IG51bWJlcik6IHN0cmluZ1tdIHwgUHJvbWlzZTxzdHJpbmdbXT4gfCB1bmRlZmluZWQge1xuXHRyZXR1cm4gY2FjaGUuZ2V0KHBhbmVsSWQpXG59XG5cbi8qKlxuICogUmV0dXJuIGNvbnRlbnQgaWYgcmVhZHkgYXMgYW4gYXJyYXkuXG4gKiBPdGhlcndpc2UgcmV0dXJuIGEgcHJvbWlzZTsgaW5pdGlhdGUgYSBmZXRjaFxuICogb3IgcmV0dXJuIGFuIGFscmVhZHkgcGVuZGluZyBwcm9taXNlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0IChpZDogbnVtYmVyKTogc3RyaW5nW10gfCBQcm9taXNlPHN0cmluZ1tdPiB7XG5cdGlmICghY2FjaGUuaGFzKGlkKSkge1xuXHRcdC8vIEVudHJ5IGRvZXNuJ3QgZXhpc3QgLSBzdGFydCB3aXRoIGEgcHJvbWlzZVxuXHRcdGNvbnNvbGUubG9nKCdmZXRjaGluZzogJyArIGlkKVxuXHRcdC8vIFVzZSBCYWNvbklwc3VtLmNvbSB0byBnZW5lcmF0ZSBzb21lIGNvbnRlbnQgZm9yIGVhY2ggcGFuZWxcblx0XHRjYWNoZS5zZXQoaWQsIGZldGNoKFxuXHRcdFx0J2h0dHBzOi8vYmFjb25pcHN1bS5jb20vYXBpLz90eXBlPW1lYXQtYW5kLWZpbGxlcidcblx0XHQpLnRoZW4oXG5cdFx0XHRyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxzdHJpbmdbXT5cblx0XHQpLnRoZW4odGV4dHMgPT4ge1xuXHRcdFx0Ly8gV2hlbiByZXNvbHZlZCwgcmVwbGFjZSB0aGUgcHJvbWlzZSB3aXRoIHRoZVxuXHRcdFx0Ly8gdW53cmFwcGVkIHZhbHVlIGluIHRoZSBNYXBcblx0XHRcdGNhY2hlLnNldChpZCwgdGV4dHMpXG5cdFx0XHRyZXR1cm4gdGV4dHNcblx0XHR9KS5jYXRjaChlcnIgPT4ge1xuXHRcdFx0Y2FjaGUuZGVsZXRlKGlkKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFxuXHRcdFx0XHRgRmFpbGVkIHRvIGZldGNoIGNvbnRlbnQgZm9yIHBhbmVsICR7aWR9OiAke2Vyci5tZXNzYWdlfWBcblx0XHRcdClcblx0XHR9KSlcblx0fVxuXHRyZXR1cm4gY2FjaGUuZ2V0KGlkKSFcbn1cbiIsImltcG9ydCBtIGZyb20gJ21pdGhyaWwnXG5pbXBvcnQgQXBwIGZyb20gJy4vQXBwJ1xuXG5tLm1vdW50KGRvY3VtZW50LmJvZHksIEFwcClcbiIsImltcG9ydCBtIGZyb20gJ21pdGhyaWwnXG5cbi8vIFBhbmVsIGNvbnRlbnQgcmVuZGVyaW5nXG5cbmNvbnN0IHBpY3N1bU9mZnNldCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDApXG5cbi8qKiBSZW5kZXIgcGFuZWwgY29udGVudC4gUmV0dXJucyBET00gdHJlZS4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJQYW5lbENvbnRlbnQgKGRvbTogSFRNTEVsZW1lbnQsIHBpZDogbnVtYmVyLCB0ZXh0czogc3RyaW5nW10pIHtcblx0bS5yZW5kZXIoZG9tLCBtKCdkaXYnLFxuXHRcdG0oJ2gyJywgYCR7cGlkfS4gJHt0ZXh0c1sxXS5zdWJzdHIoMCwgMTAgKyBwaWQgJSAxMCkudHJpbSgpfWApLFxuXHRcdG0oJ3AnLFxuXHRcdFx0bSgnaW1nJywge1xuXHRcdFx0XHRzdHlsZTogJ3dpZHRoOiAzMDBweDsgaGVpZ2h0OiAyMDBweCcsXG5cdFx0XHRcdHNyYzogYGh0dHBzOi8vcGljc3VtLnBob3Rvcy8zMDAvMjAwP2ltYWdlPSR7cGljc3VtT2Zmc2V0ICsgcGlkfWBcblx0XHRcdH0pXG5cdFx0KSxcblx0XHR0ZXh0cy5tYXAodGV4dCA9PlxuXHRcdFx0bSgncCcsIHRleHQpXG5cdFx0KVxuXHQpKVxufVxuXG4vKiogUHJlLXJlbmRlciAoZmFzdCkgKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVSZW5kZXJQYW5lbENvbnRlbnQgKGRvbTogSFRNTEVsZW1lbnQsIHBpZDogbnVtYmVyLCB0ZXh0OiBzdHJpbmcpIHtcblx0bS5yZW5kZXIoZG9tLCBtKCdkaXYnLFxuXHRcdG0oJ2gyJywgYCR7cGlkfS4gLi4uYCksXG5cdFx0bSgncCcsXG5cdFx0XHRtKCdkaXYnLCB7XG5cdFx0XHRcdHN0eWxlOiAnd2lkdGg6IDMwMHB4OyBoZWlnaHQ6IDIwMHB4OyBiYWNrZ3JvdW5kLWNvbG9yOiAjREREJyxcblx0XHRcdH0pXG5cdFx0KSxcblx0XHRtKCdwJywge3N0eWxlOiAnZm9udC1zdHlsZTogaXRhbGljJ30sIHRleHQpXG5cdCkpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJJbnRybyAoZG9tOiBIVE1MRWxlbWVudCkge1xuXHRtLnJlbmRlcihkb20sIG0oJy5pbnRybycsXG5cdFx0bSgnaDIuY2VudGVyJywgJ1BhbmVsLVNsaWRlcicpLFxuXHRcdG0oJy5jZW50ZXIubGctbHQnLCAn4p6UJyksXG5cdFx0bSgncC5jZW50ZXInLCAnU3dpcGUgbGVmdCBvciByaWdodCB0byBuYXZpZ2F0ZS4nKSxcblx0XHRtKCdwJyxcblx0XHRcdCdQYW5lbCBjb250ZW50IGlzIGxvYWRlZCBhc3luY2hyb25vdXNseS4gJ1xuXHRcdFx0KyAnT24gYSBkZXNrdG9wIHlvdSBjYW4gcmVzaXplIHRoZSB3aW5kb3cgd2lkdGggdG8gY2hhbmdlIHRoZSBudW1iZXIgb2YgcGFuZWxzLiAnXG5cdFx0XHQrICdNb2JpbGUgZGV2aWNlcyBtYXkgc2hvdyBtb3JlIHBhbmVscyBpbiBsYW5kc2NhcGUgb3JpZW50YXRpb24uJ1xuXHRcdCksXG5cdFx0bSgncCcsXG5cdFx0XHQnRG9jcyBhbmQgc291cmNlOiAnLFxuXHRcdFx0bSgnYScsXG5cdFx0XHRcdHtocmVmOiAnaHR0cDovL2dpdGh1Yi5jb20vc3BhY2VqYWNrL3BhbmVsLXNsaWRlcid9LFxuXHRcdFx0XHQnR2l0aHViIFJlcG8nXG5cdFx0XHQpXG5cdFx0KVxuXHQpKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyT3V0cm8gKGRvbTogSFRNTEVsZW1lbnQpIHtcblx0bS5yZW5kZXIoZG9tLCBtKCcuaW50cm8uY2VudGVyJyxcblx0XHRtKCdoMicsICdQYW5lbC1TbGlkZXInKSxcblx0XHRtKCcubGctbHQnLCB7c3R5bGU6ICd0cmFuc2Zvcm06IHJvdGF0ZSgxODBkZWcpJ30sICfinpQnKSxcblx0XHRtKCdwJywgJ1N3aXBlIGxlZnQgb3IgcmlnaHQgdG8gbmF2aWdhdGUuJyksXG5cdFx0bSgncCcsXG5cdFx0XHQnwqkgMjAxOSBieSBNaWtlIExpbmtvdmljaCB8ICcsXG5cdFx0XHRtKCdhJywge2hyZWY6ICdodHRwczovL2dpdGh1Yi5jb20vc3BhY2VqYWNrJ30sICdHaXRodWInKVxuXHRcdClcblx0KSlcbn1cbiIsIjsoZnVuY3Rpb24oKSB7XG5cInVzZSBzdHJpY3RcIlxuZnVuY3Rpb24gVm5vZGUodGFnLCBrZXksIGF0dHJzMCwgY2hpbGRyZW4sIHRleHQsIGRvbSkge1xuXHRyZXR1cm4ge3RhZzogdGFnLCBrZXk6IGtleSwgYXR0cnM6IGF0dHJzMCwgY2hpbGRyZW46IGNoaWxkcmVuLCB0ZXh0OiB0ZXh0LCBkb206IGRvbSwgZG9tU2l6ZTogdW5kZWZpbmVkLCBzdGF0ZTogdW5kZWZpbmVkLCBfc3RhdGU6IHVuZGVmaW5lZCwgZXZlbnRzOiB1bmRlZmluZWQsIGluc3RhbmNlOiB1bmRlZmluZWQsIHNraXA6IGZhbHNlfVxufVxuVm5vZGUubm9ybWFsaXplID0gZnVuY3Rpb24obm9kZSkge1xuXHRpZiAoQXJyYXkuaXNBcnJheShub2RlKSkgcmV0dXJuIFZub2RlKFwiW1wiLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgVm5vZGUubm9ybWFsaXplQ2hpbGRyZW4obm9kZSksIHVuZGVmaW5lZCwgdW5kZWZpbmVkKVxuXHRpZiAobm9kZSAhPSBudWxsICYmIHR5cGVvZiBub2RlICE9PSBcIm9iamVjdFwiKSByZXR1cm4gVm5vZGUoXCIjXCIsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBub2RlID09PSBmYWxzZSA/IFwiXCIgOiBub2RlLCB1bmRlZmluZWQsIHVuZGVmaW5lZClcblx0cmV0dXJuIG5vZGVcbn1cblZub2RlLm5vcm1hbGl6ZUNoaWxkcmVuID0gZnVuY3Rpb24gbm9ybWFsaXplQ2hpbGRyZW4oY2hpbGRyZW4pIHtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdGNoaWxkcmVuW2ldID0gVm5vZGUubm9ybWFsaXplKGNoaWxkcmVuW2ldKVxuXHR9XG5cdHJldHVybiBjaGlsZHJlblxufVxudmFyIHNlbGVjdG9yUGFyc2VyID0gLyg/OihefCN8XFwuKShbXiNcXC5cXFtcXF1dKykpfChcXFsoLis/KSg/Olxccyo9XFxzKihcInwnfCkoKD86XFxcXFtcIidcXF1dfC4pKj8pXFw1KT9cXF0pL2dcbnZhciBzZWxlY3RvckNhY2hlID0ge31cbnZhciBoYXNPd24gPSB7fS5oYXNPd25Qcm9wZXJ0eVxuZnVuY3Rpb24gaXNFbXB0eShvYmplY3QpIHtcblx0Zm9yICh2YXIga2V5IGluIG9iamVjdCkgaWYgKGhhc093bi5jYWxsKG9iamVjdCwga2V5KSkgcmV0dXJuIGZhbHNlXG5cdHJldHVybiB0cnVlXG59XG5mdW5jdGlvbiBjb21waWxlU2VsZWN0b3Ioc2VsZWN0b3IpIHtcblx0dmFyIG1hdGNoLCB0YWcgPSBcImRpdlwiLCBjbGFzc2VzID0gW10sIGF0dHJzID0ge31cblx0d2hpbGUgKG1hdGNoID0gc2VsZWN0b3JQYXJzZXIuZXhlYyhzZWxlY3RvcikpIHtcblx0XHR2YXIgdHlwZSA9IG1hdGNoWzFdLCB2YWx1ZSA9IG1hdGNoWzJdXG5cdFx0aWYgKHR5cGUgPT09IFwiXCIgJiYgdmFsdWUgIT09IFwiXCIpIHRhZyA9IHZhbHVlXG5cdFx0ZWxzZSBpZiAodHlwZSA9PT0gXCIjXCIpIGF0dHJzLmlkID0gdmFsdWVcblx0XHRlbHNlIGlmICh0eXBlID09PSBcIi5cIikgY2xhc3Nlcy5wdXNoKHZhbHVlKVxuXHRcdGVsc2UgaWYgKG1hdGNoWzNdWzBdID09PSBcIltcIikge1xuXHRcdFx0dmFyIGF0dHJWYWx1ZSA9IG1hdGNoWzZdXG5cdFx0XHRpZiAoYXR0clZhbHVlKSBhdHRyVmFsdWUgPSBhdHRyVmFsdWUucmVwbGFjZSgvXFxcXChbXCInXSkvZywgXCIkMVwiKS5yZXBsYWNlKC9cXFxcXFxcXC9nLCBcIlxcXFxcIilcblx0XHRcdGlmIChtYXRjaFs0XSA9PT0gXCJjbGFzc1wiKSBjbGFzc2VzLnB1c2goYXR0clZhbHVlKVxuXHRcdFx0ZWxzZSBhdHRyc1ttYXRjaFs0XV0gPSBhdHRyVmFsdWUgPT09IFwiXCIgPyBhdHRyVmFsdWUgOiBhdHRyVmFsdWUgfHwgdHJ1ZVxuXHRcdH1cblx0fVxuXHRpZiAoY2xhc3Nlcy5sZW5ndGggPiAwKSBhdHRycy5jbGFzc05hbWUgPSBjbGFzc2VzLmpvaW4oXCIgXCIpXG5cdHJldHVybiBzZWxlY3RvckNhY2hlW3NlbGVjdG9yXSA9IHt0YWc6IHRhZywgYXR0cnM6IGF0dHJzfVxufVxuZnVuY3Rpb24gZXhlY1NlbGVjdG9yKHN0YXRlLCBhdHRycywgY2hpbGRyZW4pIHtcblx0dmFyIGhhc0F0dHJzID0gZmFsc2UsIGNoaWxkTGlzdCwgdGV4dFxuXHR2YXIgY2xhc3NOYW1lID0gYXR0cnMuY2xhc3NOYW1lIHx8IGF0dHJzLmNsYXNzXG5cdGlmICghaXNFbXB0eShzdGF0ZS5hdHRycykgJiYgIWlzRW1wdHkoYXR0cnMpKSB7XG5cdFx0dmFyIG5ld0F0dHJzID0ge31cblx0XHRmb3IodmFyIGtleSBpbiBhdHRycykge1xuXHRcdFx0aWYgKGhhc093bi5jYWxsKGF0dHJzLCBrZXkpKSB7XG5cdFx0XHRcdG5ld0F0dHJzW2tleV0gPSBhdHRyc1trZXldXG5cdFx0XHR9XG5cdFx0fVxuXHRcdGF0dHJzID0gbmV3QXR0cnNcblx0fVxuXHRmb3IgKHZhciBrZXkgaW4gc3RhdGUuYXR0cnMpIHtcblx0XHRpZiAoaGFzT3duLmNhbGwoc3RhdGUuYXR0cnMsIGtleSkpIHtcblx0XHRcdGF0dHJzW2tleV0gPSBzdGF0ZS5hdHRyc1trZXldXG5cdFx0fVxuXHR9XG5cdGlmIChjbGFzc05hbWUgIT09IHVuZGVmaW5lZCkge1xuXHRcdGlmIChhdHRycy5jbGFzcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRhdHRycy5jbGFzcyA9IHVuZGVmaW5lZFxuXHRcdFx0YXR0cnMuY2xhc3NOYW1lID0gY2xhc3NOYW1lXG5cdFx0fVxuXHRcdGlmIChzdGF0ZS5hdHRycy5jbGFzc05hbWUgIT0gbnVsbCkge1xuXHRcdFx0YXR0cnMuY2xhc3NOYW1lID0gc3RhdGUuYXR0cnMuY2xhc3NOYW1lICsgXCIgXCIgKyBjbGFzc05hbWVcblx0XHR9XG5cdH1cblx0Zm9yICh2YXIga2V5IGluIGF0dHJzKSB7XG5cdFx0aWYgKGhhc093bi5jYWxsKGF0dHJzLCBrZXkpICYmIGtleSAhPT0gXCJrZXlcIikge1xuXHRcdFx0aGFzQXR0cnMgPSB0cnVlXG5cdFx0XHRicmVha1xuXHRcdH1cblx0fVxuXHRpZiAoQXJyYXkuaXNBcnJheShjaGlsZHJlbikgJiYgY2hpbGRyZW4ubGVuZ3RoID09PSAxICYmIGNoaWxkcmVuWzBdICE9IG51bGwgJiYgY2hpbGRyZW5bMF0udGFnID09PSBcIiNcIikge1xuXHRcdHRleHQgPSBjaGlsZHJlblswXS5jaGlsZHJlblxuXHR9IGVsc2Uge1xuXHRcdGNoaWxkTGlzdCA9IGNoaWxkcmVuXG5cdH1cblx0cmV0dXJuIFZub2RlKHN0YXRlLnRhZywgYXR0cnMua2V5LCBoYXNBdHRycyA/IGF0dHJzIDogdW5kZWZpbmVkLCBjaGlsZExpc3QsIHRleHQpXG59XG5mdW5jdGlvbiBoeXBlcnNjcmlwdChzZWxlY3Rvcikge1xuXHQvLyBCZWNhdXNlIHNsb3BweSBtb2RlIHN1Y2tzXG5cdHZhciBhdHRycyA9IGFyZ3VtZW50c1sxXSwgc3RhcnQgPSAyLCBjaGlsZHJlblxuXHRpZiAoc2VsZWN0b3IgPT0gbnVsbCB8fCB0eXBlb2Ygc2VsZWN0b3IgIT09IFwic3RyaW5nXCIgJiYgdHlwZW9mIHNlbGVjdG9yICE9PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIHNlbGVjdG9yLnZpZXcgIT09IFwiZnVuY3Rpb25cIikge1xuXHRcdHRocm93IEVycm9yKFwiVGhlIHNlbGVjdG9yIG11c3QgYmUgZWl0aGVyIGEgc3RyaW5nIG9yIGEgY29tcG9uZW50LlwiKTtcblx0fVxuXHRpZiAodHlwZW9mIHNlbGVjdG9yID09PSBcInN0cmluZ1wiKSB7XG5cdFx0dmFyIGNhY2hlZCA9IHNlbGVjdG9yQ2FjaGVbc2VsZWN0b3JdIHx8IGNvbXBpbGVTZWxlY3RvcihzZWxlY3Rvcilcblx0fVxuXHRpZiAoYXR0cnMgPT0gbnVsbCkge1xuXHRcdGF0dHJzID0ge31cblx0fSBlbHNlIGlmICh0eXBlb2YgYXR0cnMgIT09IFwib2JqZWN0XCIgfHwgYXR0cnMudGFnICE9IG51bGwgfHwgQXJyYXkuaXNBcnJheShhdHRycykpIHtcblx0XHRhdHRycyA9IHt9XG5cdFx0c3RhcnQgPSAxXG5cdH1cblx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IHN0YXJ0ICsgMSkge1xuXHRcdGNoaWxkcmVuID0gYXJndW1lbnRzW3N0YXJ0XVxuXHRcdGlmICghQXJyYXkuaXNBcnJheShjaGlsZHJlbikpIGNoaWxkcmVuID0gW2NoaWxkcmVuXVxuXHR9IGVsc2Uge1xuXHRcdGNoaWxkcmVuID0gW11cblx0XHR3aGlsZSAoc3RhcnQgPCBhcmd1bWVudHMubGVuZ3RoKSBjaGlsZHJlbi5wdXNoKGFyZ3VtZW50c1tzdGFydCsrXSlcblx0fVxuXHR2YXIgbm9ybWFsaXplZCA9IFZub2RlLm5vcm1hbGl6ZUNoaWxkcmVuKGNoaWxkcmVuKVxuXHRpZiAodHlwZW9mIHNlbGVjdG9yID09PSBcInN0cmluZ1wiKSB7XG5cdFx0cmV0dXJuIGV4ZWNTZWxlY3RvcihjYWNoZWQsIGF0dHJzLCBub3JtYWxpemVkKVxuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBWbm9kZShzZWxlY3RvciwgYXR0cnMua2V5LCBhdHRycywgbm9ybWFsaXplZClcblx0fVxufVxuaHlwZXJzY3JpcHQudHJ1c3QgPSBmdW5jdGlvbihodG1sKSB7XG5cdGlmIChodG1sID09IG51bGwpIGh0bWwgPSBcIlwiXG5cdHJldHVybiBWbm9kZShcIjxcIiwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGh0bWwsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKVxufVxuaHlwZXJzY3JpcHQuZnJhZ21lbnQgPSBmdW5jdGlvbihhdHRyczEsIGNoaWxkcmVuKSB7XG5cdHJldHVybiBWbm9kZShcIltcIiwgYXR0cnMxLmtleSwgYXR0cnMxLCBWbm9kZS5ub3JtYWxpemVDaGlsZHJlbihjaGlsZHJlbiksIHVuZGVmaW5lZCwgdW5kZWZpbmVkKVxufVxudmFyIG0gPSBoeXBlcnNjcmlwdFxuLyoqIEBjb25zdHJ1Y3RvciAqL1xudmFyIFByb21pc2VQb2x5ZmlsbCA9IGZ1bmN0aW9uKGV4ZWN1dG9yKSB7XG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBQcm9taXNlUG9seWZpbGwpKSB0aHJvdyBuZXcgRXJyb3IoXCJQcm9taXNlIG11c3QgYmUgY2FsbGVkIHdpdGggYG5ld2BcIilcblx0aWYgKHR5cGVvZiBleGVjdXRvciAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiZXhlY3V0b3IgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpXG5cdHZhciBzZWxmID0gdGhpcywgcmVzb2x2ZXJzID0gW10sIHJlamVjdG9ycyA9IFtdLCByZXNvbHZlQ3VycmVudCA9IGhhbmRsZXIocmVzb2x2ZXJzLCB0cnVlKSwgcmVqZWN0Q3VycmVudCA9IGhhbmRsZXIocmVqZWN0b3JzLCBmYWxzZSlcblx0dmFyIGluc3RhbmNlID0gc2VsZi5faW5zdGFuY2UgPSB7cmVzb2x2ZXJzOiByZXNvbHZlcnMsIHJlamVjdG9yczogcmVqZWN0b3JzfVxuXHR2YXIgY2FsbEFzeW5jID0gdHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gXCJmdW5jdGlvblwiID8gc2V0SW1tZWRpYXRlIDogc2V0VGltZW91dFxuXHRmdW5jdGlvbiBoYW5kbGVyKGxpc3QsIHNob3VsZEFic29yYikge1xuXHRcdHJldHVybiBmdW5jdGlvbiBleGVjdXRlKHZhbHVlKSB7XG5cdFx0XHR2YXIgdGhlblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aWYgKHNob3VsZEFic29yYiAmJiB2YWx1ZSAhPSBudWxsICYmICh0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIpICYmIHR5cGVvZiAodGhlbiA9IHZhbHVlLnRoZW4pID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHRpZiAodmFsdWUgPT09IHNlbGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcm9taXNlIGNhbid0IGJlIHJlc29sdmVkIHcvIGl0c2VsZlwiKVxuXHRcdFx0XHRcdGV4ZWN1dGVPbmNlKHRoZW4uYmluZCh2YWx1ZSkpXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y2FsbEFzeW5jKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0aWYgKCFzaG91bGRBYnNvcmIgJiYgbGlzdC5sZW5ndGggPT09IDApIGNvbnNvbGUuZXJyb3IoXCJQb3NzaWJsZSB1bmhhbmRsZWQgcHJvbWlzZSByZWplY3Rpb246XCIsIHZhbHVlKVxuXHRcdFx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSBsaXN0W2ldKHZhbHVlKVxuXHRcdFx0XHRcdFx0cmVzb2x2ZXJzLmxlbmd0aCA9IDAsIHJlamVjdG9ycy5sZW5ndGggPSAwXG5cdFx0XHRcdFx0XHRpbnN0YW5jZS5zdGF0ZSA9IHNob3VsZEFic29yYlxuXHRcdFx0XHRcdFx0aW5zdGFuY2UucmV0cnkgPSBmdW5jdGlvbigpIHtleGVjdXRlKHZhbHVlKX1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRyZWplY3RDdXJyZW50KGUpXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdGZ1bmN0aW9uIGV4ZWN1dGVPbmNlKHRoZW4pIHtcblx0XHR2YXIgcnVucyA9IDBcblx0XHRmdW5jdGlvbiBydW4oZm4pIHtcblx0XHRcdHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0XHRpZiAocnVucysrID4gMCkgcmV0dXJuXG5cdFx0XHRcdGZuKHZhbHVlKVxuXHRcdFx0fVxuXHRcdH1cblx0XHR2YXIgb25lcnJvciA9IHJ1bihyZWplY3RDdXJyZW50KVxuXHRcdHRyeSB7dGhlbihydW4ocmVzb2x2ZUN1cnJlbnQpLCBvbmVycm9yKX0gY2F0Y2ggKGUpIHtvbmVycm9yKGUpfVxuXHR9XG5cdGV4ZWN1dGVPbmNlKGV4ZWN1dG9yKVxufVxuUHJvbWlzZVBvbHlmaWxsLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24ob25GdWxmaWxsZWQsIG9uUmVqZWN0aW9uKSB7XG5cdHZhciBzZWxmID0gdGhpcywgaW5zdGFuY2UgPSBzZWxmLl9pbnN0YW5jZVxuXHRmdW5jdGlvbiBoYW5kbGUoY2FsbGJhY2ssIGxpc3QsIG5leHQsIHN0YXRlKSB7XG5cdFx0bGlzdC5wdXNoKGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRpZiAodHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpIG5leHQodmFsdWUpXG5cdFx0XHRlbHNlIHRyeSB7cmVzb2x2ZU5leHQoY2FsbGJhY2sodmFsdWUpKX0gY2F0Y2ggKGUpIHtpZiAocmVqZWN0TmV4dCkgcmVqZWN0TmV4dChlKX1cblx0XHR9KVxuXHRcdGlmICh0eXBlb2YgaW5zdGFuY2UucmV0cnkgPT09IFwiZnVuY3Rpb25cIiAmJiBzdGF0ZSA9PT0gaW5zdGFuY2Uuc3RhdGUpIGluc3RhbmNlLnJldHJ5KClcblx0fVxuXHR2YXIgcmVzb2x2ZU5leHQsIHJlamVjdE5leHRcblx0dmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZVBvbHlmaWxsKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge3Jlc29sdmVOZXh0ID0gcmVzb2x2ZSwgcmVqZWN0TmV4dCA9IHJlamVjdH0pXG5cdGhhbmRsZShvbkZ1bGZpbGxlZCwgaW5zdGFuY2UucmVzb2x2ZXJzLCByZXNvbHZlTmV4dCwgdHJ1ZSksIGhhbmRsZShvblJlamVjdGlvbiwgaW5zdGFuY2UucmVqZWN0b3JzLCByZWplY3ROZXh0LCBmYWxzZSlcblx0cmV0dXJuIHByb21pc2Vcbn1cblByb21pc2VQb2x5ZmlsbC5wcm90b3R5cGUuY2F0Y2ggPSBmdW5jdGlvbihvblJlamVjdGlvbikge1xuXHRyZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0aW9uKVxufVxuUHJvbWlzZVBvbHlmaWxsLnJlc29sdmUgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRpZiAodmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlUG9seWZpbGwpIHJldHVybiB2YWx1ZVxuXHRyZXR1cm4gbmV3IFByb21pc2VQb2x5ZmlsbChmdW5jdGlvbihyZXNvbHZlKSB7cmVzb2x2ZSh2YWx1ZSl9KVxufVxuUHJvbWlzZVBvbHlmaWxsLnJlamVjdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdHJldHVybiBuZXcgUHJvbWlzZVBvbHlmaWxsKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge3JlamVjdCh2YWx1ZSl9KVxufVxuUHJvbWlzZVBvbHlmaWxsLmFsbCA9IGZ1bmN0aW9uKGxpc3QpIHtcblx0cmV0dXJuIG5ldyBQcm9taXNlUG9seWZpbGwoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0dmFyIHRvdGFsID0gbGlzdC5sZW5ndGgsIGNvdW50ID0gMCwgdmFsdWVzID0gW11cblx0XHRpZiAobGlzdC5sZW5ndGggPT09IDApIHJlc29sdmUoW10pXG5cdFx0ZWxzZSBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdChmdW5jdGlvbihpKSB7XG5cdFx0XHRcdGZ1bmN0aW9uIGNvbnN1bWUodmFsdWUpIHtcblx0XHRcdFx0XHRjb3VudCsrXG5cdFx0XHRcdFx0dmFsdWVzW2ldID0gdmFsdWVcblx0XHRcdFx0XHRpZiAoY291bnQgPT09IHRvdGFsKSByZXNvbHZlKHZhbHVlcylcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobGlzdFtpXSAhPSBudWxsICYmICh0eXBlb2YgbGlzdFtpXSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgbGlzdFtpXSA9PT0gXCJmdW5jdGlvblwiKSAmJiB0eXBlb2YgbGlzdFtpXS50aGVuID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHRsaXN0W2ldLnRoZW4oY29uc3VtZSwgcmVqZWN0KVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgY29uc3VtZShsaXN0W2ldKVxuXHRcdFx0fSkoaSlcblx0XHR9XG5cdH0pXG59XG5Qcm9taXNlUG9seWZpbGwucmFjZSA9IGZ1bmN0aW9uKGxpc3QpIHtcblx0cmV0dXJuIG5ldyBQcm9taXNlUG9seWZpbGwoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRsaXN0W2ldLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KVxuXHRcdH1cblx0fSlcbn1cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdGlmICh0eXBlb2Ygd2luZG93LlByb21pc2UgPT09IFwidW5kZWZpbmVkXCIpIHdpbmRvdy5Qcm9taXNlID0gUHJvbWlzZVBvbHlmaWxsXG5cdHZhciBQcm9taXNlUG9seWZpbGwgPSB3aW5kb3cuUHJvbWlzZVxufSBlbHNlIGlmICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdGlmICh0eXBlb2YgZ2xvYmFsLlByb21pc2UgPT09IFwidW5kZWZpbmVkXCIpIGdsb2JhbC5Qcm9taXNlID0gUHJvbWlzZVBvbHlmaWxsXG5cdHZhciBQcm9taXNlUG9seWZpbGwgPSBnbG9iYWwuUHJvbWlzZVxufSBlbHNlIHtcbn1cbnZhciBidWlsZFF1ZXJ5U3RyaW5nID0gZnVuY3Rpb24ob2JqZWN0KSB7XG5cdGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSAhPT0gXCJbb2JqZWN0IE9iamVjdF1cIikgcmV0dXJuIFwiXCJcblx0dmFyIGFyZ3MgPSBbXVxuXHRmb3IgKHZhciBrZXkwIGluIG9iamVjdCkge1xuXHRcdGRlc3RydWN0dXJlKGtleTAsIG9iamVjdFtrZXkwXSlcblx0fVxuXHRyZXR1cm4gYXJncy5qb2luKFwiJlwiKVxuXHRmdW5jdGlvbiBkZXN0cnVjdHVyZShrZXkwLCB2YWx1ZSkge1xuXHRcdGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRkZXN0cnVjdHVyZShrZXkwICsgXCJbXCIgKyBpICsgXCJdXCIsIHZhbHVlW2ldKVxuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgT2JqZWN0XVwiKSB7XG5cdFx0XHRmb3IgKHZhciBpIGluIHZhbHVlKSB7XG5cdFx0XHRcdGRlc3RydWN0dXJlKGtleTAgKyBcIltcIiArIGkgKyBcIl1cIiwgdmFsdWVbaV0pXG5cdFx0XHR9XG5cdFx0fVxuXHRcdGVsc2UgYXJncy5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChrZXkwKSArICh2YWx1ZSAhPSBudWxsICYmIHZhbHVlICE9PSBcIlwiID8gXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpIDogXCJcIikpXG5cdH1cbn1cbnZhciBGSUxFX1BST1RPQ09MX1JFR0VYID0gbmV3IFJlZ0V4cChcIl5maWxlOi8vXCIsIFwiaVwiKVxudmFyIF84ID0gZnVuY3Rpb24oJHdpbmRvdywgUHJvbWlzZSkge1xuXHR2YXIgY2FsbGJhY2tDb3VudCA9IDBcblx0dmFyIG9uY29tcGxldGlvblxuXHRmdW5jdGlvbiBzZXRDb21wbGV0aW9uQ2FsbGJhY2soY2FsbGJhY2spIHtvbmNvbXBsZXRpb24gPSBjYWxsYmFja31cblx0ZnVuY3Rpb24gZmluYWxpemVyKCkge1xuXHRcdHZhciBjb3VudCA9IDBcblx0XHRmdW5jdGlvbiBjb21wbGV0ZSgpIHtpZiAoLS1jb3VudCA9PT0gMCAmJiB0eXBlb2Ygb25jb21wbGV0aW9uID09PSBcImZ1bmN0aW9uXCIpIG9uY29tcGxldGlvbigpfVxuXHRcdHJldHVybiBmdW5jdGlvbiBmaW5hbGl6ZShwcm9taXNlMCkge1xuXHRcdFx0dmFyIHRoZW4wID0gcHJvbWlzZTAudGhlblxuXHRcdFx0cHJvbWlzZTAudGhlbiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb3VudCsrXG5cdFx0XHRcdHZhciBuZXh0ID0gdGhlbjAuYXBwbHkocHJvbWlzZTAsIGFyZ3VtZW50cylcblx0XHRcdFx0bmV4dC50aGVuKGNvbXBsZXRlLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0Y29tcGxldGUoKVxuXHRcdFx0XHRcdGlmIChjb3VudCA9PT0gMCkgdGhyb3cgZVxuXHRcdFx0XHR9KVxuXHRcdFx0XHRyZXR1cm4gZmluYWxpemUobmV4dClcblx0XHRcdH1cblx0XHRcdHJldHVybiBwcm9taXNlMFxuXHRcdH1cblx0fVxuXHRmdW5jdGlvbiBub3JtYWxpemUoYXJncywgZXh0cmEpIHtcblx0XHRpZiAodHlwZW9mIGFyZ3MgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdHZhciB1cmwgPSBhcmdzXG5cdFx0XHRhcmdzID0gZXh0cmEgfHwge31cblx0XHRcdGlmIChhcmdzLnVybCA9PSBudWxsKSBhcmdzLnVybCA9IHVybFxuXHRcdH1cblx0XHRyZXR1cm4gYXJnc1xuXHR9XG5cdGZ1bmN0aW9uIHJlcXVlc3QoYXJncywgZXh0cmEpIHtcblx0XHR2YXIgZmluYWxpemUgPSBmaW5hbGl6ZXIoKVxuXHRcdGFyZ3MgPSBub3JtYWxpemUoYXJncywgZXh0cmEpXG5cdFx0dmFyIHByb21pc2UwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0XHRpZiAoYXJncy5tZXRob2QgPT0gbnVsbCkgYXJncy5tZXRob2QgPSBcIkdFVFwiXG5cdFx0XHRhcmdzLm1ldGhvZCA9IGFyZ3MubWV0aG9kLnRvVXBwZXJDYXNlKClcblx0XHRcdHZhciB1c2VCb2R5ID0gKGFyZ3MubWV0aG9kID09PSBcIkdFVFwiIHx8IGFyZ3MubWV0aG9kID09PSBcIlRSQUNFXCIpID8gZmFsc2UgOiAodHlwZW9mIGFyZ3MudXNlQm9keSA9PT0gXCJib29sZWFuXCIgPyBhcmdzLnVzZUJvZHkgOiB0cnVlKVxuXHRcdFx0aWYgKHR5cGVvZiBhcmdzLnNlcmlhbGl6ZSAhPT0gXCJmdW5jdGlvblwiKSBhcmdzLnNlcmlhbGl6ZSA9IHR5cGVvZiBGb3JtRGF0YSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBhcmdzLmRhdGEgaW5zdGFuY2VvZiBGb3JtRGF0YSA/IGZ1bmN0aW9uKHZhbHVlKSB7cmV0dXJuIHZhbHVlfSA6IEpTT04uc3RyaW5naWZ5XG5cdFx0XHRpZiAodHlwZW9mIGFyZ3MuZGVzZXJpYWxpemUgIT09IFwiZnVuY3Rpb25cIikgYXJncy5kZXNlcmlhbGl6ZSA9IGRlc2VyaWFsaXplXG5cdFx0XHRpZiAodHlwZW9mIGFyZ3MuZXh0cmFjdCAhPT0gXCJmdW5jdGlvblwiKSBhcmdzLmV4dHJhY3QgPSBleHRyYWN0XG5cdFx0XHRhcmdzLnVybCA9IGludGVycG9sYXRlKGFyZ3MudXJsLCBhcmdzLmRhdGEpXG5cdFx0XHRpZiAodXNlQm9keSkgYXJncy5kYXRhID0gYXJncy5zZXJpYWxpemUoYXJncy5kYXRhKVxuXHRcdFx0ZWxzZSBhcmdzLnVybCA9IGFzc2VtYmxlKGFyZ3MudXJsLCBhcmdzLmRhdGEpXG5cdFx0XHR2YXIgeGhyID0gbmV3ICR3aW5kb3cuWE1MSHR0cFJlcXVlc3QoKSxcblx0XHRcdFx0YWJvcnRlZCA9IGZhbHNlLFxuXHRcdFx0XHRfYWJvcnQgPSB4aHIuYWJvcnRcblx0XHRcdHhoci5hYm9ydCA9IGZ1bmN0aW9uIGFib3J0KCkge1xuXHRcdFx0XHRhYm9ydGVkID0gdHJ1ZVxuXHRcdFx0XHRfYWJvcnQuY2FsbCh4aHIpXG5cdFx0XHR9XG5cdFx0XHR4aHIub3BlbihhcmdzLm1ldGhvZCwgYXJncy51cmwsIHR5cGVvZiBhcmdzLmFzeW5jID09PSBcImJvb2xlYW5cIiA/IGFyZ3MuYXN5bmMgOiB0cnVlLCB0eXBlb2YgYXJncy51c2VyID09PSBcInN0cmluZ1wiID8gYXJncy51c2VyIDogdW5kZWZpbmVkLCB0eXBlb2YgYXJncy5wYXNzd29yZCA9PT0gXCJzdHJpbmdcIiA/IGFyZ3MucGFzc3dvcmQgOiB1bmRlZmluZWQpXG5cdFx0XHRpZiAoYXJncy5zZXJpYWxpemUgPT09IEpTT04uc3RyaW5naWZ5ICYmIHVzZUJvZHkgJiYgIShhcmdzLmhlYWRlcnMgJiYgYXJncy5oZWFkZXJzLmhhc093blByb3BlcnR5KFwiQ29udGVudC1UeXBlXCIpKSkge1xuXHRcdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIilcblx0XHRcdH1cblx0XHRcdGlmIChhcmdzLmRlc2VyaWFsaXplID09PSBkZXNlcmlhbGl6ZSAmJiAhKGFyZ3MuaGVhZGVycyAmJiBhcmdzLmhlYWRlcnMuaGFzT3duUHJvcGVydHkoXCJBY2NlcHRcIikpKSB7XG5cdFx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQWNjZXB0XCIsIFwiYXBwbGljYXRpb24vanNvbiwgdGV4dC8qXCIpXG5cdFx0XHR9XG5cdFx0XHRpZiAoYXJncy53aXRoQ3JlZGVudGlhbHMpIHhoci53aXRoQ3JlZGVudGlhbHMgPSBhcmdzLndpdGhDcmVkZW50aWFsc1xuXHRcdFx0Zm9yICh2YXIga2V5IGluIGFyZ3MuaGVhZGVycykgaWYgKHt9Lmhhc093blByb3BlcnR5LmNhbGwoYXJncy5oZWFkZXJzLCBrZXkpKSB7XG5cdFx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKGtleSwgYXJncy5oZWFkZXJzW2tleV0pXG5cdFx0XHR9XG5cdFx0XHRpZiAodHlwZW9mIGFyZ3MuY29uZmlnID09PSBcImZ1bmN0aW9uXCIpIHhociA9IGFyZ3MuY29uZmlnKHhociwgYXJncykgfHwgeGhyXG5cdFx0XHR4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vIERvbid0IHRocm93IGVycm9ycyBvbiB4aHIuYWJvcnQoKS5cblx0XHRcdFx0aWYoYWJvcnRlZCkgcmV0dXJuXG5cdFx0XHRcdGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCkge1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHR2YXIgcmVzcG9uc2UgPSAoYXJncy5leHRyYWN0ICE9PSBleHRyYWN0KSA/IGFyZ3MuZXh0cmFjdCh4aHIsIGFyZ3MpIDogYXJncy5kZXNlcmlhbGl6ZShhcmdzLmV4dHJhY3QoeGhyLCBhcmdzKSlcblx0XHRcdFx0XHRcdGlmICgoeGhyLnN0YXR1cyA+PSAyMDAgJiYgeGhyLnN0YXR1cyA8IDMwMCkgfHwgeGhyLnN0YXR1cyA9PT0gMzA0IHx8IEZJTEVfUFJPVE9DT0xfUkVHRVgudGVzdChhcmdzLnVybCkpIHtcblx0XHRcdFx0XHRcdFx0cmVzb2x2ZShjYXN0KGFyZ3MudHlwZSwgcmVzcG9uc2UpKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHZhciBlcnJvciA9IG5ldyBFcnJvcih4aHIucmVzcG9uc2VUZXh0KVxuXHRcdFx0XHRcdFx0XHRmb3IgKHZhciBrZXkgaW4gcmVzcG9uc2UpIGVycm9yW2tleV0gPSByZXNwb25zZVtrZXldXG5cdFx0XHRcdFx0XHRcdHJlamVjdChlcnJvcilcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRcdHJlamVjdChlKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKHVzZUJvZHkgJiYgKGFyZ3MuZGF0YSAhPSBudWxsKSkgeGhyLnNlbmQoYXJncy5kYXRhKVxuXHRcdFx0ZWxzZSB4aHIuc2VuZCgpXG5cdFx0fSlcblx0XHRyZXR1cm4gYXJncy5iYWNrZ3JvdW5kID09PSB0cnVlID8gcHJvbWlzZTAgOiBmaW5hbGl6ZShwcm9taXNlMClcblx0fVxuXHRmdW5jdGlvbiBqc29ucChhcmdzLCBleHRyYSkge1xuXHRcdHZhciBmaW5hbGl6ZSA9IGZpbmFsaXplcigpXG5cdFx0YXJncyA9IG5vcm1hbGl6ZShhcmdzLCBleHRyYSlcblx0XHR2YXIgcHJvbWlzZTAgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcblx0XHRcdHZhciBjYWxsYmFja05hbWUgPSBhcmdzLmNhbGxiYWNrTmFtZSB8fCBcIl9taXRocmlsX1wiICsgTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMWUxNikgKyBcIl9cIiArIGNhbGxiYWNrQ291bnQrK1xuXHRcdFx0dmFyIHNjcmlwdCA9ICR3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKVxuXHRcdFx0JHdpbmRvd1tjYWxsYmFja05hbWVdID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHRzY3JpcHQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzY3JpcHQpXG5cdFx0XHRcdHJlc29sdmUoY2FzdChhcmdzLnR5cGUsIGRhdGEpKVxuXHRcdFx0XHRkZWxldGUgJHdpbmRvd1tjYWxsYmFja05hbWVdXG5cdFx0XHR9XG5cdFx0XHRzY3JpcHQub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzY3JpcHQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzY3JpcHQpXG5cdFx0XHRcdHJlamVjdChuZXcgRXJyb3IoXCJKU09OUCByZXF1ZXN0IGZhaWxlZFwiKSlcblx0XHRcdFx0ZGVsZXRlICR3aW5kb3dbY2FsbGJhY2tOYW1lXVxuXHRcdFx0fVxuXHRcdFx0aWYgKGFyZ3MuZGF0YSA9PSBudWxsKSBhcmdzLmRhdGEgPSB7fVxuXHRcdFx0YXJncy51cmwgPSBpbnRlcnBvbGF0ZShhcmdzLnVybCwgYXJncy5kYXRhKVxuXHRcdFx0YXJncy5kYXRhW2FyZ3MuY2FsbGJhY2tLZXkgfHwgXCJjYWxsYmFja1wiXSA9IGNhbGxiYWNrTmFtZVxuXHRcdFx0c2NyaXB0LnNyYyA9IGFzc2VtYmxlKGFyZ3MudXJsLCBhcmdzLmRhdGEpXG5cdFx0XHQkd2luZG93LmRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hcHBlbmRDaGlsZChzY3JpcHQpXG5cdFx0fSlcblx0XHRyZXR1cm4gYXJncy5iYWNrZ3JvdW5kID09PSB0cnVlPyBwcm9taXNlMCA6IGZpbmFsaXplKHByb21pc2UwKVxuXHR9XG5cdGZ1bmN0aW9uIGludGVycG9sYXRlKHVybCwgZGF0YSkge1xuXHRcdGlmIChkYXRhID09IG51bGwpIHJldHVybiB1cmxcblx0XHR2YXIgdG9rZW5zID0gdXJsLm1hdGNoKC86W15cXC9dKy9naSkgfHwgW11cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGtleSA9IHRva2Vuc1tpXS5zbGljZSgxKVxuXHRcdFx0aWYgKGRhdGFba2V5XSAhPSBudWxsKSB7XG5cdFx0XHRcdHVybCA9IHVybC5yZXBsYWNlKHRva2Vuc1tpXSwgZGF0YVtrZXldKVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdXJsXG5cdH1cblx0ZnVuY3Rpb24gYXNzZW1ibGUodXJsLCBkYXRhKSB7XG5cdFx0dmFyIHF1ZXJ5c3RyaW5nID0gYnVpbGRRdWVyeVN0cmluZyhkYXRhKVxuXHRcdGlmIChxdWVyeXN0cmluZyAhPT0gXCJcIikge1xuXHRcdFx0dmFyIHByZWZpeCA9IHVybC5pbmRleE9mKFwiP1wiKSA8IDAgPyBcIj9cIiA6IFwiJlwiXG5cdFx0XHR1cmwgKz0gcHJlZml4ICsgcXVlcnlzdHJpbmdcblx0XHR9XG5cdFx0cmV0dXJuIHVybFxuXHR9XG5cdGZ1bmN0aW9uIGRlc2VyaWFsaXplKGRhdGEpIHtcblx0XHR0cnkge3JldHVybiBkYXRhICE9PSBcIlwiID8gSlNPTi5wYXJzZShkYXRhKSA6IG51bGx9XG5cdFx0Y2F0Y2ggKGUpIHt0aHJvdyBuZXcgRXJyb3IoZGF0YSl9XG5cdH1cblx0ZnVuY3Rpb24gZXh0cmFjdCh4aHIpIHtyZXR1cm4geGhyLnJlc3BvbnNlVGV4dH1cblx0ZnVuY3Rpb24gY2FzdCh0eXBlMCwgZGF0YSkge1xuXHRcdGlmICh0eXBlb2YgdHlwZTAgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0aWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0ZGF0YVtpXSA9IG5ldyB0eXBlMChkYXRhW2ldKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHJldHVybiBuZXcgdHlwZTAoZGF0YSlcblx0XHR9XG5cdFx0cmV0dXJuIGRhdGFcblx0fVxuXHRyZXR1cm4ge3JlcXVlc3Q6IHJlcXVlc3QsIGpzb25wOiBqc29ucCwgc2V0Q29tcGxldGlvbkNhbGxiYWNrOiBzZXRDb21wbGV0aW9uQ2FsbGJhY2t9XG59XG52YXIgcmVxdWVzdFNlcnZpY2UgPSBfOCh3aW5kb3csIFByb21pc2VQb2x5ZmlsbClcbnZhciBjb3JlUmVuZGVyZXIgPSBmdW5jdGlvbigkd2luZG93KSB7XG5cdHZhciAkZG9jID0gJHdpbmRvdy5kb2N1bWVudFxuXHR2YXIgJGVtcHR5RnJhZ21lbnQgPSAkZG9jLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKVxuXHR2YXIgbmFtZVNwYWNlID0ge1xuXHRcdHN2ZzogXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLFxuXHRcdG1hdGg6IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OC9NYXRoL01hdGhNTFwiXG5cdH1cblx0dmFyIG9uZXZlbnRcblx0ZnVuY3Rpb24gc2V0RXZlbnRDYWxsYmFjayhjYWxsYmFjaykge3JldHVybiBvbmV2ZW50ID0gY2FsbGJhY2t9XG5cdGZ1bmN0aW9uIGdldE5hbWVTcGFjZSh2bm9kZSkge1xuXHRcdHJldHVybiB2bm9kZS5hdHRycyAmJiB2bm9kZS5hdHRycy54bWxucyB8fCBuYW1lU3BhY2Vbdm5vZGUudGFnXVxuXHR9XG5cdC8vY3JlYXRlXG5cdGZ1bmN0aW9uIGNyZWF0ZU5vZGVzKHBhcmVudCwgdm5vZGVzLCBzdGFydCwgZW5kLCBob29rcywgbmV4dFNpYmxpbmcsIG5zKSB7XG5cdFx0Zm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcblx0XHRcdHZhciB2bm9kZSA9IHZub2Rlc1tpXVxuXHRcdFx0aWYgKHZub2RlICE9IG51bGwpIHtcblx0XHRcdFx0Y3JlYXRlTm9kZShwYXJlbnQsIHZub2RlLCBob29rcywgbnMsIG5leHRTaWJsaW5nKVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRmdW5jdGlvbiBjcmVhdGVOb2RlKHBhcmVudCwgdm5vZGUsIGhvb2tzLCBucywgbmV4dFNpYmxpbmcpIHtcblx0XHR2YXIgdGFnID0gdm5vZGUudGFnXG5cdFx0aWYgKHR5cGVvZiB0YWcgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdHZub2RlLnN0YXRlID0ge31cblx0XHRcdGlmICh2bm9kZS5hdHRycyAhPSBudWxsKSBpbml0TGlmZWN5Y2xlKHZub2RlLmF0dHJzLCB2bm9kZSwgaG9va3MpXG5cdFx0XHRzd2l0Y2ggKHRhZykge1xuXHRcdFx0XHRjYXNlIFwiI1wiOiByZXR1cm4gY3JlYXRlVGV4dChwYXJlbnQsIHZub2RlLCBuZXh0U2libGluZylcblx0XHRcdFx0Y2FzZSBcIjxcIjogcmV0dXJuIGNyZWF0ZUhUTUwocGFyZW50LCB2bm9kZSwgbmV4dFNpYmxpbmcpXG5cdFx0XHRcdGNhc2UgXCJbXCI6IHJldHVybiBjcmVhdGVGcmFnbWVudChwYXJlbnQsIHZub2RlLCBob29rcywgbnMsIG5leHRTaWJsaW5nKVxuXHRcdFx0XHRkZWZhdWx0OiByZXR1cm4gY3JlYXRlRWxlbWVudChwYXJlbnQsIHZub2RlLCBob29rcywgbnMsIG5leHRTaWJsaW5nKVxuXHRcdFx0fVxuXHRcdH1cblx0XHRlbHNlIHJldHVybiBjcmVhdGVDb21wb25lbnQocGFyZW50LCB2bm9kZSwgaG9va3MsIG5zLCBuZXh0U2libGluZylcblx0fVxuXHRmdW5jdGlvbiBjcmVhdGVUZXh0KHBhcmVudCwgdm5vZGUsIG5leHRTaWJsaW5nKSB7XG5cdFx0dm5vZGUuZG9tID0gJGRvYy5jcmVhdGVUZXh0Tm9kZSh2bm9kZS5jaGlsZHJlbilcblx0XHRpbnNlcnROb2RlKHBhcmVudCwgdm5vZGUuZG9tLCBuZXh0U2libGluZylcblx0XHRyZXR1cm4gdm5vZGUuZG9tXG5cdH1cblx0ZnVuY3Rpb24gY3JlYXRlSFRNTChwYXJlbnQsIHZub2RlLCBuZXh0U2libGluZykge1xuXHRcdHZhciBtYXRjaDEgPSB2bm9kZS5jaGlsZHJlbi5tYXRjaCgvXlxccyo/PChcXHcrKS9pbSkgfHwgW11cblx0XHR2YXIgcGFyZW50MSA9IHtjYXB0aW9uOiBcInRhYmxlXCIsIHRoZWFkOiBcInRhYmxlXCIsIHRib2R5OiBcInRhYmxlXCIsIHRmb290OiBcInRhYmxlXCIsIHRyOiBcInRib2R5XCIsIHRoOiBcInRyXCIsIHRkOiBcInRyXCIsIGNvbGdyb3VwOiBcInRhYmxlXCIsIGNvbDogXCJjb2xncm91cFwifVttYXRjaDFbMV1dIHx8IFwiZGl2XCJcblx0XHR2YXIgdGVtcCA9ICRkb2MuY3JlYXRlRWxlbWVudChwYXJlbnQxKVxuXHRcdHRlbXAuaW5uZXJIVE1MID0gdm5vZGUuY2hpbGRyZW5cblx0XHR2bm9kZS5kb20gPSB0ZW1wLmZpcnN0Q2hpbGRcblx0XHR2bm9kZS5kb21TaXplID0gdGVtcC5jaGlsZE5vZGVzLmxlbmd0aFxuXHRcdHZhciBmcmFnbWVudCA9ICRkb2MuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpXG5cdFx0dmFyIGNoaWxkXG5cdFx0d2hpbGUgKGNoaWxkID0gdGVtcC5maXJzdENoaWxkKSB7XG5cdFx0XHRmcmFnbWVudC5hcHBlbmRDaGlsZChjaGlsZClcblx0XHR9XG5cdFx0aW5zZXJ0Tm9kZShwYXJlbnQsIGZyYWdtZW50LCBuZXh0U2libGluZylcblx0XHRyZXR1cm4gZnJhZ21lbnRcblx0fVxuXHRmdW5jdGlvbiBjcmVhdGVGcmFnbWVudChwYXJlbnQsIHZub2RlLCBob29rcywgbnMsIG5leHRTaWJsaW5nKSB7XG5cdFx0dmFyIGZyYWdtZW50ID0gJGRvYy5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcblx0XHRpZiAodm5vZGUuY2hpbGRyZW4gIT0gbnVsbCkge1xuXHRcdFx0dmFyIGNoaWxkcmVuID0gdm5vZGUuY2hpbGRyZW5cblx0XHRcdGNyZWF0ZU5vZGVzKGZyYWdtZW50LCBjaGlsZHJlbiwgMCwgY2hpbGRyZW4ubGVuZ3RoLCBob29rcywgbnVsbCwgbnMpXG5cdFx0fVxuXHRcdHZub2RlLmRvbSA9IGZyYWdtZW50LmZpcnN0Q2hpbGRcblx0XHR2bm9kZS5kb21TaXplID0gZnJhZ21lbnQuY2hpbGROb2Rlcy5sZW5ndGhcblx0XHRpbnNlcnROb2RlKHBhcmVudCwgZnJhZ21lbnQsIG5leHRTaWJsaW5nKVxuXHRcdHJldHVybiBmcmFnbWVudFxuXHR9XG5cdGZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQocGFyZW50LCB2bm9kZSwgaG9va3MsIG5zLCBuZXh0U2libGluZykge1xuXHRcdHZhciB0YWcgPSB2bm9kZS50YWdcblx0XHR2YXIgYXR0cnMyID0gdm5vZGUuYXR0cnNcblx0XHR2YXIgaXMgPSBhdHRyczIgJiYgYXR0cnMyLmlzXG5cdFx0bnMgPSBnZXROYW1lU3BhY2Uodm5vZGUpIHx8IG5zXG5cdFx0dmFyIGVsZW1lbnQgPSBucyA/XG5cdFx0XHRpcyA/ICRkb2MuY3JlYXRlRWxlbWVudE5TKG5zLCB0YWcsIHtpczogaXN9KSA6ICRkb2MuY3JlYXRlRWxlbWVudE5TKG5zLCB0YWcpIDpcblx0XHRcdGlzID8gJGRvYy5jcmVhdGVFbGVtZW50KHRhZywge2lzOiBpc30pIDogJGRvYy5jcmVhdGVFbGVtZW50KHRhZylcblx0XHR2bm9kZS5kb20gPSBlbGVtZW50XG5cdFx0aWYgKGF0dHJzMiAhPSBudWxsKSB7XG5cdFx0XHRzZXRBdHRycyh2bm9kZSwgYXR0cnMyLCBucylcblx0XHR9XG5cdFx0aW5zZXJ0Tm9kZShwYXJlbnQsIGVsZW1lbnQsIG5leHRTaWJsaW5nKVxuXHRcdGlmICh2bm9kZS5hdHRycyAhPSBudWxsICYmIHZub2RlLmF0dHJzLmNvbnRlbnRlZGl0YWJsZSAhPSBudWxsKSB7XG5cdFx0XHRzZXRDb250ZW50RWRpdGFibGUodm5vZGUpXG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0aWYgKHZub2RlLnRleHQgIT0gbnVsbCkge1xuXHRcdFx0XHRpZiAodm5vZGUudGV4dCAhPT0gXCJcIikgZWxlbWVudC50ZXh0Q29udGVudCA9IHZub2RlLnRleHRcblx0XHRcdFx0ZWxzZSB2bm9kZS5jaGlsZHJlbiA9IFtWbm9kZShcIiNcIiwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHZub2RlLnRleHQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKV1cblx0XHRcdH1cblx0XHRcdGlmICh2bm9kZS5jaGlsZHJlbiAhPSBudWxsKSB7XG5cdFx0XHRcdHZhciBjaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuXG5cdFx0XHRcdGNyZWF0ZU5vZGVzKGVsZW1lbnQsIGNoaWxkcmVuLCAwLCBjaGlsZHJlbi5sZW5ndGgsIGhvb2tzLCBudWxsLCBucylcblx0XHRcdFx0c2V0TGF0ZUF0dHJzKHZub2RlKVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gZWxlbWVudFxuXHR9XG5cdGZ1bmN0aW9uIGluaXRDb21wb25lbnQodm5vZGUsIGhvb2tzKSB7XG5cdFx0dmFyIHNlbnRpbmVsXG5cdFx0aWYgKHR5cGVvZiB2bm9kZS50YWcudmlldyA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHR2bm9kZS5zdGF0ZSA9IE9iamVjdC5jcmVhdGUodm5vZGUudGFnKVxuXHRcdFx0c2VudGluZWwgPSB2bm9kZS5zdGF0ZS52aWV3XG5cdFx0XHRpZiAoc2VudGluZWwuJCRyZWVudHJhbnRMb2NrJCQgIT0gbnVsbCkgcmV0dXJuICRlbXB0eUZyYWdtZW50XG5cdFx0XHRzZW50aW5lbC4kJHJlZW50cmFudExvY2skJCA9IHRydWVcblx0XHR9IGVsc2Uge1xuXHRcdFx0dm5vZGUuc3RhdGUgPSB2b2lkIDBcblx0XHRcdHNlbnRpbmVsID0gdm5vZGUudGFnXG5cdFx0XHRpZiAoc2VudGluZWwuJCRyZWVudHJhbnRMb2NrJCQgIT0gbnVsbCkgcmV0dXJuICRlbXB0eUZyYWdtZW50XG5cdFx0XHRzZW50aW5lbC4kJHJlZW50cmFudExvY2skJCA9IHRydWVcblx0XHRcdHZub2RlLnN0YXRlID0gKHZub2RlLnRhZy5wcm90b3R5cGUgIT0gbnVsbCAmJiB0eXBlb2Ygdm5vZGUudGFnLnByb3RvdHlwZS52aWV3ID09PSBcImZ1bmN0aW9uXCIpID8gbmV3IHZub2RlLnRhZyh2bm9kZSkgOiB2bm9kZS50YWcodm5vZGUpXG5cdFx0fVxuXHRcdHZub2RlLl9zdGF0ZSA9IHZub2RlLnN0YXRlXG5cdFx0aWYgKHZub2RlLmF0dHJzICE9IG51bGwpIGluaXRMaWZlY3ljbGUodm5vZGUuYXR0cnMsIHZub2RlLCBob29rcylcblx0XHRpbml0TGlmZWN5Y2xlKHZub2RlLl9zdGF0ZSwgdm5vZGUsIGhvb2tzKVxuXHRcdHZub2RlLmluc3RhbmNlID0gVm5vZGUubm9ybWFsaXplKHZub2RlLl9zdGF0ZS52aWV3LmNhbGwodm5vZGUuc3RhdGUsIHZub2RlKSlcblx0XHRpZiAodm5vZGUuaW5zdGFuY2UgPT09IHZub2RlKSB0aHJvdyBFcnJvcihcIkEgdmlldyBjYW5ub3QgcmV0dXJuIHRoZSB2bm9kZSBpdCByZWNlaXZlZCBhcyBhcmd1bWVudFwiKVxuXHRcdHNlbnRpbmVsLiQkcmVlbnRyYW50TG9jayQkID0gbnVsbFxuXHR9XG5cdGZ1bmN0aW9uIGNyZWF0ZUNvbXBvbmVudChwYXJlbnQsIHZub2RlLCBob29rcywgbnMsIG5leHRTaWJsaW5nKSB7XG5cdFx0aW5pdENvbXBvbmVudCh2bm9kZSwgaG9va3MpXG5cdFx0aWYgKHZub2RlLmluc3RhbmNlICE9IG51bGwpIHtcblx0XHRcdHZhciBlbGVtZW50ID0gY3JlYXRlTm9kZShwYXJlbnQsIHZub2RlLmluc3RhbmNlLCBob29rcywgbnMsIG5leHRTaWJsaW5nKVxuXHRcdFx0dm5vZGUuZG9tID0gdm5vZGUuaW5zdGFuY2UuZG9tXG5cdFx0XHR2bm9kZS5kb21TaXplID0gdm5vZGUuZG9tICE9IG51bGwgPyB2bm9kZS5pbnN0YW5jZS5kb21TaXplIDogMFxuXHRcdFx0aW5zZXJ0Tm9kZShwYXJlbnQsIGVsZW1lbnQsIG5leHRTaWJsaW5nKVxuXHRcdFx0cmV0dXJuIGVsZW1lbnRcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHR2bm9kZS5kb21TaXplID0gMFxuXHRcdFx0cmV0dXJuICRlbXB0eUZyYWdtZW50XG5cdFx0fVxuXHR9XG5cdC8vdXBkYXRlXG5cdGZ1bmN0aW9uIHVwZGF0ZU5vZGVzKHBhcmVudCwgb2xkLCB2bm9kZXMsIHJlY3ljbGluZywgaG9va3MsIG5leHRTaWJsaW5nLCBucykge1xuXHRcdGlmIChvbGQgPT09IHZub2RlcyB8fCBvbGQgPT0gbnVsbCAmJiB2bm9kZXMgPT0gbnVsbCkgcmV0dXJuXG5cdFx0ZWxzZSBpZiAob2xkID09IG51bGwpIGNyZWF0ZU5vZGVzKHBhcmVudCwgdm5vZGVzLCAwLCB2bm9kZXMubGVuZ3RoLCBob29rcywgbmV4dFNpYmxpbmcsIG5zKVxuXHRcdGVsc2UgaWYgKHZub2RlcyA9PSBudWxsKSByZW1vdmVOb2RlcyhvbGQsIDAsIG9sZC5sZW5ndGgsIHZub2Rlcylcblx0XHRlbHNlIHtcblx0XHRcdGlmIChvbGQubGVuZ3RoID09PSB2bm9kZXMubGVuZ3RoKSB7XG5cdFx0XHRcdHZhciBpc1Vua2V5ZWQgPSBmYWxzZVxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHZub2Rlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdGlmICh2bm9kZXNbaV0gIT0gbnVsbCAmJiBvbGRbaV0gIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0aXNVbmtleWVkID0gdm5vZGVzW2ldLmtleSA9PSBudWxsICYmIG9sZFtpXS5rZXkgPT0gbnVsbFxuXHRcdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGlzVW5rZXllZCkge1xuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgb2xkLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0XHRpZiAob2xkW2ldID09PSB2bm9kZXNbaV0pIGNvbnRpbnVlXG5cdFx0XHRcdFx0XHRlbHNlIGlmIChvbGRbaV0gPT0gbnVsbCAmJiB2bm9kZXNbaV0gIT0gbnVsbCkgY3JlYXRlTm9kZShwYXJlbnQsIHZub2Rlc1tpXSwgaG9va3MsIG5zLCBnZXROZXh0U2libGluZyhvbGQsIGkgKyAxLCBuZXh0U2libGluZykpXG5cdFx0XHRcdFx0XHRlbHNlIGlmICh2bm9kZXNbaV0gPT0gbnVsbCkgcmVtb3ZlTm9kZXMob2xkLCBpLCBpICsgMSwgdm5vZGVzKVxuXHRcdFx0XHRcdFx0ZWxzZSB1cGRhdGVOb2RlKHBhcmVudCwgb2xkW2ldLCB2bm9kZXNbaV0sIGhvb2tzLCBnZXROZXh0U2libGluZyhvbGQsIGkgKyAxLCBuZXh0U2libGluZyksIHJlY3ljbGluZywgbnMpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZWN5Y2xpbmcgPSByZWN5Y2xpbmcgfHwgaXNSZWN5Y2xhYmxlKG9sZCwgdm5vZGVzKVxuXHRcdFx0aWYgKHJlY3ljbGluZykge1xuXHRcdFx0XHR2YXIgcG9vbCA9IG9sZC5wb29sXG5cdFx0XHRcdG9sZCA9IG9sZC5jb25jYXQob2xkLnBvb2wpXG5cdFx0XHR9XG5cdFx0XHR2YXIgb2xkU3RhcnQgPSAwLCBzdGFydCA9IDAsIG9sZEVuZCA9IG9sZC5sZW5ndGggLSAxLCBlbmQgPSB2bm9kZXMubGVuZ3RoIC0gMSwgbWFwXG5cdFx0XHR3aGlsZSAob2xkRW5kID49IG9sZFN0YXJ0ICYmIGVuZCA+PSBzdGFydCkge1xuXHRcdFx0XHR2YXIgbyA9IG9sZFtvbGRTdGFydF0sIHYgPSB2bm9kZXNbc3RhcnRdXG5cdFx0XHRcdGlmIChvID09PSB2ICYmICFyZWN5Y2xpbmcpIG9sZFN0YXJ0KyssIHN0YXJ0Kytcblx0XHRcdFx0ZWxzZSBpZiAobyA9PSBudWxsKSBvbGRTdGFydCsrXG5cdFx0XHRcdGVsc2UgaWYgKHYgPT0gbnVsbCkgc3RhcnQrK1xuXHRcdFx0XHRlbHNlIGlmIChvLmtleSA9PT0gdi5rZXkpIHtcblx0XHRcdFx0XHR2YXIgc2hvdWxkUmVjeWNsZSA9IChwb29sICE9IG51bGwgJiYgb2xkU3RhcnQgPj0gb2xkLmxlbmd0aCAtIHBvb2wubGVuZ3RoKSB8fCAoKHBvb2wgPT0gbnVsbCkgJiYgcmVjeWNsaW5nKVxuXHRcdFx0XHRcdG9sZFN0YXJ0KyssIHN0YXJ0Kytcblx0XHRcdFx0XHR1cGRhdGVOb2RlKHBhcmVudCwgbywgdiwgaG9va3MsIGdldE5leHRTaWJsaW5nKG9sZCwgb2xkU3RhcnQsIG5leHRTaWJsaW5nKSwgc2hvdWxkUmVjeWNsZSwgbnMpXG5cdFx0XHRcdFx0aWYgKHJlY3ljbGluZyAmJiBvLnRhZyA9PT0gdi50YWcpIGluc2VydE5vZGUocGFyZW50LCB0b0ZyYWdtZW50KG8pLCBuZXh0U2libGluZylcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHR2YXIgbyA9IG9sZFtvbGRFbmRdXG5cdFx0XHRcdFx0aWYgKG8gPT09IHYgJiYgIXJlY3ljbGluZykgb2xkRW5kLS0sIHN0YXJ0Kytcblx0XHRcdFx0XHRlbHNlIGlmIChvID09IG51bGwpIG9sZEVuZC0tXG5cdFx0XHRcdFx0ZWxzZSBpZiAodiA9PSBudWxsKSBzdGFydCsrXG5cdFx0XHRcdFx0ZWxzZSBpZiAoby5rZXkgPT09IHYua2V5KSB7XG5cdFx0XHRcdFx0XHR2YXIgc2hvdWxkUmVjeWNsZSA9IChwb29sICE9IG51bGwgJiYgb2xkRW5kID49IG9sZC5sZW5ndGggLSBwb29sLmxlbmd0aCkgfHwgKChwb29sID09IG51bGwpICYmIHJlY3ljbGluZylcblx0XHRcdFx0XHRcdHVwZGF0ZU5vZGUocGFyZW50LCBvLCB2LCBob29rcywgZ2V0TmV4dFNpYmxpbmcob2xkLCBvbGRFbmQgKyAxLCBuZXh0U2libGluZyksIHNob3VsZFJlY3ljbGUsIG5zKVxuXHRcdFx0XHRcdFx0aWYgKHJlY3ljbGluZyB8fCBzdGFydCA8IGVuZCkgaW5zZXJ0Tm9kZShwYXJlbnQsIHRvRnJhZ21lbnQobyksIGdldE5leHRTaWJsaW5nKG9sZCwgb2xkU3RhcnQsIG5leHRTaWJsaW5nKSlcblx0XHRcdFx0XHRcdG9sZEVuZC0tLCBzdGFydCsrXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgYnJlYWtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0d2hpbGUgKG9sZEVuZCA+PSBvbGRTdGFydCAmJiBlbmQgPj0gc3RhcnQpIHtcblx0XHRcdFx0dmFyIG8gPSBvbGRbb2xkRW5kXSwgdiA9IHZub2Rlc1tlbmRdXG5cdFx0XHRcdGlmIChvID09PSB2ICYmICFyZWN5Y2xpbmcpIG9sZEVuZC0tLCBlbmQtLVxuXHRcdFx0XHRlbHNlIGlmIChvID09IG51bGwpIG9sZEVuZC0tXG5cdFx0XHRcdGVsc2UgaWYgKHYgPT0gbnVsbCkgZW5kLS1cblx0XHRcdFx0ZWxzZSBpZiAoby5rZXkgPT09IHYua2V5KSB7XG5cdFx0XHRcdFx0dmFyIHNob3VsZFJlY3ljbGUgPSAocG9vbCAhPSBudWxsICYmIG9sZEVuZCA+PSBvbGQubGVuZ3RoIC0gcG9vbC5sZW5ndGgpIHx8ICgocG9vbCA9PSBudWxsKSAmJiByZWN5Y2xpbmcpXG5cdFx0XHRcdFx0dXBkYXRlTm9kZShwYXJlbnQsIG8sIHYsIGhvb2tzLCBnZXROZXh0U2libGluZyhvbGQsIG9sZEVuZCArIDEsIG5leHRTaWJsaW5nKSwgc2hvdWxkUmVjeWNsZSwgbnMpXG5cdFx0XHRcdFx0aWYgKHJlY3ljbGluZyAmJiBvLnRhZyA9PT0gdi50YWcpIGluc2VydE5vZGUocGFyZW50LCB0b0ZyYWdtZW50KG8pLCBuZXh0U2libGluZylcblx0XHRcdFx0XHRpZiAoby5kb20gIT0gbnVsbCkgbmV4dFNpYmxpbmcgPSBvLmRvbVxuXHRcdFx0XHRcdG9sZEVuZC0tLCBlbmQtLVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGlmICghbWFwKSBtYXAgPSBnZXRLZXlNYXAob2xkLCBvbGRFbmQpXG5cdFx0XHRcdFx0aWYgKHYgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0dmFyIG9sZEluZGV4ID0gbWFwW3Yua2V5XVxuXHRcdFx0XHRcdFx0aWYgKG9sZEluZGV4ICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0dmFyIG1vdmFibGUgPSBvbGRbb2xkSW5kZXhdXG5cdFx0XHRcdFx0XHRcdHZhciBzaG91bGRSZWN5Y2xlID0gKHBvb2wgIT0gbnVsbCAmJiBvbGRJbmRleCA+PSBvbGQubGVuZ3RoIC0gcG9vbC5sZW5ndGgpIHx8ICgocG9vbCA9PSBudWxsKSAmJiByZWN5Y2xpbmcpXG5cdFx0XHRcdFx0XHRcdHVwZGF0ZU5vZGUocGFyZW50LCBtb3ZhYmxlLCB2LCBob29rcywgZ2V0TmV4dFNpYmxpbmcob2xkLCBvbGRFbmQgKyAxLCBuZXh0U2libGluZyksIHJlY3ljbGluZywgbnMpXG5cdFx0XHRcdFx0XHRcdGluc2VydE5vZGUocGFyZW50LCB0b0ZyYWdtZW50KG1vdmFibGUpLCBuZXh0U2libGluZylcblx0XHRcdFx0XHRcdFx0b2xkW29sZEluZGV4XS5za2lwID0gdHJ1ZVxuXHRcdFx0XHRcdFx0XHRpZiAobW92YWJsZS5kb20gIT0gbnVsbCkgbmV4dFNpYmxpbmcgPSBtb3ZhYmxlLmRvbVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHZhciBkb20gPSBjcmVhdGVOb2RlKHBhcmVudCwgdiwgaG9va3MsIG5zLCBuZXh0U2libGluZylcblx0XHRcdFx0XHRcdFx0bmV4dFNpYmxpbmcgPSBkb21cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZW5kLS1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZW5kIDwgc3RhcnQpIGJyZWFrXG5cdFx0XHR9XG5cdFx0XHRjcmVhdGVOb2RlcyhwYXJlbnQsIHZub2Rlcywgc3RhcnQsIGVuZCArIDEsIGhvb2tzLCBuZXh0U2libGluZywgbnMpXG5cdFx0XHRyZW1vdmVOb2RlcyhvbGQsIG9sZFN0YXJ0LCBvbGRFbmQgKyAxLCB2bm9kZXMpXG5cdFx0fVxuXHR9XG5cdGZ1bmN0aW9uIHVwZGF0ZU5vZGUocGFyZW50LCBvbGQsIHZub2RlLCBob29rcywgbmV4dFNpYmxpbmcsIHJlY3ljbGluZywgbnMpIHtcblx0XHR2YXIgb2xkVGFnID0gb2xkLnRhZywgdGFnID0gdm5vZGUudGFnXG5cdFx0aWYgKG9sZFRhZyA9PT0gdGFnKSB7XG5cdFx0XHR2bm9kZS5zdGF0ZSA9IG9sZC5zdGF0ZVxuXHRcdFx0dm5vZGUuX3N0YXRlID0gb2xkLl9zdGF0ZVxuXHRcdFx0dm5vZGUuZXZlbnRzID0gb2xkLmV2ZW50c1xuXHRcdFx0aWYgKCFyZWN5Y2xpbmcgJiYgc2hvdWxkTm90VXBkYXRlKHZub2RlLCBvbGQpKSByZXR1cm5cblx0XHRcdGlmICh0eXBlb2Ygb2xkVGFnID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdGlmICh2bm9kZS5hdHRycyAhPSBudWxsKSB7XG5cdFx0XHRcdFx0aWYgKHJlY3ljbGluZykge1xuXHRcdFx0XHRcdFx0dm5vZGUuc3RhdGUgPSB7fVxuXHRcdFx0XHRcdFx0aW5pdExpZmVjeWNsZSh2bm9kZS5hdHRycywgdm5vZGUsIGhvb2tzKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHVwZGF0ZUxpZmVjeWNsZSh2bm9kZS5hdHRycywgdm5vZGUsIGhvb2tzKVxuXHRcdFx0XHR9XG5cdFx0XHRcdHN3aXRjaCAob2xkVGFnKSB7XG5cdFx0XHRcdFx0Y2FzZSBcIiNcIjogdXBkYXRlVGV4dChvbGQsIHZub2RlKTsgYnJlYWtcblx0XHRcdFx0XHRjYXNlIFwiPFwiOiB1cGRhdGVIVE1MKHBhcmVudCwgb2xkLCB2bm9kZSwgbmV4dFNpYmxpbmcpOyBicmVha1xuXHRcdFx0XHRcdGNhc2UgXCJbXCI6IHVwZGF0ZUZyYWdtZW50KHBhcmVudCwgb2xkLCB2bm9kZSwgcmVjeWNsaW5nLCBob29rcywgbmV4dFNpYmxpbmcsIG5zKTsgYnJlYWtcblx0XHRcdFx0XHRkZWZhdWx0OiB1cGRhdGVFbGVtZW50KG9sZCwgdm5vZGUsIHJlY3ljbGluZywgaG9va3MsIG5zKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHVwZGF0ZUNvbXBvbmVudChwYXJlbnQsIG9sZCwgdm5vZGUsIGhvb2tzLCBuZXh0U2libGluZywgcmVjeWNsaW5nLCBucylcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRyZW1vdmVOb2RlKG9sZCwgbnVsbClcblx0XHRcdGNyZWF0ZU5vZGUocGFyZW50LCB2bm9kZSwgaG9va3MsIG5zLCBuZXh0U2libGluZylcblx0XHR9XG5cdH1cblx0ZnVuY3Rpb24gdXBkYXRlVGV4dChvbGQsIHZub2RlKSB7XG5cdFx0aWYgKG9sZC5jaGlsZHJlbi50b1N0cmluZygpICE9PSB2bm9kZS5jaGlsZHJlbi50b1N0cmluZygpKSB7XG5cdFx0XHRvbGQuZG9tLm5vZGVWYWx1ZSA9IHZub2RlLmNoaWxkcmVuXG5cdFx0fVxuXHRcdHZub2RlLmRvbSA9IG9sZC5kb21cblx0fVxuXHRmdW5jdGlvbiB1cGRhdGVIVE1MKHBhcmVudCwgb2xkLCB2bm9kZSwgbmV4dFNpYmxpbmcpIHtcblx0XHRpZiAob2xkLmNoaWxkcmVuICE9PSB2bm9kZS5jaGlsZHJlbikge1xuXHRcdFx0dG9GcmFnbWVudChvbGQpXG5cdFx0XHRjcmVhdGVIVE1MKHBhcmVudCwgdm5vZGUsIG5leHRTaWJsaW5nKVxuXHRcdH1cblx0XHRlbHNlIHZub2RlLmRvbSA9IG9sZC5kb20sIHZub2RlLmRvbVNpemUgPSBvbGQuZG9tU2l6ZVxuXHR9XG5cdGZ1bmN0aW9uIHVwZGF0ZUZyYWdtZW50KHBhcmVudCwgb2xkLCB2bm9kZSwgcmVjeWNsaW5nLCBob29rcywgbmV4dFNpYmxpbmcsIG5zKSB7XG5cdFx0dXBkYXRlTm9kZXMocGFyZW50LCBvbGQuY2hpbGRyZW4sIHZub2RlLmNoaWxkcmVuLCByZWN5Y2xpbmcsIGhvb2tzLCBuZXh0U2libGluZywgbnMpXG5cdFx0dmFyIGRvbVNpemUgPSAwLCBjaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuXG5cdFx0dm5vZGUuZG9tID0gbnVsbFxuXHRcdGlmIChjaGlsZHJlbiAhPSBudWxsKSB7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG5cdFx0XHRcdGlmIChjaGlsZCAhPSBudWxsICYmIGNoaWxkLmRvbSAhPSBudWxsKSB7XG5cdFx0XHRcdFx0aWYgKHZub2RlLmRvbSA9PSBudWxsKSB2bm9kZS5kb20gPSBjaGlsZC5kb21cblx0XHRcdFx0XHRkb21TaXplICs9IGNoaWxkLmRvbVNpemUgfHwgMVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoZG9tU2l6ZSAhPT0gMSkgdm5vZGUuZG9tU2l6ZSA9IGRvbVNpemVcblx0XHR9XG5cdH1cblx0ZnVuY3Rpb24gdXBkYXRlRWxlbWVudChvbGQsIHZub2RlLCByZWN5Y2xpbmcsIGhvb2tzLCBucykge1xuXHRcdHZhciBlbGVtZW50ID0gdm5vZGUuZG9tID0gb2xkLmRvbVxuXHRcdG5zID0gZ2V0TmFtZVNwYWNlKHZub2RlKSB8fCBuc1xuXHRcdGlmICh2bm9kZS50YWcgPT09IFwidGV4dGFyZWFcIikge1xuXHRcdFx0aWYgKHZub2RlLmF0dHJzID09IG51bGwpIHZub2RlLmF0dHJzID0ge31cblx0XHRcdGlmICh2bm9kZS50ZXh0ICE9IG51bGwpIHtcblx0XHRcdFx0dm5vZGUuYXR0cnMudmFsdWUgPSB2bm9kZS50ZXh0IC8vRklYTUUgaGFuZGxlMCBtdWx0aXBsZSBjaGlsZHJlblxuXHRcdFx0XHR2bm9kZS50ZXh0ID0gdW5kZWZpbmVkXG5cdFx0XHR9XG5cdFx0fVxuXHRcdHVwZGF0ZUF0dHJzKHZub2RlLCBvbGQuYXR0cnMsIHZub2RlLmF0dHJzLCBucylcblx0XHRpZiAodm5vZGUuYXR0cnMgIT0gbnVsbCAmJiB2bm9kZS5hdHRycy5jb250ZW50ZWRpdGFibGUgIT0gbnVsbCkge1xuXHRcdFx0c2V0Q29udGVudEVkaXRhYmxlKHZub2RlKVxuXHRcdH1cblx0XHRlbHNlIGlmIChvbGQudGV4dCAhPSBudWxsICYmIHZub2RlLnRleHQgIT0gbnVsbCAmJiB2bm9kZS50ZXh0ICE9PSBcIlwiKSB7XG5cdFx0XHRpZiAob2xkLnRleHQudG9TdHJpbmcoKSAhPT0gdm5vZGUudGV4dC50b1N0cmluZygpKSBvbGQuZG9tLmZpcnN0Q2hpbGQubm9kZVZhbHVlID0gdm5vZGUudGV4dFxuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGlmIChvbGQudGV4dCAhPSBudWxsKSBvbGQuY2hpbGRyZW4gPSBbVm5vZGUoXCIjXCIsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBvbGQudGV4dCwgdW5kZWZpbmVkLCBvbGQuZG9tLmZpcnN0Q2hpbGQpXVxuXHRcdFx0aWYgKHZub2RlLnRleHQgIT0gbnVsbCkgdm5vZGUuY2hpbGRyZW4gPSBbVm5vZGUoXCIjXCIsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB2bm9kZS50ZXh0LCB1bmRlZmluZWQsIHVuZGVmaW5lZCldXG5cdFx0XHR1cGRhdGVOb2RlcyhlbGVtZW50LCBvbGQuY2hpbGRyZW4sIHZub2RlLmNoaWxkcmVuLCByZWN5Y2xpbmcsIGhvb2tzLCBudWxsLCBucylcblx0XHR9XG5cdH1cblx0ZnVuY3Rpb24gdXBkYXRlQ29tcG9uZW50KHBhcmVudCwgb2xkLCB2bm9kZSwgaG9va3MsIG5leHRTaWJsaW5nLCByZWN5Y2xpbmcsIG5zKSB7XG5cdFx0aWYgKHJlY3ljbGluZykge1xuXHRcdFx0aW5pdENvbXBvbmVudCh2bm9kZSwgaG9va3MpXG5cdFx0fSBlbHNlIHtcblx0XHRcdHZub2RlLmluc3RhbmNlID0gVm5vZGUubm9ybWFsaXplKHZub2RlLl9zdGF0ZS52aWV3LmNhbGwodm5vZGUuc3RhdGUsIHZub2RlKSlcblx0XHRcdGlmICh2bm9kZS5pbnN0YW5jZSA9PT0gdm5vZGUpIHRocm93IEVycm9yKFwiQSB2aWV3IGNhbm5vdCByZXR1cm4gdGhlIHZub2RlIGl0IHJlY2VpdmVkIGFzIGFyZ3VtZW50XCIpXG5cdFx0XHRpZiAodm5vZGUuYXR0cnMgIT0gbnVsbCkgdXBkYXRlTGlmZWN5Y2xlKHZub2RlLmF0dHJzLCB2bm9kZSwgaG9va3MpXG5cdFx0XHR1cGRhdGVMaWZlY3ljbGUodm5vZGUuX3N0YXRlLCB2bm9kZSwgaG9va3MpXG5cdFx0fVxuXHRcdGlmICh2bm9kZS5pbnN0YW5jZSAhPSBudWxsKSB7XG5cdFx0XHRpZiAob2xkLmluc3RhbmNlID09IG51bGwpIGNyZWF0ZU5vZGUocGFyZW50LCB2bm9kZS5pbnN0YW5jZSwgaG9va3MsIG5zLCBuZXh0U2libGluZylcblx0XHRcdGVsc2UgdXBkYXRlTm9kZShwYXJlbnQsIG9sZC5pbnN0YW5jZSwgdm5vZGUuaW5zdGFuY2UsIGhvb2tzLCBuZXh0U2libGluZywgcmVjeWNsaW5nLCBucylcblx0XHRcdHZub2RlLmRvbSA9IHZub2RlLmluc3RhbmNlLmRvbVxuXHRcdFx0dm5vZGUuZG9tU2l6ZSA9IHZub2RlLmluc3RhbmNlLmRvbVNpemVcblx0XHR9XG5cdFx0ZWxzZSBpZiAob2xkLmluc3RhbmNlICE9IG51bGwpIHtcblx0XHRcdHJlbW92ZU5vZGUob2xkLmluc3RhbmNlLCBudWxsKVxuXHRcdFx0dm5vZGUuZG9tID0gdW5kZWZpbmVkXG5cdFx0XHR2bm9kZS5kb21TaXplID0gMFxuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdHZub2RlLmRvbSA9IG9sZC5kb21cblx0XHRcdHZub2RlLmRvbVNpemUgPSBvbGQuZG9tU2l6ZVxuXHRcdH1cblx0fVxuXHRmdW5jdGlvbiBpc1JlY3ljbGFibGUob2xkLCB2bm9kZXMpIHtcblx0XHRpZiAob2xkLnBvb2wgIT0gbnVsbCAmJiBNYXRoLmFicyhvbGQucG9vbC5sZW5ndGggLSB2bm9kZXMubGVuZ3RoKSA8PSBNYXRoLmFicyhvbGQubGVuZ3RoIC0gdm5vZGVzLmxlbmd0aCkpIHtcblx0XHRcdHZhciBvbGRDaGlsZHJlbkxlbmd0aCA9IG9sZFswXSAmJiBvbGRbMF0uY2hpbGRyZW4gJiYgb2xkWzBdLmNoaWxkcmVuLmxlbmd0aCB8fCAwXG5cdFx0XHR2YXIgcG9vbENoaWxkcmVuTGVuZ3RoID0gb2xkLnBvb2xbMF0gJiYgb2xkLnBvb2xbMF0uY2hpbGRyZW4gJiYgb2xkLnBvb2xbMF0uY2hpbGRyZW4ubGVuZ3RoIHx8IDBcblx0XHRcdHZhciB2bm9kZXNDaGlsZHJlbkxlbmd0aCA9IHZub2Rlc1swXSAmJiB2bm9kZXNbMF0uY2hpbGRyZW4gJiYgdm5vZGVzWzBdLmNoaWxkcmVuLmxlbmd0aCB8fCAwXG5cdFx0XHRpZiAoTWF0aC5hYnMocG9vbENoaWxkcmVuTGVuZ3RoIC0gdm5vZGVzQ2hpbGRyZW5MZW5ndGgpIDw9IE1hdGguYWJzKG9sZENoaWxkcmVuTGVuZ3RoIC0gdm5vZGVzQ2hpbGRyZW5MZW5ndGgpKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlXG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZVxuXHR9XG5cdGZ1bmN0aW9uIGdldEtleU1hcCh2bm9kZXMsIGVuZCkge1xuXHRcdHZhciBtYXAgPSB7fSwgaSA9IDBcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGVuZDsgaSsrKSB7XG5cdFx0XHR2YXIgdm5vZGUgPSB2bm9kZXNbaV1cblx0XHRcdGlmICh2bm9kZSAhPSBudWxsKSB7XG5cdFx0XHRcdHZhciBrZXkyID0gdm5vZGUua2V5XG5cdFx0XHRcdGlmIChrZXkyICE9IG51bGwpIG1hcFtrZXkyXSA9IGlcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG1hcFxuXHR9XG5cdGZ1bmN0aW9uIHRvRnJhZ21lbnQodm5vZGUpIHtcblx0XHR2YXIgY291bnQwID0gdm5vZGUuZG9tU2l6ZVxuXHRcdGlmIChjb3VudDAgIT0gbnVsbCB8fCB2bm9kZS5kb20gPT0gbnVsbCkge1xuXHRcdFx0dmFyIGZyYWdtZW50ID0gJGRvYy5jcmVhdGVEb2N1bWVudEZyYWdtZW50KClcblx0XHRcdGlmIChjb3VudDAgPiAwKSB7XG5cdFx0XHRcdHZhciBkb20gPSB2bm9kZS5kb21cblx0XHRcdFx0d2hpbGUgKC0tY291bnQwKSBmcmFnbWVudC5hcHBlbmRDaGlsZChkb20ubmV4dFNpYmxpbmcpXG5cdFx0XHRcdGZyYWdtZW50Lmluc2VydEJlZm9yZShkb20sIGZyYWdtZW50LmZpcnN0Q2hpbGQpXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZnJhZ21lbnRcblx0XHR9XG5cdFx0ZWxzZSByZXR1cm4gdm5vZGUuZG9tXG5cdH1cblx0ZnVuY3Rpb24gZ2V0TmV4dFNpYmxpbmcodm5vZGVzLCBpLCBuZXh0U2libGluZykge1xuXHRcdGZvciAoOyBpIDwgdm5vZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZiAodm5vZGVzW2ldICE9IG51bGwgJiYgdm5vZGVzW2ldLmRvbSAhPSBudWxsKSByZXR1cm4gdm5vZGVzW2ldLmRvbVxuXHRcdH1cblx0XHRyZXR1cm4gbmV4dFNpYmxpbmdcblx0fVxuXHRmdW5jdGlvbiBpbnNlcnROb2RlKHBhcmVudCwgZG9tLCBuZXh0U2libGluZykge1xuXHRcdGlmIChuZXh0U2libGluZyAmJiBuZXh0U2libGluZy5wYXJlbnROb2RlKSBwYXJlbnQuaW5zZXJ0QmVmb3JlKGRvbSwgbmV4dFNpYmxpbmcpXG5cdFx0ZWxzZSBwYXJlbnQuYXBwZW5kQ2hpbGQoZG9tKVxuXHR9XG5cdGZ1bmN0aW9uIHNldENvbnRlbnRFZGl0YWJsZSh2bm9kZSkge1xuXHRcdHZhciBjaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuXG5cdFx0aWYgKGNoaWxkcmVuICE9IG51bGwgJiYgY2hpbGRyZW4ubGVuZ3RoID09PSAxICYmIGNoaWxkcmVuWzBdLnRhZyA9PT0gXCI8XCIpIHtcblx0XHRcdHZhciBjb250ZW50ID0gY2hpbGRyZW5bMF0uY2hpbGRyZW5cblx0XHRcdGlmICh2bm9kZS5kb20uaW5uZXJIVE1MICE9PSBjb250ZW50KSB2bm9kZS5kb20uaW5uZXJIVE1MID0gY29udGVudFxuXHRcdH1cblx0XHRlbHNlIGlmICh2bm9kZS50ZXh0ICE9IG51bGwgfHwgY2hpbGRyZW4gIT0gbnVsbCAmJiBjaGlsZHJlbi5sZW5ndGggIT09IDApIHRocm93IG5ldyBFcnJvcihcIkNoaWxkIG5vZGUgb2YgYSBjb250ZW50ZWRpdGFibGUgbXVzdCBiZSB0cnVzdGVkXCIpXG5cdH1cblx0Ly9yZW1vdmVcblx0ZnVuY3Rpb24gcmVtb3ZlTm9kZXModm5vZGVzLCBzdGFydCwgZW5kLCBjb250ZXh0KSB7XG5cdFx0Zm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcblx0XHRcdHZhciB2bm9kZSA9IHZub2Rlc1tpXVxuXHRcdFx0aWYgKHZub2RlICE9IG51bGwpIHtcblx0XHRcdFx0aWYgKHZub2RlLnNraXApIHZub2RlLnNraXAgPSBmYWxzZVxuXHRcdFx0XHRlbHNlIHJlbW92ZU5vZGUodm5vZGUsIGNvbnRleHQpXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdGZ1bmN0aW9uIHJlbW92ZU5vZGUodm5vZGUsIGNvbnRleHQpIHtcblx0XHR2YXIgZXhwZWN0ZWQgPSAxLCBjYWxsZWQgPSAwXG5cdFx0aWYgKHZub2RlLmF0dHJzICYmIHR5cGVvZiB2bm9kZS5hdHRycy5vbmJlZm9yZXJlbW92ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHR2YXIgcmVzdWx0ID0gdm5vZGUuYXR0cnMub25iZWZvcmVyZW1vdmUuY2FsbCh2bm9kZS5zdGF0ZSwgdm5vZGUpXG5cdFx0XHRpZiAocmVzdWx0ICE9IG51bGwgJiYgdHlwZW9mIHJlc3VsdC50aGVuID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0ZXhwZWN0ZWQrK1xuXHRcdFx0XHRyZXN1bHQudGhlbihjb250aW51YXRpb24sIGNvbnRpbnVhdGlvbilcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKHR5cGVvZiB2bm9kZS50YWcgIT09IFwic3RyaW5nXCIgJiYgdHlwZW9mIHZub2RlLl9zdGF0ZS5vbmJlZm9yZXJlbW92ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHR2YXIgcmVzdWx0ID0gdm5vZGUuX3N0YXRlLm9uYmVmb3JlcmVtb3ZlLmNhbGwodm5vZGUuc3RhdGUsIHZub2RlKVxuXHRcdFx0aWYgKHJlc3VsdCAhPSBudWxsICYmIHR5cGVvZiByZXN1bHQudGhlbiA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdGV4cGVjdGVkKytcblx0XHRcdFx0cmVzdWx0LnRoZW4oY29udGludWF0aW9uLCBjb250aW51YXRpb24pXG5cdFx0XHR9XG5cdFx0fVxuXHRcdGNvbnRpbnVhdGlvbigpXG5cdFx0ZnVuY3Rpb24gY29udGludWF0aW9uKCkge1xuXHRcdFx0aWYgKCsrY2FsbGVkID09PSBleHBlY3RlZCkge1xuXHRcdFx0XHRvbnJlbW92ZSh2bm9kZSlcblx0XHRcdFx0aWYgKHZub2RlLmRvbSkge1xuXHRcdFx0XHRcdHZhciBjb3VudDAgPSB2bm9kZS5kb21TaXplIHx8IDFcblx0XHRcdFx0XHRpZiAoY291bnQwID4gMSkge1xuXHRcdFx0XHRcdFx0dmFyIGRvbSA9IHZub2RlLmRvbVxuXHRcdFx0XHRcdFx0d2hpbGUgKC0tY291bnQwKSB7XG5cdFx0XHRcdFx0XHRcdHJlbW92ZU5vZGVGcm9tRE9NKGRvbS5uZXh0U2libGluZylcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmVtb3ZlTm9kZUZyb21ET00odm5vZGUuZG9tKVxuXHRcdFx0XHRcdGlmIChjb250ZXh0ICE9IG51bGwgJiYgdm5vZGUuZG9tU2l6ZSA9PSBudWxsICYmICFoYXNJbnRlZ3JhdGlvbk1ldGhvZHModm5vZGUuYXR0cnMpICYmIHR5cGVvZiB2bm9kZS50YWcgPT09IFwic3RyaW5nXCIpIHsgLy9UT0RPIHRlc3QgY3VzdG9tIGVsZW1lbnRzXG5cdFx0XHRcdFx0XHRpZiAoIWNvbnRleHQucG9vbCkgY29udGV4dC5wb29sID0gW3Zub2RlXVxuXHRcdFx0XHRcdFx0ZWxzZSBjb250ZXh0LnBvb2wucHVzaCh2bm9kZSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblx0ZnVuY3Rpb24gcmVtb3ZlTm9kZUZyb21ET00obm9kZSkge1xuXHRcdHZhciBwYXJlbnQgPSBub2RlLnBhcmVudE5vZGVcblx0XHRpZiAocGFyZW50ICE9IG51bGwpIHBhcmVudC5yZW1vdmVDaGlsZChub2RlKVxuXHR9XG5cdGZ1bmN0aW9uIG9ucmVtb3ZlKHZub2RlKSB7XG5cdFx0aWYgKHZub2RlLmF0dHJzICYmIHR5cGVvZiB2bm9kZS5hdHRycy5vbnJlbW92ZSA9PT0gXCJmdW5jdGlvblwiKSB2bm9kZS5hdHRycy5vbnJlbW92ZS5jYWxsKHZub2RlLnN0YXRlLCB2bm9kZSlcblx0XHRpZiAodHlwZW9mIHZub2RlLnRhZyAhPT0gXCJzdHJpbmdcIikge1xuXHRcdFx0aWYgKHR5cGVvZiB2bm9kZS5fc3RhdGUub25yZW1vdmUgPT09IFwiZnVuY3Rpb25cIikgdm5vZGUuX3N0YXRlLm9ucmVtb3ZlLmNhbGwodm5vZGUuc3RhdGUsIHZub2RlKVxuXHRcdFx0aWYgKHZub2RlLmluc3RhbmNlICE9IG51bGwpIG9ucmVtb3ZlKHZub2RlLmluc3RhbmNlKVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR2YXIgY2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlblxuXHRcdFx0aWYgKEFycmF5LmlzQXJyYXkoY2hpbGRyZW4pKSB7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHR2YXIgY2hpbGQgPSBjaGlsZHJlbltpXVxuXHRcdFx0XHRcdGlmIChjaGlsZCAhPSBudWxsKSBvbnJlbW92ZShjaGlsZClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHQvL2F0dHJzMlxuXHRmdW5jdGlvbiBzZXRBdHRycyh2bm9kZSwgYXR0cnMyLCBucykge1xuXHRcdGZvciAodmFyIGtleTIgaW4gYXR0cnMyKSB7XG5cdFx0XHRzZXRBdHRyKHZub2RlLCBrZXkyLCBudWxsLCBhdHRyczJba2V5Ml0sIG5zKVxuXHRcdH1cblx0fVxuXHRmdW5jdGlvbiBzZXRBdHRyKHZub2RlLCBrZXkyLCBvbGQsIHZhbHVlLCBucykge1xuXHRcdHZhciBlbGVtZW50ID0gdm5vZGUuZG9tXG5cdFx0aWYgKGtleTIgPT09IFwia2V5XCIgfHwga2V5MiA9PT0gXCJpc1wiIHx8IChvbGQgPT09IHZhbHVlICYmICFpc0Zvcm1BdHRyaWJ1dGUodm5vZGUsIGtleTIpKSAmJiB0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIHZhbHVlID09PSBcInVuZGVmaW5lZFwiIHx8IGlzTGlmZWN5Y2xlTWV0aG9kKGtleTIpKSByZXR1cm5cblx0XHR2YXIgbnNMYXN0SW5kZXggPSBrZXkyLmluZGV4T2YoXCI6XCIpXG5cdFx0aWYgKG5zTGFzdEluZGV4ID4gLTEgJiYga2V5Mi5zdWJzdHIoMCwgbnNMYXN0SW5kZXgpID09PSBcInhsaW5rXCIpIHtcblx0XHRcdGVsZW1lbnQuc2V0QXR0cmlidXRlTlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIsIGtleTIuc2xpY2UobnNMYXN0SW5kZXggKyAxKSwgdmFsdWUpXG5cdFx0fVxuXHRcdGVsc2UgaWYgKGtleTJbMF0gPT09IFwib1wiICYmIGtleTJbMV0gPT09IFwiblwiICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiKSB1cGRhdGVFdmVudCh2bm9kZSwga2V5MiwgdmFsdWUpXG5cdFx0ZWxzZSBpZiAoa2V5MiA9PT0gXCJzdHlsZVwiKSB1cGRhdGVTdHlsZShlbGVtZW50LCBvbGQsIHZhbHVlKVxuXHRcdGVsc2UgaWYgKGtleTIgaW4gZWxlbWVudCAmJiAhaXNBdHRyaWJ1dGUoa2V5MikgJiYgbnMgPT09IHVuZGVmaW5lZCAmJiAhaXNDdXN0b21FbGVtZW50KHZub2RlKSkge1xuXHRcdFx0aWYgKGtleTIgPT09IFwidmFsdWVcIikge1xuXHRcdFx0XHR2YXIgbm9ybWFsaXplZDAgPSBcIlwiICsgdmFsdWUgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1pbXBsaWNpdC1jb2VyY2lvblxuXHRcdFx0XHQvL3NldHRpbmcgaW5wdXRbdmFsdWVdIHRvIHNhbWUgdmFsdWUgYnkgdHlwaW5nIG9uIGZvY3VzZWQgZWxlbWVudCBtb3ZlcyBjdXJzb3IgdG8gZW5kIGluIENocm9tZVxuXHRcdFx0XHRpZiAoKHZub2RlLnRhZyA9PT0gXCJpbnB1dFwiIHx8IHZub2RlLnRhZyA9PT0gXCJ0ZXh0YXJlYVwiKSAmJiB2bm9kZS5kb20udmFsdWUgPT09IG5vcm1hbGl6ZWQwICYmIHZub2RlLmRvbSA9PT0gJGRvYy5hY3RpdmVFbGVtZW50KSByZXR1cm5cblx0XHRcdFx0Ly9zZXR0aW5nIHNlbGVjdFt2YWx1ZV0gdG8gc2FtZSB2YWx1ZSB3aGlsZSBoYXZpbmcgc2VsZWN0IG9wZW4gYmxpbmtzIHNlbGVjdCBkcm9wZG93biBpbiBDaHJvbWVcblx0XHRcdFx0aWYgKHZub2RlLnRhZyA9PT0gXCJzZWxlY3RcIikge1xuXHRcdFx0XHRcdGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0aWYgKHZub2RlLmRvbS5zZWxlY3RlZEluZGV4ID09PSAtMSAmJiB2bm9kZS5kb20gPT09ICRkb2MuYWN0aXZlRWxlbWVudCkgcmV0dXJuXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGlmIChvbGQgIT09IG51bGwgJiYgdm5vZGUuZG9tLnZhbHVlID09PSBub3JtYWxpemVkMCAmJiB2bm9kZS5kb20gPT09ICRkb2MuYWN0aXZlRWxlbWVudCkgcmV0dXJuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vc2V0dGluZyBvcHRpb25bdmFsdWVdIHRvIHNhbWUgdmFsdWUgd2hpbGUgaGF2aW5nIHNlbGVjdCBvcGVuIGJsaW5rcyBzZWxlY3QgZHJvcGRvd24gaW4gQ2hyb21lXG5cdFx0XHRcdGlmICh2bm9kZS50YWcgPT09IFwib3B0aW9uXCIgJiYgb2xkICE9IG51bGwgJiYgdm5vZGUuZG9tLnZhbHVlID09PSBub3JtYWxpemVkMCkgcmV0dXJuXG5cdFx0XHR9XG5cdFx0XHQvLyBJZiB5b3UgYXNzaWduIGFuIGlucHV0IHR5cGUxIHRoYXQgaXMgbm90IHN1cHBvcnRlZCBieSBJRSAxMSB3aXRoIGFuIGFzc2lnbm1lbnQgZXhwcmVzc2lvbiwgYW4gZXJyb3IwIHdpbGwgb2NjdXIuXG5cdFx0XHRpZiAodm5vZGUudGFnID09PSBcImlucHV0XCIgJiYga2V5MiA9PT0gXCJ0eXBlXCIpIHtcblx0XHRcdFx0ZWxlbWVudC5zZXRBdHRyaWJ1dGUoa2V5MiwgdmFsdWUpXG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0ZWxlbWVudFtrZXkyXSA9IHZhbHVlXG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJib29sZWFuXCIpIHtcblx0XHRcdFx0aWYgKHZhbHVlKSBlbGVtZW50LnNldEF0dHJpYnV0ZShrZXkyLCBcIlwiKVxuXHRcdFx0XHRlbHNlIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKGtleTIpXG5cdFx0XHR9XG5cdFx0XHRlbHNlIGVsZW1lbnQuc2V0QXR0cmlidXRlKGtleTIgPT09IFwiY2xhc3NOYW1lXCIgPyBcImNsYXNzXCIgOiBrZXkyLCB2YWx1ZSlcblx0XHR9XG5cdH1cblx0ZnVuY3Rpb24gc2V0TGF0ZUF0dHJzKHZub2RlKSB7XG5cdFx0dmFyIGF0dHJzMiA9IHZub2RlLmF0dHJzXG5cdFx0aWYgKHZub2RlLnRhZyA9PT0gXCJzZWxlY3RcIiAmJiBhdHRyczIgIT0gbnVsbCkge1xuXHRcdFx0aWYgKFwidmFsdWVcIiBpbiBhdHRyczIpIHNldEF0dHIodm5vZGUsIFwidmFsdWVcIiwgbnVsbCwgYXR0cnMyLnZhbHVlLCB1bmRlZmluZWQpXG5cdFx0XHRpZiAoXCJzZWxlY3RlZEluZGV4XCIgaW4gYXR0cnMyKSBzZXRBdHRyKHZub2RlLCBcInNlbGVjdGVkSW5kZXhcIiwgbnVsbCwgYXR0cnMyLnNlbGVjdGVkSW5kZXgsIHVuZGVmaW5lZClcblx0XHR9XG5cdH1cblx0ZnVuY3Rpb24gdXBkYXRlQXR0cnModm5vZGUsIG9sZCwgYXR0cnMyLCBucykge1xuXHRcdGlmIChhdHRyczIgIT0gbnVsbCkge1xuXHRcdFx0Zm9yICh2YXIga2V5MiBpbiBhdHRyczIpIHtcblx0XHRcdFx0c2V0QXR0cih2bm9kZSwga2V5Miwgb2xkICYmIG9sZFtrZXkyXSwgYXR0cnMyW2tleTJdLCBucylcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKG9sZCAhPSBudWxsKSB7XG5cdFx0XHRmb3IgKHZhciBrZXkyIGluIG9sZCkge1xuXHRcdFx0XHRpZiAoYXR0cnMyID09IG51bGwgfHwgIShrZXkyIGluIGF0dHJzMikpIHtcblx0XHRcdFx0XHRpZiAoa2V5MiA9PT0gXCJjbGFzc05hbWVcIikga2V5MiA9IFwiY2xhc3NcIlxuXHRcdFx0XHRcdGlmIChrZXkyWzBdID09PSBcIm9cIiAmJiBrZXkyWzFdID09PSBcIm5cIiAmJiAhaXNMaWZlY3ljbGVNZXRob2Qoa2V5MikpIHVwZGF0ZUV2ZW50KHZub2RlLCBrZXkyLCB1bmRlZmluZWQpXG5cdFx0XHRcdFx0ZWxzZSBpZiAoa2V5MiAhPT0gXCJrZXlcIikgdm5vZGUuZG9tLnJlbW92ZUF0dHJpYnV0ZShrZXkyKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdGZ1bmN0aW9uIGlzRm9ybUF0dHJpYnV0ZSh2bm9kZSwgYXR0cikge1xuXHRcdHJldHVybiBhdHRyID09PSBcInZhbHVlXCIgfHwgYXR0ciA9PT0gXCJjaGVja2VkXCIgfHwgYXR0ciA9PT0gXCJzZWxlY3RlZEluZGV4XCIgfHwgYXR0ciA9PT0gXCJzZWxlY3RlZFwiICYmIHZub2RlLmRvbSA9PT0gJGRvYy5hY3RpdmVFbGVtZW50XG5cdH1cblx0ZnVuY3Rpb24gaXNMaWZlY3ljbGVNZXRob2QoYXR0cikge1xuXHRcdHJldHVybiBhdHRyID09PSBcIm9uaW5pdFwiIHx8IGF0dHIgPT09IFwib25jcmVhdGVcIiB8fCBhdHRyID09PSBcIm9udXBkYXRlXCIgfHwgYXR0ciA9PT0gXCJvbnJlbW92ZVwiIHx8IGF0dHIgPT09IFwib25iZWZvcmVyZW1vdmVcIiB8fCBhdHRyID09PSBcIm9uYmVmb3JldXBkYXRlXCJcblx0fVxuXHRmdW5jdGlvbiBpc0F0dHJpYnV0ZShhdHRyKSB7XG5cdFx0cmV0dXJuIGF0dHIgPT09IFwiaHJlZlwiIHx8IGF0dHIgPT09IFwibGlzdFwiIHx8IGF0dHIgPT09IFwiZm9ybVwiIHx8IGF0dHIgPT09IFwid2lkdGhcIiB8fCBhdHRyID09PSBcImhlaWdodFwiLy8gfHwgYXR0ciA9PT0gXCJ0eXBlXCJcblx0fVxuXHRmdW5jdGlvbiBpc0N1c3RvbUVsZW1lbnQodm5vZGUpe1xuXHRcdHJldHVybiB2bm9kZS5hdHRycy5pcyB8fCB2bm9kZS50YWcuaW5kZXhPZihcIi1cIikgPiAtMVxuXHR9XG5cdGZ1bmN0aW9uIGhhc0ludGVncmF0aW9uTWV0aG9kcyhzb3VyY2UpIHtcblx0XHRyZXR1cm4gc291cmNlICE9IG51bGwgJiYgKHNvdXJjZS5vbmNyZWF0ZSB8fCBzb3VyY2Uub251cGRhdGUgfHwgc291cmNlLm9uYmVmb3JlcmVtb3ZlIHx8IHNvdXJjZS5vbnJlbW92ZSlcblx0fVxuXHQvL3N0eWxlXG5cdGZ1bmN0aW9uIHVwZGF0ZVN0eWxlKGVsZW1lbnQsIG9sZCwgc3R5bGUpIHtcblx0XHRpZiAob2xkID09PSBzdHlsZSkgZWxlbWVudC5zdHlsZS5jc3NUZXh0ID0gXCJcIiwgb2xkID0gbnVsbFxuXHRcdGlmIChzdHlsZSA9PSBudWxsKSBlbGVtZW50LnN0eWxlLmNzc1RleHQgPSBcIlwiXG5cdFx0ZWxzZSBpZiAodHlwZW9mIHN0eWxlID09PSBcInN0cmluZ1wiKSBlbGVtZW50LnN0eWxlLmNzc1RleHQgPSBzdHlsZVxuXHRcdGVsc2Uge1xuXHRcdFx0aWYgKHR5cGVvZiBvbGQgPT09IFwic3RyaW5nXCIpIGVsZW1lbnQuc3R5bGUuY3NzVGV4dCA9IFwiXCJcblx0XHRcdGZvciAodmFyIGtleTIgaW4gc3R5bGUpIHtcblx0XHRcdFx0ZWxlbWVudC5zdHlsZVtrZXkyXSA9IHN0eWxlW2tleTJdXG5cdFx0XHR9XG5cdFx0XHRpZiAob2xkICE9IG51bGwgJiYgdHlwZW9mIG9sZCAhPT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHRmb3IgKHZhciBrZXkyIGluIG9sZCkge1xuXHRcdFx0XHRcdGlmICghKGtleTIgaW4gc3R5bGUpKSBlbGVtZW50LnN0eWxlW2tleTJdID0gXCJcIlxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdC8vZXZlbnRcblx0ZnVuY3Rpb24gdXBkYXRlRXZlbnQodm5vZGUsIGtleTIsIHZhbHVlKSB7XG5cdFx0dmFyIGVsZW1lbnQgPSB2bm9kZS5kb21cblx0XHR2YXIgY2FsbGJhY2sgPSB0eXBlb2Ygb25ldmVudCAhPT0gXCJmdW5jdGlvblwiID8gdmFsdWUgOiBmdW5jdGlvbihlKSB7XG5cdFx0XHR2YXIgcmVzdWx0ID0gdmFsdWUuY2FsbChlbGVtZW50LCBlKVxuXHRcdFx0b25ldmVudC5jYWxsKGVsZW1lbnQsIGUpXG5cdFx0XHRyZXR1cm4gcmVzdWx0XG5cdFx0fVxuXHRcdGlmIChrZXkyIGluIGVsZW1lbnQpIGVsZW1lbnRba2V5Ml0gPSB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIiA/IGNhbGxiYWNrIDogbnVsbFxuXHRcdGVsc2Uge1xuXHRcdFx0dmFyIGV2ZW50TmFtZSA9IGtleTIuc2xpY2UoMilcblx0XHRcdGlmICh2bm9kZS5ldmVudHMgPT09IHVuZGVmaW5lZCkgdm5vZGUuZXZlbnRzID0ge31cblx0XHRcdGlmICh2bm9kZS5ldmVudHNba2V5Ml0gPT09IGNhbGxiYWNrKSByZXR1cm5cblx0XHRcdGlmICh2bm9kZS5ldmVudHNba2V5Ml0gIT0gbnVsbCkgZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgdm5vZGUuZXZlbnRzW2tleTJdLCBmYWxzZSlcblx0XHRcdGlmICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHR2bm9kZS5ldmVudHNba2V5Ml0gPSBjYWxsYmFja1xuXHRcdFx0XHRlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCB2bm9kZS5ldmVudHNba2V5Ml0sIGZhbHNlKVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHQvL2xpZmVjeWNsZVxuXHRmdW5jdGlvbiBpbml0TGlmZWN5Y2xlKHNvdXJjZSwgdm5vZGUsIGhvb2tzKSB7XG5cdFx0aWYgKHR5cGVvZiBzb3VyY2Uub25pbml0ID09PSBcImZ1bmN0aW9uXCIpIHNvdXJjZS5vbmluaXQuY2FsbCh2bm9kZS5zdGF0ZSwgdm5vZGUpXG5cdFx0aWYgKHR5cGVvZiBzb3VyY2Uub25jcmVhdGUgPT09IFwiZnVuY3Rpb25cIikgaG9va3MucHVzaChzb3VyY2Uub25jcmVhdGUuYmluZCh2bm9kZS5zdGF0ZSwgdm5vZGUpKVxuXHR9XG5cdGZ1bmN0aW9uIHVwZGF0ZUxpZmVjeWNsZShzb3VyY2UsIHZub2RlLCBob29rcykge1xuXHRcdGlmICh0eXBlb2Ygc291cmNlLm9udXBkYXRlID09PSBcImZ1bmN0aW9uXCIpIGhvb2tzLnB1c2goc291cmNlLm9udXBkYXRlLmJpbmQodm5vZGUuc3RhdGUsIHZub2RlKSlcblx0fVxuXHRmdW5jdGlvbiBzaG91bGROb3RVcGRhdGUodm5vZGUsIG9sZCkge1xuXHRcdHZhciBmb3JjZVZub2RlVXBkYXRlLCBmb3JjZUNvbXBvbmVudFVwZGF0ZVxuXHRcdGlmICh2bm9kZS5hdHRycyAhPSBudWxsICYmIHR5cGVvZiB2bm9kZS5hdHRycy5vbmJlZm9yZXVwZGF0ZSA9PT0gXCJmdW5jdGlvblwiKSBmb3JjZVZub2RlVXBkYXRlID0gdm5vZGUuYXR0cnMub25iZWZvcmV1cGRhdGUuY2FsbCh2bm9kZS5zdGF0ZSwgdm5vZGUsIG9sZClcblx0XHRpZiAodHlwZW9mIHZub2RlLnRhZyAhPT0gXCJzdHJpbmdcIiAmJiB0eXBlb2Ygdm5vZGUuX3N0YXRlLm9uYmVmb3JldXBkYXRlID09PSBcImZ1bmN0aW9uXCIpIGZvcmNlQ29tcG9uZW50VXBkYXRlID0gdm5vZGUuX3N0YXRlLm9uYmVmb3JldXBkYXRlLmNhbGwodm5vZGUuc3RhdGUsIHZub2RlLCBvbGQpXG5cdFx0aWYgKCEoZm9yY2VWbm9kZVVwZGF0ZSA9PT0gdW5kZWZpbmVkICYmIGZvcmNlQ29tcG9uZW50VXBkYXRlID09PSB1bmRlZmluZWQpICYmICFmb3JjZVZub2RlVXBkYXRlICYmICFmb3JjZUNvbXBvbmVudFVwZGF0ZSkge1xuXHRcdFx0dm5vZGUuZG9tID0gb2xkLmRvbVxuXHRcdFx0dm5vZGUuZG9tU2l6ZSA9IG9sZC5kb21TaXplXG5cdFx0XHR2bm9kZS5pbnN0YW5jZSA9IG9sZC5pbnN0YW5jZVxuXHRcdFx0cmV0dXJuIHRydWVcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlXG5cdH1cblx0ZnVuY3Rpb24gcmVuZGVyKGRvbSwgdm5vZGVzKSB7XG5cdFx0aWYgKCFkb20pIHRocm93IG5ldyBFcnJvcihcIkVuc3VyZSB0aGUgRE9NIGVsZW1lbnQgYmVpbmcgcGFzc2VkIHRvIG0ucm91dGUvbS5tb3VudC9tLnJlbmRlciBpcyBub3QgdW5kZWZpbmVkLlwiKVxuXHRcdHZhciBob29rcyA9IFtdXG5cdFx0dmFyIGFjdGl2ZSA9ICRkb2MuYWN0aXZlRWxlbWVudFxuXHRcdHZhciBuYW1lc3BhY2UgPSBkb20ubmFtZXNwYWNlVVJJXG5cdFx0Ly8gRmlyc3QgdGltZTAgcmVuZGVyaW5nIGludG8gYSBub2RlIGNsZWFycyBpdCBvdXRcblx0XHRpZiAoZG9tLnZub2RlcyA9PSBudWxsKSBkb20udGV4dENvbnRlbnQgPSBcIlwiXG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KHZub2RlcykpIHZub2RlcyA9IFt2bm9kZXNdXG5cdFx0dXBkYXRlTm9kZXMoZG9tLCBkb20udm5vZGVzLCBWbm9kZS5ub3JtYWxpemVDaGlsZHJlbih2bm9kZXMpLCBmYWxzZSwgaG9va3MsIG51bGwsIG5hbWVzcGFjZSA9PT0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCIgPyB1bmRlZmluZWQgOiBuYW1lc3BhY2UpXG5cdFx0ZG9tLnZub2RlcyA9IHZub2Rlc1xuXHRcdC8vIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgY2FuIHJldHVybiBudWxsIGluIElFIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9Eb2N1bWVudC9hY3RpdmVFbGVtZW50XG5cdFx0aWYgKGFjdGl2ZSAhPSBudWxsICYmICRkb2MuYWN0aXZlRWxlbWVudCAhPT0gYWN0aXZlKSBhY3RpdmUuZm9jdXMoKVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgaG9va3MubGVuZ3RoOyBpKyspIGhvb2tzW2ldKClcblx0fVxuXHRyZXR1cm4ge3JlbmRlcjogcmVuZGVyLCBzZXRFdmVudENhbGxiYWNrOiBzZXRFdmVudENhbGxiYWNrfVxufVxuZnVuY3Rpb24gdGhyb3R0bGUoY2FsbGJhY2spIHtcblx0Ly82MGZwcyB0cmFuc2xhdGVzIHRvIDE2LjZtcywgcm91bmQgaXQgZG93biBzaW5jZSBzZXRUaW1lb3V0IHJlcXVpcmVzIGludFxuXHR2YXIgdGltZSA9IDE2XG5cdHZhciBsYXN0ID0gMCwgcGVuZGluZyA9IG51bGxcblx0dmFyIHRpbWVvdXQgPSB0eXBlb2YgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID09PSBcImZ1bmN0aW9uXCIgPyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgOiBzZXRUaW1lb3V0XG5cdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHR2YXIgbm93ID0gRGF0ZS5ub3coKVxuXHRcdGlmIChsYXN0ID09PSAwIHx8IG5vdyAtIGxhc3QgPj0gdGltZSkge1xuXHRcdFx0bGFzdCA9IG5vd1xuXHRcdFx0Y2FsbGJhY2soKVxuXHRcdH1cblx0XHRlbHNlIGlmIChwZW5kaW5nID09PSBudWxsKSB7XG5cdFx0XHRwZW5kaW5nID0gdGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0cGVuZGluZyA9IG51bGxcblx0XHRcdFx0Y2FsbGJhY2soKVxuXHRcdFx0XHRsYXN0ID0gRGF0ZS5ub3coKVxuXHRcdFx0fSwgdGltZSAtIChub3cgLSBsYXN0KSlcblx0XHR9XG5cdH1cbn1cbnZhciBfMTEgPSBmdW5jdGlvbigkd2luZG93KSB7XG5cdHZhciByZW5kZXJTZXJ2aWNlID0gY29yZVJlbmRlcmVyKCR3aW5kb3cpXG5cdHJlbmRlclNlcnZpY2Uuc2V0RXZlbnRDYWxsYmFjayhmdW5jdGlvbihlKSB7XG5cdFx0aWYgKGUucmVkcmF3ID09PSBmYWxzZSkgZS5yZWRyYXcgPSB1bmRlZmluZWRcblx0XHRlbHNlIHJlZHJhdygpXG5cdH0pXG5cdHZhciBjYWxsYmFja3MgPSBbXVxuXHRmdW5jdGlvbiBzdWJzY3JpYmUoa2V5MSwgY2FsbGJhY2spIHtcblx0XHR1bnN1YnNjcmliZShrZXkxKVxuXHRcdGNhbGxiYWNrcy5wdXNoKGtleTEsIHRocm90dGxlKGNhbGxiYWNrKSlcblx0fVxuXHRmdW5jdGlvbiB1bnN1YnNjcmliZShrZXkxKSB7XG5cdFx0dmFyIGluZGV4ID0gY2FsbGJhY2tzLmluZGV4T2Yoa2V5MSlcblx0XHRpZiAoaW5kZXggPiAtMSkgY2FsbGJhY2tzLnNwbGljZShpbmRleCwgMilcblx0fVxuXHRmdW5jdGlvbiByZWRyYXcoKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDE7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyBpICs9IDIpIHtcblx0XHRcdGNhbGxiYWNrc1tpXSgpXG5cdFx0fVxuXHR9XG5cdHJldHVybiB7c3Vic2NyaWJlOiBzdWJzY3JpYmUsIHVuc3Vic2NyaWJlOiB1bnN1YnNjcmliZSwgcmVkcmF3OiByZWRyYXcsIHJlbmRlcjogcmVuZGVyU2VydmljZS5yZW5kZXJ9XG59XG52YXIgcmVkcmF3U2VydmljZSA9IF8xMSh3aW5kb3cpXG5yZXF1ZXN0U2VydmljZS5zZXRDb21wbGV0aW9uQ2FsbGJhY2socmVkcmF3U2VydmljZS5yZWRyYXcpXG52YXIgXzE2ID0gZnVuY3Rpb24ocmVkcmF3U2VydmljZTApIHtcblx0cmV0dXJuIGZ1bmN0aW9uKHJvb3QsIGNvbXBvbmVudCkge1xuXHRcdGlmIChjb21wb25lbnQgPT09IG51bGwpIHtcblx0XHRcdHJlZHJhd1NlcnZpY2UwLnJlbmRlcihyb290LCBbXSlcblx0XHRcdHJlZHJhd1NlcnZpY2UwLnVuc3Vic2NyaWJlKHJvb3QpXG5cdFx0XHRyZXR1cm5cblx0XHR9XG5cdFx0XG5cdFx0aWYgKGNvbXBvbmVudC52aWV3ID09IG51bGwgJiYgdHlwZW9mIGNvbXBvbmVudCAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgRXJyb3IoXCJtLm1vdW50KGVsZW1lbnQsIGNvbXBvbmVudCkgZXhwZWN0cyBhIGNvbXBvbmVudCwgbm90IGEgdm5vZGVcIilcblx0XHRcblx0XHR2YXIgcnVuMCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmVkcmF3U2VydmljZTAucmVuZGVyKHJvb3QsIFZub2RlKGNvbXBvbmVudCkpXG5cdFx0fVxuXHRcdHJlZHJhd1NlcnZpY2UwLnN1YnNjcmliZShyb290LCBydW4wKVxuXHRcdHJlZHJhd1NlcnZpY2UwLnJlZHJhdygpXG5cdH1cbn1cbm0ubW91bnQgPSBfMTYocmVkcmF3U2VydmljZSlcbnZhciBQcm9taXNlID0gUHJvbWlzZVBvbHlmaWxsXG52YXIgcGFyc2VRdWVyeVN0cmluZyA9IGZ1bmN0aW9uKHN0cmluZykge1xuXHRpZiAoc3RyaW5nID09PSBcIlwiIHx8IHN0cmluZyA9PSBudWxsKSByZXR1cm4ge31cblx0aWYgKHN0cmluZy5jaGFyQXQoMCkgPT09IFwiP1wiKSBzdHJpbmcgPSBzdHJpbmcuc2xpY2UoMSlcblx0dmFyIGVudHJpZXMgPSBzdHJpbmcuc3BsaXQoXCImXCIpLCBkYXRhMCA9IHt9LCBjb3VudGVycyA9IHt9XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgZW50cmllcy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBlbnRyeSA9IGVudHJpZXNbaV0uc3BsaXQoXCI9XCIpXG5cdFx0dmFyIGtleTUgPSBkZWNvZGVVUklDb21wb25lbnQoZW50cnlbMF0pXG5cdFx0dmFyIHZhbHVlID0gZW50cnkubGVuZ3RoID09PSAyID8gZGVjb2RlVVJJQ29tcG9uZW50KGVudHJ5WzFdKSA6IFwiXCJcblx0XHRpZiAodmFsdWUgPT09IFwidHJ1ZVwiKSB2YWx1ZSA9IHRydWVcblx0XHRlbHNlIGlmICh2YWx1ZSA9PT0gXCJmYWxzZVwiKSB2YWx1ZSA9IGZhbHNlXG5cdFx0dmFyIGxldmVscyA9IGtleTUuc3BsaXQoL1xcXVxcWz98XFxbLylcblx0XHR2YXIgY3Vyc29yID0gZGF0YTBcblx0XHRpZiAoa2V5NS5pbmRleE9mKFwiW1wiKSA+IC0xKSBsZXZlbHMucG9wKClcblx0XHRmb3IgKHZhciBqID0gMDsgaiA8IGxldmVscy5sZW5ndGg7IGorKykge1xuXHRcdFx0dmFyIGxldmVsID0gbGV2ZWxzW2pdLCBuZXh0TGV2ZWwgPSBsZXZlbHNbaiArIDFdXG5cdFx0XHR2YXIgaXNOdW1iZXIgPSBuZXh0TGV2ZWwgPT0gXCJcIiB8fCAhaXNOYU4ocGFyc2VJbnQobmV4dExldmVsLCAxMCkpXG5cdFx0XHR2YXIgaXNWYWx1ZSA9IGogPT09IGxldmVscy5sZW5ndGggLSAxXG5cdFx0XHRpZiAobGV2ZWwgPT09IFwiXCIpIHtcblx0XHRcdFx0dmFyIGtleTUgPSBsZXZlbHMuc2xpY2UoMCwgaikuam9pbigpXG5cdFx0XHRcdGlmIChjb3VudGVyc1trZXk1XSA9PSBudWxsKSBjb3VudGVyc1trZXk1XSA9IDBcblx0XHRcdFx0bGV2ZWwgPSBjb3VudGVyc1trZXk1XSsrXG5cdFx0XHR9XG5cdFx0XHRpZiAoY3Vyc29yW2xldmVsXSA9PSBudWxsKSB7XG5cdFx0XHRcdGN1cnNvcltsZXZlbF0gPSBpc1ZhbHVlID8gdmFsdWUgOiBpc051bWJlciA/IFtdIDoge31cblx0XHRcdH1cblx0XHRcdGN1cnNvciA9IGN1cnNvcltsZXZlbF1cblx0XHR9XG5cdH1cblx0cmV0dXJuIGRhdGEwXG59XG52YXIgY29yZVJvdXRlciA9IGZ1bmN0aW9uKCR3aW5kb3cpIHtcblx0dmFyIHN1cHBvcnRzUHVzaFN0YXRlID0gdHlwZW9mICR3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUgPT09IFwiZnVuY3Rpb25cIlxuXHR2YXIgY2FsbEFzeW5jMCA9IHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHNldEltbWVkaWF0ZSA6IHNldFRpbWVvdXRcblx0ZnVuY3Rpb24gbm9ybWFsaXplMShmcmFnbWVudDApIHtcblx0XHR2YXIgZGF0YSA9ICR3aW5kb3cubG9jYXRpb25bZnJhZ21lbnQwXS5yZXBsYWNlKC8oPzolW2EtZjg5XVthLWYwLTldKSsvZ2ltLCBkZWNvZGVVUklDb21wb25lbnQpXG5cdFx0aWYgKGZyYWdtZW50MCA9PT0gXCJwYXRobmFtZVwiICYmIGRhdGFbMF0gIT09IFwiL1wiKSBkYXRhID0gXCIvXCIgKyBkYXRhXG5cdFx0cmV0dXJuIGRhdGFcblx0fVxuXHR2YXIgYXN5bmNJZFxuXHRmdW5jdGlvbiBkZWJvdW5jZUFzeW5jKGNhbGxiYWNrMCkge1xuXHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdGlmIChhc3luY0lkICE9IG51bGwpIHJldHVyblxuXHRcdFx0YXN5bmNJZCA9IGNhbGxBc3luYzAoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGFzeW5jSWQgPSBudWxsXG5cdFx0XHRcdGNhbGxiYWNrMCgpXG5cdFx0XHR9KVxuXHRcdH1cblx0fVxuXHRmdW5jdGlvbiBwYXJzZVBhdGgocGF0aCwgcXVlcnlEYXRhLCBoYXNoRGF0YSkge1xuXHRcdHZhciBxdWVyeUluZGV4ID0gcGF0aC5pbmRleE9mKFwiP1wiKVxuXHRcdHZhciBoYXNoSW5kZXggPSBwYXRoLmluZGV4T2YoXCIjXCIpXG5cdFx0dmFyIHBhdGhFbmQgPSBxdWVyeUluZGV4ID4gLTEgPyBxdWVyeUluZGV4IDogaGFzaEluZGV4ID4gLTEgPyBoYXNoSW5kZXggOiBwYXRoLmxlbmd0aFxuXHRcdGlmIChxdWVyeUluZGV4ID4gLTEpIHtcblx0XHRcdHZhciBxdWVyeUVuZCA9IGhhc2hJbmRleCA+IC0xID8gaGFzaEluZGV4IDogcGF0aC5sZW5ndGhcblx0XHRcdHZhciBxdWVyeVBhcmFtcyA9IHBhcnNlUXVlcnlTdHJpbmcocGF0aC5zbGljZShxdWVyeUluZGV4ICsgMSwgcXVlcnlFbmQpKVxuXHRcdFx0Zm9yICh2YXIga2V5NCBpbiBxdWVyeVBhcmFtcykgcXVlcnlEYXRhW2tleTRdID0gcXVlcnlQYXJhbXNba2V5NF1cblx0XHR9XG5cdFx0aWYgKGhhc2hJbmRleCA+IC0xKSB7XG5cdFx0XHR2YXIgaGFzaFBhcmFtcyA9IHBhcnNlUXVlcnlTdHJpbmcocGF0aC5zbGljZShoYXNoSW5kZXggKyAxKSlcblx0XHRcdGZvciAodmFyIGtleTQgaW4gaGFzaFBhcmFtcykgaGFzaERhdGFba2V5NF0gPSBoYXNoUGFyYW1zW2tleTRdXG5cdFx0fVxuXHRcdHJldHVybiBwYXRoLnNsaWNlKDAsIHBhdGhFbmQpXG5cdH1cblx0dmFyIHJvdXRlciA9IHtwcmVmaXg6IFwiIyFcIn1cblx0cm91dGVyLmdldFBhdGggPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgdHlwZTIgPSByb3V0ZXIucHJlZml4LmNoYXJBdCgwKVxuXHRcdHN3aXRjaCAodHlwZTIpIHtcblx0XHRcdGNhc2UgXCIjXCI6IHJldHVybiBub3JtYWxpemUxKFwiaGFzaFwiKS5zbGljZShyb3V0ZXIucHJlZml4Lmxlbmd0aClcblx0XHRcdGNhc2UgXCI/XCI6IHJldHVybiBub3JtYWxpemUxKFwic2VhcmNoXCIpLnNsaWNlKHJvdXRlci5wcmVmaXgubGVuZ3RoKSArIG5vcm1hbGl6ZTEoXCJoYXNoXCIpXG5cdFx0XHRkZWZhdWx0OiByZXR1cm4gbm9ybWFsaXplMShcInBhdGhuYW1lXCIpLnNsaWNlKHJvdXRlci5wcmVmaXgubGVuZ3RoKSArIG5vcm1hbGl6ZTEoXCJzZWFyY2hcIikgKyBub3JtYWxpemUxKFwiaGFzaFwiKVxuXHRcdH1cblx0fVxuXHRyb3V0ZXIuc2V0UGF0aCA9IGZ1bmN0aW9uKHBhdGgsIGRhdGEsIG9wdGlvbnMpIHtcblx0XHR2YXIgcXVlcnlEYXRhID0ge30sIGhhc2hEYXRhID0ge31cblx0XHRwYXRoID0gcGFyc2VQYXRoKHBhdGgsIHF1ZXJ5RGF0YSwgaGFzaERhdGEpXG5cdFx0aWYgKGRhdGEgIT0gbnVsbCkge1xuXHRcdFx0Zm9yICh2YXIga2V5NCBpbiBkYXRhKSBxdWVyeURhdGFba2V5NF0gPSBkYXRhW2tleTRdXG5cdFx0XHRwYXRoID0gcGF0aC5yZXBsYWNlKC86KFteXFwvXSspL2csIGZ1bmN0aW9uKG1hdGNoMiwgdG9rZW4pIHtcblx0XHRcdFx0ZGVsZXRlIHF1ZXJ5RGF0YVt0b2tlbl1cblx0XHRcdFx0cmV0dXJuIGRhdGFbdG9rZW5dXG5cdFx0XHR9KVxuXHRcdH1cblx0XHR2YXIgcXVlcnkgPSBidWlsZFF1ZXJ5U3RyaW5nKHF1ZXJ5RGF0YSlcblx0XHRpZiAocXVlcnkpIHBhdGggKz0gXCI/XCIgKyBxdWVyeVxuXHRcdHZhciBoYXNoID0gYnVpbGRRdWVyeVN0cmluZyhoYXNoRGF0YSlcblx0XHRpZiAoaGFzaCkgcGF0aCArPSBcIiNcIiArIGhhc2hcblx0XHRpZiAoc3VwcG9ydHNQdXNoU3RhdGUpIHtcblx0XHRcdHZhciBzdGF0ZSA9IG9wdGlvbnMgPyBvcHRpb25zLnN0YXRlIDogbnVsbFxuXHRcdFx0dmFyIHRpdGxlID0gb3B0aW9ucyA/IG9wdGlvbnMudGl0bGUgOiBudWxsXG5cdFx0XHQkd2luZG93Lm9ucG9wc3RhdGUoKVxuXHRcdFx0aWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5yZXBsYWNlKSAkd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKHN0YXRlLCB0aXRsZSwgcm91dGVyLnByZWZpeCArIHBhdGgpXG5cdFx0XHRlbHNlICR3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUoc3RhdGUsIHRpdGxlLCByb3V0ZXIucHJlZml4ICsgcGF0aClcblx0XHR9XG5cdFx0ZWxzZSAkd2luZG93LmxvY2F0aW9uLmhyZWYgPSByb3V0ZXIucHJlZml4ICsgcGF0aFxuXHR9XG5cdHJvdXRlci5kZWZpbmVSb3V0ZXMgPSBmdW5jdGlvbihyb3V0ZXMsIHJlc29sdmUsIHJlamVjdCkge1xuXHRcdGZ1bmN0aW9uIHJlc29sdmVSb3V0ZSgpIHtcblx0XHRcdHZhciBwYXRoID0gcm91dGVyLmdldFBhdGgoKVxuXHRcdFx0dmFyIHBhcmFtcyA9IHt9XG5cdFx0XHR2YXIgcGF0aG5hbWUgPSBwYXJzZVBhdGgocGF0aCwgcGFyYW1zLCBwYXJhbXMpXG5cdFx0XHR2YXIgc3RhdGUgPSAkd2luZG93Lmhpc3Rvcnkuc3RhdGVcblx0XHRcdGlmIChzdGF0ZSAhPSBudWxsKSB7XG5cdFx0XHRcdGZvciAodmFyIGsgaW4gc3RhdGUpIHBhcmFtc1trXSA9IHN0YXRlW2tdXG5cdFx0XHR9XG5cdFx0XHRmb3IgKHZhciByb3V0ZTAgaW4gcm91dGVzKSB7XG5cdFx0XHRcdHZhciBtYXRjaGVyID0gbmV3IFJlZ0V4cChcIl5cIiArIHJvdXRlMC5yZXBsYWNlKC86W15cXC9dKz9cXC57M30vZywgXCIoLio/KVwiKS5yZXBsYWNlKC86W15cXC9dKy9nLCBcIihbXlxcXFwvXSspXCIpICsgXCJcXC8/JFwiKVxuXHRcdFx0XHRpZiAobWF0Y2hlci50ZXN0KHBhdGhuYW1lKSkge1xuXHRcdFx0XHRcdHBhdGhuYW1lLnJlcGxhY2UobWF0Y2hlciwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHR2YXIga2V5cyA9IHJvdXRlMC5tYXRjaCgvOlteXFwvXSsvZykgfHwgW11cblx0XHRcdFx0XHRcdHZhciB2YWx1ZXMgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSwgLTIpXG5cdFx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdFx0cGFyYW1zW2tleXNbaV0ucmVwbGFjZSgvOnxcXC4vZywgXCJcIildID0gZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlc1tpXSlcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJlc29sdmUocm91dGVzW3JvdXRlMF0sIHBhcmFtcywgcGF0aCwgcm91dGUwKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJlamVjdChwYXRoLCBwYXJhbXMpXG5cdFx0fVxuXHRcdGlmIChzdXBwb3J0c1B1c2hTdGF0ZSkgJHdpbmRvdy5vbnBvcHN0YXRlID0gZGVib3VuY2VBc3luYyhyZXNvbHZlUm91dGUpXG5cdFx0ZWxzZSBpZiAocm91dGVyLnByZWZpeC5jaGFyQXQoMCkgPT09IFwiI1wiKSAkd2luZG93Lm9uaGFzaGNoYW5nZSA9IHJlc29sdmVSb3V0ZVxuXHRcdHJlc29sdmVSb3V0ZSgpXG5cdH1cblx0cmV0dXJuIHJvdXRlclxufVxudmFyIF8yMCA9IGZ1bmN0aW9uKCR3aW5kb3csIHJlZHJhd1NlcnZpY2UwKSB7XG5cdHZhciByb3V0ZVNlcnZpY2UgPSBjb3JlUm91dGVyKCR3aW5kb3cpXG5cdHZhciBpZGVudGl0eSA9IGZ1bmN0aW9uKHYpIHtyZXR1cm4gdn1cblx0dmFyIHJlbmRlcjEsIGNvbXBvbmVudCwgYXR0cnMzLCBjdXJyZW50UGF0aCwgbGFzdFVwZGF0ZVxuXHR2YXIgcm91dGUgPSBmdW5jdGlvbihyb290LCBkZWZhdWx0Um91dGUsIHJvdXRlcykge1xuXHRcdGlmIChyb290ID09IG51bGwpIHRocm93IG5ldyBFcnJvcihcIkVuc3VyZSB0aGUgRE9NIGVsZW1lbnQgdGhhdCB3YXMgcGFzc2VkIHRvIGBtLnJvdXRlYCBpcyBub3QgdW5kZWZpbmVkXCIpXG5cdFx0dmFyIHJ1bjEgPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmIChyZW5kZXIxICE9IG51bGwpIHJlZHJhd1NlcnZpY2UwLnJlbmRlcihyb290LCByZW5kZXIxKFZub2RlKGNvbXBvbmVudCwgYXR0cnMzLmtleSwgYXR0cnMzKSkpXG5cdFx0fVxuXHRcdHZhciBiYWlsID0gZnVuY3Rpb24ocGF0aCkge1xuXHRcdFx0aWYgKHBhdGggIT09IGRlZmF1bHRSb3V0ZSkgcm91dGVTZXJ2aWNlLnNldFBhdGgoZGVmYXVsdFJvdXRlLCBudWxsLCB7cmVwbGFjZTogdHJ1ZX0pXG5cdFx0XHRlbHNlIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCByZXNvbHZlIGRlZmF1bHQgcm91dGUgXCIgKyBkZWZhdWx0Um91dGUpXG5cdFx0fVxuXHRcdHJvdXRlU2VydmljZS5kZWZpbmVSb3V0ZXMocm91dGVzLCBmdW5jdGlvbihwYXlsb2FkLCBwYXJhbXMsIHBhdGgpIHtcblx0XHRcdHZhciB1cGRhdGUgPSBsYXN0VXBkYXRlID0gZnVuY3Rpb24ocm91dGVSZXNvbHZlciwgY29tcCkge1xuXHRcdFx0XHRpZiAodXBkYXRlICE9PSBsYXN0VXBkYXRlKSByZXR1cm5cblx0XHRcdFx0Y29tcG9uZW50ID0gY29tcCAhPSBudWxsICYmICh0eXBlb2YgY29tcC52aWV3ID09PSBcImZ1bmN0aW9uXCIgfHwgdHlwZW9mIGNvbXAgPT09IFwiZnVuY3Rpb25cIik/IGNvbXAgOiBcImRpdlwiXG5cdFx0XHRcdGF0dHJzMyA9IHBhcmFtcywgY3VycmVudFBhdGggPSBwYXRoLCBsYXN0VXBkYXRlID0gbnVsbFxuXHRcdFx0XHRyZW5kZXIxID0gKHJvdXRlUmVzb2x2ZXIucmVuZGVyIHx8IGlkZW50aXR5KS5iaW5kKHJvdXRlUmVzb2x2ZXIpXG5cdFx0XHRcdHJ1bjEoKVxuXHRcdFx0fVxuXHRcdFx0aWYgKHBheWxvYWQudmlldyB8fCB0eXBlb2YgcGF5bG9hZCA9PT0gXCJmdW5jdGlvblwiKSB1cGRhdGUoe30sIHBheWxvYWQpXG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0aWYgKHBheWxvYWQub25tYXRjaCkge1xuXHRcdFx0XHRcdFByb21pc2UucmVzb2x2ZShwYXlsb2FkLm9ubWF0Y2gocGFyYW1zLCBwYXRoKSkudGhlbihmdW5jdGlvbihyZXNvbHZlZCkge1xuXHRcdFx0XHRcdFx0dXBkYXRlKHBheWxvYWQsIHJlc29sdmVkKVxuXHRcdFx0XHRcdH0sIGJhaWwpXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB1cGRhdGUocGF5bG9hZCwgXCJkaXZcIilcblx0XHRcdH1cblx0XHR9LCBiYWlsKVxuXHRcdHJlZHJhd1NlcnZpY2UwLnN1YnNjcmliZShyb290LCBydW4xKVxuXHR9XG5cdHJvdXRlLnNldCA9IGZ1bmN0aW9uKHBhdGgsIGRhdGEsIG9wdGlvbnMpIHtcblx0XHRpZiAobGFzdFVwZGF0ZSAhPSBudWxsKSB7XG5cdFx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuXHRcdFx0b3B0aW9ucy5yZXBsYWNlID0gdHJ1ZVxuXHRcdH1cblx0XHRsYXN0VXBkYXRlID0gbnVsbFxuXHRcdHJvdXRlU2VydmljZS5zZXRQYXRoKHBhdGgsIGRhdGEsIG9wdGlvbnMpXG5cdH1cblx0cm91dGUuZ2V0ID0gZnVuY3Rpb24oKSB7cmV0dXJuIGN1cnJlbnRQYXRofVxuXHRyb3V0ZS5wcmVmaXggPSBmdW5jdGlvbihwcmVmaXgwKSB7cm91dGVTZXJ2aWNlLnByZWZpeCA9IHByZWZpeDB9XG5cdHJvdXRlLmxpbmsgPSBmdW5jdGlvbih2bm9kZTEpIHtcblx0XHR2bm9kZTEuZG9tLnNldEF0dHJpYnV0ZShcImhyZWZcIiwgcm91dGVTZXJ2aWNlLnByZWZpeCArIHZub2RlMS5hdHRycy5ocmVmKVxuXHRcdHZub2RlMS5kb20ub25jbGljayA9IGZ1bmN0aW9uKGUpIHtcblx0XHRcdGlmIChlLmN0cmxLZXkgfHwgZS5tZXRhS2V5IHx8IGUuc2hpZnRLZXkgfHwgZS53aGljaCA9PT0gMikgcmV0dXJuXG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KClcblx0XHRcdGUucmVkcmF3ID0gZmFsc2Vcblx0XHRcdHZhciBocmVmID0gdGhpcy5nZXRBdHRyaWJ1dGUoXCJocmVmXCIpXG5cdFx0XHRpZiAoaHJlZi5pbmRleE9mKHJvdXRlU2VydmljZS5wcmVmaXgpID09PSAwKSBocmVmID0gaHJlZi5zbGljZShyb3V0ZVNlcnZpY2UucHJlZml4Lmxlbmd0aClcblx0XHRcdHJvdXRlLnNldChocmVmLCB1bmRlZmluZWQsIHVuZGVmaW5lZClcblx0XHR9XG5cdH1cblx0cm91dGUucGFyYW0gPSBmdW5jdGlvbihrZXkzKSB7XG5cdFx0aWYodHlwZW9mIGF0dHJzMyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2Yga2V5MyAhPT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIGF0dHJzM1trZXkzXVxuXHRcdHJldHVybiBhdHRyczNcblx0fVxuXHRyZXR1cm4gcm91dGVcbn1cbm0ucm91dGUgPSBfMjAod2luZG93LCByZWRyYXdTZXJ2aWNlKVxubS53aXRoQXR0ciA9IGZ1bmN0aW9uKGF0dHJOYW1lLCBjYWxsYmFjazEsIGNvbnRleHQpIHtcblx0cmV0dXJuIGZ1bmN0aW9uKGUpIHtcblx0XHRjYWxsYmFjazEuY2FsbChjb250ZXh0IHx8IHRoaXMsIGF0dHJOYW1lIGluIGUuY3VycmVudFRhcmdldCA/IGUuY3VycmVudFRhcmdldFthdHRyTmFtZV0gOiBlLmN1cnJlbnRUYXJnZXQuZ2V0QXR0cmlidXRlKGF0dHJOYW1lKSlcblx0fVxufVxudmFyIF8yOCA9IGNvcmVSZW5kZXJlcih3aW5kb3cpXG5tLnJlbmRlciA9IF8yOC5yZW5kZXJcbm0ucmVkcmF3ID0gcmVkcmF3U2VydmljZS5yZWRyYXdcbm0ucmVxdWVzdCA9IHJlcXVlc3RTZXJ2aWNlLnJlcXVlc3Rcbm0uanNvbnAgPSByZXF1ZXN0U2VydmljZS5qc29ucFxubS5wYXJzZVF1ZXJ5U3RyaW5nID0gcGFyc2VRdWVyeVN0cmluZ1xubS5idWlsZFF1ZXJ5U3RyaW5nID0gYnVpbGRRdWVyeVN0cmluZ1xubS52ZXJzaW9uID0gXCIxLjEuNlwiXG5tLnZub2RlID0gVm5vZGVcbmlmICh0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiKSBtb2R1bGVbXCJleHBvcnRzXCJdID0gbVxuZWxzZSB3aW5kb3cubSA9IG1cbn0oKSk7IiwiXCJ1c2Ugc3RyaWN0XCJcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zdHJlYW0vc3RyZWFtXCIpXG4iLCIvKiBlc2xpbnQtZGlzYWJsZSAqL1xuOyhmdW5jdGlvbigpIHtcblwidXNlIHN0cmljdFwiXG4vKiBlc2xpbnQtZW5hYmxlICovXG5cbnZhciBndWlkID0gMCwgSEFMVCA9IHt9XG5mdW5jdGlvbiBjcmVhdGVTdHJlYW0oKSB7XG5cdGZ1bmN0aW9uIHN0cmVhbSgpIHtcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSBIQUxUKSB1cGRhdGVTdHJlYW0oc3RyZWFtLCBhcmd1bWVudHNbMF0pXG5cdFx0cmV0dXJuIHN0cmVhbS5fc3RhdGUudmFsdWVcblx0fVxuXHRpbml0U3RyZWFtKHN0cmVhbSlcblxuXHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSBIQUxUKSB1cGRhdGVTdHJlYW0oc3RyZWFtLCBhcmd1bWVudHNbMF0pXG5cblx0cmV0dXJuIHN0cmVhbVxufVxuZnVuY3Rpb24gaW5pdFN0cmVhbShzdHJlYW0pIHtcblx0c3RyZWFtLmNvbnN0cnVjdG9yID0gY3JlYXRlU3RyZWFtXG5cdHN0cmVhbS5fc3RhdGUgPSB7aWQ6IGd1aWQrKywgdmFsdWU6IHVuZGVmaW5lZCwgc3RhdGU6IDAsIGRlcml2ZTogdW5kZWZpbmVkLCByZWNvdmVyOiB1bmRlZmluZWQsIGRlcHM6IHt9LCBwYXJlbnRzOiBbXSwgZW5kU3RyZWFtOiB1bmRlZmluZWQsIHVucmVnaXN0ZXI6IHVuZGVmaW5lZH1cblx0c3RyZWFtLm1hcCA9IHN0cmVhbVtcImZhbnRhc3ktbGFuZC9tYXBcIl0gPSBtYXAsIHN0cmVhbVtcImZhbnRhc3ktbGFuZC9hcFwiXSA9IGFwLCBzdHJlYW1bXCJmYW50YXN5LWxhbmQvb2ZcIl0gPSBjcmVhdGVTdHJlYW1cblx0c3RyZWFtLnZhbHVlT2YgPSB2YWx1ZU9mLCBzdHJlYW0udG9KU09OID0gdG9KU09OLCBzdHJlYW0udG9TdHJpbmcgPSB2YWx1ZU9mXG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXMoc3RyZWFtLCB7XG5cdFx0ZW5kOiB7Z2V0OiBmdW5jdGlvbigpIHtcblx0XHRcdGlmICghc3RyZWFtLl9zdGF0ZS5lbmRTdHJlYW0pIHtcblx0XHRcdFx0dmFyIGVuZFN0cmVhbSA9IGNyZWF0ZVN0cmVhbSgpXG5cdFx0XHRcdGVuZFN0cmVhbS5tYXAoZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdFx0XHRpZiAodmFsdWUgPT09IHRydWUpIHtcblx0XHRcdFx0XHRcdHVucmVnaXN0ZXJTdHJlYW0oc3RyZWFtKVxuXHRcdFx0XHRcdFx0ZW5kU3RyZWFtLl9zdGF0ZS51bnJlZ2lzdGVyID0gZnVuY3Rpb24oKXt1bnJlZ2lzdGVyU3RyZWFtKGVuZFN0cmVhbSl9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiB2YWx1ZVxuXHRcdFx0XHR9KVxuXHRcdFx0XHRzdHJlYW0uX3N0YXRlLmVuZFN0cmVhbSA9IGVuZFN0cmVhbVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHN0cmVhbS5fc3RhdGUuZW5kU3RyZWFtXG5cdFx0fX1cblx0fSlcbn1cbmZ1bmN0aW9uIHVwZGF0ZVN0cmVhbShzdHJlYW0sIHZhbHVlKSB7XG5cdHVwZGF0ZVN0YXRlKHN0cmVhbSwgdmFsdWUpXG5cdGZvciAodmFyIGlkIGluIHN0cmVhbS5fc3RhdGUuZGVwcykgdXBkYXRlRGVwZW5kZW5jeShzdHJlYW0uX3N0YXRlLmRlcHNbaWRdLCBmYWxzZSlcblx0aWYgKHN0cmVhbS5fc3RhdGUudW5yZWdpc3RlciAhPSBudWxsKSBzdHJlYW0uX3N0YXRlLnVucmVnaXN0ZXIoKVxuXHRmaW5hbGl6ZShzdHJlYW0pXG59XG5mdW5jdGlvbiB1cGRhdGVTdGF0ZShzdHJlYW0sIHZhbHVlKSB7XG5cdHN0cmVhbS5fc3RhdGUudmFsdWUgPSB2YWx1ZVxuXHRzdHJlYW0uX3N0YXRlLmNoYW5nZWQgPSB0cnVlXG5cdGlmIChzdHJlYW0uX3N0YXRlLnN0YXRlICE9PSAyKSBzdHJlYW0uX3N0YXRlLnN0YXRlID0gMVxufVxuZnVuY3Rpb24gdXBkYXRlRGVwZW5kZW5jeShzdHJlYW0sIG11c3RTeW5jKSB7XG5cdHZhciBzdGF0ZSA9IHN0cmVhbS5fc3RhdGUsIHBhcmVudHMgPSBzdGF0ZS5wYXJlbnRzXG5cdGlmIChwYXJlbnRzLmxlbmd0aCA+IDAgJiYgcGFyZW50cy5ldmVyeShhY3RpdmUpICYmIChtdXN0U3luYyB8fCBwYXJlbnRzLnNvbWUoY2hhbmdlZCkpKSB7XG5cdFx0dmFyIHZhbHVlID0gc3RyZWFtLl9zdGF0ZS5kZXJpdmUoKVxuXHRcdGlmICh2YWx1ZSA9PT0gSEFMVCkgcmV0dXJuIGZhbHNlXG5cdFx0dXBkYXRlU3RhdGUoc3RyZWFtLCB2YWx1ZSlcblx0fVxufVxuZnVuY3Rpb24gZmluYWxpemUoc3RyZWFtKSB7XG5cdHN0cmVhbS5fc3RhdGUuY2hhbmdlZCA9IGZhbHNlXG5cdGZvciAodmFyIGlkIGluIHN0cmVhbS5fc3RhdGUuZGVwcykgc3RyZWFtLl9zdGF0ZS5kZXBzW2lkXS5fc3RhdGUuY2hhbmdlZCA9IGZhbHNlXG59XG5cbmZ1bmN0aW9uIGNvbWJpbmUoZm4sIHN0cmVhbXMpIHtcblx0aWYgKCFzdHJlYW1zLmV2ZXJ5KHZhbGlkKSkgdGhyb3cgbmV3IEVycm9yKFwiRW5zdXJlIHRoYXQgZWFjaCBpdGVtIHBhc3NlZCB0byBzdHJlYW0uY29tYmluZS9zdHJlYW0ubWVyZ2UgaXMgYSBzdHJlYW1cIilcblx0cmV0dXJuIGluaXREZXBlbmRlbmN5KGNyZWF0ZVN0cmVhbSgpLCBzdHJlYW1zLCBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gZm4uYXBwbHkodGhpcywgc3RyZWFtcy5jb25jYXQoW3N0cmVhbXMuZmlsdGVyKGNoYW5nZWQpXSkpXG5cdH0pXG59XG5cbmZ1bmN0aW9uIGluaXREZXBlbmRlbmN5KGRlcCwgc3RyZWFtcywgZGVyaXZlKSB7XG5cdHZhciBzdGF0ZSA9IGRlcC5fc3RhdGVcblx0c3RhdGUuZGVyaXZlID0gZGVyaXZlXG5cdHN0YXRlLnBhcmVudHMgPSBzdHJlYW1zLmZpbHRlcihub3RFbmRlZClcblxuXHRyZWdpc3RlckRlcGVuZGVuY3koZGVwLCBzdGF0ZS5wYXJlbnRzKVxuXHR1cGRhdGVEZXBlbmRlbmN5KGRlcCwgdHJ1ZSlcblxuXHRyZXR1cm4gZGVwXG59XG5mdW5jdGlvbiByZWdpc3RlckRlcGVuZGVuY3koc3RyZWFtLCBwYXJlbnRzKSB7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgcGFyZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdHBhcmVudHNbaV0uX3N0YXRlLmRlcHNbc3RyZWFtLl9zdGF0ZS5pZF0gPSBzdHJlYW1cblx0XHRyZWdpc3RlckRlcGVuZGVuY3koc3RyZWFtLCBwYXJlbnRzW2ldLl9zdGF0ZS5wYXJlbnRzKVxuXHR9XG59XG5mdW5jdGlvbiB1bnJlZ2lzdGVyU3RyZWFtKHN0cmVhbSkge1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IHN0cmVhbS5fc3RhdGUucGFyZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdHZhciBwYXJlbnQgPSBzdHJlYW0uX3N0YXRlLnBhcmVudHNbaV1cblx0XHRkZWxldGUgcGFyZW50Ll9zdGF0ZS5kZXBzW3N0cmVhbS5fc3RhdGUuaWRdXG5cdH1cblx0Zm9yICh2YXIgaWQgaW4gc3RyZWFtLl9zdGF0ZS5kZXBzKSB7XG5cdFx0dmFyIGRlcGVuZGVudCA9IHN0cmVhbS5fc3RhdGUuZGVwc1tpZF1cblx0XHR2YXIgaW5kZXggPSBkZXBlbmRlbnQuX3N0YXRlLnBhcmVudHMuaW5kZXhPZihzdHJlYW0pXG5cdFx0aWYgKGluZGV4ID4gLTEpIGRlcGVuZGVudC5fc3RhdGUucGFyZW50cy5zcGxpY2UoaW5kZXgsIDEpXG5cdH1cblx0c3RyZWFtLl9zdGF0ZS5zdGF0ZSA9IDIgLy9lbmRlZFxuXHRzdHJlYW0uX3N0YXRlLmRlcHMgPSB7fVxufVxuXG5mdW5jdGlvbiBtYXAoZm4pIHtyZXR1cm4gY29tYmluZShmdW5jdGlvbihzdHJlYW0pIHtyZXR1cm4gZm4oc3RyZWFtKCkpfSwgW3RoaXNdKX1cbmZ1bmN0aW9uIGFwKHN0cmVhbSkge3JldHVybiBjb21iaW5lKGZ1bmN0aW9uKHMxLCBzMikge3JldHVybiBzMSgpKHMyKCkpfSwgW3N0cmVhbSwgdGhpc10pfVxuZnVuY3Rpb24gdmFsdWVPZigpIHtyZXR1cm4gdGhpcy5fc3RhdGUudmFsdWV9XG5mdW5jdGlvbiB0b0pTT04oKSB7cmV0dXJuIHRoaXMuX3N0YXRlLnZhbHVlICE9IG51bGwgJiYgdHlwZW9mIHRoaXMuX3N0YXRlLnZhbHVlLnRvSlNPTiA9PT0gXCJmdW5jdGlvblwiID8gdGhpcy5fc3RhdGUudmFsdWUudG9KU09OKCkgOiB0aGlzLl9zdGF0ZS52YWx1ZX1cblxuZnVuY3Rpb24gdmFsaWQoc3RyZWFtKSB7cmV0dXJuIHN0cmVhbS5fc3RhdGUgfVxuZnVuY3Rpb24gYWN0aXZlKHN0cmVhbSkge3JldHVybiBzdHJlYW0uX3N0YXRlLnN0YXRlID09PSAxfVxuZnVuY3Rpb24gY2hhbmdlZChzdHJlYW0pIHtyZXR1cm4gc3RyZWFtLl9zdGF0ZS5jaGFuZ2VkfVxuZnVuY3Rpb24gbm90RW5kZWQoc3RyZWFtKSB7cmV0dXJuIHN0cmVhbS5fc3RhdGUuc3RhdGUgIT09IDJ9XG5cbmZ1bmN0aW9uIG1lcmdlKHN0cmVhbXMpIHtcblx0cmV0dXJuIGNvbWJpbmUoZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHN0cmVhbXMubWFwKGZ1bmN0aW9uKHMpIHtyZXR1cm4gcygpfSlcblx0fSwgc3RyZWFtcylcbn1cblxuZnVuY3Rpb24gc2NhbihyZWR1Y2VyLCBzZWVkLCBzdHJlYW0pIHtcblx0dmFyIG5ld1N0cmVhbSA9IGNvbWJpbmUoZnVuY3Rpb24gKHMpIHtcblx0XHRyZXR1cm4gc2VlZCA9IHJlZHVjZXIoc2VlZCwgcy5fc3RhdGUudmFsdWUpXG5cdH0sIFtzdHJlYW1dKVxuXG5cdGlmIChuZXdTdHJlYW0uX3N0YXRlLnN0YXRlID09PSAwKSBuZXdTdHJlYW0oc2VlZClcblxuXHRyZXR1cm4gbmV3U3RyZWFtXG59XG5cbmZ1bmN0aW9uIHNjYW5NZXJnZSh0dXBsZXMsIHNlZWQpIHtcblx0dmFyIHN0cmVhbXMgPSB0dXBsZXMubWFwKGZ1bmN0aW9uKHR1cGxlKSB7XG5cdFx0dmFyIHN0cmVhbSA9IHR1cGxlWzBdXG5cdFx0aWYgKHN0cmVhbS5fc3RhdGUuc3RhdGUgPT09IDApIHN0cmVhbSh1bmRlZmluZWQpXG5cdFx0cmV0dXJuIHN0cmVhbVxuXHR9KVxuXG5cdHZhciBuZXdTdHJlYW0gPSBjb21iaW5lKGZ1bmN0aW9uKCkge1xuXHRcdHZhciBjaGFuZ2VkID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXVxuXG5cdFx0c3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uKHN0cmVhbSwgaWR4KSB7XG5cdFx0XHRpZiAoY2hhbmdlZC5pbmRleE9mKHN0cmVhbSkgPiAtMSkge1xuXHRcdFx0XHRzZWVkID0gdHVwbGVzW2lkeF1bMV0oc2VlZCwgc3RyZWFtLl9zdGF0ZS52YWx1ZSlcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0cmV0dXJuIHNlZWRcblx0fSwgc3RyZWFtcylcblxuXHRyZXR1cm4gbmV3U3RyZWFtXG59XG5cbmNyZWF0ZVN0cmVhbVtcImZhbnRhc3ktbGFuZC9vZlwiXSA9IGNyZWF0ZVN0cmVhbVxuY3JlYXRlU3RyZWFtLm1lcmdlID0gbWVyZ2VcbmNyZWF0ZVN0cmVhbS5jb21iaW5lID0gY29tYmluZVxuY3JlYXRlU3RyZWFtLnNjYW4gPSBzY2FuXG5jcmVhdGVTdHJlYW0uc2Nhbk1lcmdlID0gc2Nhbk1lcmdlXG5jcmVhdGVTdHJlYW0uSEFMVCA9IEhBTFRcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09IFwidW5kZWZpbmVkXCIpIG1vZHVsZVtcImV4cG9ydHNcIl0gPSBjcmVhdGVTdHJlYW1cbmVsc2UgaWYgKHR5cGVvZiB3aW5kb3cubSA9PT0gXCJmdW5jdGlvblwiICYmICEoXCJzdHJlYW1cIiBpbiB3aW5kb3cubSkpIHdpbmRvdy5tLnN0cmVhbSA9IGNyZWF0ZVN0cmVhbVxuZWxzZSB3aW5kb3cubSA9IHtzdHJlYW0gOiBjcmVhdGVTdHJlYW19XG5cbn0oKSk7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwidmFyIG5leHRUaWNrID0gcmVxdWlyZSgncHJvY2Vzcy9icm93c2VyLmpzJykubmV4dFRpY2s7XG52YXIgYXBwbHkgPSBGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHk7XG52YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG52YXIgaW1tZWRpYXRlSWRzID0ge307XG52YXIgbmV4dEltbWVkaWF0ZUlkID0gMDtcblxuLy8gRE9NIEFQSXMsIGZvciBjb21wbGV0ZW5lc3NcblxuZXhwb3J0cy5zZXRUaW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgVGltZW91dChhcHBseS5jYWxsKHNldFRpbWVvdXQsIHdpbmRvdywgYXJndW1lbnRzKSwgY2xlYXJUaW1lb3V0KTtcbn07XG5leHBvcnRzLnNldEludGVydmFsID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgVGltZW91dChhcHBseS5jYWxsKHNldEludGVydmFsLCB3aW5kb3csIGFyZ3VtZW50cyksIGNsZWFySW50ZXJ2YWwpO1xufTtcbmV4cG9ydHMuY2xlYXJUaW1lb3V0ID1cbmV4cG9ydHMuY2xlYXJJbnRlcnZhbCA9IGZ1bmN0aW9uKHRpbWVvdXQpIHsgdGltZW91dC5jbG9zZSgpOyB9O1xuXG5mdW5jdGlvbiBUaW1lb3V0KGlkLCBjbGVhckZuKSB7XG4gIHRoaXMuX2lkID0gaWQ7XG4gIHRoaXMuX2NsZWFyRm4gPSBjbGVhckZuO1xufVxuVGltZW91dC5wcm90b3R5cGUudW5yZWYgPSBUaW1lb3V0LnByb3RvdHlwZS5yZWYgPSBmdW5jdGlvbigpIHt9O1xuVGltZW91dC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fY2xlYXJGbi5jYWxsKHdpbmRvdywgdGhpcy5faWQpO1xufTtcblxuLy8gRG9lcyBub3Qgc3RhcnQgdGhlIHRpbWUsIGp1c3Qgc2V0cyB1cCB0aGUgbWVtYmVycyBuZWVkZWQuXG5leHBvcnRzLmVucm9sbCA9IGZ1bmN0aW9uKGl0ZW0sIG1zZWNzKSB7XG4gIGNsZWFyVGltZW91dChpdGVtLl9pZGxlVGltZW91dElkKTtcbiAgaXRlbS5faWRsZVRpbWVvdXQgPSBtc2Vjcztcbn07XG5cbmV4cG9ydHMudW5lbnJvbGwgPSBmdW5jdGlvbihpdGVtKSB7XG4gIGNsZWFyVGltZW91dChpdGVtLl9pZGxlVGltZW91dElkKTtcbiAgaXRlbS5faWRsZVRpbWVvdXQgPSAtMTtcbn07XG5cbmV4cG9ydHMuX3VucmVmQWN0aXZlID0gZXhwb3J0cy5hY3RpdmUgPSBmdW5jdGlvbihpdGVtKSB7XG4gIGNsZWFyVGltZW91dChpdGVtLl9pZGxlVGltZW91dElkKTtcblxuICB2YXIgbXNlY3MgPSBpdGVtLl9pZGxlVGltZW91dDtcbiAgaWYgKG1zZWNzID49IDApIHtcbiAgICBpdGVtLl9pZGxlVGltZW91dElkID0gc2V0VGltZW91dChmdW5jdGlvbiBvblRpbWVvdXQoKSB7XG4gICAgICBpZiAoaXRlbS5fb25UaW1lb3V0KVxuICAgICAgICBpdGVtLl9vblRpbWVvdXQoKTtcbiAgICB9LCBtc2Vjcyk7XG4gIH1cbn07XG5cbi8vIFRoYXQncyBub3QgaG93IG5vZGUuanMgaW1wbGVtZW50cyBpdCBidXQgdGhlIGV4cG9zZWQgYXBpIGlzIHRoZSBzYW1lLlxuZXhwb3J0cy5zZXRJbW1lZGlhdGUgPSB0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSBcImZ1bmN0aW9uXCIgPyBzZXRJbW1lZGlhdGUgOiBmdW5jdGlvbihmbikge1xuICB2YXIgaWQgPSBuZXh0SW1tZWRpYXRlSWQrKztcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHMubGVuZ3RoIDwgMiA/IGZhbHNlIDogc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG4gIGltbWVkaWF0ZUlkc1tpZF0gPSB0cnVlO1xuXG4gIG5leHRUaWNrKGZ1bmN0aW9uIG9uTmV4dFRpY2soKSB7XG4gICAgaWYgKGltbWVkaWF0ZUlkc1tpZF0pIHtcbiAgICAgIC8vIGZuLmNhbGwoKSBpcyBmYXN0ZXIgc28gd2Ugb3B0aW1pemUgZm9yIHRoZSBjb21tb24gdXNlLWNhc2VcbiAgICAgIC8vIEBzZWUgaHR0cDovL2pzcGVyZi5jb20vY2FsbC1hcHBseS1zZWd1XG4gICAgICBpZiAoYXJncykge1xuICAgICAgICBmbi5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZuLmNhbGwobnVsbCk7XG4gICAgICB9XG4gICAgICAvLyBQcmV2ZW50IGlkcyBmcm9tIGxlYWtpbmdcbiAgICAgIGV4cG9ydHMuY2xlYXJJbW1lZGlhdGUoaWQpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGlkO1xufTtcblxuZXhwb3J0cy5jbGVhckltbWVkaWF0ZSA9IHR5cGVvZiBjbGVhckltbWVkaWF0ZSA9PT0gXCJmdW5jdGlvblwiID8gY2xlYXJJbW1lZGlhdGUgOiBmdW5jdGlvbihpZCkge1xuICBkZWxldGUgaW1tZWRpYXRlSWRzW2lkXTtcbn07IiwiaW1wb3J0IFNwZWVkbyBmcm9tICcuL1NwZWVkbydcblxuY29uc3QgTk9ORSAgPSAwXG5jb25zdCBNT1VTRSA9IDFcbmNvbnN0IFRPVUNIID0gMlxuXG5jb25zdCBERVZJQ0VfREVMQVkgPSAzMDBcblxuY29uc3QgREVGQVVMVF9EUkFHX1RIUkVTSE9MRCA9IDEyXG5jb25zdCBERUZBVUxUX0RSQUdfUkFUSU8gICAgID0gMS41XG5cbnR5cGUgRHJhZ2dlckV2ZW50VHlwZSA9ICdkcmFnc3RhcnQnIHwgJ2RyYWdtb3ZlJyB8ICdkcmFnZW5kJyB8ICdkcmFnY2FuY2VsJyB8ICdkZXZpY2VwcmVzcycgfCAnZGV2aWNlcmVsZWFzZSdcblxuZXhwb3J0IGNsYXNzIERyYWdnZXJFdmVudCB7XG5cdHR5cGU6IERyYWdnZXJFdmVudFR5cGVcblx0Y29uc3RydWN0b3IgKHR5cGU6IERyYWdnZXJFdmVudFR5cGUpIHtcblx0XHR0aGlzLnR5cGUgPSB0eXBlXG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIERyYWdnZXJEcmFnRXZlbnQgZXh0ZW5kcyBEcmFnZ2VyRXZlbnQge1xuXHR4OiBudW1iZXJcblx0eHY6IG51bWJlclxuXHRjb25zdHJ1Y3RvciAodHlwZTogJ2RyYWdzdGFydCcgfCAnZHJhZ21vdmUnIHwgJ2RyYWdlbmQnLCB4OiBudW1iZXIsIHh2OiBudW1iZXIpIHtcblx0XHRzdXBlcih0eXBlKVxuXHRcdHRoaXMueCA9IHhcblx0XHR0aGlzLnh2ID0geHZcblx0fVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIERyYWdnZXJFdmVudExpc3RlbmVycyB7XG5cdC8qKiBGaXJlcyB3aGVuIGRyYWdUaHJlc2hvbGQgZXhjZWVkZWQgYW5kIGVsZW1lbnQgaXMgaW4gJ2RyYWdnaW5nJyBzdGF0ZSAqL1xuXHRkcmFnc3RhcnQ/KGU6IERyYWdnZXJEcmFnRXZlbnQpOiB2b2lkXG5cdC8qKiBGaXJlcyBmb3IgZXZlcnkgbW92ZSBtYWRlIHdoaWxlIGRyYWdnZWQgKi9cblx0ZHJhZ21vdmU/KGU6IERyYWdnZXJEcmFnRXZlbnQpOiB2b2lkXG5cdC8qKiBGaXJlcyB3aGVuIGRyYWcgZW5kcyAqL1xuXHRkcmFnZW5kPyhlOiBEcmFnZ2VyRHJhZ0V2ZW50KTogdm9pZFxuXHQvKiogRmlyZXMgaWYgZHJhZyB3YXMgc3RhcnRlZCB0aGVuIGNhbmNlbGxlZCAqL1xuXHRkcmFnY2FuY2VsPyhlOiBEcmFnZ2VyRXZlbnQpOiB2b2lkXG5cdC8qKiBGaXJlcyB3aGVuIGlucHV0IGRldmljZSBwcmVzc2VkICovXG5cdGRldmljZXByZXNzPyhlOiBNb3VzZUV2ZW50IHwgVG91Y2hFdmVudCk6IHZvaWRcblx0LyoqIEZpcmVzIHdoZW4gaW5wdXQgZGV2aWNlIHJlbGVhc2VkICovXG5cdGRldmljZXJlbGVhc2U/KGU6IE1vdXNlRXZlbnQgfCBUb3VjaEV2ZW50KTogdm9pZFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIERyYWdnZXJPcHRpb25zIHtcblx0LyoqIFNwZWNpZnkgZHJhZyB0aHJlc2hvbGQgZGlzdGFuY2UgKi9cblx0ZHJhZ1RocmVzaG9sZD86IG51bWJlclxuXHQvKiogU3BlY2lmaXkgbWluaW11bSBkcmFnIHJhdGlvICovXG5cdGRyYWdSYXRpbz86IG51bWJlclxuXHQvKiogRGV2aWNlcyB0byBhY2NlcHQgaW5wdXQgZnJvbSAoZGVmYXVsdCBbJ21vdXNlJywgJ3RvdWNoJ10pICovXG5cdGRldmljZXM/OiAoJ21vdXNlJyB8ICd0b3VjaCcpW11cblx0b24/OiBEcmFnZ2VyRXZlbnRMaXN0ZW5lcnNcblx0LyoqIE1heGltdW0gbGVmdCBkcmFnIGFtb3VudCAqL1xuXHRtYXhMZWZ0PygpOiBudW1iZXJcblx0LyoqIE1heGltdW0gbGVmdCBkcmFnIGFtb3VudCAqL1xuXHRtYXhSaWdodD8oKTogbnVtYmVyXG59XG5cbi8qKlxuICogR2l2ZW4gYSBkb20gZWxlbWVudCwgZW1pdCAnZHJhZycgZXZlbnRzIHRoYXQgb2NjdXIgYWxvbmcgdGhlIGhvcml6b250YWwgYXhpc1xuICovXG5mdW5jdGlvbiBEcmFnZ2VyIChcblx0ZWw6IEhUTUxFbGVtZW50LFxuXHR7XG5cdFx0b24gPSB7fSxcblx0XHRkcmFnVGhyZXNob2xkID0gREVGQVVMVF9EUkFHX1RIUkVTSE9MRCxcblx0XHRkcmFnUmF0aW8gPSBERUZBVUxUX0RSQUdfUkFUSU8sXG5cdFx0ZGV2aWNlcyxcblx0XHRtYXhMZWZ0LCBtYXhSaWdodFxuXHR9OiBEcmFnZ2VyT3B0aW9ucyA9IHt9XG4pIHtcblx0YXBwbHlJT1NIYWNrKClcblx0Y29uc3Qgc3BlZWRvID0gU3BlZWRvKClcblx0bGV0IGRldmljZTogMCB8IDEgfCAyID0gTk9ORVxuXHQvKiogRmxhZyB0byBwcmV2ZW50IGRyYWdnaW5nIHdoaWxlIHNvbWUgY2hpbGQgZWxlbWVudCBpcyBzY3JvbGxpbmcgKi9cblx0bGV0IGlzU2Nyb2xsaW5nID0gZmFsc2Vcblx0LyoqIFRvdWNoL01vdXNlIGlzIGRvd24gKi9cblx0bGV0IHByZXNzZWQgPSBmYWxzZVxuXHQvKiogSW5kaWNhdGVzIGRyYWcgdGhyZXNob2xkIGNyb3NzZWQgYW5kIHdlJ3JlIGluIFwiZHJhZ2dpbmdcIiBtb2RlICovXG5cdGxldCBpc0RyYWdnaW5nID0gZmFsc2Vcblx0Y29uc3QgZHJhZ1N0YXJ0ID0ge3g6IDAsIHk6IDB9XG5cblx0ZnVuY3Rpb24gb25Nb3VzZURvd24gKGU6IE1vdXNlRXZlbnQpIHtcblx0XHRpZiAoZGV2aWNlID09PSBUT1VDSCkgcmV0dXJuXG5cdFx0Y2FuY2VsUHJlc3MoKVxuXHRcdGlmIChlLmJ1dHRvbiAhPT0gMCkgcmV0dXJuXG5cdFx0ZGV2aWNlID0gTU9VU0Vcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgb25Nb3VzZU1vdmUpXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBvbk1vdXNlVXApXG5cdFx0b25QcmVzcyhlLmNsaWVudFgsIGUuY2xpZW50WSwgZSlcblx0fVxuXHRmdW5jdGlvbiBvbk1vdXNlTW92ZSAoZTogTW91c2VFdmVudCkge1xuXHRcdG9uTW92ZShlLmNsaWVudFgsIGUuY2xpZW50WSwgZSlcblx0fVxuXHRmdW5jdGlvbiBvbk1vdXNlVXAgKGU6IE1vdXNlRXZlbnQpIHtcblx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgb25Nb3VzZU1vdmUpXG5cdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBvbk1vdXNlVXApXG5cdFx0b25SZWxlYXNlKGUuY2xpZW50WCwgZS5jbGllbnRZLCBlKVxuXHR9XG5cblx0ZnVuY3Rpb24gb25Ub3VjaFN0YXJ0IChlOiBUb3VjaEV2ZW50KSB7XG5cdFx0aWYgKGRldmljZSA9PT0gTU9VU0UpIHJldHVyblxuXHRcdGNhbmNlbFByZXNzKClcblx0XHRkZXZpY2UgPSBUT1VDSFxuXHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIG9uVG91Y2hNb3ZlKVxuXHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgb25Ub3VjaEVuZClcblx0XHRjb25zdCB0ID0gZS5jaGFuZ2VkVG91Y2hlc1swXVxuXHRcdG9uUHJlc3ModC5jbGllbnRYLCB0LmNsaWVudFksIGUpXG5cdH1cblx0ZnVuY3Rpb24gb25Ub3VjaE1vdmUgKGU6IFRvdWNoRXZlbnQpIHtcblx0XHRjb25zdCB0ID0gZS5jaGFuZ2VkVG91Y2hlc1swXVxuXHRcdG9uTW92ZSh0LmNsaWVudFgsIHQuY2xpZW50WSwgZSlcblx0fVxuXHRmdW5jdGlvbiBvblRvdWNoRW5kIChlOiBUb3VjaEV2ZW50KSB7XG5cdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgb25Ub3VjaE1vdmUpXG5cdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBvblRvdWNoRW5kKVxuXHRcdGNvbnN0IHQgPSBlLmNoYW5nZWRUb3VjaGVzWzBdXG5cdFx0b25SZWxlYXNlKHQuY2xpZW50WCwgdC5jbGllbnRZLCBlKVxuXHR9XG5cblx0ZnVuY3Rpb24gb25QcmVzcyAoeDogbnVtYmVyLCB5OiBudW1iZXIsIGU6IE1vdXNlRXZlbnQgfCBUb3VjaEV2ZW50KSB7XG5cdFx0aXNTY3JvbGxpbmcgPSBmYWxzZVxuXHRcdHByZXNzZWQgPSB0cnVlXG5cdFx0ZHJhZ1N0YXJ0LnggPSB4XG5cdFx0ZHJhZ1N0YXJ0LnkgPSB5XG5cdFx0c3BlZWRvLnN0YXJ0KDAsIERhdGUubm93KCkgLyAxMDAwKVxuXHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIG9uU2Nyb2xsLCB0cnVlKVxuXHRcdG9uLmRldmljZXByZXNzICYmIG9uLmRldmljZXByZXNzKGUpXG5cdH1cblxuXHRmdW5jdGlvbiBvbk1vdmUgKHg6IG51bWJlciwgeTogbnVtYmVyLCBlOiBNb3VzZUV2ZW50IHwgVG91Y2hFdmVudCkge1xuXHRcdGlmICghcHJlc3NlZCkgcmV0dXJuXG5cdFx0bGV0IGR4ID0geCAtIGRyYWdTdGFydC54XG5cdFx0aWYgKG1heExlZnQgIT0gbnVsbCkge1xuXHRcdFx0ZHggPSBNYXRoLm1heChkeCwgbWF4TGVmdCgpKVxuXHRcdH1cblx0XHRpZiAobWF4UmlnaHQgIT0gbnVsbCkge1xuXHRcdFx0ZHggPSBNYXRoLm1pbihkeCwgbWF4UmlnaHQoKSlcblx0XHR9XG5cdFx0Y29uc3QgZHkgPSB5IC0gZHJhZ1N0YXJ0Lnlcblx0XHRzcGVlZG8uYWRkU2FtcGxlKGR4LCBEYXRlLm5vdygpIC8gMTAwMClcblx0XHRpZiAoIWlzRHJhZ2dpbmcpIHtcblx0XHRcdGNvbnN0IHJhdGlvID0gZHkgIT09IDAgPyBNYXRoLmFicyhkeCAvIGR5KSA6IDEwMDAwMDAwMDAuMFxuXHRcdFx0aWYgKE1hdGguYWJzKGR4KSA8IGRyYWdUaHJlc2hvbGQgfHwgcmF0aW8gPCBkcmFnUmF0aW8pIHtcblx0XHRcdFx0Ly8gU3RpbGwgbm90IGRyYWdnaW5nLiBCYWlsIG91dC5cblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHQvLyBEaXN0YW5jZSB0aHJlc2hvbGQgY3Jvc3NlZCAtIGluaXQgZHJhZyBzdGF0ZVxuXHRcdFx0aXNEcmFnZ2luZyA9IHRydWVcblx0XHRcdG9uLmRyYWdzdGFydCAmJiBvbi5kcmFnc3RhcnQoXG5cdFx0XHRcdG5ldyBEcmFnZ2VyRHJhZ0V2ZW50KCdkcmFnc3RhcnQnLCBkeCwgMClcblx0XHRcdClcblx0XHR9XG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0b24uZHJhZ21vdmUgJiYgb24uZHJhZ21vdmUoXG5cdFx0XHRuZXcgRHJhZ2dlckRyYWdFdmVudCgnZHJhZ21vdmUnLCBkeCwgc3BlZWRvLmdldFZlbCgpKVxuXHRcdClcblx0fVxuXG5cdGZ1bmN0aW9uIG9uUmVsZWFzZSAoeDogbnVtYmVyLCB5OiBudW1iZXIsIGU6IE1vdXNlRXZlbnQgfCBUb3VjaEV2ZW50KSB7XG5cdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgb25TY3JvbGwsIHRydWUpXG5cdFx0cHJlc3NlZCA9IGZhbHNlXG5cdFx0aWYgKCFpc0RyYWdnaW5nKSB7XG5cdFx0XHQvLyBOZXZlciBjcm9zc2VkIGRyYWcgc3RhcnQgdGhyZXNob2xkLCBiYWlsIG91dCBub3cuXG5cdFx0XHRyZXR1cm5cblx0XHR9XG5cdFx0aXNEcmFnZ2luZyA9IGZhbHNlXG5cdFx0Y29uc3QgZHggPSB4IC0gZHJhZ1N0YXJ0Lnhcblx0XHRzcGVlZG8uYWRkU2FtcGxlKGR4LCBEYXRlLm5vdygpIC8gMTAwMClcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdGlmICghcHJlc3NlZCkgZGV2aWNlID0gTk9ORVxuXHRcdH0sIERFVklDRV9ERUxBWSlcblx0XHRvbi5kZXZpY2VyZWxlYXNlICYmIG9uLmRldmljZXJlbGVhc2UoZSlcblx0XHRvbi5kcmFnZW5kICYmIG9uLmRyYWdlbmQoXG5cdFx0XHRuZXcgRHJhZ2dlckRyYWdFdmVudCgnZHJhZ2VuZCcsIGR4LCBzcGVlZG8uZ2V0VmVsKCkpXG5cdFx0KVxuXHR9XG5cblx0LyoqIFJlY2VpdmVkIHNjcm9sbCBldmVudCAtIGRyYWdnaW5nIHNob3VsZCBiZSBjYW5jZWxsZWQuICovXG5cdGZ1bmN0aW9uIG9uU2Nyb2xsIChlOiBVSUV2ZW50KSB7XG5cdFx0aXNTY3JvbGxpbmcgPSB0cnVlXG5cdFx0Y2FuY2VsUHJlc3MoKVxuXHR9XG5cblx0ZnVuY3Rpb24gY2FuY2VsUHJlc3MoKSB7XG5cdFx0aWYgKCFwcmVzc2VkKSByZXR1cm5cblx0XHRpZiAoZGV2aWNlID09PSBNT1VTRSkge1xuXHRcdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIG9uTW91c2VNb3ZlKVxuXHRcdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBvbk1vdXNlVXApXG5cdFx0fSBlbHNlIGlmIChkZXZpY2UgPT09IFRPVUNIKSB7XG5cdFx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBvblRvdWNoTW92ZSlcblx0XHRcdGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgb25Ub3VjaEVuZClcblx0XHR9XG5cdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgb25TY3JvbGwsIHRydWUpXG5cdFx0cHJlc3NlZCA9IGZhbHNlXG5cdFx0aWYgKGlzRHJhZ2dpbmcpIHtcblx0XHRcdGlzRHJhZ2dpbmcgPSBmYWxzZVxuXHRcdFx0b24uZHJhZ2NhbmNlbCAmJiBvbi5kcmFnY2FuY2VsKFxuXHRcdFx0XHRuZXcgRHJhZ2dlckV2ZW50KCdkcmFnY2FuY2VsJylcblx0XHRcdClcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBkZXN0cm95KCkge1xuXHRcdGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIG9uTW91c2VEb3duKVxuXHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgb25Nb3VzZVVwKVxuXHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBvbk1vdXNlTW92ZSlcblx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0Jywgb25Ub3VjaFN0YXJ0KVxuXHRcdGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgb25Ub3VjaEVuZClcblx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBvblRvdWNoTW92ZSlcblx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdzY3JvbGwnLCBvblNjcm9sbCwgdHJ1ZSlcblx0fVxuXG5cdC8vIEluaXRpYWxpemUgdGhlIGlucHV0IGxpc3RlbmVycyB3ZSB3YW50XG5cdGlmICghZGV2aWNlcyB8fCBkZXZpY2VzLmluZGV4T2YoJ21vdXNlJykgPj0gMCkge1xuXHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIG9uTW91c2VEb3duKVxuXHR9XG5cdGlmICghZGV2aWNlcyB8fCBkZXZpY2VzLmluZGV4T2YoJ3RvdWNoJykgPj0gMCkge1xuXHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvblRvdWNoU3RhcnQpXG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdGlzRHJhZ2dpbmc6ICgpID0+IGlzRHJhZ2dpbmcsXG5cdFx0ZGVzdHJveVxuXHR9XG59XG5cbnR5cGUgRHJhZ2dlciA9IFJldHVyblR5cGU8dHlwZW9mIERyYWdnZXI+XG5cbmV4cG9ydCBkZWZhdWx0IERyYWdnZXJcblxuLy8gV29ya2Fyb3VuZCBmb3Igd2Via2l0IGJ1ZyB3aGVyZSBldmVudC5wcmV2ZW50RGVmYXVsdFxuLy8gd2l0aGluIHRvdWNobW92ZSBoYW5kbGVyIGZhaWxzIHRvIHByZXZlbnQgc2Nyb2xsaW5nLlxuY29uc3QgaXNJT1MgPSAhIW5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL2lQaG9uZXxpUGFkfGlQb2QvaSlcbmxldCBpT1NIYWNrQXBwbGllZCA9IGZhbHNlXG5mdW5jdGlvbiBhcHBseUlPU0hhY2soKSB7XG5cdC8vIE9ubHkgYXBwbHkgdGhpcyBoYWNrIGlmIGlPUywgaGF2ZW4ndCB5ZXQgYXBwbGllZCBpdCxcblx0Ly8gYW5kIG9ubHkgaWYgYSBjb21wb25lbnQgaXMgYWN0dWFsbHkgY3JlYXRlZFxuXHRpZiAoIWlzSU9TIHx8IGlPU0hhY2tBcHBsaWVkKSByZXR1cm5cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIGZ1bmN0aW9uKCkge30pXG5cdGlPU0hhY2tBcHBsaWVkID0gdHJ1ZVxufVxuIiwiLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVuZGVyYWJsZSBlbGVtZW50IGZvciBhIFBhbmVsLlxuICovXG5pbnRlcmZhY2UgUGFuZWwge1xuXHQvKiogVGhpcyBwYW5lbCBhbHdheXMgcmVmZXJlbmNlcyB0aGUgc2FtZSBkb20gbm9kZSAqL1xuXHRyZWFkb25seSBkb206IEhUTUxFbGVtZW50XG5cdC8qKiBDdXJyZW50IHBhbmVsIGluZGV4IHRoYXQgcmVuZGVycyB0byB0aGlzIHBhbmVsICovXG5cdGluZGV4OiBudW1iZXJcblx0LyoqIFJlbmRlcmVkIHN0YXRlIG9mIHBhbmVsICovXG5cdHN0YXRlOiBQYW5lbC5TdGF0ZVxufVxuXG4vKiogQ3JlYXRlcyBhIFBhbmVsIGluc3RhbmNlICovXG5mdW5jdGlvbiBQYW5lbCAoXG5cdGluZGV4OiBudW1iZXIsIHdpZHRoUGN0OiBudW1iZXIsIHN0YXRlID0gUGFuZWwuRU1QVFksIGNsYXNzTmFtZSA9ICcnXG4pOiBQYW5lbCB7XG5cdGNvbnN0IHhwY3QgPSBpbmRleCAqIHdpZHRoUGN0XG5cdHJldHVybiB7XG5cdFx0ZG9tOiBQYW5lbC5jcmVhdGVFbGVtZW50KGNsYXNzTmFtZSwge1xuXHRcdFx0d2lkdGg6IGAke3dpZHRoUGN0fSVgLFxuXHRcdFx0dHJhbnNmb3JtOiBgdHJhbnNsYXRlM2QoJHt4cGN0fSUsMCwwKWBcblx0XHR9KSxcblx0XHRpbmRleCxcblx0XHRzdGF0ZVxuXHR9XG59XG5cbi8qKiBBZGRpdGlvbmFsIFBhbmVsIHN0YXRpY3MgKi9cbm5hbWVzcGFjZSBQYW5lbCB7XG5cdGV4cG9ydCB0eXBlIFN0YXRlID0gMCB8IDEgfCAyIHwgMyB8IC0xXG5cdGV4cG9ydCBjb25zdCBFTVBUWSAgICAgIDogU3RhdGUgPSAwXG5cdGV4cG9ydCBjb25zdCBQUkVSRU5ERVJFRDogU3RhdGUgPSAxXG5cdGV4cG9ydCBjb25zdCBGRVRDSElORyAgIDogU3RhdGUgPSAyXG5cdGV4cG9ydCBjb25zdCBSRU5ERVJFRCAgIDogU3RhdGUgPSAzXG5cdGV4cG9ydCBjb25zdCBESVJUWSAgICAgIDogU3RhdGUgPSAtMVxuXG5cdC8qKiBDcmVhdGVzIGEgUGFuZWwgRE9NIG5vZGUgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQoY2xhc3NOYW1lID0gJycsIHN0eWxlOiB7d2lkdGg/OiBzdHJpbmcsIHRyYW5zZm9ybT86IHN0cmluZ30gPSB7fSkge1xuXHRcdGNvbnN0IGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jylcblx0XHRpZiAoY2xhc3NOYW1lKSB7XG5cdFx0XHRlbC5jbGFzc05hbWUgPSBjbGFzc05hbWVcblx0XHR9XG5cdFx0T2JqZWN0LmFzc2lnbihlbC5zdHlsZSwge1xuXHRcdFx0cG9zaXRpb246ICdhYnNvbHV0ZScsXG5cdFx0XHRsZWZ0OiAnMCcsXG5cdFx0XHR0b3A6ICcwJyxcblx0XHRcdHdpZHRoOiAnMTAwJScsXG5cdFx0XHRoZWlnaHQ6ICcxMDAlJyxcblx0XHRcdHRyYW5zZm9ybTogJ3RyYW5zbGF0ZTNkKDAsMCwwKSdcblx0XHR9LCBzdHlsZSlcblx0XHRyZXR1cm4gZWxcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBQYW5lbFxuIiwiaW1wb3J0IHtwbW9kfSBmcm9tICcuL21hdGgnXG5cbmNvbnN0IERFRkFVTFRfU0FNUExFUyA9IDRcblxuaW50ZXJmYWNlIFNwZWVkbyB7XG5cdHN0YXJ0KHg6IG51bWJlciwgdDogbnVtYmVyKTogdm9pZFxuXHRhZGRTYW1wbGUoeDogbnVtYmVyLCB0OiBudW1iZXIpOiB2b2lkXG5cdGdldFZlbCgpOiBudW1iZXJcbn1cblxuaW50ZXJmYWNlIFNhbXBsZSB7XG5cdHg6IG51bWJlclxuXHR0OiBudW1iZXJcbn1cblxuLyoqXG4gKiBDb21wdXRlcyBzcGVlZCAoZGVsdGEgeCBvdmVyIHRpbWUpXG4gKi9cbmZ1bmN0aW9uIFNwZWVkbyAobnVtU2FtcGxlcyA9IERFRkFVTFRfU0FNUExFUykgOiBTcGVlZG8ge1xuXHRjb25zdCBzYW1wbGVzOiBTYW1wbGVbXSA9IFtdXG5cdGxldCBpbmRleCA9IDBcblx0bGV0IGNvdW50ID0gMFxuXG5cdGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBudW1TYW1wbGVzOyArK2luZGV4KSB7XG5cdFx0c2FtcGxlcy5wdXNoKHt4OiAwLCB0OiAwfSlcblx0fVxuXHRpbmRleCA9IDBcblxuXHRmdW5jdGlvbiBzdGFydCAoeDogbnVtYmVyLCB0OiBudW1iZXIpIHtcblx0XHRpbmRleCA9IDBcblx0XHRjb3VudCA9IDBcblx0XHRzYW1wbGVzW2luZGV4XS54ID0geFxuXHRcdHNhbXBsZXNbaW5kZXhdLnQgPSB0XG5cdFx0aW5kZXggPSAxXG5cdFx0Y291bnQgPSAxXG5cdH1cblxuXHRmdW5jdGlvbiBhZGRTYW1wbGUgKHg6IG51bWJlciwgdDogbnVtYmVyKSB7XG5cdFx0c2FtcGxlc1tpbmRleF0ueCA9IHhcblx0XHRzYW1wbGVzW2luZGV4XS50ID0gdFxuXHRcdGluZGV4ID0gKGluZGV4ICsgMSkgJSBudW1TYW1wbGVzXG5cdFx0Y291bnQgKz0gMVxuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0VmVsKCkge1xuXHRcdGlmIChjb3VudCA8IDEpIHtcblx0XHRcdHJldHVybiAwXG5cdFx0fVxuXHRcdGNvbnN0IG4gPSBjb3VudCA+IG51bVNhbXBsZXMgPyBudW1TYW1wbGVzIDogY291bnRcblx0XHRjb25zdCBpTGFzdCA9IHBtb2QoaW5kZXggLSAxLCBudW1TYW1wbGVzKVxuXHRcdGNvbnN0IGlGaXJzdCA9IHBtb2QoaW5kZXggLSBuLCBudW1TYW1wbGVzKVxuXHRcdGNvbnN0IGRlbHRhVCA9IHNhbXBsZXNbaUxhc3RdLnQgLSBzYW1wbGVzW2lGaXJzdF0udFxuXHRcdGNvbnN0IGR4ID0gc2FtcGxlc1tpTGFzdF0ueCAtIHNhbXBsZXNbaUZpcnN0XS54XG5cdFx0cmV0dXJuIGR4IC8gZGVsdGFUXG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdHN0YXJ0LFxuXHRcdGFkZFNhbXBsZSxcblx0XHRnZXRWZWxcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBTcGVlZG9cbiIsIi8vIHRzbGludDpkaXNhYmxlIHVuaWZpZWQtc2lnbmF0dXJlc1xuXG4vKiogR2VuZXJhdGUgYW4gYXJyYXkgc2VxdWVuY2Ugb2YgbnVtIG51bWJlcnMgc3RhcnRpbmcgZnJvbSAwIGluY3JlbWVudGluZyBieSAxICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZ2UgKG51bTogbnVtYmVyKTogbnVtYmVyW11cbi8qKiBHZW5lcmF0ZSBhbiBhcnJheSBzZXF1ZW5jZSBvZiBudW1iZXJzIHN0YXJ0aW5nIGZyb20gc3RhcnQgdXAgdG8gYnV0IG5vdCBpbmNsdWRpbmcgZW5kLCBpbmNyZW1lbnRpbmcgYnkgMSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmdlIChzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcik6IG51bWJlcltdIC8vIHRzbGludDpkaXNhYmxlLWxpbmUgdW5pZmllZC1zaWduYXR1cmVzXG4vKiogR2VuZXJhdGUgYW4gYXJyYXkgc2VxdWVuY2Ugb2YgbnVtYmVycyBmcm9tIHN0YXJ0IHVwIHRvIGJ1dCBub3QgaW5jbHVkaW5nIGVuZCBpbmNyZW1lbnRpbmcgYnkgc3RlcCAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmdlIChzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlciwgc3RlcDogbnVtYmVyKTogbnVtYmVyW11cblxuZXhwb3J0IGZ1bmN0aW9uIHJhbmdlIChzdGFydDogbnVtYmVyLCBlbmQ/OiBudW1iZXIsIHN0ZXA/OiBudW1iZXIpOiBudW1iZXJbXSB7XG5cdHN0ZXAgPSBzdGVwIHx8IDFcblx0aWYgKGVuZCA9PSBudWxsKSB7XG5cdFx0ZW5kID0gc3RhcnRcblx0XHRzdGFydCA9IDBcblx0fVxuXHRjb25zdCBzaXplID0gTWF0aC5jZWlsKChlbmQgLSBzdGFydCkgLyBzdGVwKVxuXHRjb25zdCBhOiBudW1iZXJbXSA9IFtdXG5cdGZvciAobGV0IGkgPSAwOyBpIDwgc2l6ZTsgKytpKSB7XG5cdFx0YS5wdXNoKHN0YXJ0ICsgc3RlcCAqIGkpXG5cdH1cblx0cmV0dXJuIGFcbn1cbiIsImltcG9ydCB7Y2xhbXB9IGZyb20gJy4vbWF0aCdcblxuZXhwb3J0IGludGVyZmFjZSBTd2lwZU9wdGlvbnMge1xuXHQvKiogQ3VycmVudCBwYW5lbCBpbmRleCAqL1xuXHRwYW5lbElkOiBudW1iZXJcblx0LyoqIEN1cnJlbnQgZHJhZyBwb3NpdGlvbiBpbiBwaXhlbHMgKGFsd2F5cyBhIG5lZ2F0aXZlIG51bWJlcikgKi9cblx0eDogbnVtYmVyXG5cdC8qKiBWZWxvY2l0eSBvZiBzd2lwZSBpbiBwaXhlbHMvc2Vjb25kICovXG5cdHh2OiBudW1iZXJcblx0LyoqIFdpZHRoIG9mIDEgcGFuZWwgaW4gcGl4ZWxzICovXG5cdHBhbmVsV2lkdGg6IG51bWJlclxuXHQvKiogTWF4aW11bSBzd2lwZSBwYW5lbCB0cmF2ZWwgKi9cblx0bWF4U3dpcGVQYW5lbHM6IG51bWJlclxuXHQvKiogVG90YWwgIyBvZiBwYW5lbHMgKi9cblx0dG90YWxQYW5lbHM6IG51bWJlclxuXHQvKiogVHlwaWNhbCBkdXJhdGlvbiBvZiAxIHBhbmVsIHN3aXBlICovXG5cdHVuaXREdXJhdGlvbjogbnVtYmVyXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3dpcGVSZXN1bHQge1xuXHRwYW5lbElkOiBudW1iZXJcblx0ZHVyYXRpb246IG51bWJlclxufVxuXG4vKipcbiAqIENvbXB1dGUgXCJ0aHJvd1wiIGZyb20gc3dpcGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN3aXBlICh7XG5cdHBhbmVsSWQsIHgsIHh2LCBwYW5lbFdpZHRoLCBtYXhTd2lwZVBhbmVscywgdG90YWxQYW5lbHMsIHVuaXREdXJhdGlvblxufTogU3dpcGVPcHRpb25zKTogU3dpcGVSZXN1bHQge1xuXHQvKiogTWluaW11bSBkdXJhdGlvbiBvZiBhbmltYXRpb24gKi9cblx0Y29uc3QgTUlOX0RVUl9NUyA9IDE3XG5cdC8qKiBNYXggdGhyb3cgdmVsb2NpdHkgKi9cblx0Y29uc3QgTUFYX1ZFTCA9IDEwMDAwXG5cdC8qIG1heCBkaXN0YW5jZSB3ZSBjYW4gdHJhdmVsICovXG5cdC8vY29uc3QgTUFYX0RJU1QgPSBtYXhTd2lwZVBhbmVsc1xuXHQvKiogc3dpcGUgdmVsb2NpdHkgaW4gcHgvcyBjbGFtcGVkIHRvIHNhbmUgcmFuZ2UgKi9cblx0Y29uc3QgeHZlbCA9IGNsYW1wKHh2LCAtTUFYX1ZFTCwgTUFYX1ZFTClcblx0LyoqIERlc3RpbmF0aW9uIHBvc2l0aW9uICovXG5cdGNvbnN0IGRlc3RYID0geCArIHh2ZWwgKiAwLjVcblx0LyoqIEN1cnJlbnQgaW5kZXggcGFuZWwgKHdoZXJlIGl0IGlzIGN1cnJlbnRseSBkcmFnZ2VkIHRvLCBub3QgaXRzIHJlc3RpbmcgcG9zaXRpb24pICovXG5cdGNvbnN0IHAwID0gTWF0aC5mbG9vcigteCAvIHBhbmVsV2lkdGgpXG5cdC8qKiBEZXN0aW5hdGlvbiBwYW5lbCBpbmRleCAqL1xuXHRsZXQgZGVzdFBhbmVsID0gTWF0aC5yb3VuZCgtZGVzdFggLyBwYW5lbFdpZHRoKVxuXHRpZiAoZGVzdFBhbmVsIC0gcDAgPiBtYXhTd2lwZVBhbmVscykge1xuXHRcdGRlc3RQYW5lbCA9IHAwICsgbWF4U3dpcGVQYW5lbHNcblx0fSBlbHNlIGlmIChwMCAtIGRlc3RQYW5lbCA+IG1heFN3aXBlUGFuZWxzKSB7XG5cdFx0ZGVzdFBhbmVsID0gcDAgLSBtYXhTd2lwZVBhbmVsc1xuXHR9XG5cdGRlc3RQYW5lbCA9IGNsYW1wKGRlc3RQYW5lbCxcblx0XHRNYXRoLm1heCgwLCBwYW5lbElkIC0gbWF4U3dpcGVQYW5lbHMpLFxuXHRcdE1hdGgubWluKHRvdGFsUGFuZWxzIC0gMSwgcGFuZWxJZCArIG1heFN3aXBlUGFuZWxzKVxuXHQpXG5cdC8qKiBIb3cgbWFueSBwYW5lbHMgKGluY2wuIGZyYWN0aW9ucykgYXJlIHdlIHRyYXZlbGxpbmcgYWNyb3NzICovXG5cdGNvbnN0IHVuaXREaXN0ID0gKGRlc3RQYW5lbCAqIHBhbmVsV2lkdGggLSAoLXgpKSAvIHBhbmVsV2lkdGhcblx0Y29uc3QgYWJzVW5pdERpc3QgPSBNYXRoLmFicyh1bml0RGlzdClcblx0LyoqIER1cmF0aW9uIG9mIHRoZSBhbmltYXRpb24gKi9cblx0bGV0IGR1ciA9IDBcblx0aWYgKGFic1VuaXREaXN0ID4gMSkge1xuXHRcdC8vIENvbXB1dGUgYSBkdXJhdGlvbiBzdWl0YWJsZSBmb3IgdHJhdmVsbGluZyBtdWx0aXBsZSBwYW5lbHNcblx0XHRkdXIgPSBNYXRoLm1heChcblx0XHRcdE1JTl9EVVJfTVMsXG5cdFx0XHR1bml0RHVyYXRpb24hICogTWF0aC5wb3coYWJzVW5pdERpc3QsIDAuMjUpICogMS4wXG5cdFx0KVxuXHR9IGVsc2Uge1xuXHRcdC8vIENvbXB1dGUgYSBkdXJhdGlvbiBzdWl0YWJsZSBmb3IgMSBvciBsZXNzIHBhbmVsIHRyYXZlbFxuXHRcdGR1ciA9IE1hdGgubWF4KE1JTl9EVVJfTVMsIHVuaXREdXJhdGlvbiAqIGFic1VuaXREaXN0KSAvLyhhYnNVbml0RGlzdCAqIGNmZy52aXNpYmxlUGFuZWxzKSlcblx0XHRpZiAoTWF0aC5zaWduKHVuaXREaXN0KSA9PT0gLU1hdGguc2lnbih4dmVsKSkge1xuXHRcdFx0Ly8gU3dpcGUgaW4gc2FtZSBkaXJlY3Rpb24gb2YgdHJhdmVsIC0gc3BlZWQgdXAgYW5pbWF0aW9uIHJlbGF0aXZlIHRvIHN3aXBlIHNwZWVkXG5cdFx0XHRjb25zdCB0aW1lU2NhbGUgPSBNYXRoLm1heChNYXRoLmFicyh4dmVsIC8gMTAwMCksIDEpXG5cdFx0XHRkdXIgPSBNYXRoLm1heChNSU5fRFVSX01TLCBkdXIgLyB0aW1lU2NhbGUpXG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIFN3aXBlIGluIG9wcG9zaXRlIGRpcmVjdGlvbiAtLSBUT0RPOiBhbnl0aGluZz9cblx0XHR9XG5cdH1cblx0cmV0dXJuIHtwYW5lbElkOiBkZXN0UGFuZWwsIGR1cmF0aW9uOiBkdXJ9XG59XG4iLCJpbXBvcnQge3JhbmdlfSBmcm9tICcuL2FycmF5J1xuaW1wb3J0IHtzZXRQb3MzZH0gZnJvbSAnLi90cmFuc2Zvcm0nXG5pbXBvcnQgRHJhZ2dlciBmcm9tICcuL0RyYWdnZXInXG5pbXBvcnQgUGFuZWwgZnJvbSAnLi9QYW5lbCdcbmltcG9ydCAqIGFzIGdlc3R1cmUgZnJvbSAnLi9nZXN0dXJlJ1xuXG4vLyB0c2xpbnQ6ZGlzYWJsZSB1bmlmaWVkLXNpZ25hdHVyZXNcblxuLyoqXG4gKiBBbGxvd3MgYSB1c2VyIHRvIGRyYWcgYSBzZXQgb2YgcGFuZWxzIGhvcml6b250YWxseSBhY3Jvc3MgYSB2aWV3cG9ydC5cbiAqL1xuaW50ZXJmYWNlIFBhbmVsU2xpZGVyIHtcblx0LyoqIEFkZCBhIGxpc3RlbmVyIHRoYXQgZmlyZXMgd2hlbiBkcmFnIHN0YXJ0cyAqL1xuXHRvbihldmVudFR5cGU6ICdkcmFnc3RhcnQnLCBjYjogKGU6IFBhbmVsU2xpZGVyLkRyYWdFdmVudCkgPT4gdm9pZCk6IHZvaWRcblx0LyoqIFJlbW92ZSBkcmFnc3RhcnQgbGlzdGVuZXIgKi9cblx0b2ZmKGV2ZW50VHlwZTogJ2RyYWdzdGFydCcsIGNiOiAoZTogUGFuZWxTbGlkZXIuRHJhZ0V2ZW50KSA9PiB2b2lkKTogdm9pZFxuXHQvKiogQWRkIGEgbGlzdGVuZXIgdGhhdCBmaXJlcyBldmVyeSBtb3ZlIGV2ZW50IHdoaWxlIGRyYWdnaW5nICovXG5cdG9uKGV2ZW50VHlwZTogJ2RyYWcnLCBjYjogKGU6IFBhbmVsU2xpZGVyLkRyYWdFdmVudCkgPT4gdm9pZCk6IHZvaWRcblx0LyoqIFJlbW92ZSBkcmFnIGxpc3RlbmVyICovXG5cdG9mZihldmVudFR5cGU6ICdkcmFnJywgY2I6IChlOiBQYW5lbFNsaWRlci5EcmFnRXZlbnQpID0+IHZvaWQpOiB2b2lkXG5cdC8qKiBBZGQgYSBsaXN0ZW5lciB0aGF0IGZpcmVzIHdoZW4gZHJhZyBlbmRlZCAqL1xuXHRvbihldmVudFR5cGU6ICdkcmFnZW5kJywgY2I6IChlOiBQYW5lbFNsaWRlci5EcmFnRXZlbnQpID0+IHZvaWQpOiB2b2lkXG5cdC8qKiBSZW1vdmUgZHJhZ2VuZCBsaXN0ZW5lciAqL1xuXHRvZmYoZXZlbnRUeXBlOiAnZHJhZ2VuZCcsIGNiOiAoZTogUGFuZWxTbGlkZXIuRHJhZ0V2ZW50KSA9PiB2b2lkKTogdm9pZFxuXHQvKiogQWRkIGEgbGlzdGVuZXIgdGhhdCBmaXJlcyB3aGVuIGRyYWcgY2FuY2VsZWQgKi9cblx0b24oZXZlbnRUeXBlOiAnZHJhZ2NhbmNlbCcsIGNiOiAoZTogUGFuZWxTbGlkZXIuRHJhZ0V2ZW50KSA9PiB2b2lkKTogdm9pZFxuXHQvKiogUmVtb3ZlIGRyYWdjYW5jZWwgbGlzdGVuZXIgKi9cblx0b2ZmKGV2ZW50VHlwZTogJ2RyYWdjYW5jZWwnLCBjYjogKGU6IFBhbmVsU2xpZGVyLkRyYWdFdmVudCkgPT4gdm9pZCk6IHZvaWRcblx0LyoqIEFkZCBhIGxpc3RlbmVyIHRoYXQgZmlyZXMgZXZlcnkgZnJhbWUgdGhlIHBhbmVsIG1vdmVzICovXG5cdG9uKGV2ZW50VHlwZTogJ2FuaW1hdGUnLCBjYjogKGU6IFBhbmVsU2xpZGVyLkFuaW1hdGVFdmVudCkgPT4gdm9pZCk6IHZvaWRcblx0LyoqIFJlbW92ZSBhbmltYXRlIGxpc3RlbmVyICovXG5cdG9mZihldmVudFR5cGU6ICdhbmltYXRlJywgY2I6IChlOiBQYW5lbFNsaWRlci5BbmltYXRlRXZlbnQpID0+IHZvaWQpOiB2b2lkXG5cdC8qKiBBZGQgYSBsaXN0ZW5lciB0aGF0IGZpcmVzIHdoZW4gYW5pbWF0aW9uIHN0YXJ0cyBvciBlbmRzICovXG5cdG9uKGV2ZW50VHlwZTogJ2FuaW1hdGlvbnN0YXRlY2hhbmdlJywgY2I6IChlOiBQYW5lbFNsaWRlci5BbmltYXRpb25FdmVudCkgPT4gdm9pZCk6IHZvaWRcblx0LyoqIFJlbW92ZSBhbmltYXRpb25zdGF0ZWNoYW5nZSBsaXN0ZW5lciAqL1xuXHRvZmYoZXZlbnRUeXBlOiAnYW5pbWF0aW9uc3RhdGVjaGFuZ2UnLCBjYjogKGU6IFBhbmVsU2xpZGVyLkFuaW1hdGlvbkV2ZW50KSA9PiB2b2lkKTogdm9pZFxuXHQvKiogQWRkIGEgbGlzdGVuZXIgdGhhdCBmaXJlcyB3aGVuIGN1cnJlbnQgcGFuZWwgaGFzIGNoYW5nZWQgKi9cblx0b24oZXZlbnRUeXBlOiAncGFuZWxjaGFuZ2UnLCBjYjogKGU6IFBhbmVsU2xpZGVyLkNoYW5nZUV2ZW50KSA9PiB2b2lkKTogdm9pZFxuXHQvKiogUmVtb3ZlIHBhbmVsY2hhbmdlIGxpc3RlbmVyICovXG5cdG9mZihldmVudFR5cGU6ICdwYW5lbGNoYW5nZScsIGNiOiAoZTogUGFuZWxTbGlkZXIuQ2hhbmdlRXZlbnQpID0+IHZvaWQpOiB2b2lkXG5cdC8qKiBHZXRzIHRoZSBjdXJyZW50IHBhbmVsICovXG5cdGdldFBhbmVsKCk6IG51bWJlclxuXHQvKipcblx0ICogU2V0cyB0aGUgY3VycmVudCBwYW5lbCAtIGFuaW1hdGVzIHRvIHBvc2l0aW9uLlxuXHQgKiBAcGFyYW0gcGFuZWxJZCBUaGUgcGFuZWwgaW5kZXggdG8gZ28gdG9cblx0ICogQHBhcmFtIGR1cmF0aW9uIER1cmF0aW9uIGluIG1zLiBJZiBvbWl0dGVkLCB0aGUgY29uZmlndXJlZCBkZWZhdWx0IGlzIHVzZWQuXG5cdCAqL1xuXHRzZXRQYW5lbChwYW5lbElkOiBudW1iZXIsIGR1cmF0aW9uPzogbnVtYmVyKTogUHJvbWlzZTxudW1iZXI+XG5cdC8qKiBTZXRzIHRoZSBjdXJyZW50IHBhbmVsIGltbWVkaWF0ZWx5LCBubyBhbmltYXRpb24gKi9cblx0c2V0UGFuZWxJbW1lZGlhdGUocGFuZWxJZDogbnVtYmVyKTogdm9pZFxuXHQvKiogR2V0cyB0aGUgY3VycmVudCByb290IGVsZW1lbnQgJiBwYW5lbCBzaXplcyAqL1xuXHRnZXRTaXplcygpOiB7ZnVsbFdpZHRoOiBudW1iZXIsIHBhbmVsV2lkdGg6IG51bWJlcn1cblx0LyoqIFJldHVybnMgd2hldGhlciBwYW5lbHMgYXJlIGN1cnJlbnRseSBiZWluZyBkcmFnZ2VkIG9yIG5vdCAqL1xuXHRpc0RyYWdnaW5nKCk6IGJvb2xlYW5cblx0LyoqIFJldHVybnMgd2hldGhlciBwYW5lbHMgYXJlIGN1cnJlbnRseSBhbmltYXRpbmcgb3Igbm90ICovXG5cdGlzQW5pbWF0aW5nKCk6IGJvb2xlYW5cblx0LyoqXG5cdCAqIFRyaWdnZXJzIGEgcmVuZGVyIGZvciB0aGUgZ2l2ZW4gcGFuZWxJZCAob3IgYWxsIHBhbmVscyBpZiBubyBpbmRleCBpcyBwcm92aWRlZC4pXG5cdCAqIFRoZSByZW5kZXIgd2lsbCBvbmx5IG9jY3VyIGlmIHRoaXMgcGFuZWwgaW5kZXggaXMgaW4gdGhlIHJlbmRlciBjYWNoZS5cblx0ICogUmV0dXJucyB0cnVlIGlmIHRoZSByZW5kZXIgd2FzIHBlcmZvcm1lZCBvdGhlcndpc2UgZmFsc2UuXG5cdCAqL1xuXHRyZW5kZXIocGFuZWxJZD86IG51bWJlcik6IGJvb2xlYW5cblx0LyoqXG5cdCAqIFBhbmVsU2xpZGVyIGxpc3RlbnMgZm9yIHdpbmRvdyByZXNpemUgZXZlbnRzLCBob3dldmVyIGlmIHlvdXIgYXBwbGljYXRpb24gcmVzaXplc1xuXHQgKiB0aGUgY29udGFpbmVyIGVsZW1lbnQgeW91IHNob3VsZCBjYWxsIHRoaXMgbWV0aG9kIHRvIGVuc3VyZSBwYW5lbCBzaXplcyBhbmQgcG9zaXRpb25zXG5cdCAqIGFyZSBtYWludGFpbmVkIGNvcnJlY3RseVxuXHQgKi9cblx0cmVzaXplKCk6IHZvaWRcblx0LyoqIERlc3Ryb3kgJiBjbGVhbnVwIHJlc291cmNlcyAqL1xuXHRkZXN0cm95KCk6IHZvaWRcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgUGFuZWxTbGlkZXIgaW5zdGFuY2UuXG4gKi9cbmZ1bmN0aW9uIFBhbmVsU2xpZGVyIChjZmc6IFBhbmVsU2xpZGVyLk9wdGlvbnMpOiBQYW5lbFNsaWRlciB7XG5cdGNmZyA9IHsuLi5jZmd9XG5cdGNmZy52aXNpYmxlUGFuZWxzID0gY2ZnLnZpc2libGVQYW5lbHMgfHwgMVxuXHRjZmcuaW5pdGlhbFBhbmVsID0gY2ZnLmluaXRpYWxQYW5lbCB8fCAwXG5cdGNmZy5tYXhTd2lwZVBhbmVscyA9IGNmZy5tYXhTd2lwZVBhbmVscyB8fCBjZmcudmlzaWJsZVBhbmVsc1xuXHRjZmcuc2xpZGVEdXJhdGlvbiA9IGNmZy5zbGlkZUR1cmF0aW9uIHx8IFBhbmVsU2xpZGVyLkRFRkFVTFRfU0xJREVfRFVSQVRJT05cblx0Y2ZnLnBhbmVsQ2xhc3NOYW1lID0gY2ZnLnBhbmVsQ2xhc3NOYW1lIHx8ICcnXG5cdGNmZy5kcmFnUmF0aW8gPSBjZmcuZHJhZ1JhdGlvIHx8IFBhbmVsU2xpZGVyLkRFRkFVTFRfRFJBR19SQVRJT1xuXHRjZmcuZHJhZ1RocmVzaG9sZCA9IGNmZy5kcmFnVGhyZXNob2xkIHx8IFBhbmVsU2xpZGVyLkRFRkFVTFRfRFJBR19USFJFU0hPTERcblx0Y2ZnLm9uID0gY2ZnLm9uIHx8IHt9XG5cdGNmZy50ZXJwID0gY2ZnLnRlcnAgfHwgUGFuZWxTbGlkZXIudGVycFxuXG5cdGNvbnN0IGVtaXR0ZXJzOiBQYW5lbFNsaWRlci5FdmVudEVtaXR0ZXJzID0ge1xuXHRcdGRyYWdzdGFydDogW10sXG5cdFx0ZHJhZzogW10sXG5cdFx0ZHJhZ2VuZDogW10sXG5cdFx0ZHJhZ2NhbmNlbDogW10sXG5cdFx0YW5pbWF0ZTogW10sXG5cdFx0YW5pbWF0aW9uc3RhdGVjaGFuZ2U6IFtdLFxuXHRcdHBhbmVsY2hhbmdlOiBbXVxuXHR9XG5cdGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNmZy5vbikgYXMgKGtleW9mIFBhbmVsU2xpZGVyLkV2ZW50TGlzdGVuZXJzKVtdKSB7XG5cdFx0aWYgKGNmZy5vbltrZXldICE9IG51bGwpIHtcblx0XHRcdGFkZExpc3RlbmVyKGtleSwgY2ZnLm9uW2tleV0hKVxuXHRcdH1cblx0fVxuXG5cdGNvbnN0IHBhbmVscyA9IHJhbmdlKGNmZy5pbml0aWFsUGFuZWwsIGNmZy5pbml0aWFsUGFuZWwgKyBjZmcudmlzaWJsZVBhbmVscyAqIDMpLm1hcChwaWQgPT4gUGFuZWwoXG5cdFx0cGlkLCAxMDAgLyBjZmcudmlzaWJsZVBhbmVscyEsIFBhbmVsLkVNUFRZLCBjZmcucGFuZWxDbGFzc05hbWVcblx0KSlcblx0Y2ZnLmRvbS5pbm5lckhUTUwgPSAnJ1xuXHRmb3IgKGNvbnN0IHAgb2YgcGFuZWxzKSB7XG5cdFx0cC5zdGF0ZSA9IGNmZy5yZW5kZXJDb250ZW50KFxuXHRcdFx0bmV3IFBhbmVsU2xpZGVyLlJlbmRlckV2ZW50KCdyZW5kZXInLCBwLmRvbSwgcC5pbmRleClcblx0XHQpXG5cdFx0Y2ZnLmRvbS5hcHBlbmRDaGlsZChwLmRvbSlcblx0fVxuXG5cdC8vIFdpbGwgYmUgY29tcHV0ZWQgb24gcmVzaXplXG5cdGxldCBmdWxsV2lkdGggPSBwYW5lbHMubGVuZ3RoXG5cdGxldCB2aXNpYmxlV2lkdGggPSBjZmcudmlzaWJsZVBhbmVsc1xuXHQvKiogV2lkdGggb2YgYSBwYW5lbCBpbiBwaXhlbHMgKi9cblx0bGV0IHBhbmVsV2lkdGggPSAxXG5cdC8qKiBDdXJyZW50IFBhbmVsIGluZGV4ICovXG5cdGxldCBjdXJQYW5lbCA9IGNmZy5pbml0aWFsUGFuZWxcblx0LyoqIEN1cnJlbnQgdmlld3BvcnQgcG9zaXRpb24gaW4gcGl4ZWxzIChsZWZ0IGVkZ2UpICovXG5cdGxldCBjdXJQb3NYID0gMFxuXHQvKiogSW5kaWNhdGVzIHBhbmVsIGFuaW1hdGlvbiBsb29wIGlzIHJ1bm5pbmcgKi9cblx0bGV0IGlzQW5pbWF0aW5nID0gZmFsc2Vcblx0LyoqIE92ZXJzY3JvbGwgKi9cblx0Y29uc3Qgb3ZlcnNjcm9sbCA9IDFcblxuXHQvKiogVXBkYXRlIG91ciBmdWxsIHdpZHRoIGFuZCBwYW5lbCB3aWR0aCBvbiByZXNpemUgKi9cblx0ZnVuY3Rpb24gcmVzaXplKCkge1xuXHRcdGNvbnN0IHJjID0gY2ZnLmRvbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVxuXHRcdHBhbmVsV2lkdGggPSByYy53aWR0aCAvIGNmZy52aXNpYmxlUGFuZWxzIVxuXHRcdHZpc2libGVXaWR0aCA9IHBhbmVsV2lkdGggKiBjZmcudmlzaWJsZVBhbmVscyFcblx0XHRmdWxsV2lkdGggPSBwYW5lbFdpZHRoICogY2ZnLnRvdGFsUGFuZWxzXG5cdFx0Y3VyUG9zWCA9IC1jdXJQYW5lbCAqIHBhbmVsV2lkdGhcblx0XHRyZW5kZXIoKVxuXHR9XG5cblx0LyoqIEFwcGxpZXMgYXZlcnNjcm9sbCBkYW1wZW5pbmcgaWYgZHJhZ2dlZCBwYXN0IGVkZ2VzICovXG5cdGZ1bmN0aW9uIGFwcGx5T3ZlcnNjcm9sbCAoeDogbnVtYmVyKSB7XG5cdFx0aWYgKHggPiAwKSB7XG5cdFx0XHRjb25zdCB4cCA9IE1hdGgubWluKDEsIHggLyAob3ZlcnNjcm9sbCAqIHBhbmVsV2lkdGgpKVxuXHRcdFx0cmV0dXJuIHhwICogKDEgLSBNYXRoLnNxcnQoeHAgLyAyKSkgKiBvdmVyc2Nyb2xsICogcGFuZWxXaWR0aFxuXHRcdH1cblx0XHRjb25zdCB4TWF4ID0gZnVsbFdpZHRoIC0gcGFuZWxXaWR0aCAqIGNmZy52aXNpYmxlUGFuZWxzIVxuXHRcdGlmICh4IDwgLXhNYXgpIHtcblx0XHRcdGNvbnN0IGR4ID0gTWF0aC5hYnMoeCAtICgteE1heCkpXG5cdFx0XHRjb25zdCB4cCA9IE1hdGgubWluKDEsIGR4IC8gKG92ZXJzY3JvbGwgKiBwYW5lbFdpZHRoKSlcblx0XHRcdHJldHVybiAteE1heCAtIHhwICogKDEgLSBNYXRoLnNxcnQoeHAgLyAyKSkgKiBvdmVyc2Nyb2xsICogcGFuZWxXaWR0aFxuXHRcdH1cblx0XHRyZXR1cm4geFxuXHR9XG5cblx0ZnVuY3Rpb24gcmVuZGVyIChmYXN0PzogYm9vbGVhbikge1xuXHRcdC8vIG5vdGUgdGhhdDogY3VyUG9zWCA9IC1jdXJQYW5lbCAqIHBhbmVsV2lkdGhcblx0XHRjb25zdCB4ID0gTWF0aC5hYnMoY3VyUG9zWClcblx0XHQvKiogSW5jbHVzaXZlIHN0YXJ0L2VuZCBwYW5lbCBpbmRleGVzICovXG5cdFx0bGV0IGlTdGFydCA9IE1hdGguZmxvb3IoY2ZnLnRvdGFsUGFuZWxzICogeCAvIGZ1bGxXaWR0aClcblx0XHRsZXQgaUVuZCA9IE1hdGgubWluKFxuXHRcdFx0TWF0aC5jZWlsKGNmZy50b3RhbFBhbmVscyAqICh4ICsgcGFuZWxXaWR0aCAqIGNmZy52aXNpYmxlUGFuZWxzISkgLyBmdWxsV2lkdGgpLFxuXHRcdFx0Y2ZnLnRvdGFsUGFuZWxzIC0gMVxuXHRcdClcblx0XHQvLyBSZW5kZXIgZXh0cmEgcGFuZWxzIG91dHdhcmQgZnJvbSB2aWV3cG9ydCBlZGdlcy5cblx0XHQvLyBTdGFydCBvbiB0aGUgbGVmdCBzaWRlIHRoZW4gYWx0ZXJuYXRlLlxuXHRcdGZvciAobGV0IGkgPSAwLCBuID0gcGFuZWxzLmxlbmd0aCAtIChpRW5kIC0gaVN0YXJ0ICsgMSk7IG4gPiAwOyArK2kpIHtcblx0XHRcdGlmIChpICUgMiA9PT0gMCkge1xuXHRcdFx0XHRpZiAoaVN0YXJ0ID4gMCkge1xuXHRcdFx0XHRcdGlTdGFydCAtPSAxXG5cdFx0XHRcdFx0biAtPSAxXG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChpRW5kIDwgcGFuZWxzLmxlbmd0aCAtIDEpIHtcblx0XHRcdFx0XHRpRW5kICs9IDFcblx0XHRcdFx0XHRuIC09IDFcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHQvKiogQ2FjaGVkIHBhbmVscyB0aGF0IGFyZSBzdGlsbCB2YWxpZCAqL1xuXHRcdGNvbnN0IGtlZXBQYW5lbHM6IHtbaWQ6IG51bWJlcl06IFBhbmVsfSA9IE9iamVjdC5jcmVhdGUobnVsbClcblx0XHQvKiogaWRzIG9mIHBhbmVscyB0aGF0IHdlcmUgbm90IGNhY2hlZCAqL1xuXHRcdGNvbnN0IGlkczogbnVtYmVyW10gPSBbXVxuXHRcdC8vIFJlbmRlciBwYW5lbHMgdGhhdCBhcmUgY2FjaGVkXG5cdFx0Zm9yIChsZXQgaSA9IGlTdGFydDsgaSA8PSBpRW5kOyArK2kpIHtcblx0XHRcdC8vIEZpbmQgYSBib3VuZCBwYW5lbFxuXHRcdFx0Y29uc3QgcGFuZWwgPSBwYW5lbHMuZmluZChwID0+IHAuaW5kZXggPT09IGkpXG5cdFx0XHRpZiAocGFuZWwpIHtcblx0XHRcdFx0aWYgKHBhbmVsLnN0YXRlIDwgUGFuZWwuUFJFUkVOREVSRUQgfHwgKCFmYXN0ICYmIHBhbmVsLnN0YXRlIDwgUGFuZWwuRkVUQ0hJTkcpKSB7XG5cdFx0XHRcdFx0cGFuZWwuc3RhdGUgPSBjZmcucmVuZGVyQ29udGVudChcblx0XHRcdFx0XHRcdG5ldyBQYW5lbFNsaWRlci5SZW5kZXJFdmVudChcblx0XHRcdFx0XHRcdFx0ZmFzdCA/ICdwcmV2aWV3JyA6ICdyZW5kZXInLCBwYW5lbC5kb20sIHBhbmVsLmluZGV4XG5cdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0KVxuXHRcdFx0XHR9XG5cdFx0XHRcdHNldFBvczNkKHBhbmVsLmRvbSwgY3VyUG9zWCArIGkgKiBwYW5lbFdpZHRoKVxuXHRcdFx0XHRrZWVwUGFuZWxzW2ldID0gcGFuZWxcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlkcy5wdXNoKGkpXG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIFJlbmRlciBwYW5lbHMgdGhhdCB3ZXJlbid0IGNhY2hlZFxuXHRcdGZvciAoY29uc3QgaSBvZiBpZHMpIHtcblx0XHRcdGNvbnN0IHBhbmVsID0gcGFuZWxzLmZpbmQocCA9PiAha2VlcFBhbmVsc1twLmluZGV4XSlcblx0XHRcdGlmIChwYW5lbCA9PSBudWxsKSB7XG5cdFx0XHRcdGNvbnNvbGUud2FybignQ291bGQgbm90IGZpbmQgYW4gYXZhaWxhYmxlIHBhbmVsIGZvciBpZDonLCBpKVxuXHRcdFx0XHRjb250aW51ZVxuXHRcdFx0fVxuXHRcdFx0Ly8gTmVlZCB0byByZW5kZXIgdGhpc1xuXHRcdFx0aWYgKCFmYXN0KSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGB1cGRhdGluZyBwYW5lbDogJHtpfWApXG5cdFx0XHR9XG5cdFx0XHRwYW5lbC5pbmRleCA9IGlcblx0XHRcdHBhbmVsLnN0YXRlID0gY2ZnLnJlbmRlckNvbnRlbnQoXG5cdFx0XHRcdG5ldyBQYW5lbFNsaWRlci5SZW5kZXJFdmVudCgncHJldmlldycsIHBhbmVsLmRvbSwgcGFuZWwuaW5kZXgpXG5cdFx0XHQpXG5cdFx0XHRzZXRQb3MzZChwYW5lbC5kb20sIGN1clBvc1ggLSBpICogcGFuZWxXaWR0aClcblx0XHRcdGtlZXBQYW5lbHNbaV0gPSBwYW5lbFxuXHRcdH1cblx0fVxuXG5cdC8qKiBBcHBsaWNhdGlvbiB3YW50cyB0byByZS1yZW5kZXIgdGhpcyBwYW5lbCAob3IgYWxsIHBhbmVscykgY29udGVudCAqL1xuXHRmdW5jdGlvbiByZW5kZXJQYW5lbENvbnRlbnQgKHBpZD86IG51bWJlcikge1xuXHRcdGlmIChwaWQgIT0gbnVsbCkge1xuXHRcdFx0Y29uc3QgcGFuZWwgPSBwYW5lbHMuZmluZChwID0+IHAuaW5kZXggPT09IHBpZClcblx0XHRcdGlmICghcGFuZWwpIHJldHVybiBmYWxzZVxuXHRcdFx0cGFuZWwuc3RhdGUgPSBjZmcucmVuZGVyQ29udGVudChcblx0XHRcdFx0bmV3IFBhbmVsU2xpZGVyLlJlbmRlckV2ZW50KCdyZW5kZXInLCBwYW5lbC5kb20sIHBhbmVsLmluZGV4KVxuXHRcdFx0KVxuXHRcdFx0cmV0dXJuIHRydWVcblx0XHR9XG5cdFx0Zm9yIChjb25zdCBwYW5lbCBvZiBwYW5lbHMpIHtcblx0XHRcdHBhbmVsLnN0YXRlID0gY2ZnLnJlbmRlckNvbnRlbnQoXG5cdFx0XHRcdG5ldyBQYW5lbFNsaWRlci5SZW5kZXJFdmVudCgncmVuZGVyJywgcGFuZWwuZG9tLCBwYW5lbC5pbmRleClcblx0XHRcdClcblx0XHR9XG5cdFx0cmV0dXJuIHRydWVcblx0fVxuXG5cdGZ1bmN0aW9uIGVtaXQgKGU6IFBhbmVsU2xpZGVyLkV2ZW50KSB7XG5cdFx0Zm9yIChjb25zdCBjYiBvZiBlbWl0dGVyc1tlLnR5cGVdKSB7XG5cdFx0XHRjYihlIGFzIGFueSlcblx0XHR9XG5cdH1cblxuXHRyZXNpemUoKVxuXG5cdGNvbnN0IGRyYWdnZXIgPSBEcmFnZ2VyKGNmZy5kb20sIHtcblx0XHRkcmFnVGhyZXNob2xkOiBjZmcuZHJhZ1RocmVzaG9sZCwgZHJhZ1JhdGlvOiBjZmcuZHJhZ1JhdGlvLFxuXHRcdGRldmljZXM6IGNmZy5kZXZpY2VzLFxuXHRcdG9uOiB7XG5cdFx0XHRkcmFnc3RhcnQgKGUpIHtcblx0XHRcdFx0ZW1pdChuZXcgUGFuZWxTbGlkZXIuRHJhZ0V2ZW50KCdkcmFnJywgZS54LCAwKSlcblx0XHRcdH0sXG5cdFx0XHRkcmFnbW92ZShlKSB7XG5cdFx0XHRcdGNvbnN0IG94ID0gLWN1clBhbmVsICogcGFuZWxXaWR0aFxuXHRcdFx0XHQvL2N1clBvc1ggPSBNYXRoLnJvdW5kKGNsYW1wKG94ICsgZS54LCAtKGZ1bGxXaWR0aCAtIHBhbmVsV2lkdGgpLCAwKSlcblx0XHRcdFx0Y3VyUG9zWCA9IGFwcGx5T3ZlcnNjcm9sbChveCArIGUueClcblx0XHRcdFx0cmVuZGVyKClcblx0XHRcdFx0ZW1pdChuZXcgUGFuZWxTbGlkZXIuQW5pbWF0ZUV2ZW50KFxuXHRcdFx0XHRcdCdhbmltYXRlJywgLWN1clBvc1ggLyBwYW5lbFdpZHRoXG5cdFx0XHRcdCkpXG5cdFx0XHRcdGVtaXQobmV3IFBhbmVsU2xpZGVyLkRyYWdFdmVudCgnZHJhZycsIGUueCwgZS54dikpXG5cdFx0XHR9LFxuXHRcdFx0ZHJhZ2NhbmNlbCgpIHtcblx0XHRcdFx0ZW1pdChuZXcgUGFuZWxTbGlkZXIuRHJhZ0V2ZW50KCdkcmFnY2FuY2VsJywgY3VyUG9zWCwgMCkpXG5cdFx0XHRcdHN3aXBlQW5pbSgwLCBwaWQgPT4ge1xuXHRcdFx0XHRcdGVtaXQobmV3IFBhbmVsU2xpZGVyLkNoYW5nZUV2ZW50KCdwYW5lbGNoYW5nZScsIHBpZCkpXG5cdFx0XHRcdH0pXG5cdFx0XHR9LFxuXHRcdFx0ZHJhZ2VuZCAoZSkge1xuXHRcdFx0XHRjb25zdCBveCA9IC1jdXJQYW5lbCAqIHBhbmVsV2lkdGhcblx0XHRcdFx0Ly9jdXJQb3NYID0gTWF0aC5yb3VuZChjbGFtcChveCArIGUueCwgLShmdWxsV2lkdGggLSBwYW5lbFdpZHRoKSwgMCkpXG5cdFx0XHRcdGN1clBvc1ggPSBhcHBseU92ZXJzY3JvbGwoTWF0aC5yb3VuZChveCArIGUueCkpXG5cdFx0XHRcdHJlbmRlcigpXG5cdFx0XHRcdHN3aXBlQW5pbShlLnh2LCBwaWQgPT4ge1xuXHRcdFx0XHRcdGVtaXQobmV3IFBhbmVsU2xpZGVyLkNoYW5nZUV2ZW50KCdwYW5lbGNoYW5nZScsIHBpZCkpXG5cdFx0XHRcdH0pXG5cdFx0XHRcdGVtaXQobmV3IFBhbmVsU2xpZGVyLkFuaW1hdGVFdmVudChcblx0XHRcdFx0XHQnYW5pbWF0ZScsIC1jdXJQb3NYIC8gcGFuZWxXaWR0aFxuXHRcdFx0XHQpKVxuXHRcdFx0XHRlbWl0KG5ldyBQYW5lbFNsaWRlci5EcmFnRXZlbnQoJ2RyYWdlbmQnLCBlLngsIGUueHYpKVxuXHRcdFx0fSxcblx0XHRcdGRldmljZXByZXNzKCkge1xuXHRcdFx0XHQvLyBFbnN1cmUgd2UgaGF2ZSB1cC10by1kYXRlIGRpbWVuc2lvbnMgd2hlbmV2ZXIgYSBkcmFnIGFjdGlvblxuXHRcdFx0XHQvLyBtYXkgc3RhcnQgaW4gY2FzZSB3ZSBtaXNzZWQgYSBzdGVhbHRoIHdpbmRvdyByZXNpemUuXG5cdFx0XHRcdHJlc2l6ZSgpXG5cdFx0XHR9XG5cdFx0fVxuXHR9KVxuXG5cdC8qKlxuXHQgKiBAcGFyYW0geFZlbG9jaXR5IFNwZWVkIG9mIHN3aXBlIGluIHBpeGVscy9zZWNvbmRcblx0ICogQHBhcmFtIGRvbmUgY2FsbGJhY2sgd2hlbiBzd2lwZSBlbmRzXG5cdCAqL1xuXHRmdW5jdGlvbiBzd2lwZUFuaW0gKHhWZWxvY2l0eTogbnVtYmVyLCBkb25lPzogKHBhbmVsSWQ6IG51bWJlcikgPT4gdm9pZCkge1xuXHRcdGNvbnN0IHJlc3VsdCA9IGdlc3R1cmUuc3dpcGUoe1xuXHRcdFx0cGFuZWxJZDogY3VyUGFuZWwsXG5cdFx0XHR4OiBjdXJQb3NYLCB4djogeFZlbG9jaXR5LFxuXHRcdFx0bWF4U3dpcGVQYW5lbHM6IGNmZy5tYXhTd2lwZVBhbmVscyEsXG5cdFx0XHRwYW5lbFdpZHRoLFxuXHRcdFx0dW5pdER1cmF0aW9uOiBjZmcuc2xpZGVEdXJhdGlvbiEsXG5cdFx0XHR0b3RhbFBhbmVsczogY2ZnLnRvdGFsUGFuZWxzIC0gKGNmZy52aXNpYmxlUGFuZWxzISAtIDEpXG5cdFx0fSlcblx0XHRhbmltYXRlVG8ocmVzdWx0LnBhbmVsSWQsIHJlc3VsdC5kdXJhdGlvbiwgZG9uZSlcblx0fVxuXG5cdC8qKiBBbmltYXRlIHBhbmVscyB0byB0aGUgc3BlY2lmaWVkIHBhbmVsSWQgKi9cblx0ZnVuY3Rpb24gYW5pbWF0ZVRvIChcblx0XHRkZXN0UGFuZWw6IG51bWJlciwgZHVyID0gY2ZnLnNsaWRlRHVyYXRpb24hLCBkb25lPzogKHBhbmVsSWQ6IG51bWJlcikgPT4gdm9pZFxuXHQpIHtcblx0XHRpZiAoaXNBbmltYXRpbmcpIHtcblx0XHRcdC8vIFRPRE86IEFsbG93IHJlZGlyZWN0XG5cdFx0XHRjb25zb2xlLndhcm4oXCJDYW5ub3QgYW5pbWF0ZVRvIC0gYWxyZWFkeSBhbmltYXRpbmdcIilcblx0XHRcdHJldHVyblxuXHRcdH1cblx0XHRpZiAoZHJhZ2dlci5pc0RyYWdnaW5nKCkpIHtcblx0XHRcdGNvbnNvbGUud2FybihcIkNhbm5vdCBhbmltYXRlVG8gLSBjdXJyZW50bHkgZHJhZ2dpbmdcIilcblx0XHRcdHJldHVyblxuXHRcdH1cblxuXHRcdGlzQW5pbWF0aW5nID0gdHJ1ZVxuXHRcdGNvbnN0IHN0YXJ0WCA9IGN1clBvc1hcblx0XHRjb25zdCBkZXN0WCA9IC1kZXN0UGFuZWwgKiBwYW5lbFdpZHRoXG5cblx0XHRmdW5jdGlvbiBmaW5pc2goKSB7XG5cdFx0XHRjdXJQYW5lbCA9IGRlc3RQYW5lbFxuXHRcdFx0aXNBbmltYXRpbmcgPSBmYWxzZVxuXHRcdFx0ZW1pdChuZXcgUGFuZWxTbGlkZXIuQW5pbWF0aW9uRXZlbnQoXG5cdFx0XHRcdCdhbmltYXRpb25zdGF0ZWNoYW5nZScsIGZhbHNlXG5cdFx0XHQpKVxuXHRcdFx0ZG9uZSAmJiBkb25lKGN1clBhbmVsKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGxvb3AoKSB7XG5cdFx0XHRpZiAoIWlzQW5pbWF0aW5nKSB7XG5cdFx0XHRcdC8vIEFuaW1hdGlvbiBoYXMgYmVlbiBjYW5jZWxsZWQsIGFzc3VtZVxuXHRcdFx0XHQvLyBzb21ldGhpbmcgZWxzZSBoYXMgY2hhbmdlZCBjdXJQYW5lbC5cblx0XHRcdFx0Ly8gKGVnLiBzZXRQYW5lbEltbWVkaWF0ZSlcblx0XHRcdFx0ZG9uZSAmJiBkb25lKGN1clBhbmVsKVxuXHRcdFx0XHRlbWl0KG5ldyBQYW5lbFNsaWRlci5BbmltYXRpb25FdmVudChcblx0XHRcdFx0XHQnYW5pbWF0aW9uc3RhdGVjaGFuZ2UnLCBmYWxzZVxuXHRcdFx0XHQpKVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnN0IHQgPSBEYXRlLm5vdygpXG5cdFx0XHRjb25zdCBkZXN0WCA9IC1kZXN0UGFuZWwgKiBwYW5lbFdpZHRoXG5cdFx0XHRjb25zdCB0b3RhbFQgPSB0IC0gc3RhcnRUXG5cdFx0XHRjb25zdCBhbmltVCA9IE1hdGgubWluKHRvdGFsVCwgZHVyKVxuXHRcdFx0Y3VyUG9zWCA9IGNmZy50ZXJwIShzdGFydFgsIGRlc3RYLCBhbmltVCAvIGR1cilcblx0XHRcdC8vIFVzZSBhICdmYXN0JyByZW5kZXIgdW5sZXNzIHRoaXMgaXMgdGhlIGxhc3QgZnJhbWUgb2YgdGhlIGFuaW1hdGlvblxuXHRcdFx0Y29uc3QgaXNMYXN0RnJhbWUgPSB0b3RhbFQgPj0gZHVyXG5cdFx0XHRyZW5kZXIoIWlzTGFzdEZyYW1lKVxuXHRcdFx0ZW1pdChuZXcgUGFuZWxTbGlkZXIuQW5pbWF0ZUV2ZW50KFxuXHRcdFx0XHQnYW5pbWF0ZScsIC1jdXJQb3NYIC8gcGFuZWxXaWR0aFxuXHRcdFx0KSlcblx0XHRcdGlmICghaXNMYXN0RnJhbWUpIHtcblx0XHRcdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGxvb3ApXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmaW5pc2goKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChkZXN0WCA9PT0gc3RhcnRYKSB7XG5cdFx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZmluaXNoKVxuXHRcdFx0ZW1pdChuZXcgUGFuZWxTbGlkZXIuQW5pbWF0ZUV2ZW50KFxuXHRcdFx0XHQnYW5pbWF0ZScsIC1jdXJQb3NYIC8gcGFuZWxXaWR0aFxuXHRcdFx0KSlcblx0XHRcdHJldHVyblxuXHRcdH1cblxuXHRcdGNvbnN0IHN0YXJ0VCA9IERhdGUubm93KClcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUobG9vcClcblx0XHRlbWl0KG5ldyBQYW5lbFNsaWRlci5BbmltYXRlRXZlbnQoXG5cdFx0XHQnYW5pbWF0ZScsIC1jdXJQb3NYIC8gcGFuZWxXaWR0aFxuXHRcdCkpXG5cdH1cblxuXHQvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cdC8vIFB1YmxpY1xuXG5cdC8qKiBBZGQgYW4gZXZlbnQgbGlzdGVuZXIgKi9cblx0ZnVuY3Rpb24gYWRkTGlzdGVuZXIgKG46IFBhbmVsU2xpZGVyLkV2ZW50VHlwZSwgZm46IChwYXJhbTogYW55KSA9PiB2b2lkKSB7XG5cdFx0Y29uc3QgYXJyID0gZW1pdHRlcnNbbl0gYXMgYW55W11cblx0XHRpZiAoYXJyLmluZGV4T2YoZm4pID09PSAtMSkge1xuXHRcdFx0YXJyLnB1c2goZm4pXG5cdFx0fVxuXHR9XG5cblx0LyoqIFJlbW92ZSBhbiBldmVudCBsaXN0ZW5lciAqL1xuXHRmdW5jdGlvbiByZW1vdmVMaXN0ZW5lciAobjogUGFuZWxTbGlkZXIuRXZlbnRUeXBlLCBmbjogKHBhcmFtOiBhbnkpID0+IHZvaWQpIHtcblx0XHRjb25zdCBhcnIgPSBlbWl0dGVyc1tuXSBhcyBhbnlbXVxuXHRcdGNvbnN0IGkgPSBhcnIuaW5kZXhPZihmbilcblx0XHRpZiAoaSA+PSAwKSB7XG5cdFx0XHRhcnIuc3BsaWNlKGksIDEpXG5cdFx0fVxuXHR9XG5cblx0LyoqIFJldHVybnMgY3VycmVudCBwYW5lbCBpbmRleCAqL1xuXHRmdW5jdGlvbiBnZXRQYW5lbCgpIHtcblx0XHRyZXR1cm4gY3VyUGFuZWxcblx0fVxuXG5cdC8qKlxuXHQgKiBBbmltYXRlcyB0byBwb3NpdGlvbiBhbmQgdXBkYXRlcyBwYW5lbCBpbmRleC5cblx0ICogVGhlIGFuaW1hdGlvbiBjb3VsZCBiZSByZWRpcmVjdGVkIG9yIGFib3J0ZWQsXG5cdCAqIHNvIHRoZSByZXN1bHQgaW5kZXggbWF5IG5vdCBiZSB3aGF0IHdhc1xuXHQgKiByZXF1ZXN0ZWQgb3IgdGhlIHByb21pc2UgbWF5IG5vdCByZXNvbHZlLlxuXHQgKi9cblx0ZnVuY3Rpb24gc2V0UGFuZWwgKHBhbmVsSWQ6IG51bWJlciwgZHVyYXRpb24gPSBjZmcuc2xpZGVEdXJhdGlvbikge1xuXHRcdHJldHVybiBwYW5lbElkID09PSBjdXJQYW5lbFxuXHRcdFx0PyBQcm9taXNlLnJlc29sdmUocGFuZWxJZClcblx0XHRcdDogbmV3IFByb21pc2U8bnVtYmVyPihyID0+IHtcblx0XHRcdFx0YW5pbWF0ZVRvKHBhbmVsSWQsIGR1cmF0aW9uLCByKVxuXHRcdFx0fSlcblx0fVxuXG5cdC8qKiBTZXRzIHRoZSBjdXJyZW50IHBhbmVsIGluZGV4IGltbWVkaWF0ZWx5LCBubyBhbmltYXRpb24gKi9cblx0ZnVuY3Rpb24gc2V0UGFuZWxJbW1lZGlhdGUgKHBhbmVsSWQ6IG51bWJlcikge1xuXHRcdGlmICh0eXBlb2YgcGFuZWxJZCAhPT0gJ251bWJlcicgfHwgIU51bWJlci5pc1NhZmVJbnRlZ2VyKHBhbmVsSWQpXG5cdFx0XHR8fCBwYW5lbElkIDwgMCB8fCBwYW5lbElkID49IGNmZy50b3RhbFBhbmVsc1xuXHRcdCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHBhbmVsJylcblx0XHR9XG5cdFx0aWYgKGlzQW5pbWF0aW5nKSB7XG5cdFx0XHRpc0FuaW1hdGluZyA9IGZhbHNlXG5cdFx0fSBlbHNlIGlmIChwYW5lbElkID09PSBjdXJQYW5lbCkge1xuXHRcdFx0cmV0dXJuXG5cdFx0fVxuXHRcdGN1clBhbmVsID0gcGFuZWxJZFxuXHRcdGN1clBvc1ggPSAtY3VyUGFuZWwgKiBwYW5lbFdpZHRoXG5cdFx0cmVuZGVyKClcblx0fVxuXG5cdC8qKiBSZW1vdmUgYWxsIGV2ZW50IGhhbmRsZXJzLCBjbGVhbnVwIHN0cmVhbXMgZXRjLiAqL1xuXHRmdW5jdGlvbiBkZXN0cm95KCkge1xuXHRcdC8vIFJlbW92ZSBldmVudCBsaXN0ZW5lcnNcblx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgcmVzaXplKVxuXHRcdGRyYWdnZXIuZGVzdHJveSgpXG5cdFx0T2JqZWN0LmtleXMoZW1pdHRlcnMpLmZvckVhY2goayA9PiB7XG5cdFx0XHRlbWl0dGVyc1trIGFzIFBhbmVsU2xpZGVyLkV2ZW50VHlwZV0ubGVuZ3RoID0gMFxuXHRcdH0pXG5cdFx0aWYgKGNmZy5kb20gIT0gbnVsbCkge1xuXHRcdFx0Y2ZnLmRvbS5pbm5lckhUTUwgPSAnJ1xuXHRcdFx0Y2ZnLmRvbSA9IHVuZGVmaW5lZCBhcyBhbnlcblx0XHR9XG5cdH1cblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgcmVzaXplKVxuXG5cdHJldHVybiB7XG5cdFx0b246IGFkZExpc3RlbmVyLFxuXHRcdG9mZjogcmVtb3ZlTGlzdGVuZXIsXG5cdFx0Z2V0UGFuZWwsXG5cdFx0c2V0UGFuZWwsXG5cdFx0c2V0UGFuZWxJbW1lZGlhdGUsXG5cdFx0Z2V0U2l6ZXM6ICgpID0+ICh7ZnVsbFdpZHRoLCBwYW5lbFdpZHRofSksXG5cdFx0aXNEcmFnZ2luZzogZHJhZ2dlci5pc0RyYWdnaW5nLFxuXHRcdGlzQW5pbWF0aW5nOiAoKSA9PiBpc0FuaW1hdGluZyxcblx0XHRyZW5kZXI6IHJlbmRlclBhbmVsQ29udGVudCxcblx0XHRyZXNpemUsXG5cdFx0ZGVzdHJveSxcblx0fVxufVxuXG4vKipcbiAqIFBhbmVsU2xpZGVyIHN0YXRpYyBtZXRob2RzIGFuZCBwcm9wZXJ0aWVzLlxuICovXG5uYW1lc3BhY2UgUGFuZWxTbGlkZXIge1xuXHRleHBvcnQgY29uc3QgREVGQVVMVF9TTElERV9EVVJBVElPTiA9IDUwMFxuXHRleHBvcnQgY29uc3QgREVGQVVMVF9EUkFHX1RIUkVTSE9MRCA9IDEyXG5cdGV4cG9ydCBjb25zdCBERUZBVUxUX0RSQUdfUkFUSU8gPSAxLjVcblxuXHQvKipcblx0ICogRGVmYXVsdCBhbmltYXRpb24gaW50ZXJwb2xhdGlvbiBmdW5jdGlvblxuXHQgKiBAcGFyYW0geDAgU3RhcnQgY29vcmRpbmF0ZVxuXHQgKiBAcGFyYW0geDEgRW5kIGNvb3JkaW5hdGVcblx0ICogQHBhcmFtIHQgVGltZSAoMC4uMSlcblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiB0ZXJwICh4MDogbnVtYmVyLCB4MTogbnVtYmVyLCB0OiBudW1iZXIpOiBudW1iZXIge1xuXHRcdGNvbnN0IHIgPSAoTWF0aC5QSSAvIDIuMCkgKiB0XG5cdFx0Y29uc3QgcyA9IE1hdGguc2luKHIpXG5cdFx0Y29uc3Qgc2kgPSAxLjAgLSBzXG5cdFx0cmV0dXJuICh4MCAqIHNpICsgeDEgKiBzKVxuXHR9XG5cblx0LyoqIExpZ2h0d2VpZ2h0IFBhbmVsU2xpZGVyIEV2ZW50IHR5cGUgKi9cblx0ZXhwb3J0IGNsYXNzIEV2ZW50IHtcblx0XHR0eXBlOiBFdmVudFR5cGVcblx0XHRjb25zdHJ1Y3Rvcih0eXBlOiBFdmVudFR5cGUpIHtcblx0XHRcdHRoaXMudHlwZSA9IHR5cGVcblx0XHR9XG5cdH1cblxuXHQvKiogRXZlbnQgZW1pdHRlZCB3aGVuIGN1cnJlbnQgcGFuZWwgY2hhbmdlcyAqL1xuXHRleHBvcnQgY2xhc3MgQ2hhbmdlRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG5cdFx0cGFuZWxJZDogbnVtYmVyXG5cdFx0Y29uc3RydWN0b3IodHlwZTogJ3BhbmVsY2hhbmdlJywgcGFuZWxJZDogbnVtYmVyKSB7XG5cdFx0XHRzdXBlcih0eXBlKVxuXHRcdFx0dGhpcy5wYW5lbElkID0gcGFuZWxJZFxuXHRcdH1cblx0fVxuXG5cdC8qKiBFdmVudCBlbWl0dGVkIHdoZW4gY3VycmVudCBwYW5lbCBkcmFnZ2VkICovXG5cdGV4cG9ydCBjbGFzcyBEcmFnRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG5cdFx0LyoqIEhvcml6b250YWwgYW1vdW50IGRyYWdnZWQgZnJvbSBzdGFydCAoaW4gcGl4ZWxzKSAqL1xuXHRcdHg6IG51bWJlclxuXHRcdC8qKiBDdXJyZW50IGhvcml6b250YWwgdmVsb2NpdHkgKi9cblx0XHR4djogbnVtYmVyXG5cdFx0Y29uc3RydWN0b3IodHlwZTogJ2RyYWcnIHwgJ2RyYWdzdGFydCcgfCAnZHJhZ2VuZCcgfCAnZHJhZ2NhbmNlbCcsIHg6IG51bWJlciwgeHY6IG51bWJlcikge1xuXHRcdFx0c3VwZXIodHlwZSlcblx0XHRcdHRoaXMueCA9IHhcblx0XHRcdHRoaXMueHYgPSB4dlxuXHRcdH1cblx0fVxuXG5cdC8qKiBFbWl0dGVkIG9uIGFuaW1hdGlvbiBzdGFydC9zdG9wICovXG5cdGV4cG9ydCBjbGFzcyBBbmltYXRpb25FdmVudCBleHRlbmRzIEV2ZW50IHtcblx0XHRhbmltYXRpbmc6IGJvb2xlYW5cblx0XHRjb25zdHJ1Y3Rvcih0eXBlOiAnYW5pbWF0aW9uc3RhdGVjaGFuZ2UnLCBhbmltYXRpbmc6IGJvb2xlYW4pIHtcblx0XHRcdHN1cGVyKHR5cGUpXG5cdFx0XHR0aGlzLmFuaW1hdGluZyA9IGFuaW1hdGluZ1xuXHRcdH1cblx0fVxuXG5cdC8qKiBFbWl0dGVkIGV2ZXJ5IGZyYW1lIGR1cmluZyBhbiBhbmltYXRpb24gKi9cblx0ZXhwb3J0IGNsYXNzIEFuaW1hdGVFdmVudCBleHRlbmRzIEV2ZW50IHtcblx0XHRwYW5lbEZyYWN0aW9uOiBudW1iZXJcblx0XHRjb25zdHJ1Y3Rvcih0eXBlOiAnYW5pbWF0ZScsIHBhbmVsRnJhY3Rpb246IG51bWJlcikge1xuXHRcdFx0c3VwZXIodHlwZSlcblx0XHRcdHRoaXMucGFuZWxGcmFjdGlvbiA9IHBhbmVsRnJhY3Rpb25cblx0XHR9XG5cdH1cblxuXHQvKiogUmVjZWl2ZWQgYnkgdGhlIGFwcGxpY2F0aW9uJ3MgYHJlbmRlckNvbnRlbnRgIGNhbGxiYWNrICovXG5cdGV4cG9ydCBjbGFzcyBSZW5kZXJFdmVudCB7XG5cdFx0dHlwZTogJ3JlbmRlcicgfCAncHJldmlldydcblx0XHRkb206IEhUTUxFbGVtZW50XG5cdFx0cGFuZWxJZDogbnVtYmVyXG5cdFx0Y29uc3RydWN0b3IgKHR5cGU6ICdyZW5kZXInIHwgJ3ByZXZpZXcnLCBkb206IEhUTUxFbGVtZW50LCBwYW5lbElkOiBudW1iZXIpIHtcblx0XHRcdHRoaXMudHlwZSA9IHR5cGVcblx0XHRcdHRoaXMuZG9tID0gZG9tXG5cdFx0XHR0aGlzLnBhbmVsSWQgPSBwYW5lbElkXG5cdFx0fVxuXHR9XG5cblx0LyoqIFJldHVybiB2YWx1ZSBmcm9tIGFwcGxpY2F0aW9uIGByZW5kZXJDb250ZW50YCBjYWxsYmFjayAqL1xuXHRleHBvcnQgdHlwZSBSZW5kZXJSZXN1bHQgPSAwIHwgMSB8IDIgfCAzIHwgLTFcblx0LyoqIEluZGljYXRlcyB0aGUgcGFuZWwgaXMgZW1wdHkgYWZ0ZXIgcmVuZGVyQ29udGVudCAqL1xuXHRleHBvcnQgY29uc3QgRU1QVFkgICAgICA6IFJlbmRlclJlc3VsdCA9IDBcblx0LyoqIEluZGljYXRlcyB0aGUgcGFuZWwgaXMgJ3ByZS1yZW5kZXJlZCcgYWZ0ZXIgcmVuZGVyQ29udGVudCAqL1xuXHRleHBvcnQgY29uc3QgUFJFUkVOREVSRUQ6IFJlbmRlclJlc3VsdCA9IDFcblx0LyoqIEluZGljYXRlcyB0aGUgcGFuZWwgaXMgJ3ByZS1yZW5kZXJlZCcgYW5kIGF3YWl0aW5nIGNvbnRlbnQgYWZ0ZXIgcmVuZGVyQ29udGVudCAqL1xuXHRleHBvcnQgY29uc3QgRkVUQ0hJTkcgICA6IFJlbmRlclJlc3VsdCA9IDJcblx0LyoqIEluZGljYXRlcyB0aGUgcGFuZWwgaXMgZnVsbHkgcmVuZGVyZWQgKi9cblx0ZXhwb3J0IGNvbnN0IFJFTkRFUkVEICAgOiBSZW5kZXJSZXN1bHQgPSAzXG5cdC8qKiBJbmRpY2F0ZXMgdGhlIHBhbmVsIGNvbnRlbnQgaXMgb3V0IG9mIGRhdGUgYW5kIG5lZWRzIHRvIHJlLXJlbmRlciAqL1xuXHRleHBvcnQgY29uc3QgRElSVFkgICAgICA6IFJlbmRlclJlc3VsdCA9IC0xXG5cblx0LyoqIEV2ZW50IExpc3RlbmVyIHNpZ25hdHVyZSAqL1xuXHRleHBvcnQgdHlwZSBFdmVudExpc3RlbmVyID0gKGU6IEV2ZW50KSA9PiB2b2lkXG5cblx0ZXhwb3J0IGludGVyZmFjZSBFdmVudExpc3RlbmVycyB7XG5cdFx0ZHJhZ3N0YXJ0PyhlOiBEcmFnRXZlbnQpOiB2b2lkXG5cdFx0ZHJhZz8oZTogRHJhZ0V2ZW50KTogdm9pZFxuXHRcdGRyYWdlbmQ/KGU6IERyYWdFdmVudCk6IHZvaWRcblx0XHRkcmFnY2FuY2VsPyhlOiBEcmFnRXZlbnQpOiB2b2lkXG5cdFx0YW5pbWF0ZT8oZTogQW5pbWF0ZUV2ZW50KTogdm9pZFxuXHRcdGFuaW1hdGlvbnN0YXRlY2hhbmdlPyhlOiBBbmltYXRpb25FdmVudCk6IHZvaWRcblx0XHRwYW5lbGNoYW5nZT8oZTogQ2hhbmdlRXZlbnQpOiB2b2lkXG5cdH1cblxuXHRleHBvcnQgaW50ZXJmYWNlIEV2ZW50RW1pdHRlcnMge1xuXHRcdGRyYWdzdGFydDogKChlOiBEcmFnRXZlbnQpID0+IHZvaWQpW11cblx0XHRkcmFnOiAoKGU6IERyYWdFdmVudCkgPT4gdm9pZClbXVxuXHRcdGRyYWdlbmQ6ICgoZTogRHJhZ0V2ZW50KSA9PiB2b2lkKVtdXG5cdFx0ZHJhZ2NhbmNlbDogKChlOiBEcmFnRXZlbnQpID0+IHZvaWQpW11cblx0XHRhbmltYXRlOiAoKGU6IEFuaW1hdGVFdmVudCkgPT4gdm9pZClbXVxuXHRcdGFuaW1hdGlvbnN0YXRlY2hhbmdlOiAoKGU6IEFuaW1hdGlvbkV2ZW50KSA9PiB2b2lkKVtdXG5cdFx0cGFuZWxjaGFuZ2U6ICgoZTogQ2hhbmdlRXZlbnQpID0+IHZvaWQpW11cblx0fVxuXG5cdC8qKiBFdmVudCB0eXBlcyAqL1xuXHRleHBvcnQgdHlwZSBFdmVudFR5cGUgPSBrZXlvZiBFdmVudEVtaXR0ZXJzXG5cblx0LyoqIFBhbmVsU2xpZGVyIGNyZWF0aW9uIG9wdGlvbnMgKi9cblx0ZXhwb3J0IGludGVyZmFjZSBPcHRpb25zIHtcblx0XHQvKipcblx0XHQgKiBUaGUgcm9vdCBET00gZWxlbWVudCB0byB1c2UuIEl0IHNob3VsZCBiZSBlbXB0eSBhbmRcblx0XHQgKiBwYW5lbCBjaGlsZCBlbGVtZW50cyB3aWxsIGJlIGFkZGVkIHRvIGl0LlxuXHRcdCAqL1xuXHRcdGRvbTogSFRNTEVsZW1lbnRcblx0XHQvKiogVG90YWwgbnVtYmVyIG9mIHBhbmVscyB3aXRoIGNvbnRlbnQgKi9cblx0XHR0b3RhbFBhbmVsczogbnVtYmVyXG5cdFx0LyoqIFRvdGFsIG51bWJlciBvZiB2aXNpYmxlIHBhbmVscyB0aGF0IGZpdCBhY3Jvc3MgdGhlIHdpZHRoIG9mIHBhbmVsLXNldCBjb250YWluZXIgKi9cblx0XHR2aXNpYmxlUGFuZWxzPzogbnVtYmVyXG5cdFx0LyoqIFN0YXJ0aW5nIHBhbmVsICovXG5cdFx0aW5pdGlhbFBhbmVsPzogbnVtYmVyXG5cdFx0LyoqIE1heGltdW0gcGFuZWxzIHRyYXZlbGxlZCBmcm9tIHN3aXBlIChkZWZhdWx0IHZpc2libGVQYW5lbHMpICovXG5cdFx0bWF4U3dpcGVQYW5lbHM/OiBudW1iZXJcblx0XHQvKiogRHVyYXRpb24gb2Ygc2xpZGUgYW5pbWF0aW9uIG9uIHJlbGVhc2UgKGRlZmF1bHQgNTAwbXMpICovXG5cdFx0c2xpZGVEdXJhdGlvbj86IG51bWJlclxuXHRcdC8qKiBIb3Jpem9udGFsIGRpc3RhbmNlIHRocmVzaG9sZCB0byBpbml0aWF0ZSBkcmFnIChkZWZhdWx0IDEycHgpICovXG5cdFx0ZHJhZ1RocmVzaG9sZD86IG51bWJlclxuXHRcdC8qKiBNaW5pbXVtIHJlcXVpcmVkIGhvcml6b250YWw6dmVydGljYWwgcmF0aW8gdG8gaW5pdGlhdGUgZHJhZyAoZGVmYXVsdCAxLjUpICovXG5cdFx0ZHJhZ1JhdGlvPzogbnVtYmVyXG5cdFx0LyoqIElucHV0IGRldmljZXMgdG8gZW5hYmxlIChkZWZhdWx0IFsnbW91c2UnLCAndG91Y2gnXSkgKi9cblx0XHRkZXZpY2VzPzogKCdtb3VzZScgfCAndG91Y2gnKVtdXG5cdFx0LyoqIENTUyBjbGFzc05hbWUgdG8gdXNlIGZvciB0aGUgcGFuZWwgZWxlbWVudHMgKi9cblx0XHRwYW5lbENsYXNzTmFtZT86IHN0cmluZ1xuXHRcdC8qKiBJbml0aWFsIGV2ZW50IGxpc3RlbmVycyAqL1xuXHRcdG9uPzogRXZlbnRMaXN0ZW5lcnNcblx0XHQvKiogQXBwbGljYXRpb24gZnVuY3Rpb24gdG8gcmVuZGVyIGEgcGFuZWwgKi9cblx0XHRyZW5kZXJDb250ZW50KGV2ZW50OiBSZW5kZXJFdmVudCk6IFBhbmVsU2xpZGVyLlJlbmRlclJlc3VsdFxuXHRcdC8qKlxuXHRcdCAqIE9wdGlvbmFsIGN1c3RvbSBhbmltYXRpb24gaW50ZXJwb2xhdGlvbiBmdW5jdGlvblxuXHRcdCAqIEBwYXJhbSB4MCBTdGFydCBjb29yZGluYXRlXG5cdFx0ICogQHBhcmFtIHgxIEVuZCBjb29yZGluYXRlXG5cdFx0ICogQHBhcmFtIHQgVGltZSAoMC4uMSlcblx0XHQgKiBAcmV0dXJucyBJbnRlcnBvbGF0ZWQgdmFsdWUgYmV0d2VlbiB4MCAodD0wKSBhbmQgeDEgKHQ9MSlcblx0XHQgKi9cblx0XHR0ZXJwPyh4MDogbnVtYmVyLCB4MTogbnVtYmVyLCB0OiBudW1iZXIpOiBudW1iZXJcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBQYW5lbFNsaWRlclxuIiwiLy8gTWF0aCB1dGlsc1xuXG4vKiogQ2xhbXAgbiB0byByYW5nZSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYW1wIChuOiBudW1iZXIsIG1pbjogbnVtYmVyLCBtYXg6IG51bWJlcikge1xuXHRyZXR1cm4gTWF0aC5taW4oTWF0aC5tYXgobiwgbWluKSwgbWF4KVxufVxuXG4vKiogIEFsd2F5cyBwb3NpdGl2ZSBtb2R1bHVzICovXG5leHBvcnQgZnVuY3Rpb24gcG1vZCAobjogbnVtYmVyLCBtOiBudW1iZXIpIHtcblx0cmV0dXJuICgobiAlIG0gKyBtKSAlIG0pXG59XG4iLCIvLyBEZXRlcm1pbmUgc3R5bGUgbmFtZXMgKGlmIHByZWZpeCByZXF1aXJlZClcblxuZnVuY3Rpb24gdG9Mb3dlciAoczogYW55KSB7XG5cdHJldHVybiAhIXMgJiYgdHlwZW9mIHMgPT09ICdzdHJpbmcnID8gcy50b0xvd2VyQ2FzZSgpIDogJydcbn1cblxuZXhwb3J0IGNvbnN0IHByZWZpeCA9IChmdW5jdGlvbigpIHtcblx0Y29uc3QgdCA9ICd0cmFuc2xhdGUzZCgxMDBweCwyMHB4LDBweCknIC8vIHRoZSB0cmFuc2Zvcm0gd2UnbGwgdXNlIHRvIHRlc3Rcblx0Y29uc3QgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSAvLyBNYWtlIGEgdGVzdCBlbGVtZW50XG5cblx0Ly8gIENoZWNrIHN1cHBvcnQgZm9yIGN1cnJlbnQgc3RhbmRhcmQgZmlyc3Rcblx0ZWwuc3R5bGUudHJhbnNmb3JtID0gdFxuXHRsZXQgc3R5bGVBdHRyTGMgPSB0b0xvd2VyKGVsLmdldEF0dHJpYnV0ZSgnc3R5bGUnKSlcblx0aWYgKHN0eWxlQXR0ckxjLmluZGV4T2YoJ3RyYW5zZm9ybScpID09PSAwKSB7XG5cdFx0cmV0dXJuICcnIC8vIGN1cnJlbnQsIHlheS5cblx0fVxuXG5cdC8vICBUcnkgYmV0YSBuYW1lc1xuXHQvLyB0c2xpbnQ6ZGlzYWJsZSBhbGlnblxuXHQoZWwuc3R5bGUgYXMgYW55KS5Nb3pUcmFuc2Zvcm0gPSB0IC8vIGZpcmVmb3hcblx0OyhlbC5zdHlsZSBhcyBhbnkpLndlYmtpdFRyYW5zZm9ybSA9IHQgLy8gd2Via2l0L2Nocm9tZVxuXHQ7KGVsLnN0eWxlIGFzIGFueSkubXNUcmFuc2Zvcm0gPSB0IC8vIElFXG5cdHN0eWxlQXR0ckxjID0gdG9Mb3dlcihlbC5nZXRBdHRyaWJ1dGUoJ3N0eWxlJykpXG5cblx0Ly8gIFNlZSB3aGljaCBvbmUgd29ya2VkLCBpZiBhbnkuLi5cblx0aWYgKHN0eWxlQXR0ckxjLmluZGV4T2YoJ21veicpICE9PSAtMSkge1xuXHRcdHJldHVybiAnbW96J1xuXHR9IGVsc2UgaWYgKHN0eWxlQXR0ckxjLmluZGV4T2YoJ3dlYmtpdCcpICE9PSAtMSkge1xuXHRcdHJldHVybiAnd2Via2l0J1xuXHR9IGVsc2UgaWYgKHN0eWxlQXR0ckxjLmluZGV4T2YoJ21zJykgIT09IC0xKSB7XG5cdFx0cmV0dXJuICdtcydcblx0fVxuXHRjb25zb2xlLndhcm4oXCJDU1MgdHJhbnNmb3JtIHN0eWxlIG5vdCBzdXBwb3J0ZWQuXCIpXG5cdHJldHVybiAnJ1xufSkoKVxuXG5leHBvcnQgY29uc3QgdHJhbnNmb3JtID0gcHJlZml4ID8gcHJlZml4ICsgJy10cmFuc2Zvcm0nIDogJ3RyYW5zZm9ybSdcblxuLyoqXG4gKiBTZXQgcG9zaXRpb24gb2YgZWxlbWVudCB1c2luZyAzZCB0cmFuc2Zvcm0gc3R5bGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldFBvczNkIChlbDogSFRNTEVsZW1lbnQsIHg6IG51bWJlciwgeSA9IDAsIHogPSAwKSB7XG5cdChlbC5zdHlsZSBhcyBhbnkpW3RyYW5zZm9ybV0gPSBgdHJhbnNsYXRlM2QoJHt4fXB4LCR7eX1weCwke3p9cHgpYFxufVxuIl19
