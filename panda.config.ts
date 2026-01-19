import { defineConfig } from "@pandacss/dev";
import { createPreset } from "@park-ui/panda-preset";
import iris from "@park-ui/panda-preset/colors/iris";
import neutral from "@park-ui/panda-preset/colors/neutral";

export default defineConfig({
  preflight: true,
  include: ["./src/**/*.{js,jsx,ts,tsx}"],
  exclude: [],
  outdir: "styled-system",
  jsxFramework: "solid",

  presets: [
    "@pandacss/preset-base",
    createPreset({
      accentColor: iris,
      grayColor: neutral,
      radius: "sm",
    }),
  ],

  theme: {
    extend: {
      tokens: {
        colors: {
          twitch: { value: "#9147ff" },
          twitchHover: { value: "#772ce8" },
        },
      },
    },
  },

  plugins: [
    {
      name: "Remove Panda Preset Colors",
      hooks: {
        "preset:resolved": ({ utils, preset, name }) =>
          name === "@pandacss/preset-panda"
            ? utils.omit(preset, ["theme.tokens.colors", "theme.semanticTokens.colors"])
            : preset,
      },
    },
  ],
});
