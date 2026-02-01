import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TwitchApiClient } from "../client";
import type { TwitchApiResponse, TwitchUser } from "../types";
import { createUsersEndpoint } from "./users";

function createMockClient() {
  return {
    get: vi.fn(),
    isAuthenticated: vi.fn(),
    getRateLimitInfo: vi.fn(),
  } as unknown as TwitchApiClient & { get: ReturnType<typeof vi.fn> };
}

function makeResponse<T>(data: T[]): TwitchApiResponse<T> {
  return { data };
}

const sampleUser: TwitchUser = {
  id: "123",
  login: "testuser",
  display_name: "TestUser",
  type: "",
  broadcaster_type: "",
  description: "",
  profile_image_url: "https://example.com/avatar.jpg",
  offline_image_url: "",
  created_at: "2020-01-01T00:00:00Z",
};

describe("createUsersEndpoint", () => {
  let client: ReturnType<typeof createMockClient>;
  let users: ReturnType<typeof createUsersEndpoint>;

  beforeEach(() => {
    client = createMockClient();
    users = createUsersEndpoint(client);
  });

  it("getByLogin calls /users with login param", async () => {
    client.get.mockResolvedValue(makeResponse([sampleUser]));

    const result = await users.getByLogin("testuser");
    expect(result).toEqual(sampleUser);
    expect(client.get).toHaveBeenCalledWith("/users", { login: "testuser" });
  });

  it("getByLogin returns null when no data", async () => {
    client.get.mockResolvedValue(makeResponse([]));

    const result = await users.getByLogin("nobody");
    expect(result).toBeNull();
  });

  it("getByLogins returns empty for empty array", async () => {
    const result = await users.getByLogins([]);
    expect(result).toEqual([]);
    expect(client.get).not.toHaveBeenCalled();
  });

  it("getByLogins passes joined logins", async () => {
    client.get.mockResolvedValue(makeResponse([sampleUser]));

    await users.getByLogins(["user1", "user2"]);
    expect(client.get).toHaveBeenCalledWith("/users", { login: "user1&login=user2" });
  });

  it("getById calls /users with id param", async () => {
    client.get.mockResolvedValue(makeResponse([sampleUser]));

    const result = await users.getById("123");
    expect(result).toEqual(sampleUser);
    expect(client.get).toHaveBeenCalledWith("/users", { id: "123" });
  });

  it("getByIds returns empty for empty array", async () => {
    const result = await users.getByIds([]);
    expect(result).toEqual([]);
    expect(client.get).not.toHaveBeenCalled();
  });
});
