/**
 * Message keys for i18n.
 * These constants provide type safety and autocomplete for translation keys.
 * Each key corresponds to an entry in _locales/{locale}/messages.json
 */

export const MSG = {
  // Common
  COMMON_LOADING: "common_loading",
  COMMON_ERROR: "common_error",
  COMMON_CANCEL: "common_cancel",
  COMMON_SAVE: "common_save",

  // Popup - Header
  POPUP_DEFAULT_TITLE: "popup_defaultTitle",
  POPUP_WATCHING_STREAMER: "popup_watchingStreamer",
  POPUP_VOD_LABEL: "popup_vodLabel",
  POPUP_BADGE_LIVE: "popup_badgeLive",
  POPUP_BADGE_VOD: "popup_badgeVod",

  // Popup - Tabs
  POPUP_TAB_PENDING: "popup_tabPending",
  POPUP_TAB_COMPLETED: "popup_tabCompleted",

  // Popup - Empty State
  POPUP_EMPTY_TITLE: "popup_emptyTitle",
  POPUP_EMPTY_DESCRIPTION: "popup_emptyDescription",
  POPUP_EMPTY_COMPLETED_TITLE: "popup_emptyCompletedTitle",
  POPUP_EMPTY_COMPLETED_DESCRIPTION: "popup_emptyCompletedDescription",

  // Auth
  AUTH_DISCONNECT: "auth_disconnect",
  AUTH_ENTER_CODE: "auth_enterCode",
  AUTH_OPEN_LINK: "auth_openLink",
  AUTH_CONNECT_TWITCH: "auth_connectTwitch",

  // Record
  RECORD_DELETE_CONFIRM: "record_deleteConfirm",
  RECORD_CREATE_CLIP: "record_createClip",
  RECORD_CLIPPED: "record_clipped",
  RECORD_FIND_VOD: "record_findVod",
  RECORD_FIND_VODS: "record_findVods",
  RECORD_NO_BROADCAST_ID: "record_noBroadcastId",
  RECORD_SELECT_VOD: "record_selectVod",
  RECORD_NO_VODS_AVAILABLE: "record_noVodsAvailable",
  RECORD_DELETE_LABEL: "record_deleteLabel",
  RECORD_DELETE_ALL: "record_deleteAll",
  RECORD_DELETE_ALL_CONFIRM: "record_deleteAllConfirm",
  RECORD_DELETE_ALL_COMPLETED: "record_deleteAllCompleted",
  RECORD_DELETE_ALL_COMPLETED_CONFIRM: "record_deleteAllCompletedConfirm",
  RECORD_ADD_MEMO_PLACEHOLDER: "record_addMemoPlaceholder",
  RECORD_ENTER_MEMO_PLACEHOLDER: "record_enterMemoPlaceholder",

  // Widget
  WIDGET_PENDING_CLIPS_LABEL: "widget_pendingClipsLabel",
  WIDGET_DEFAULT_LABEL: "widget_defaultLabel",
  WIDGET_TOOLTIP: "widget_tooltip",
  WIDGET_ERROR_LABEL: "widget_errorLabel",
  WIDGET_ERROR_TOOLTIP: "widget_errorTooltip",

  // Memo Input
  MEMO_TITLE: "memo_title",
  MEMO_PLACEHOLDER: "memo_placeholder",
  MEMO_CANCELLING: "memo_cancelling",

  // Buttons
  BUTTON_CLIP_LATER_LABEL: "button_clipLaterLabel",
  BUTTON_RECORD_MOMENT_TITLE: "button_recordMomentTitle",
  BUTTON_CLIP_LATER: "button_clipLater",

  // Toasts
  TOAST_NOT_AVAILABLE: "toast_notAvailable",
  TOAST_NO_TIMESTAMP: "toast_noTimestamp",
  TOAST_NO_STREAMER_NAME: "toast_noStreamerName",
  TOAST_MOMENT_RECORDED: "toast_momentRecorded",
  TOAST_RECORDING_CANCELLED: "toast_recordingCancelled",
  TOAST_CANCEL_FAILED: "toast_cancelFailed",
  TOAST_RECORD_FAILED: "toast_recordFailed",
  TOAST_VOD_LINKED: "toast_vodLinked",
} as const;

export type MessageKey = (typeof MSG)[keyof typeof MSG];
