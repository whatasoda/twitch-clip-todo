export interface InjectionOptions {
  /** Function to find the target element in the DOM */
  findTarget: () => HTMLElement | null;
  /** Callback when target is found; return true if injection succeeded */
  onFound: (target: HTMLElement) => boolean;
  /** Callback for cleanup */
  onCleanup?: () => void;
  /** Retry timeout in milliseconds (default: 2000) */
  retryTimeoutMs?: number;
}

export interface ElementInjector {
  /** Start injection attempt with retry logic */
  inject: () => void;
  /** Clean up injection attempts and optionally remove injected elements */
  cleanup: () => void;
}

/**
 * Create an element injector with MutationObserver-based retry logic.
 *
 * The injector will:
 * 1. Immediately attempt injection
 * 2. If failed, set up a MutationObserver to retry on DOM changes
 * 3. Also set up a timeout as a backup retry mechanism
 */
export function createElementInjector(options: InjectionOptions): ElementInjector {
  const { findTarget, onFound, onCleanup, retryTimeoutMs = 2000 } = options;

  let observer: MutationObserver | null = null;
  let retryTimeoutId: number | null = null;
  let injected = false;

  function attemptInjection(): boolean {
    if (injected) return true;

    const target = findTarget();
    if (target && onFound(target)) {
      injected = true;
      cleanupRetry();
      return true;
    }
    return false;
  }

  function cleanupRetry(): void {
    if (retryTimeoutId !== null) {
      clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
    }
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function inject(): void {
    // Clean up any previous attempt
    cleanupRetry();
    injected = false;

    // Try immediate injection
    if (attemptInjection()) return;

    // Set up MutationObserver for retry
    observer = new MutationObserver(() => {
      attemptInjection();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Set up timeout as backup
    retryTimeoutId = window.setTimeout(() => {
      attemptInjection();
      cleanupRetry();
    }, retryTimeoutMs);
  }

  function cleanup(): void {
    cleanupRetry();
    injected = false;
    onCleanup?.();
  }

  return { inject, cleanup };
}
