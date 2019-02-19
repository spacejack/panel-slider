"use strict";
// tslint:disable unified-signatures
Object.defineProperty(exports, "__esModule", { value: true });
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
