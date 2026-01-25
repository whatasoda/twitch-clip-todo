import { token } from "../../../styled-system-content/tokens";

// Outlined bookmark icon (shared between player and chat buttons)
export const BOOKMARK_ICON_OUTLINED = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5 3h10a1 1 0 0 1 1 1v14l-6-3.5-6 3.5V4a1 1 0 0 1 1-1z"/>
</svg>`;

// Inline styles for content script UI (Shadow DOM)
// Uses Panda CSS tokens for consistent color values
export const styles = {
  // Legacy button style (keeping for reference)
  button: {
    base: `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 4px;
      background: ${token("colors.twitch")};
      color: white;
      cursor: pointer;
      transition: background 0.2s;
      font-size: 16px;
    `,
    hover: `background: ${token("colors.twitchHover")};`,
    active: `transform: scale(0.95);`,
  },
  // Twitch-native player button style
  playerButton: {
    base: `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 30px;
      padding: 0 10px;
      border: none;
      border-radius: 15px;
      background: rgba(255, 255, 255, 0.15);
      color: white;
      cursor: pointer;
      transition: background 0.1s ease;
      font-size: 13px;
      font-weight: 600;
      gap: 5px;
      font-family: inherit;
    `,
    hover: `background: rgba(255, 255, 255, 0.25);`,
  },
  // Chat panel button style
  chatButton: {
    base: `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: none;
      border-radius: 15px;
      background: transparent;
      color: ${token("colors.twitchText")};
      cursor: pointer;
      transition: background 0.1s ease;
    `,
    hover: `background: rgba(255, 255, 255, 0.15);`,
  },
  memoInput: {
    backdrop: `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      background: transparent;
    `,
    container: `
      position: fixed;
      bottom: 80px;
      right: 20px;
      z-index: 10000;
      background: ${token("colors.twitchDark")};
      border: 1px solid ${token("colors.twitchBorder")};
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `,
    title: `
      color: ${token("colors.twitchText")};
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    `,
    input: `
      width: 320px;
      padding: 8px 12px;
      border: 1px solid ${token("colors.twitchBorder")};
      border-radius: 4px;
      background: ${token("colors.twitchInput")};
      color: ${token("colors.twitchText")};
      font-size: 14px;
      outline: none;
    `,
    buttonRow: `
      display: flex;
      gap: 8px;
      margin-top: 8px;
      justify-content: flex-end;
    `,
    saveButton: `
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      background: ${token("colors.twitch")};
      color: white;
      cursor: pointer;
      font-size: 12px;
    `,
    cancelButton: `
      padding: 6px 12px;
      border: 1px solid ${token("colors.twitchBorder")};
      border-radius: 4px;
      background: transparent;
      color: ${token("colors.twitchText")};
      cursor: pointer;
      font-size: 12px;
    `,
  },
  toast: {
    base: `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10001;
      padding: 12px 16px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: white;
      animation: slideIn 0.3s ease;
    `,
    success: `background: ${token("colors.success")};`,
    error: `background: ${token("colors.error")};`,
    info: `background: ${token("colors.twitch")};`,
  },
  indicator: {
    container: `
      position: fixed;
      bottom: 80px;
      left: 20px;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: ${token("colors.twitchDark")};
      border: 1px solid ${token("colors.twitch")};
      border-radius: 20px;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: transform 0.2s;
    `,
    badge: `
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 10px;
      background: ${token("colors.twitch")};
      color: white;
      font-size: 12px;
      font-weight: bold;
    `,
    text: `
      color: ${token("colors.twitchText")};
      font-size: 12px;
    `,
  },
};
