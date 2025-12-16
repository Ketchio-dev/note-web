/**
 * Fractional indexing for block ordering
 * Allows insertion between any two blocks without reordering siblings
 * 
 * Based on: https://www.figma.com/blog/realtime-editing-of-ordered-sequences/
 */

const BASE_62_DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Generate a position string between two positions
 */
export function generatePositionBetween(
    before: string | null,
    after: string | null
): string {
    // First position
    if (!before && !after) {
        return 'a0';
    }

    // Insert at beginning
    if (!before) {
        return generateBefore(after!);
    }

    // Insert at end
    if (!after) {
        return generateAfter(before);
    }

    // Insert between
    return generateBetween(before, after);
}

/**
 * Generate position before a given position
 */
function generateBefore(pos: string): string {
    // If pos is "a0", generate something before it
    if (pos === 'a0') {
        return 'Z';  // Z comes before a in our ordering
    }

    // Decrement last character
    const lastChar = pos[pos.length - 1];
    const lastCharIndex = BASE_62_DIGITS.indexOf(lastChar);

    if (lastCharIndex > 0) {
        return pos.slice(0, -1) + BASE_62_DIGITS[lastCharIndex - 1];
    }

    // Need to go to previous "digit"
    return pos.slice(0, -1) + 'Z';
}

/**
 * Generate position after a given position
 */
function generateAfter(pos: string): string {
    // Increment last character
    const lastChar = pos[pos.length - 1];
    const lastCharIndex = BASE_62_DIGITS.indexOf(lastChar);

    if (lastCharIndex < BASE_62_DIGITS.length - 1) {
        return pos + BASE_62_DIGITS[lastCharIndex + 1];
    }

    // Append a new "digit"
    return pos + '0';
}

/**
 * Generate position between two positions
 */
function generateBetween(before: string, after: string): string {
    // Make sure before < after
    if (before >= after) {
        throw new Error('Invalid position: before must be less than after');
    }

    // Find first differing character
    let i = 0;
    while (i < before.length && i < after.length && before[i] === after[i]) {
        i++;
    }

    // If before is a prefix of after
    if (i === before.length) {
        // Insert between 'before' and 'before + first char of remaining after'
        const midChar = BASE_62_DIGITS[Math.floor(BASE_62_DIGITS.indexOf(after[i]) / 2)];
        return before + midChar;
    }

    // If after is a prefix of before (shouldn't happen if before < after)
    if (i === after.length) {
        return before + '0';
    }

    // Find midpoint character
    const beforeChar = BASE_62_DIGITS.indexOf(before[i]);
    const afterChar = BASE_62_DIGITS.indexOf(after[i]);

    if (afterChar - beforeChar > 1) {
        // There's room for a character in between
        const midChar = BASE_62_DIGITS[beforeChar + Math.floor((afterChar - beforeChar) / 2)];
        return before.slice(0, i) + midChar;
    }

    // Characters are adjacent, need to add more precision
    return before + BASE_62_DIGITS[Math.floor(BASE_62_DIGITS.length / 2)];
}

/**
 * Generate multiple positions between two positions
 */
export function generateNPositionsBetween(
    before: string | null,
    after: string | null,
    count: number
): string[] {
    const positions: string[] = [];

    if (count === 0) return positions;
    if (count === 1) return [generatePositionBetween(before, after)];

    // Generate positions by recursively splitting
    let currentBefore = before;

    for (let i = 0; i < count; i++) {
        const pos = generatePositionBetween(currentBefore, after);
        positions.push(pos);
        currentBefore = pos;
    }

    return positions;
}

/**
 * Compare two positions lexicographically
 */
export function comparePositions(a: string, b: string): number {
    return a.localeCompare(b);
}
