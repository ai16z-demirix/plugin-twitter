import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";
import { TwitterAuth } from "../auth";

// Create a mock TwitterApi instance
const mockTwitterApiInstance = {
  v2: {
    me: mock()
  }
};

// Create a mock constructor function
const MockTwitterApi = mock(function() {
  return mockTwitterApiInstance;
});

// Mock the twitter-api-v2 module
mock.module("twitter-api-v2", () => {
  return {
    TwitterApi: MockTwitterApi
  };
});

// Import the module after mocking
import { TwitterApi } from "twitter-api-v2";

describe("TwitterAuth", () => {
  let auth: TwitterAuth;
  let mockTwitterApi: any;

  beforeEach(() => {
    // Reset mocks for each test
mockTwitterApiInstance.v2.me.mockReset();
MockTwitterApi.mockClear();

    mockTwitterApi = mockTwitterApiInstance;

    // This is not needed with Bun's mocking approach

    auth = new TwitterAuth(
      "test-api-key",
      "test-api-secret",
      "test-access-token",
      "test-access-secret",
    );
  });

  describe("constructor", () => {
    test("should initialize with API credentials", () => {
      expect(TwitterApi).toHaveBeenCalledWith({
        appKey: "test-api-key",
        appSecret: "test-api-secret",
        accessToken: "test-access-token",
        accessSecret: "test-access-secret",
      });
    });
  });

  describe("getV2Client", () => {
    test("should return the Twitter API v2 client", () => {
      const client = auth.getV2Client();
      expect(client).toBe(mockTwitterApi);
    });
  });

  describe("isLoggedIn", () => {
    test("should return true when authenticated", async () => {
      mockTwitterApi.v2.me.mockResolvedValue({
        data: {
          id: "123456",
          username: "testuser",
        },
      });

      const isLoggedIn = await auth.isLoggedIn();
      expect(isLoggedIn).toBe(true);
      expect(mockTwitterApi.v2.me).toHaveBeenCalled();
    });

    test("should return false when API call fails", async () => {
      mockTwitterApi.v2.me.mockRejectedValue(new Error("Unauthorized"));

      const isLoggedIn = await auth.isLoggedIn();
      expect(isLoggedIn).toBe(false);
    });

    test("should return false when no user data returned", async () => {
      mockTwitterApi.v2.me.mockResolvedValue({});

      const isLoggedIn = await auth.isLoggedIn();
      expect(isLoggedIn).toBe(false);
    });
  });

  describe("me", () => {
    test("should return user profile", async () => {
      const mockUserData = {
        data: {
          id: "123456",
          username: "testuser",
          name: "Test User",
          description: "Test bio",
          profile_image_url: "https://example.com/avatar.jpg",
          public_metrics: {
            followers_count: 100,
            following_count: 50,
          },
          verified: true,
          location: "Test City",
          created_at: "2020-01-01T00:00:00.000Z",
        },
      };

      mockTwitterApi.v2.me.mockResolvedValue(mockUserData);

      const profile = await auth.me();

      expect(mockTwitterApi.v2.me).toHaveBeenCalledWith({
        "user.fields": [
          "id",
          "name",
          "username",
          "description",
          "profile_image_url",
          "public_metrics",
          "verified",
          "location",
          "created_at",
        ],
      });

      expect(profile).toEqual({
        userId: "123456",
        username: "testuser",
        name: "Test User",
        biography: "Test bio",
        avatar: "https://example.com/avatar.jpg",
        followersCount: 100,
        followingCount: 50,
        isVerified: true,
        location: "Test City",
        joined: new Date("2020-01-01T00:00:00.000Z"),
      });
    });

    test("should cache profile after first fetch", async () => {
      const mockUserData = {
        data: {
          id: "123456",
          username: "testuser",
          name: "Test User",
        },
      };

      mockTwitterApi.v2.me.mockResolvedValue(mockUserData);

      // First call
      const profile1 = await auth.me();
      // Second call
      const profile2 = await auth.me();

      // Should only call API once
      expect(mockTwitterApi.v2.me).toHaveBeenCalledTimes(1);
      expect(profile1).toBe(profile2);
    });

    test("should handle missing optional fields", async () => {
      const mockUserData = {
        data: {
          id: "123456",
          username: "testuser",
          name: "Test User",
          // No optional fields
        },
      };

      mockTwitterApi.v2.me.mockResolvedValue(mockUserData);

      const profile = await auth.me();

      expect(profile).toEqual({
        userId: "123456",
        username: "testuser",
        name: "Test User",
        biography: undefined,
        avatar: undefined,
        followersCount: undefined,
        followingCount: undefined,
        isVerified: undefined,
        location: "",
        joined: undefined,
      });
    });

    test("should return undefined on error", async () => {
      mockTwitterApi.v2.me.mockRejectedValue(new Error("API Error"));

      const profile = await auth.me();

      expect(profile).toBeUndefined();
    });
  });

  describe("logout", () => {
    test("should clear credentials and profile", async () => {
      // First login and fetch profile
      mockTwitterApi.v2.me.mockResolvedValue({
        data: { id: "123456", username: "testuser" },
      });

      await auth.me();

      // Then logout
      await auth.logout();

      // Try to get client after logout
      expect(() => auth.getV2Client()).toThrow(
        "Twitter API client not initialized",
      );

      // isLoggedIn should return false
      const isLoggedIn = await auth.isLoggedIn();
      expect(isLoggedIn).toBe(false);
    });
  });

  describe("hasToken", () => {
    test("should return true when authenticated", () => {
      expect(auth.hasToken()).toBe(true);
    });

    test("should return false after logout", async () => {
      await auth.logout();
      expect(auth.hasToken()).toBe(false);
    });
  });
});
