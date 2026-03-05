# Invisible Chat (Standalone)

A secure steganography messaging tool extracted from the Retro OS project.

## Features
- **Steganography (LSB)**: Hide text messages inside images.
- **Encryption**: Optional password protection.
- **Local Processing**: All processing happens in your browser. No data leaves your machine.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev:all
   ```

## Usage
- Open `http://localhost:5173` (or the port shown in your terminal).
- Use **ENCRYPT** to hide a message in an image.
- Use **DECRYPT** to reveal a message from an image.
