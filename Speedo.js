"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var math_1 = require("./math");
var DEFAULT_SAMPLES = 4;
/**
 * Computes speed (delta x over time)
 */
function Speedo(numSamples) {
    if (numSamples === void 0) { numSamples = DEFAULT_SAMPLES; }
    var samples = [];
    var index = 0;
    var count = 0;
    for (var index_1 = 0; index_1 < numSamples; ++index_1) {
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
exports.default = Speedo;
