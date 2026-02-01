import { logger } from "@/shared/logger";

export interface Provider<T> {
  readonly name: string;
  get(): Promise<T | null>;
}

export async function chainProviders<T>(providers: Provider<T>[]): Promise<T | null> {
  for (const provider of providers) {
    try {
      const result = await provider.get();
      if (result !== null) return result;
    } catch (error) {
      logger.debug(`Provider "${provider.name}" failed:`, error);
    }
  }
  return null;
}
