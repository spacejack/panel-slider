interface Speedo {
    start(x: number, t: number): void;
    addSample(x: number, t: number): void;
    getVel(): number;
}
/**
 * Computes speed (delta x over time)
 */
declare function Speedo(numSamples?: number): Speedo;
export default Speedo;
