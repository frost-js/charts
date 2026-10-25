/**
 * Creates evenly spaced ticks that cover the data and include zero.
 * @param {number[]} values The finite data values.
 * @param {number} [maxSteps=6] The preferred maximum number of intervals.
 * @returns {number[]} The ascending scale ticks.
 */
export function createScale(values, maxSteps = 6) {
    let minimum = 0;
    let maximum = 0;

    for (const value of values) {
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
    }

    // Empty and all-zero datasets still need a nonzero plotting range.
    if (minimum === maximum) {
        return [0, 1];
    }

    const stepCount = Math.max(2, Math.min(20, Math.floor(maxSteps)));
    const range = maximum - minimum;
    const approximateStep = range / stepCount;

    // Opposite extreme values can overflow the range; subnormal values can
    // underflow the step. Their endpoints remain valid scale boundaries.
    if (!Number.isFinite(approximateStep) || approximateStep === 0) {
        if (minimum < 0 && maximum > 0) {
            return [minimum, 0, maximum];
        }

        return [minimum, maximum];
    }

    const magnitude = 10 ** Math.floor(Math.log10(approximateStep));
    let step = magnitude * 10;

    for (const multiplier of [1, 2, 2.5, 5, 10]) {
        const candidate = magnitude * multiplier;

        if (candidate >= approximateStep) {
            step = candidate;
            break;
        }
    }

    if (!Number.isFinite(step) || step === 0) {
        return [minimum, maximum];
    }

    const firstStep = Math.floor(minimum / step);
    const lastStep = Math.ceil(maximum / step);
    const firstTick = firstStep * step;
    const lastTick = lastStep * step;

    // Rounding outward near Number.MAX_VALUE must not introduce infinity.
    if (!Number.isFinite(firstTick) || !Number.isFinite(lastTick)) {
        return [minimum, maximum];
    }

    const ticks = [];

    for (let index = firstStep; index <= lastStep; index++) {
        const value = index * step;
        const rounded = Number(value.toPrecision(14));

        ticks.push(rounded === 0 ? 0 : rounded);
    }

    // Decimal rounding should never move an endpoint inside the data range.
    ticks[0] = Math.min(ticks[0], minimum);
    ticks[ticks.length - 1] = Math.max(ticks[ticks.length - 1], maximum);

    return ticks;
}

/**
 * Converts a value to a fraction of a scale without overflowing its range.
 * @param {number} value The value to position.
 * @param {number} minimum The lower scale boundary.
 * @param {number} maximum The upper scale boundary.
 * @returns {number} The relative position from zero to one.
 */
export function getScalePosition(value, minimum, maximum) {
    const magnitude = Math.max(Math.abs(minimum), Math.abs(maximum)) || 1;
    const scaledMinimum = minimum / magnitude;
    const scaledMaximum = maximum / magnitude;
    const scaledValue = value / magnitude;

    return (scaledValue - scaledMinimum) / (scaledMaximum - scaledMinimum);
}
