/**
 * Design Tokens for Rota Certa Pro Enterprise
 * Synchronized with src/styles.css Tailwind v4 theme
 */

export const tokens = {
  colors: {
    primary: "var(--primary)",
    primaryGlow: "var(--primary-glow)",
    background: "var(--background)",
    foreground: "var(--foreground)",
    card: "var(--card)",
    success: "var(--success)",
    warning: "var(--warning)",
    destructive: "var(--destructive)",
    info: "var(--info)",
    border: "var(--border)",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    "2xl": "32px",
    "3xl": "48px",
  },
  radius: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "18px",
    xl: "24px",
    "2xl": "32px",
    "3xl": "40px",
    full: "9999px",
  },
  shadows: {
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)",
    xl: "var(--shadow-xl)",
    premium: "var(--shadow-premium)",
  }
};

export type DesignTokens = typeof tokens;
