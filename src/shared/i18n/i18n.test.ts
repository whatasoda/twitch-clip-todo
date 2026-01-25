import { describe, expect, test } from "vitest";
import enMessages from "../../../_locales/en/messages.json";
import jaMessages from "../../../_locales/ja/messages.json";
import { MSG } from "./message-keys";

describe("i18n", () => {
  describe("message-keys consistency", () => {
    const allKeys = Object.values(MSG);

    test("all MSG keys exist in English messages", () => {
      const enKeys = Object.keys(enMessages);
      const missingKeys = allKeys.filter((key) => !enKeys.includes(key));
      expect(missingKeys).toEqual([]);
    });

    test("all MSG keys exist in Japanese messages", () => {
      const jaKeys = Object.keys(jaMessages);
      const missingKeys = allKeys.filter((key) => !jaKeys.includes(key));
      expect(missingKeys).toEqual([]);
    });
  });

  describe("translation file consistency", () => {
    test("English and Japanese have the same keys", () => {
      const enKeys = Object.keys(enMessages).sort();
      const jaKeys = Object.keys(jaMessages).sort();
      expect(enKeys).toEqual(jaKeys);
    });

    test("all messages have non-empty message property", () => {
      const emptyEnMessages = Object.entries(enMessages).filter(
        ([, value]) => !(value as { message: string }).message,
      );
      const emptyJaMessages = Object.entries(jaMessages).filter(
        ([, value]) => !(value as { message: string }).message,
      );
      expect(emptyEnMessages).toEqual([]);
      expect(emptyJaMessages).toEqual([]);
    });
  });

  describe("MSG constant completeness", () => {
    test("MSG includes all translation keys (except manifest-only keys)", () => {
      const msgValues = new Set<string>(Object.values(MSG));
      const enKeys = Object.keys(enMessages);
      const manifestOnlyKeys = ["extName", "extDescription", "manifest_commandRecordMoment"];
      const uiKeys = enKeys.filter((key) => !manifestOnlyKeys.includes(key));
      const missingInMSG = uiKeys.filter((key) => !msgValues.has(key));
      expect(missingInMSG).toEqual([]);
    });
  });
});
