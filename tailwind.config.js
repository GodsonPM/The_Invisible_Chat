/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'matrix-black': '#0D0208',
                'matrix-green': '#00FF41',
                'cyber-blue': '#008F11',
            },
            fontFamily: {
                mono: ['"Fira Code"', 'monospace'],
            }
        },
    },
    plugins: [],
}
