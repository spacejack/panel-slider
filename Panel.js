"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Creates a Panel instance */
function Panel(index, widthPct, state, className) {
    if (state === void 0) { state = Panel.EMPTY; }
    if (className === void 0) { className = ''; }
    var xpct = index * widthPct;
    return {
        dom: Panel.createElement(className, {
            width: widthPct + "%",
            transform: "translate3d(" + xpct + "%,0,0)"
        }),
        index: index,
        state: state
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
    function createElement(className, style) {
        if (className === void 0) { className = ''; }
        if (style === void 0) { style = {}; }
        var el = document.createElement('div');
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
