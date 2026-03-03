import CryptoJS from 'crypto-js';

// Simple AES Encryption
export const encryptMessage = (message, secretKey) => {
    return CryptoJS.AES.encrypt(message, secretKey).toString();
};

// Simple AES Decryption
export const decryptMessage = (ciphertext, secretKey) => {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText;
    } catch (_error) { // eslint-disable-line no-unused-vars
        return null; // Failed to decrypt (wrong key or bad data)
    }
};
