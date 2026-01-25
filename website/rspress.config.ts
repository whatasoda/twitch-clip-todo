import { defineConfig } from "rspress/config";

export default defineConfig({
  root: "docs",
  title: "Twitch Clip Todo",
  description: "Bookmark moments during Twitch streams to create clips later",
  lang: "en",
  // icon: "/logo.svg",  // Deferred
  // logo: { light: "/logo.svg", dark: "/logo.svg" },  // Deferred
  locales: [
    {
      lang: "en",
      label: "English",
      title: "Twitch Clip Todo",
      description: "Bookmark moments during Twitch streams to create clips later",
    },
    {
      lang: "ja",
      label: "日本語",
      title: "Twitch Clip Todo",
      description: "配信中の気になる瞬間をブックマークして後でクリップ作成",
    },
  ],
  themeConfig: {
    socialLinks: [
      {
        icon: "github",
        mode: "link",
        content: "https://github.com/whatasoda/twitch-clip-todo",
      },
    ],
    footer: {
      message:
        '<a href="/en/privacy">Privacy</a> | <a href="/en/terms">Terms</a> | <a href="/ja/privacy">プライバシー</a> | <a href="/ja/terms">利用規約</a>',
    },
    locales: [
      {
        lang: "en",
        label: "English",
        outlineTitle: "On this page",
        prevPageText: "Previous",
        nextPageText: "Next",
      },
      {
        lang: "ja",
        label: "日本語",
        outlineTitle: "目次",
        prevPageText: "前へ",
        nextPageText: "次へ",
      },
    ],
  },
});
