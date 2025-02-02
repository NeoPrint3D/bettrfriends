/** @type {import('tailwindcss').Config} */
import themer from "@tailus/themer";

module.exports = {
    content: [
        './src/**/*.{astro,tsx}',
        "./node_modules/@tailus/themer-**/dist/**/*.{js,ts}",
    ],
    
    plugins: [
        themer({
            palette: {
                extend: "oz",
                primary:"amber"
            },
            radius: "smoothest",
            background: "light",
            border: "light",
            padding: "large"
        })
    ],
};
