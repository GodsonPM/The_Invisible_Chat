// ============================================================
// useSoundEffects.js - Retro Sound Effects via Web Audio API
// ============================================================
// Uses oscillators to generate 8-bit style sound effects.
// No external audio files needed.

let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playTone(frequency, duration, type = 'square', volume = 0.15) {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
}

function playSequence(notes, interval = 0.08) {
    notes.forEach(([freq, dur, type], i) => {
        setTimeout(() => playTone(freq, dur, type), i * interval * 1000);
    });
}

// --- Exported Sound Effects ---

/** Tab switch click */
export function sfxClick() {
    playTone(800, 0.05, 'square', 0.1);
}

/** File selected / image loaded */
export function sfxFileLoad() {
    playSequence([
        [400, 0.08, 'square'],
        [600, 0.08, 'square'],
        [800, 0.1, 'square'],
    ], 0.06);
}

/** Encoding started - rising sweep */
export function sfxProcessStart() {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
}

/** Success - cheerful arpeggio */
export function sfxSuccess() {
    playSequence([
        [523, 0.1, 'square'],  // C5
        [659, 0.1, 'square'],  // E5
        [784, 0.1, 'square'],  // G5
        [1047, 0.15, 'square'], // C6
    ], 0.08);
}

/** Error - descending buzz */
export function sfxError() {
    playSequence([
        [400, 0.15, 'sawtooth'],
        [200, 0.2, 'sawtooth'],
    ], 0.12);
}

/** Scan / analysis beeps */
export function sfxScan() {
    playSequence([
        [1000, 0.05, 'sine'],
        [1200, 0.05, 'sine'],
        [1000, 0.05, 'sine'],
        [1400, 0.08, 'sine'],
    ], 0.1);
}

/** Reset / clear */
export function sfxReset() {
    playTone(600, 0.08, 'triangle', 0.1);
    setTimeout(() => playTone(300, 0.12, 'triangle', 0.08), 80);
}

/** Keystroke feedback (subtle) */
export function sfxKeystroke() {
    playTone(1200 + Math.random() * 400, 0.02, 'square', 0.03);
}
