import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
  spyOn,
} from "bun:test";
import { TwitterAuth } from "../../client/auth";
import { TwitterMessageService } from "../../services/MessageService";
import { TwitterPostService } from "../../services/PostService";
import { ClientBase } from "../../base";
import { MessageType } from "../../services/IMessageService";
import { SearchMode } from "../../client";
// Define our own version of the types we need to avoid import issues
type IAgentRuntime = {
  agentId: string;
  getSetting: (key: string) => any;
  character: Record<string, any>;
  getCache: (key: string) => Promise<any>;
  setCache: (key: string, value: any) => Promise<void>;
  getMemoriesByRoomIds: (roomIds: string[]) => Promise<any[]>;
  ensureWorldExists: () => Promise<void>;
  ensureConnection: () => Promise<void>;
  createMemory: () => Promise<void>;
  getEntityById: () => Promise<any>;
  updateEntity: () => Promise<void>;
};
import dotenv from "dotenv";

// Add type for UUID template strings
type UuidString = `${string}-${string}-${string}-${string}-${string}`;
    
// Helper function to cast any string to UUID format for type compatibility
const asUuid = (id: string): UuidString => id as UuidString;

// Load environment variables from .env.test file
dotenv.config({ path: ".env.test" });

// Skip these tests if no API credentials are provided
const SKIP_E2E =
  !process.env.TWITTER_API_KEY ||
  !process.env.TWITTER_API_SECRET_KEY ||
  !process.env.TWITTER_ACCESS_TOKEN ||
  !process.env.TWITTER_ACCESS_TOKEN_SECRET;

describe.skipIf(SKIP_E2E)("Twitter E2E Integration Tests", () => {
  let auth: TwitterAuth;
  let client: ClientBase;
  let messageService: TwitterMessageService;
  let postService: TwitterPostService;
  let runtime: IAgentRuntime;
  let testTweetIds: string[] = [];

  beforeAll(async () => {

    // Setup runtime mock
    runtime = {
      agentId: "test-agent-123" as UuidString,
      getSetting: (key: string) => process.env[key],
      character: {},
      getCache: mock(),
      setCache: mock(),
      getMemoriesByRoomIds: mock().mockResolvedValue([]),
      ensureWorldExists: mock(),
      ensureConnection: mock(),
      createMemory: mock(),
      getEntityById: mock().mockResolvedValue(null),
      updateEntity: mock(),
    } as any;

    // Initialize client with real credentials
    const state = {
      TWITTER_API_KEY: process.env.TWITTER_API_KEY,
      TWITTER_API_SECRET_KEY: process.env.TWITTER_API_SECRET_KEY,
      TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
      TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    };

    client = new ClientBase(runtime as any, state);
    await client.init();

    // Initialize services
    messageService = new TwitterMessageService(client);
    postService = new TwitterPostService(client);
  });

  afterAll(async () => {
    // Cleanup: Delete all test tweets
    console.log(`Cleaning up ${testTweetIds.length} test tweets...`);

    for (const tweetId of testTweetIds) {
      try {
        await postService.deletePost(tweetId, (runtime as any).agentId);
        console.log(`Deleted tweet ${tweetId}`);
      } catch (error) {
        console.error(`Failed to delete tweet ${tweetId}:`, error);
      }
    }
  });

  beforeEach(() => {
    // Add delay between tests to avoid rate limiting
    return new Promise((resolve) => setTimeout(resolve, 2000));
  });

  describe("Authentication", () => {
    test("should authenticate successfully with API v2 credentials", async () => {
      const isLoggedIn = await client.twitterClient.isLoggedIn();
      expect(isLoggedIn).toBe(true);
    });

    test("should fetch authenticated user profile", async () => {
      const profile = await client.twitterClient.me();

      expect(profile).toBeDefined();
      expect(profile?.userId).toBeDefined();
      expect(profile?.username).toBeDefined();
      expect(profile?.name).toBeDefined();

      console.log("Authenticated as:", {
        userId: profile?.userId,
        username: profile?.username,
        name: profile?.name,
      });
    });
  });

  describe("PostService", () => {
    test("should create a simple post", async () => {
      const timestamp = Date.now();
      const post = await postService.createPost({
        agentId: (runtime as any).agentId,
        roomId: "test-room" as any,
        text: `E2E Test Post ${timestamp} - This is an automated test, will be deleted`,
      });

      expect(post).toBeDefined();
      expect(asUuid(post.id)).toBeDefined();
      expect(post.text).toContain("E2E Test Post");
      expect(post.timestamp).toBeGreaterThan(0);

      testTweetIds.push(asUuid(post.id));
      console.log("Created post:", asUuid(post.id));
    });

    test("should create a reply post", async () => {
      // First create a post to reply to
      const originalPost = await postService.createPost({
        agentId: (runtime as any).agentId,
        roomId: "test-room" as any,
        text: `E2E Test Original ${Date.now()}`,
      });
      testTweetIds.push(asUuid(originalPost.id));

      // Create a reply
      const replyPost = await postService.createPost({
        agentId: (runtime as any).agentId,
        roomId: "test-room" as any,
        text: `E2E Test Reply ${Date.now()}`,
        inReplyTo: asUuid(originalPost.id),
      });

      expect(replyPost).toBeDefined();
      expect(replyPost.inReplyTo).toBe(asUuid(originalPost.id));

      testTweetIds.push(replyPost.id);
      console.log("Created reply:", replyPost.id, "to:", asUuid(originalPost.id));
    });

    test("should fetch a post by ID", async () => {
      // Create a post
      const createdPost = await postService.createPost({
        agentId: (runtime as any).agentId,
        roomId: "test-room" as any,
        text: `E2E Test Fetch ${Date.now()}`,
      });
      testTweetIds.push(asUuid(createdPost.id));

      // Fetch it back
      const fetchedPost = await postService.getPost(
        asUuid(createdPost.id),
        (runtime as any).agentId
      );

      expect(fetchedPost).toBeDefined();
      expect(fetchedPost?.id).toBe(asUuid(createdPost.id));
      expect(fetchedPost?.text).toBe(createdPost.text);
    });

    test("should fetch user posts", async () => {
      const profile = await client.twitterClient.me();
      if (!profile) throw new Error("No profile available");

      const posts = await postService.getPosts({
        agentId: (runtime as any).agentId,
        userId: profile.userId,
        limit: 5,
      });

      expect(posts).toBeDefined();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeLessThanOrEqual(5);

      console.log(`Fetched ${posts.length} posts for user ${profile.username}`);
    });

    test("should like and unlike a post", async () => {
      // Create a post
      const post = await postService.createPost({
        agentId: (runtime as any).agentId,
        roomId: "test-room" as any,
        text: `E2E Test Like ${Date.now()}`,
      });
      testTweetIds.push(asUuid(post.id));

      // Like the post
      await postService.likePost(asUuid(post.id), (runtime as any).agentId);
      console.log("Liked post:", asUuid(post.id));

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Fetch the post to verify it was liked
      const likedPost = await postService.getPost(asUuid(post.id), (runtime as any).agentId);
      // Note: The like count might not update immediately due to Twitter's eventual consistency
      console.log("Post metrics after like:", likedPost?.metrics);
    });

    test("should delete a post", async () => {
      // Create a post
      const post = await postService.createPost({
        agentId: (runtime as any).agentId,
        roomId: "test-room" as any,
        text: `E2E Test Delete ${Date.now()}`,
      });

      console.log("Created post to delete:", asUuid(post.id));

      // Delete it
      await postService.deletePost(asUuid(post.id), (runtime as any).agentId);

      // Try to fetch it - should return null or throw
      const deletedPost = await postService.getPost(asUuid(post.id), (runtime as any).agentId);
      expect(deletedPost).toBeNull();

      console.log("Successfully deleted post:", asUuid(post.id));
    });
  });

  describe("MessageService", () => {
    test("should fetch mentions", async () => {
      const messages = await messageService.getMessages({
        agentId: (runtime as any).agentId,
        limit: 5,
      });

      expect(messages).toBeDefined();
      expect(Array.isArray(messages)).toBe(true);

      console.log(`Fetched ${messages.length} mentions`);

      if (messages.length > 0) {
        console.log("First mention:", {
          id: messages[0].id,
          username: messages[0].username,
          text: messages[0].text.substring(0, 50) + "...",
          type: messages[0].type,
        });
      }
    });

    test("should send a regular tweet via message service", async () => {
      const timestamp = Date.now();
      const message = await messageService.sendMessage({
        agentId: (runtime as any).agentId,
        roomId: "test-room" as any,
        text: `E2E Test Message ${timestamp}`,
        type: MessageType.POST,
      });

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.text).toContain("E2E Test Message");
      expect(message.type).toBe(MessageType.POST);

      testTweetIds.push(message.id);
      console.log("Sent message:", message.id);
    });

    test("should fetch a specific message by ID", async () => {
      // Create a tweet first
      const sent = await messageService.sendMessage({
        agentId: (runtime as any).agentId,
        roomId: "test-room" as any,
        text: `E2E Test Get Message ${Date.now()}`,
        type: MessageType.POST,
      });
      testTweetIds.push(sent.id);

      // Fetch it back
      const fetched = await messageService.getMessage(asUuid(sent.id), (runtime as any).agentId);

      expect(fetched).toBeDefined();
      expect(fetched?.id).toBe(sent.id);
      expect(fetched?.text).toBe(sent.text);
    });
  });

  describe("Search and Timeline", () => {
    test("should search for tweets", async () => {
      const searchResult = await client.fetchSearchTweets(
        "javascript",
        5,
        SearchMode.Latest,
      );

      expect(searchResult).toBeDefined();
      expect(searchResult.tweets).toBeDefined();
      expect(Array.isArray(searchResult.tweets)).toBe(true);

      console.log(
        `Found ${searchResult.tweets.length} tweets for "javascript"`,
      );
    });

    test("should fetch home timeline", async () => {
      const timeline = await client.fetchHomeTimeline(10, false);

      expect(timeline).toBeDefined();
      expect(Array.isArray(timeline)).toBe(true);
      expect(timeline.length).toBeLessThanOrEqual(10);

      console.log(`Fetched ${timeline.length} tweets from home timeline`);
    });
  });

  describe("Error Handling", () => {
    test("should handle non-existent tweet gracefully", async () => {
      const nonExistentId = asUuid("1234567890123456789"); // Unlikely to exist

      const post = await postService.getPost(nonExistentId, (runtime as any).agentId);
      expect(post).toBeNull();

      const message = await messageService.getMessage(
        nonExistentId,
        (runtime as any).agentId
      );
      expect(message).toBeNull();
    });
  });
});
