/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(235, 30%, 6%)",
        card: "hsl(235, 25%, 11%)",
        popover: "hsl(235, 25%, 11%)",
        primary: {
          DEFAULT: "hsla(217, 73%, 69%, 1.00)",
          foreground: "hsl(0, 0%, 100%)"
        },
        secondary: {
          DEFAULT: "hsl(262, 83%, 58%)",
          foreground: "hsla(0, 57%, 58%, 1.00)"
        },
        muted: {
          DEFAULT: "hsl(235, 20%, 20%)",
          foreground: "hsl(215, 20%, 65%)"
        },
        accent: {
  DEFAULT: "hsla(231, 31%, 54%, 1)", 
  foreground: "hsl(0, 0%, 100%)"    
},

        destructive: {
          DEFAULT: "hsl(0, 84%, 60%)",
          foreground: "hsl(0, 0%, 100%)"
        },
        border: "hsl(235, 20%, 22%)",
        input: "hsl(235, 20%, 22%)",
        ring: "hsl(217, 91%, 60%)",
        foreground: "hsl(0, 0%, 100%)"
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem"
      },
      
      fontFamily: {
        heading: ['Manrope', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
}