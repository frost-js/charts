/**
 * Applies the configured timing curve to a fraction between zero and one.
 * @param {number} progress The elapsed animation fraction.
 * @param {string} easing The timing curve name.
 * @returns {number} The eased animation fraction.
 */
export function ease(progress, easing) {
    switch (easing) {
        case 'easeOutQuad':
            return 1 - (1 - progress) ** 2;
        case 'easeInOutQuad':
            return progress < .5 ? 2 * progress ** 2 : 1 - (-2 * progress + 2) ** 2 / 2;
        default:
            return progress;
    }
}
