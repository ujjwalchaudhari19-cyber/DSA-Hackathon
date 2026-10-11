/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          50: "hsl(var(--primary-50) / <alpha-value>)",
          100: "hsl(var(--primary-100) / <alpha-value>)",
          600: "hsl(var(--primary-600) / <alpha-value>)",
          700: "hsl(var(--primary-700) / <alpha-value>)",
          800: "hsl(var(--primary-800) / <alpha-value>)",
          900: "hsl(var(--primary-900) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        earth: {
          50: "hsl(var(--earth-50) / <alpha-value>)",
          100: "hsl(var(--earth-100) / <alpha-value>)",
          200: "hsl(var(--earth-200) / <alpha-value>)",
          300: "hsl(var(--earth-300) / <alpha-value>)",
          400: "hsl(var(--earth-400) / <alpha-value>)",
          500: "hsl(var(--earth-500) / <alpha-value>)",
          600: "hsl(var(--earth-600) / <alpha-value>)",
          700: "hsl(var(--earth-700) / <alpha-value>)",
          800: "hsl(var(--earth-800) / <alpha-value>)",
          900: "hsl(var(--earth-900) / <alpha-value>)",
        },
        amber: {
          50: "hsl(var(--amber-50) / <alpha-value>)",
          100: "hsl(var(--amber-100) / <alpha-value>)",
          200: "hsl(var(--amber-200) / <alpha-value>)",
          300: "hsl(var(--amber-300) / <alpha-value>)",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "hsl(var(--amber-800) / <alpha-value>)",
          900: "hsl(var(--amber-900) / <alpha-value>)",
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
