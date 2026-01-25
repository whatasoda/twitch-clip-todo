import { defineConfig } from "@pandacss/dev";

/**
 * Panda CSS configuration for Content Script.
 * Minimal setup without Park UI preset for lightweight Shadow DOM styles.
 */
export default defineConfig({
  preflight: false, // No CSS reset needed for Shadow DOM
  include: ["./src/content/**/*.ts"],
  exclude: [],
  outdir: "styled-system-content",

  presets: ["@pandacss/preset-base"],

  theme: {
    extend: {
      tokens: {
        colors: {
          // Twitch brand colors
          twitch: { value: "#9147ff" },
          twitchHover: { value: "#772ce8" },
          twitchBg: { value: "rgba(145, 71, 255, 0.85)" },
          twitchBgHover: { value: "rgba(145, 71, 255, 0.9)" },
          // Twitch UI colors
          twitchDark: { value: "#18181b" },
          twitchBorder: { value: "#3d3d3d" },
          twitchText: { value: "#efeff1" },
          twitchInput: { value: "#0e0e10" },
          // Status colors
          success: { value: "#00a67e" },
          error: { value: "#d9534f" },
        },
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "scale(0.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        fadeOut: {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideOut: {
          from: { opacity: "1", transform: "translateX(0)" },
          to: { opacity: "0", transform: "translateX(100%)" },
        },
      },
    },
  },
});
