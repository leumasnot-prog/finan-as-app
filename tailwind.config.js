/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', "system-ui", "sans-serif"],
        display: ['"Bricolage Grotesque"', '"Instrument Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(0 0% 100%)" },
        p1: "hsl(var(--p1))",
        p2: "hsl(var(--p2))",
        ok: "hsl(var(--ok))",
        navy: "hsl(var(--navy))",
        warn: "hsl(var(--warn))",
        tint: { DEFAULT: "hsl(var(--tint))", foreground: "hsl(var(--tint-foreground))" },
      },
      borderRadius: { lg: "16px", md: "12px", sm: "8px" },
      boxShadow: { card: "var(--shadow-card)", pop: "var(--shadow-pop)", cta: "var(--shadow-cta)" },
      fontSize: {
        // escala tipográfica — ver docs/design-system.md
        eyebrow: ["12px", { lineHeight: "16px", letterSpacing: "0.08em", fontWeight: "700" }],
        caption: ["12px", { lineHeight: "16px" }],
        body: ["14px", { lineHeight: "20px" }],
        title: ["15px", { lineHeight: "20px", fontWeight: "600" }],
        heading: ["24px", { lineHeight: "28px", letterSpacing: "-0.02em", fontWeight: "700" }],
      },
    },
  },
  plugins: [],
};
