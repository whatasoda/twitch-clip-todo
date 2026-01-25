# Twitch Clip Todo

Chrome extension for bookmarking moments during Twitch streams to create clips later.

## Tech Stack

- **Build**: Vite + @crxjs/vite-plugin
- **Language**: TypeScript (strict)
- **UI**: Solid.js (Popup only)
- **Styling**: Panda CSS
- **Lint/Format**: Biome
- **Testing**: Vitest
- **Package Manager**: Bun

## Commands

```bash
bun run dev        # Start dev server
bun run build      # Production build
bun run typecheck  # Type checking
bun run lint       # Lint code
bun run format     # Format code
bun run test       # Run tests
```

## Architecture

Layered architecture with dependency injection (based on quick-tabby patterns):

```
Presentation (Popup, Content Script UI)
    ↓
Services (Business logic with DI)
    ↓
Core (Pure domain logic)
    ↓
Infrastructure (Chrome API abstraction)
```

## Directory Structure

```
src/
├── background/      # Service Worker
├── content/         # Content Script (twitch.tv)
├── popup/           # Popup UI (Solid.js)
├── components/      # Shared UI components
├── services/        # Business logic layer
├── core/            # Domain logic
├── infrastructure/  # Chrome API wrappers
└── shared/          # Shared types and utilities
```

## Documentation

- Requirements: `docs/current/spec.md`
- Technical Design: `docs/current/design.md`

## Chrome Extension

- Manifest V3
- Permissions: tabs, storage, activeTab, alarms
- Content Script runs on twitch.tv only
