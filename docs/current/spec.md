# Twitch Clip Todo - Requirements Specification

## Overview

A Chrome extension for bookmarking moments during Twitch streams to create clips later.

Users can capture interesting moments with a single action without interrupting their viewing experience. After the stream ends, they can easily navigate from their bookmarks to create clips using Twitch's official clip creation interface.

### Key Features

- No authentication required
- Works with both live streams and VODs
- Quick recording via keyboard shortcut or button
- Popup for managing records
- Automatic VOD linking for live stream recordings (no API needed)
- Automatic cleanup after 60 days

---

## Requirements

### 1. Timestamp Recording

**User Story:** As a viewer watching a live stream or VOD, I want to bookmark moments with a single action so I can remember which moments to clip later.

**Acceptance Criteria:**

1.1. When the user presses the keyboard shortcut, the system shall record the current playback position as a timestamp.

1.2. When the user clicks the record button, the system shall record the current playback position as a timestamp.

1.3. When a timestamp is recorded, the system shall display a memo input field with focus already set.

1.4. The system shall allow saving records with an empty memo.

1.5. While watching a live stream, the system shall record the elapsed time from stream start as the timestamp.

1.6. While watching a VOD, the system shall record the playback position along with the VOD ID.

1.7. The system shall persist the following data for each record:
   - Timestamp (in seconds)
   - Memo (optional)
   - Streamer name
   - Source type (live or VOD)
   - VOD ID (for VOD recordings)
   - Recording timestamp

---

### 2. Record List

**User Story:** As a viewer after watching, I want to see a list of my recorded moments so I can decide which ones to clip.

**Acceptance Criteria:**

2.1. The system shall display records in the Popup.

2.2. The system shall group records by streamer.

2.3. The system shall display the following for each record:
   - Timestamp (hh:mm:ss format)
   - Memo
   - Recording time
   - VOD linking status
   - Completion status

2.4. The system shall visually distinguish completed records.

2.5. The system shall allow editing record memos.

2.6. The system shall allow manual deletion of records.

---

### 3. Clip Creation Navigation

**User Story:** As a user ready to create a clip, I want to quickly navigate from a record to Twitch's clip creation page so I can create clips using the official interface.

**Acceptance Criteria:**

3.1. When the user initiates clip creation from a VOD-linked record, the system shall open the Twitch clip creation page (`clips.twitch.tv/create`) with the correct parameters in a new tab.

3.2. When the clip creation page opens, the system shall mark that record as completed.

3.3. If a record has no VOD link, the system shall disable clip creation and indicate that linking is required.

---

### 4. Automatic VOD Linking

**User Story:** As a user who bookmarked moments during a live stream, I want my recordings to automatically link to the VOD after the stream ends so I don't have to link them manually.

**Acceptance Criteria:**

4.1. When the user opens a streamer's VOD page, the system shall extract the VOD metadata.

4.2. When VOD metadata is available, the system shall attempt to match unlinked live recordings.

4.3. When a live recording's streamer and timestamp fall within a VOD's timeframe, the system shall automatically link them.

4.4. The system shall convert live timestamps to VOD playback positions during linking.

4.5. When linking completes, the system shall show a brief on-page notification.

---

### 5. Data Management

**User Story:** As a long-term user, I want old data to be cleaned up automatically so storage doesn't grow unbounded.

**Acceptance Criteria:**

5.1. The system shall persist records in chrome.storage.local.

5.2. The system shall automatically delete records older than 60 days.

5.3. The system shall include completed records in cleanup.

5.4. When the extension initializes, the system shall run cleanup.

---

### 6. Twitch Page Detection

**User Story:** As a user, I want the extension to only activate on Twitch so it doesn't interfere with other sites.

**Acceptance Criteria:**

6.1. The system shall only inject Content Scripts on twitch.tv.

6.2. The system shall distinguish between live stream and VOD pages.

6.3. When a non-Twitch tab is active, the system shall disable recording.

6.4. The system shall extract streamer names and VOD IDs from URL patterns.

---

### 7. User Interface

**User Story:** As a viewer, I want a minimal UI that doesn't disrupt my viewing experience.

**Acceptance Criteria:**

7.1. The system shall display a record button on Twitch pages.

7.2. The system shall position the button to avoid obstructing Twitch's native UI.

7.3. When recording succeeds, the system shall provide visual feedback.

7.4. The system shall allow customizing the keyboard shortcut.

7.5. The system shall display current stream/VOD info in the Popup header.

7.6. When the user visits a streamer's channel with pending records, the system shall display an indicator on the page.

7.7. The system shall show the pending record count on the indicator.

7.8. When the user clicks the indicator, the system shall open the Popup.

---

## Technical Constraints

- Chrome Manifest V3 compliant
- Popup API (chrome.action.openPopup) requires Chrome 127+
- No Twitch API dependency (architecture supports future integration)
- Timestamps extracted via DOM queries

---

## Out of Scope

- One-click clip creation via Twitch API
- Data export (JSON/CSV)
- Cross-device sync
- Non-Chrome browser support
