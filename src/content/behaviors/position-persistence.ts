export interface EdgePosition {
  horizontal: "left" | "right";
  horizontalOffset: number;
  vertical: "top" | "bottom";
  verticalOffset: number;
}

export interface PositionPersistenceOptions {
  storageKey: string;
  elementSize: { width: number; height: number };
  defaultPosition?: { x: number; y: number };
}

export interface PositionPersistence {
  load(): { x: number; y: number };
  save(rect: DOMRect): void;
}

export function createPositionPersistence(
  options: PositionPersistenceOptions,
): PositionPersistence {
  const { storageKey, elementSize, defaultPosition } = options;

  return {
    load(): { x: number; y: number } {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const pos: EdgePosition = JSON.parse(saved);
          const vw = window.innerWidth;
          const vh = window.innerHeight;

          // Convert edge-based offset to absolute coordinates
          const x =
            pos.horizontal === "left"
              ? pos.horizontalOffset
              : vw - pos.horizontalOffset - elementSize.width;
          const y =
            pos.vertical === "top"
              ? pos.verticalOffset
              : vh - pos.verticalOffset - elementSize.height;

          return {
            x: Math.max(0, Math.min(x, vw - elementSize.width)),
            y: Math.max(0, Math.min(y, vh - elementSize.height)),
          };
        }
      } catch {
        // Ignore parse errors or old format
      }
      // Use default or fallback to top-right area
      return defaultPosition ?? { x: window.innerWidth - elementSize.width - 20, y: 100 };
    },

    save(rect: DOMRect): void {
      try {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Determine which edge is closer
        const pos: EdgePosition = {
          horizontal: rect.left < vw - rect.right ? "left" : "right",
          horizontalOffset: rect.left < vw - rect.right ? rect.left : vw - rect.right,
          vertical: rect.top < vh - rect.bottom ? "top" : "bottom",
          verticalOffset: rect.top < vh - rect.bottom ? rect.top : vh - rect.bottom,
        };

        localStorage.setItem(storageKey, JSON.stringify(pos));
      } catch {
        // Ignore storage errors
      }
    },
  };
}
