import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  preflight: true,
  include: ["./src/**/*.{js,jsx,ts,tsx}"],
  exclude: [],
  outdir: "styled-system",
  jsxFramework: "solid",

  theme: {
    extend: {
      tokens: {
        colors: {
          primary: { value: "#9147ff" }, // Twitch purple
          primaryHover: { value: "#772ce8" },
          success: { value: "#00c853" },
          warning: { value: "#ff9800" },
          error: { value: "#f44336" },
        },
        spacing: {
          xs: { value: "4px" },
          sm: { value: "8px" },
          md: { value: "16px" },
          lg: { value: "24px" },
          xl: { value: "32px" },
        },
        radii: {
          sm: { value: "4px" },
          md: { value: "8px" },
          lg: { value: "12px" },
          full: { value: "9999px" },
        },
        fontSizes: {
          xs: { value: "10px" },
          sm: { value: "12px" },
          md: { value: "14px" },
          lg: { value: "16px" },
          xl: { value: "20px" },
        },
      },
      semanticTokens: {
        colors: {
          bg: {
            DEFAULT: { value: { base: "#ffffff", _dark: "#18181b" } },
            surface: { value: { base: "#f7f7f8", _dark: "#1f1f23" } },
          },
          text: {
            DEFAULT: { value: { base: "#0e0e10", _dark: "#efeff1" } },
            muted: { value: { base: "#53535f", _dark: "#adadb8" } },
          },
          border: {
            DEFAULT: { value: { base: "#e5e5e5", _dark: "#3d3d3d" } },
          },
        },
      },
    },
  },

  conditions: {
    dark: '[data-theme="dark"] &',
  },
});
