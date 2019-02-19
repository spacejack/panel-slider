"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Generate an array sequence of numbers from start up to but not including end incrementing by step */
function range(start, end, step) {
    step = step || 1;
    if (end == null) {
        end = start;
        start = 0;
    }
    var size = Math.ceil((end - start) / step);
    var a = [];
    for (var i = 0; i < size; ++i) {
        a.push(start + step * i);
    }
    return a;
}
exports.range = range;
