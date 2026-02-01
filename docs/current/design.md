# Twitch Clip Todo - Technical Design

## Architecture Overview

Based on quick-tabby's architecture, using layered design with dependency injection.

```
┌─────────────────────────────────────────────────────────────────┐
│  Chrome Extension (Manifest V3)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │  Content Script │◄──►│  Service Worker │                    │
│  │  (twitch.tv)    │    │  (Background)   │                    │
│  └────────┬────────┘    └────────┬────────┘                    │
│           │                      │                              │
│           │                      ▼                              │
│           │             ┌─────────────────┐                    │
│           │             │  Popup          │                    │
│           │             │  (Solid.js)     │                    │
│           │             └────────┬────────┘                    │
│           │                      │                              │
│           ▼                      ▼                              │
│  ┌─────────────────────────────────────────┐                   │
│  │         chrome.storage.local            │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Structure

```
Presentation Layer (Popup, Content Script UI)
    ↓
Custom Hooks / Signals (State & Logic)
    ↓
Services Layer (Business Logic with DI)
    ↓
Core / Domain Layer (Pure Business Logic)
    ↓
Infrastructure Layer (Chrome API Abstraction)
```

---

## Directory Structure

```
/
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── panda.config.ts
├── postcss.config.cjs
│
├── /src
│   ├── /background              # Service Worker
│   │   └── index.ts             # Entry point, service initialization
│   │
│   ├── /content                 # Content Script
│   │   ├── index.ts             # Entry point (controller)
│   │   ├── record-handler.ts    # Record creation logic
│   │   ├── page-handler.ts      # Page change handling
│   │   ├── detector.ts          # Page type detection
│   │   ├── messaging.ts         # Background messaging utils
│   │   ├── player.ts            # Player interaction
│   │   └── /ui                  # Content Script UI
│   │       ├── shadow-dom.ts    # Shadow DOM factory
│   │       ├── record-button.ts
│   │       ├── chat-button.ts
│   │       ├── floating-widget.ts
│   │       ├── memo-input.ts
│   │       └── toast.ts
│   │
│   ├── /popup                   # Popup UI
│   │   ├── index.html           # Entry point
│   │   ├── main.tsx             # Solid.js render
│   │   ├── index.tsx            # App component
│   │   ├── index.css
│   │   ├── /components
│   │   │   ├── RecordList.tsx
│   │   │   ├── RecordItem.tsx
│   │   │   ├── StreamerGroup.tsx
│   │   │   └── Header.tsx
│   │   └── /hooks
│   │       ├── useRecords.ts
│   │       └── useCurrentTab.ts
│   │
│   ├── /services                # Business logic layer
│   │   ├── index.ts             # Barrel exports
│   │   ├── record.service.ts    # Record CRUD
│   │   ├── linking.service.ts   # VOD linking
│   │   ├── cleanup.service.ts   # Cleanup logic
│   │   ├── twitch.service.ts    # Twitch API wrapper
│   │   ├── twitch-mappers.ts    # API response mappers
│   │   ├── cache.service.ts     # Memory/persistent caching
│   │   └── *.test.ts            # Colocated tests
│   │
│   ├── /core                    # Domain logic layer
│   │   ├── /record              # Record domain
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   ├── /twitch              # Twitch domain
│   │   │   ├── page-detector.ts
│   │   │   ├── timestamp-parser.ts
│   │   │   ├── vod-matcher.ts
│   │   │   └── clip-url.ts
│   │   └── /settings
│   │       ├── types.ts
│   │       └── defaults.ts
│   │
│   ├── /infrastructure          # Chrome API abstraction
│   │   ├── /chrome
│   │   │   ├── index.ts         # createChromeAPI factory
│   │   │   ├── storage.ts
│   │   │   ├── runtime.ts
│   │   │   ├── tabs.ts
│   │   │   ├── commands.ts
│   │   │   └── types.ts
│   │   ├── /twitch-api          # Twitch API client
│   │   │   ├── index.ts         # Barrel exports
│   │   │   ├── auth.ts          # Device auth flow
│   │   │   ├── client.ts        # HTTP client
│   │   │   ├── types.ts         # API response types
│   │   │   └── /endpoints       # API endpoint wrappers
│   │   │       ├── users.ts
│   │   │       ├── videos.ts
│   │   │       └── streams.ts
│   │   └── /test-doubles        # Test mocks
│   │
│   └── /shared                  # Shared modules
│       ├── /ui                  # Shared UI components
│       │   ├── /button
│       │   │   ├── button.tsx
│       │   │   ├── button.recipe.ts
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── types.ts             # Shared types, message types
│       └── constants.ts
│
└── /styled-system               # Panda CSS generated output
    ├── /css
    ├── /jsx
    ├── /patterns
    ├── /tokens
    └── /types
```

---

## Component Design

### 1. Content Script

**Responsibilities:**
- Detect Twitch page type (live/VOD/channel)
- Extract timestamps from player
- Inject record button
- Display pending records indicator
- Extract VOD metadata

**UI Implementation:**
- Vanilla TypeScript for DOM manipulation
- Static styles from Panda CSS

### 2. Service Worker

**Responsibilities:**
- Record CRUD operations
- Keyboard shortcut handling
- VOD auto-linking logic
- Scheduled cleanup
- Port communication with Popup

**Service Initialization (DI Pattern):**

```typescript
// src/background/index.ts
import { createChromeAPI } from '../infrastructure/chrome';
import { createRecordService } from '../services/record.service';
import { createLinkingService } from '../services/linking.service';
import { createCleanupService } from '../services/cleanup.service';

const chromeAPI = createChromeAPI();

const recordService = createRecordService({
  storage: chromeAPI.storage,
});

const linkingService = createLinkingService({
  storage: chromeAPI.storage,
  recordService,
});

const cleanupService = createCleanupService({
  storage: chromeAPI.storage,
  recordService,
  alarms: chromeAPI.alarms,
});
```

### 3. Popup

**Responsibilities:**
- Display record list grouped by streamer
- Edit and delete records
- Navigate to clip creation page

**Stack:**
- Solid.js (reactive UI)
- Panda CSS (recipes pattern)

---

## Data Structures

### Record

```typescript
// src/core/record/types.ts
interface Record {
  id: string;                    // UUID
  streamerId: string;            // Streamer ID (from URL)
  streamerName: string;          // Streamer display name
  timestampSeconds: number;      // Timestamp in seconds
  memo: string;                  // Memo (can be empty)
  sourceType: 'live' | 'vod';    // Recording source
  vodId: string | null;          // VOD ID (set after linking)
  recordedAt: string;            // Recording time (ISO 8601)
  completedAt: string | null;    // Completion time (ISO 8601)
  createdAt: string;             // Created at (ISO 8601)
  updatedAt: string;             // Updated at (ISO 8601)
}
```

### RecordStore

```typescript
interface RecordStore {
  version: number;               // Schema version
  records: Record[];             // All records
}
```

### Settings

```typescript
// src/core/settings/types.ts
interface Settings {
  cleanupDays: number;           // Cleanup threshold (default: 60)
}

// src/core/settings/defaults.ts
export const DEFAULT_SETTINGS: Settings = {
  cleanupDays: 60,
};
```

---

## Message Types

```typescript
// src/shared/types.ts

// Content Script / Popup → Service Worker
export type MessageToBackground =
  | { type: 'CREATE_RECORD'; payload: CreateRecordPayload }
  | { type: 'UPDATE_MEMO'; payload: { id: string; memo: string } }
  | { type: 'MARK_COMPLETED'; payload: { id: string } }
  | { type: 'DELETE_RECORD'; payload: { id: string } }
  | { type: 'GET_RECORDS'; payload: { streamerId?: string } }
  | { type: 'LINK_VOD'; payload: LinkVodPayload }
  | { type: 'GET_PENDING_COUNT'; payload: { streamerId: string } };

export interface CreateRecordPayload {
  streamerId: string;
  streamerName: string;
  timestampSeconds: number;
  sourceType: 'live' | 'vod';
  vodId: string | null;
}

export interface LinkVodPayload {
  streamerId: string;
  vodId: string;
  vodStartedAt: string;
}

// Service Worker → Content Script / Popup (response)
export type MessageResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

---

## Service Layer Design

### RecordService

```typescript
// src/services/record.service.ts

export interface RecordServiceDeps {
  storage: ChromeStorageAPI;
}

export interface RecordService {
  create(payload: CreateRecordPayload): Promise<Record>;
  getAll(): Promise<Record[]>;
  getByStreamerId(streamerId: string): Promise<Record[]>;
  updateMemo(id: string, memo: string): Promise<Record>;
  markCompleted(id: string): Promise<Record>;
  delete(id: string): Promise<void>;
  getPendingCount(streamerId: string): Promise<number>;
}

export function createRecordService(deps: RecordServiceDeps): RecordService {
  const { storage } = deps;

  return {
    async create(payload) {
      const record: Record = {
        id: crypto.randomUUID(),
        ...payload,
        memo: '',
        recordedAt: new Date().toISOString(),
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // Save to storage
      return record;
    },
    // ...
  };
}
```

### LinkingService

```typescript
// src/services/linking.service.ts

export interface LinkingServiceDeps {
  storage: ChromeStorageAPI;
  recordService: RecordService;
}

export interface LinkingService {
  linkVod(payload: LinkVodPayload): Promise<Record[]>;
}

export function createLinkingService(deps: LinkingServiceDeps): LinkingService {
  const { recordService } = deps;

  return {
    async linkVod(payload) {
      const records = await recordService.getByStreamerId(payload.streamerId);
      const unlinked = records.filter(r => r.sourceType === 'live' && !r.vodId);
      // Matching logic & linking
      return linkedRecords;
    },
  };
}
```

---

## Core Domain Logic

### Page Detection

```typescript
// src/core/twitch/page-detector.ts

export interface PageInfo {
  type: 'live' | 'vod' | 'channel' | 'other';
  streamerId: string | null;
  vodId: string | null;
}

export function detectPage(url: string): PageInfo {
  const vodMatch = url.match(/twitch\.tv\/videos\/(\d+)/);
  if (vodMatch) {
    return { type: 'vod', streamerId: null, vodId: vodMatch[1] };
  }

  const channelMatch = url.match(/twitch\.tv\/([^/]+)\/videos/);
  if (channelMatch) {
    return { type: 'channel', streamerId: channelMatch[1], vodId: null };
  }

  const liveMatch = url.match(/twitch\.tv\/([^/]+)$/);
  if (liveMatch && !['directory', 'settings', 'search'].includes(liveMatch[1])) {
    return { type: 'live', streamerId: liveMatch[1], vodId: null };
  }

  return { type: 'other', streamerId: null, vodId: null };
}
```

### Timestamp Parser

```typescript
// src/core/twitch/timestamp-parser.ts

export function parseTimeString(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parts[0] * 60 + parts[1];
}

export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}
```

### VOD Matcher

```typescript
// src/core/twitch/vod-matcher.ts

export interface VodInfo {
  vodId: string;
  streamerId: string;
  startedAt: Date;
  duration: number; // seconds
}

export function matchRecordToVod(record: Record, vod: VodInfo): boolean {
  if (record.streamerId !== vod.streamerId) return false;
  if (record.sourceType !== 'live') return false;
  if (record.vodId !== null) return false;

  const recordedAt = new Date(record.recordedAt);
  const vodEndedAt = new Date(vod.startedAt.getTime() + vod.duration * 1000);

  return recordedAt >= vod.startedAt && recordedAt <= vodEndedAt;
}
```

### Clip URL Builder

```typescript
// src/core/twitch/clip-url.ts

export interface ClipUrlParams {
  broadcasterLogin: string;  // streamer username
  vodId: string;
  offsetSeconds: number;
}

export function buildClipCreationUrl(params: ClipUrlParams): string {
  const url = new URL('https://clips.twitch.tv/create');
  url.searchParams.set('broadcasterLogin', params.broadcasterLogin);
  url.searchParams.set('vodID', params.vodId);
  url.searchParams.set('offsetSeconds', String(params.offsetSeconds));
  return url.toString();
}

// Example output:
// https://clips.twitch.tv/create?broadcasterLogin=kashiwo&vodID=2672381095&offsetSeconds=3062
```

---

## Infrastructure Layer

### Chrome API Abstraction

```typescript
// src/infrastructure/chrome/index.ts

import { createStorageAPI } from './storage';
import { createRuntimeAPI } from './runtime';
import { createTabsAPI } from './tabs';
import { createCommandsAPI } from './commands';
import { createAlarmsAPI } from './alarms';

export function createChromeAPI() {
  return {
    storage: createStorageAPI(),
    runtime: createRuntimeAPI(),
    tabs: createTabsAPI(),
    commands: createCommandsAPI(),
    alarms: createAlarmsAPI(),
  };
}

export type ChromeAPI = ReturnType<typeof createChromeAPI>;
```

```typescript
// src/infrastructure/chrome/storage.ts

export interface ChromeStorageAPI {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export function createStorageAPI(): ChromeStorageAPI {
  return {
    async get<T>(key: string): Promise<T | null> {
      const result = await chrome.storage.local.get(key);
      return result[key] ?? null;
    },
    async set<T>(key: string, value: T): Promise<void> {
      await chrome.storage.local.set({ [key]: value });
    },
    async remove(key: string): Promise<void> {
      await chrome.storage.local.remove(key);
    },
  };
}
```

---

## Panda CSS Configuration

```typescript
// panda.config.ts
import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  preflight: true,
  include: ['./src/**/*.{js,jsx,ts,tsx}'],
  exclude: [],
  outdir: 'styled-system',
  jsxFramework: 'solid',

  theme: {
    extend: {
      tokens: {
        colors: {
          primary: { value: '#9147ff' },  // Twitch purple
          success: { value: '#00c853' },
          warning: { value: '#ff9800' },
          error: { value: '#f44336' },
        },
        spacing: {
          xs: { value: '4px' },
          sm: { value: '8px' },
          md: { value: '16px' },
          lg: { value: '24px' },
          xl: { value: '32px' },
        },
      },
      semanticTokens: {
        colors: {
          bg: {
            DEFAULT: { value: { base: '#ffffff', _dark: '#18181b' } },
            surface: { value: { base: '#f7f7f8', _dark: '#1f1f23' } },
          },
          text: {
            DEFAULT: { value: { base: '#0e0e10', _dark: '#efeff1' } },
            muted: { value: { base: '#53535f', _dark: '#adadb8' } },
          },
        },
      },
    },
  },
});
```

---

## Communication Flows

### Record Creation Flow

```
User Action (Shortcut / Button Click)
         │
         ▼
┌─────────────────┐
│  Content Script │
│  1. Get timestamp       │
│  2. Get page info       │
└────────┬────────┘
         │ chrome.runtime.sendMessage
         ▼
┌─────────────────┐
│  Service Worker │
│  1. RecordService.create │
│  2. Persist to storage   │
│  3. Return result        │
└────────┬────────┘
         │ response
         ▼
┌─────────────────┐
│  Content Script │
│  1. Show memo input     │
│  2. Show toast          │
└─────────────────┘
```

### VOD Linking Flow

```
User navigates to VOD page
         │
         ▼
┌─────────────────┐
│  Content Script │
│  1. detectPage()        │
│  2. Extract VOD info    │
└────────┬────────┘
         │ chrome.runtime.sendMessage({ type: 'LINK_VOD' })
         ▼
┌─────────────────┐
│  Service Worker │
│  1. LinkingService.linkVod  │
│  2. matchRecordToVod        │
│  3. Update records          │
└────────┬────────┘
         │ response (linked records)
         ▼
┌─────────────────┐
│  Content Script │
│  1. Toast "N records linked" │
└─────────────────┘
```

---

## Build Configuration

### Tech Stack

| Category | Technology |
|----------|------------|
| Build | Vite + @crxjs/vite-plugin |
| Language | TypeScript (strict) |
| UI (Popup) | Solid.js |
| Styling | Panda CSS |
| Testing | Vitest |
| Lint/Format | Biome |

### npm Scripts

```json
{
  "scripts": {
    "dev": "panda codegen && vite",
    "build": "panda codegen && vite build",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "format": "biome format --write .",
    "test": "vitest"
  }
}
```

---

## TwitchService Interface

The TwitchService provides Twitch API integration with caching:

```typescript
// src/services/twitch.service.ts

export interface TwitchService {
  isAuthenticated(): Promise<boolean>;
  startDeviceAuth(): Promise<DeviceCodeResponse>;
  pollForToken(deviceCode: string, interval: number): Promise<TwitchAuthToken>;
  cancelAuth(): void;
  logout(): Promise<void>;
  getStreamerInfo(login: string): Promise<StreamerInfo | null>;
  getVodMetadata(vodId: string): Promise<VodMetadata | null>;
  getCurrentStream(login: string): Promise<LiveStreamInfo | null>;
  getCurrentStreamCached(login: string): Promise<LiveStreamInfo | null>;
  invalidateStreamCache(login: string): Promise<void>;
  getRecentVodsByUserId(userId: string, limit?: number): Promise<VodMetadata[]>;
  findVodByStreamId(userId: string, streamId: string): Promise<VodMetadata | null>;
}
```

### Data Mappers

```typescript
// src/services/twitch-mappers.ts

export interface StreamerInfo {
  id: string;
  login: string;
  displayName: string;
  profileImageUrl: string | null;
}

export interface VodMetadata {
  vodId: string;
  streamerId: string;
  streamerName: string;
  title: string;
  startedAt: string;
  durationSeconds: number;
  streamId: string | null;
}

export interface LiveStreamInfo {
  streamId: string;
  userId: string;
  userLogin: string;
  userName: string;
  startedAt: string;
  title: string;
  gameName: string;
}
```

### Cache Service

```typescript
// src/services/cache.service.ts

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface CacheService<T> {
  get(key: string): Promise<T | null>;
  set(key: string, data: T, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
}

// Factory functions:
createMemoryCache<T>(): CacheService<T>
createPersistentCache<T>(deps, storageKey): CacheService<T>
createTieredCache<T>(memory, persistent): CacheService<T>
```

## Known Issues / Future Improvements

### Button Injection Fragility
- The "Clip Later" button injection relies on aria-label matching for only 4 languages ("Clip", "クリップ", "클립", "Clipe")
- Twitch UI changes can break detection at any time
- Possible improvements: more robust selector strategy, or MutationObserver-based generic detection

