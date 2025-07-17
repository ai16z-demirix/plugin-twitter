import { describe, test, expect, mock, beforeEach, spyOn } from "bun:test";
import { TwitterPostService } from "../PostService";
import type { ClientBase } from "../../base";
import { SearchMode } from "../../client";

// @elizaos/core is mocked in the test-setup.ts preload file

describe("TwitterPostService", () => {
  let service: TwitterPostService;
  let mockClient: any;

  beforeEach(() => {
    // Create mock client
    mockClient = {
      runtime: {
        agentId: "agent-123" as `${string}-${string}-${string}-${string}-${string}`,
      },
      profile: {
        id: "user-123",
        username: "testuser",
      },
      fetchSearchTweets: mock(),
      fetchHomeTimeline: mock(),
      twitterClient: {
        sendTweet: mock(),
        deleteTweet: mock(),
        getTweet: mock(),
        getUserTweets: mock(),
        likeTweet: mock(),
        retweet: mock(),
      },
    };

    service = new TwitterPostService(mockClient as ClientBase);
  });

  describe("createPost", () => {
    test("should create a new post", async () => {
      const mockResult = {
        data: {
          create_tweet: {
            tweet_results: {
              result: {
                rest_id: "tweet-123",
              },
            },
          },
        },
      };

      mockClient.twitterClient.sendTweet.mockResolvedValue(mockResult);

      const options = {
        agentId: "agent-123" as `${string}-${string}-${string}-${string}-${string}`,
        roomId: "room-123" as `${string}-${string}-${string}-${string}-${string}`,
        text: "Hello World!",
      };

      const post = await service.createPost(options);

      expect(mockClient.twitterClient.sendTweet).toHaveBeenCalledWith(
        "Hello World!",
        undefined,
      );

      // Verify specific fields independently since timestamp is dynamic
      expect(post.id).toBeDefined();
      expect(post.agentId).toBe("agent-123" as `${string}-${string}-${string}-${string}-${string}`);
      expect(post.roomId).toBe("room-123" as `${string}-${string}-${string}-${string}-${string}`);
      expect(post.userId).toBe("user-123");
      expect(post.username).toBe("testuser");
      expect(post.text).toBe("Hello World!");
      expect(typeof post.timestamp).toBe("number");
      expect(post.inReplyTo).toBeUndefined();
      expect(post.quotedPostId).toBeUndefined();
      expect(post.metrics).toEqual({
        likes: 0,
        reposts: 0,
        replies: 0,
        quotes: 0,
        views: 0,
      });
      expect(post.media).toEqual([]);
      expect(post.metadata).toHaveProperty("raw");
    });
    
    test("should create a reply post", async () => {
      const mockResult = { id: "tweet-456" };

      mockClient.twitterClient.sendTweet.mockResolvedValue(mockResult);

      const options = {
        agentId: "agent-123" as `${string}-${string}-${string}-${string}-${string}`,
        roomId: "room-123" as `${string}-${string}-${string}-${string}-${string}`,
        text: "This is a reply",
        inReplyTo: "tweet-789",
      };

      const post = await service.createPost(options);

      expect(mockClient.twitterClient.sendTweet).toHaveBeenCalledWith(
        "This is a reply",
        "tweet-789",
      );

      expect(post.inReplyTo).toBe("tweet-789");
    });
    
    test("should warn about media uploads", async () => {
      const { logger } = await import("@elizaos/core");
      const warnSpy = spyOn(logger, "warn").mockImplementation(() => {});

      const mockResult = { id: "tweet-123" };
      mockClient.twitterClient.sendTweet.mockResolvedValue(mockResult);

      const options = {
        agentId: "agent-123" as `${string}-${string}-${string}-${string}-${string}`,
        roomId: "room-123" as `${string}-${string}-${string}-${string}-${string}`,
        text: "Post with media",
        media: [{ data: Buffer.from("image"), type: "image/png" } as any],
      };

      await service.createPost(options);

      expect(warnSpy).toHaveBeenCalledWith(
        "Media upload not currently supported with Twitter API v2",
      );

      warnSpy.mockRestore();
    });
  });

  describe("deletePost", () => {
    test("should delete a post", async () => {
      await service.deletePost("tweet-123", "agent-123" as `${string}-${string}-${string}-${string}-${string}`);

      expect(mockClient.twitterClient.deleteTweet).toHaveBeenCalledWith(
        "tweet-123",
      );
    });

    test("should throw error on failure", async () => {
      mockClient.twitterClient.deleteTweet.mockRejectedValue(
        new Error("Delete failed"),
      );

      await expect(
        service.deletePost("tweet-123", "agent-123" as `${string}-${string}-${string}-${string}-${string}`),
      ).rejects.toThrow("Delete failed");
    });
  });

  describe("getPost", () => {
    test("should fetch a single post", async () => {
      const mockTweet = {
        id: "tweet-123",
        userId: "user-456",
        username: "someuser",
        text: "Hello World",
        timestamp: 1234567890,
        likes: 10,
        retweets: 5,
        replies: 3,
        views: 100,
        conversationId: "conv-123",
        inReplyToId: null,
        quotedTweetId: null,
        permanentUrl: "https://twitter.com/someuser/status/tweet-123",
        photos: [
          {
            id: "photo-1",
            url: "https://example.com/photo.jpg",
          },
        ],
      };

      mockClient.twitterClient.getTweet.mockResolvedValue(mockTweet);

      const post = await service.getPost("tweet-123", "agent-123" as `${string}-${string}-${string}-${string}-${string}`);

      // Check each property individually to handle optional fields
      expect(post).toBeDefined();
      expect(post!.id).toBe("tweet-123");
      expect(post!.agentId).toBe("agent-123" as `${string}-${string}-${string}-${string}-${string}`);
      expect(post!.roomId).toBe("uuid-conv-123" as `${string}-${string}-${string}-${string}-${string}`);
      expect(post!.userId).toBe("user-456");
      expect(post!.username).toBe("someuser");
      expect(post!.text).toBe("Hello World");
      expect(post!.timestamp).toBe(1234567890000);
      expect(post!.metrics).toEqual({
        likes: 10,
        reposts: 5,
        replies: 3,
        quotes: 0,
        views: 100,
      });
      expect(post!.media).toEqual([{
        type: "image",
        url: "https://example.com/photo.jpg",
        metadata: {
          id: "photo-1",
        },
      }]);
      expect(post!.metadata).toEqual({
        conversationId: "conv-123",
        permanentUrl: "https://twitter.com/someuser/status/tweet-123",
      });
    });

    test("should return null if post not found", async () => {
      mockClient.twitterClient.getTweet.mockResolvedValue(null);

      const post = await service.getPost("tweet-123", "agent-123" as `${string}-${string}-${string}-${string}-${string}`);

      expect(post).toBeNull();
    });
  });

  describe("getPosts", () => {
    test("should fetch posts from a specific user", async () => {
      const mockTweets = [
        {
          id: "tweet-1",
          userId: "user-456",
          username: "someuser",
          text: "Tweet 1",
          timestamp: 1234567890,
        },
        {
          id: "tweet-2",
          userId: "user-456",
          username: "someuser",
          text: "Tweet 2",
          timestamp: 1234567891,
        },
      ];

      mockClient.twitterClient.getUserTweets.mockResolvedValue({
        tweets: mockTweets,
      });

      const options = {
        agentId: "agent-123" as `${string}-${string}-${string}-${string}-${string}`,
        userId: "user-456",
        limit: 10,
      };

      const posts = await service.getPosts(options);

      expect(mockClient.twitterClient.getUserTweets).toHaveBeenCalledWith(
        "user-456",
        10,
        undefined,
      );

      expect(posts).toHaveLength(2);
      expect(posts[0].id).toBe("tweet-1");
      expect(posts[1].id).toBe("tweet-2");
    });

    test("should fetch home timeline when no userId specified", async () => {
      const mockTweets = [
        {
          id: "tweet-1",
          userId: "user-789",
          username: "anotheruser",
          text: "Timeline tweet",
          timestamp: 1234567890,
          conversationId: "conv-1",
          permanentUrl: "https://twitter.com/anotheruser/status/tweet-1",
        },
      ];

      mockClient.fetchHomeTimeline.mockResolvedValue(mockTweets);

      const options = {
        agentId: "agent-123" as `${string}-${string}-${string}-${string}-${string}`,
        limit: 20,
      };

      const posts = await service.getPosts(options);

      expect(mockClient.fetchHomeTimeline).toHaveBeenCalledWith(20, false);
      expect(posts).toHaveLength(1);
    });

    test("should handle errors gracefully", async () => {
      mockClient.fetchHomeTimeline.mockRejectedValue(new Error("API Error"));

      const options = {
        agentId: "agent-123" as `${string}-${string}-${string}-${string}-${string}`,
      };

      const posts = await service.getPosts(options);

      expect(posts).toEqual([]);
    });
  });

  describe("likePost", () => {
    test("should like a post", async () => {
      await service.likePost("tweet-123", "agent-123" as `${string}-${string}-${string}-${string}-${string}`);

      expect(mockClient.twitterClient.likeTweet).toHaveBeenCalledWith(
        "tweet-123",
      );
    });

    test("should throw error on failure", async () => {
      mockClient.twitterClient.likeTweet.mockRejectedValue(
        new Error("Like failed"),
      );

      await expect(
        service.likePost("tweet-123", "agent-123" as `${string}-${string}-${string}-${string}-${string}`),
      ).rejects.toThrow("Like failed");
    });
  });

  describe("repost", () => {
    test("should repost a tweet", async () => {
      await service.repost("tweet-123", "agent-123" as `${string}-${string}-${string}-${string}-${string}`);

      expect(mockClient.twitterClient.retweet).toHaveBeenCalledWith(
        "tweet-123",
      );
    });

    test("should throw error on failure", async () => {
      mockClient.twitterClient.retweet.mockRejectedValue(
        new Error("Retweet failed"),
      );

      await expect(
        service.repost("tweet-123", "agent-123" as `${string}-${string}-${string}-${string}-${string}`),
      ).rejects.toThrow("Retweet failed");
    });
  });

  describe("getMentions", () => {
    test("should fetch mentions", async () => {
      const mockTweets = [
        {
          id: "tweet-1",
          userId: "user-456",
          username: "otheruser",
          text: "@testuser mentioned you",
          timestamp: 1234567890,
          likes: 5,
          retweets: 2,
          replies: 1,
          views: 50,
          conversationId: "conv-1",
          permanentUrl: "https://twitter.com/otheruser/status/tweet-1",
        },
      ];

      mockClient.fetchSearchTweets.mockResolvedValue({
        tweets: mockTweets,
      });

      const posts = await service.getMentions("agent-123" as `${string}-${string}-${string}-${string}-${string}`);

      expect(mockClient.fetchSearchTweets).toHaveBeenCalledWith(
        "@testuser",
        20,
        SearchMode.Latest,
        undefined,
      );

      expect(posts).toHaveLength(1);
      expect(posts[0].metadata.isMention).toBe(true);
    });

    test("should return empty array if no profile", async () => {
      mockClient.profile = null;

      const posts = await service.getMentions("agent-123" as `${string}-${string}-${string}-${string}-${string}`);

      expect(posts).toEqual([]);
    });
  });
});
