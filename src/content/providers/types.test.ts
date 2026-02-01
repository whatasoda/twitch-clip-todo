import { describe, expect, it, vi } from "vitest";
import { chainProviders, type Provider } from "./types";

describe("chainProviders", () => {
  it("returns result from first successful provider", async () => {
    const provider1: Provider<string> = {
      name: "provider1",
      get: async () => "result1",
    };
    const provider2: Provider<string> = {
      name: "provider2",
      get: async () => "result2",
    };

    const result = await chainProviders([provider1, provider2]);
    expect(result).toBe("result1");
  });

  it("falls back to next provider when first returns null", async () => {
    const provider1: Provider<string> = {
      name: "provider1",
      get: async () => null,
    };
    const provider2: Provider<string> = {
      name: "provider2",
      get: async () => "result2",
    };

    const result = await chainProviders([provider1, provider2]);
    expect(result).toBe("result2");
  });

  it("falls back to next provider when first throws", async () => {
    const provider1: Provider<string> = {
      name: "provider1",
      get: async () => {
        throw new Error("Provider 1 failed");
      },
    };
    const provider2: Provider<string> = {
      name: "provider2",
      get: async () => "result2",
    };

    const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const result = await chainProviders([provider1, provider2]);

    expect(result).toBe("result2");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[Twitch Clip Todo]",
      expect.stringContaining('Provider "provider1" failed'),
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("returns null when all providers return null", async () => {
    const provider1: Provider<string> = {
      name: "provider1",
      get: async () => null,
    };
    const provider2: Provider<string> = {
      name: "provider2",
      get: async () => null,
    };

    const result = await chainProviders([provider1, provider2]);
    expect(result).toBeNull();
  });

  it("returns null when all providers throw", async () => {
    const provider1: Provider<string> = {
      name: "provider1",
      get: async () => {
        throw new Error("Error 1");
      },
    };
    const provider2: Provider<string> = {
      name: "provider2",
      get: async () => {
        throw new Error("Error 2");
      },
    };

    vi.spyOn(console, "debug").mockImplementation(() => {});
    const result = await chainProviders([provider1, provider2]);
    expect(result).toBeNull();
  });

  it("returns null for empty providers array", async () => {
    const result = await chainProviders([]);
    expect(result).toBeNull();
  });

  it("stops at first non-null result", async () => {
    const provider1 = {
      name: "provider1",
      get: vi.fn().mockResolvedValue(null),
    };
    const provider2 = {
      name: "provider2",
      get: vi.fn().mockResolvedValue("result"),
    };
    const provider3 = {
      name: "provider3",
      get: vi.fn().mockResolvedValue("should not be called"),
    };

    await chainProviders([provider1, provider2, provider3]);

    expect(provider1.get).toHaveBeenCalledOnce();
    expect(provider2.get).toHaveBeenCalledOnce();
    expect(provider3.get).not.toHaveBeenCalled();
  });
});
