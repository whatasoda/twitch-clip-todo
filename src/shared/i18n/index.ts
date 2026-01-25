/**
 * Internationalization helper for Chrome extension.
 *
 * Uses Chrome's built-in i18n API with automatic fallback:
 * 1. Looks up message in current locale (e.g., ja)
 * 2. Falls back to default_locale (en) if not found
 * 3. Returns the key itself if message doesn't exist (for debugging)
 */

/**
 * Get a translated message by key.
 * @param key - The message key defined in _locales/{locale}/messages.json
 * @param substitutions - Optional substitution values for placeholders
 * @returns The translated message, or the key itself if not found
 */
export function t(key: string, substitutions?: string | string[]): string {
  const message = chrome.i18n.getMessage(key, substitutions);
  // Return key if message not found (helps identify missing translations)
  return message || key;
}

/**
 * Get the UI language of the browser.
 * @returns The browser's UI language code (e.g., "en", "ja")
 */
export function getUILanguage(): string {
  return chrome.i18n.getUILanguage();
}
