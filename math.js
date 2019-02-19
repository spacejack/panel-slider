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
