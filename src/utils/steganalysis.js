// ============================================================
// steganalysis.js - Statistical Detection of Hidden Data
// ============================================================

/**
 * Perform Chi-Square analysis on LSB values to detect steganographic content.
 * High score = likely contains hidden data.
 * 
 * Theory: In natural images, LSBs follow certain statistical distributions.
 * LSB embedding disrupts these patterns, making even/odd pixel value pairs
 * appear nearly equal in frequency.
 * 
 * @param {Uint8ClampedArray} data - Raw pixel data (RGBA)
 * @returns {{ score: number, verdict: string, details: object }}
 */
export function chiSquareAnalysis(data) {
    // Count frequency of each byte value in RGB channels
    const observed = new Array(256).fill(0);
    let totalSamples = 0;

    for (let i = 0; i < data.length; i++) {
        // Skip alpha channel
        if ((i + 1) % 4 === 0) continue;
        observed[data[i]]++;
        totalSamples++;
    }

    // Chi-square test: compare pairs (2k, 2k+1)
    // In unmodified images, these pairs have different frequencies
    // In LSB-encoded images, they converge (become nearly equal)
    let chiSquare = 0;
    let pairCount = 0;

    for (let k = 0; k < 128; k++) {
        const even = observed[2 * k];
        const odd = observed[2 * k + 1];
        const expected = (even + odd) / 2;

        if (expected > 0) {
            chiSquare += Math.pow(even - expected, 2) / expected;
            chiSquare += Math.pow(odd - expected, 2) / expected;
            pairCount++;
        }
    }

    // Normalize: lower chi-square = more suspicious (pairs are too equal)
    // We invert to make high score = suspicious
    const normalizedScore = Math.max(0, Math.min(100, 100 - (chiSquare / pairCount) * 10));

    let verdict;
    if (normalizedScore > 70) verdict = 'HIGH - Likely contains hidden data';
    else if (normalizedScore > 40) verdict = 'MEDIUM - Possible hidden data';
    else verdict = 'LOW - Appears clean';

    return {
        score: Math.round(normalizedScore),
        verdict,
        details: {
            chiSquareValue: Math.round(chiSquare * 100) / 100,
            pairsAnalyzed: pairCount,
            totalSamples
        }
    };
}

/**
 * Generate an LSB plane visualization.
 * Extracts the least significant bit of each channel and amplifies it
 * to create a visible image. Hidden data appears as structured patterns.
 * 
 * @param {Uint8ClampedArray} data - Raw pixel data (RGBA)
 * @param {number} width
 * @param {number} height
 * @returns {string} - Data URL of the LSB visualization (PNG)
 */
export function lsbVisualAttack(data, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const output = ctx.createImageData(width, height);

    for (let i = 0; i < data.length; i += 4) {
        // Extract LSB of R, G, B and amplify to full brightness
        output.data[i] = (data[i] & 1) * 255; // R
        output.data[i + 1] = (data[i + 1] & 1) * 255; // G
        output.data[i + 2] = (data[i + 2] & 1) * 255; // B
        output.data[i + 3] = 255; // A (fully opaque)
    }

    ctx.putImageData(output, 0, 0);
    return canvas.toDataURL('image/png');
}

/**
 * Analyze the entropy of LSB values.
 * Random data (encrypted messages) produces high entropy,
 * while natural images have lower LSB entropy.
 * 
 * @param {Uint8ClampedArray} data - Raw pixel data
 * @returns {{ entropy: number, maxEntropy: number, ratio: number }}
 */
export function lsbEntropy(data) {
    // Count LSBs directly — no array allocation (efficient for large images)
    let ones = 0;
    let total = 0;

    for (let i = 0; i < data.length; i++) {
        if ((i + 1) % 4 === 0) continue; // Skip alpha
        ones += data[i] & 1;
        total++;
    }

    const zeros = total - ones;

    // Shannon entropy for binary source
    const p0 = zeros / total;
    const p1 = ones / total;

    let entropy = 0;
    if (p0 > 0) entropy -= p0 * Math.log2(p0);
    if (p1 > 0) entropy -= p1 * Math.log2(p1);

    return {
        entropy: Math.round(entropy * 10000) / 10000,
        maxEntropy: 1.0,
        ratio: Math.round((entropy / 1.0) * 100),
        zeroBits: zeros,
        oneBits: ones,
        totalBits: total
    };
}

/**
 * Run full steganalysis on image data.
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 * @returns {{ chiSquare: object, entropy: object, lsbImage: string, overallScore: number, overallVerdict: string }}
 */
export function fullAnalysis(data, width, height) {
    const chi = chiSquareAnalysis(data);
    const ent = lsbEntropy(data);
    const lsbImage = lsbVisualAttack(data, width, height);

    // Combined score: weight chi-square (60%) and entropy ratio (40%)
    const overallScore = Math.round(chi.score * 0.6 + ent.ratio * 0.4);

    let overallVerdict;
    if (overallScore > 70) overallVerdict = '🔴 HIGH PROBABILITY - Hidden data detected';
    else if (overallScore > 40) overallVerdict = '🟡 MEDIUM - Suspicious patterns found';
    else overallVerdict = '🟢 LOW - Image appears clean';

    return {
        chiSquare: chi,
        entropy: ent,
        lsbImage,
        overallScore,
        overallVerdict
    };
}
