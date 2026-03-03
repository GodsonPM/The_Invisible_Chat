// ============================================================
// steganography.js - LSB Steganography with AES-GCM Encryption
// ============================================================

// --- Crypto Helpers (Web Crypto API) ---

/**
 * Derive a 256-bit AES key from a password using PBKDF2.
 * @param {string} password 
 * @param {Uint8Array} salt - 16-byte salt
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt plaintext with AES-GCM.
 * Returns a Uint8Array: [salt(16) | iv(12) | ciphertext(...)]
 */
async function aesEncrypt(plaintext, password) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(plaintext)
    );
    // Combine: salt + iv + ciphertext
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    return combined;
}

/**
 * Decrypt AES-GCM ciphertext.
 * Expects Uint8Array: [salt(16) | iv(12) | ciphertext(...)]
 */
async function aesDecrypt(combined, password) {
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ciphertext = combined.slice(28);
    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    );
    return new TextDecoder().decode(decrypted);
}

// --- LSB Steganography ---

/**
 * Encode a byte array into image pixel LSBs.
 * Format: [32-bit length of payload in bits] [payload bits]
 * Each bit is stored in the LSB of an R, G, or B channel (alpha skipped).
 */
function embedBitsInPixels(pixelData, payload) {
    // payload is a Uint8Array
    const totalBits = payload.length * 8;
    const lengthBinary = totalBits.toString(2).padStart(32, '0');

    // Check capacity (3 usable channels per pixel, 1 bit each)
    const usableChannels = (pixelData.length / 4) * 3;
    if (32 + totalBits > usableChannels) {
        throw new Error("Message too long for this image. Use a larger image.");
    }

    let dataIndex = 0;

    // Helper: write one bit
    const writeBit = (bit) => {
        // Skip alpha channel (every 4th byte: index 3, 7, 11...)
        if ((dataIndex + 1) % 4 === 0) dataIndex++;
        pixelData[dataIndex] = (pixelData[dataIndex] & 0xFE) | bit;
        dataIndex++;
    };

    // Write 32-bit length header
    for (let i = 0; i < 32; i++) {
        writeBit(parseInt(lengthBinary[i], 10));
    }

    // Write payload bits
    for (let byteIdx = 0; byteIdx < payload.length; byteIdx++) {
        for (let bitIdx = 7; bitIdx >= 0; bitIdx--) {
            writeBit((payload[byteIdx] >> bitIdx) & 1);
        }
    }
}

/**
 * Extract a byte array from image pixel LSBs.
 */
function extractBitsFromPixels(pixelData) {
    let dataIndex = 0;

    const readBit = () => {
        if ((dataIndex + 1) % 4 === 0) dataIndex++;
        if (dataIndex >= pixelData.length) return 0;
        const bit = pixelData[dataIndex] & 1;
        dataIndex++;
        return bit;
    };

    // Read 32-bit length header
    let lengthBinary = '';
    for (let i = 0; i < 32; i++) {
        lengthBinary += readBit().toString();
    }
    const totalBits = parseInt(lengthBinary, 2);

    if (isNaN(totalBits) || totalBits <= 0 || totalBits > pixelData.length * 3) {
        throw new Error("No hidden message found or invalid format.");
    }

    const totalBytes = Math.ceil(totalBits / 8);
    const payload = new Uint8Array(totalBytes);

    for (let byteIdx = 0; byteIdx < totalBytes; byteIdx++) {
        let byte = 0;
        for (let bitIdx = 7; bitIdx >= 0; bitIdx--) {
            byte |= readBit() << bitIdx;
        }
        payload[byteIdx] = byte;
    }

    return payload;
}

// --- Image Helpers ---

function loadImageToCanvas(image) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            resolve({ canvas, ctx });
        };

        img.onerror = () => reject(new Error('Failed to load image'));

        if (typeof image === 'string') {
            img.src = image;
        } else {
            img.src = URL.createObjectURL(image);
        }
    });
}

// --- Public API ---

// Magic bytes to identify encrypted vs plaintext payloads
const MAGIC_AES = new Uint8Array([0x47, 0x50, 0x41]); // "GPA" = Ghost Protocol AES

/**
 * Encode a message into an image using LSB steganography.
 * If password is provided, encrypts with AES-GCM + PBKDF2.
 * @param {File|string} image - Cover image (File object or data URL)
 * @param {string} message - Secret message
 * @param {string} password - Optional encryption password
 * @returns {Promise<string>} - Data URL of the encoded image (PNG)
 */
export const encodeMessage = async (image, message, password = '') => {
    const { canvas, ctx } = await loadImageToCanvas(image);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    let payload;

    if (password) {
        // AES-GCM encrypted
        const encrypted = await aesEncrypt(message, password);
        // Prepend magic bytes: [GPA(3)] [encrypted(...)]
        payload = new Uint8Array(MAGIC_AES.length + encrypted.length);
        payload.set(MAGIC_AES, 0);
        payload.set(encrypted, MAGIC_AES.length);
    } else {
        // Plaintext (UTF-8 encoded)
        const encoder = new TextEncoder();
        payload = encoder.encode(message);
    }

    embedBitsInPixels(imgData.data, payload);
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
};

/**
 * Decode a message from an image.
 * @param {File|string} image - Encoded image
 * @param {string} password - Password (required if message was encrypted)
 * @returns {Promise<string>} - Decoded message
 */
export const decodeMessage = async (image, password = '') => {
    const { canvas, ctx } = await loadImageToCanvas(image);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const payload = extractBitsFromPixels(imgData.data);

    // Check for AES magic bytes
    const hasAES = payload.length >= MAGIC_AES.length &&
        payload[0] === MAGIC_AES[0] &&
        payload[1] === MAGIC_AES[1] &&
        payload[2] === MAGIC_AES[2];

    if (hasAES) {
        if (!password) {
            throw new Error("🔒 This message is encrypted. Password required.");
        }
        const encrypted = payload.slice(MAGIC_AES.length);
        try {
            return await aesDecrypt(encrypted, password);
        } catch (_e) { // eslint-disable-line no-unused-vars
            throw new Error("❌ Incorrect password or corrupted data.");
        }
    } else {
        // Plaintext
        return new TextDecoder().decode(payload);
    }
};

/**
 * Get raw pixel data from an image (for steganalysis).
 * @param {File|string} image
 * @returns {Promise<{data: Uint8ClampedArray, width: number, height: number}>}
 */
export const getImageData = async (image) => {
    const { canvas, ctx } = await loadImageToCanvas(image);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { data: imgData.data, width: canvas.width, height: canvas.height };
};
