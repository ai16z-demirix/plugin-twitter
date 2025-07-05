# Twitter Plugin Testing Guide

## Overview

This guide explains how to test the refactored Twitter plugin after removing username/password authentication and Twitter Spaces functionality. The plugin now exclusively uses Twitter API v2 with developer credentials.

## Prerequisites

### 1. Twitter Developer Account

You need a Twitter Developer account with:

- API Key
- API Secret Key
- Access Token
- Access Token Secret

To get these credentials:

1. Go to https://developer.twitter.com/
2. Create a developer account (if you don't have one)
3. Create a new app in the developer portal
4. Generate API keys and access tokens

### 2. Environment Setup

Create a `.env.test` file in the plugin root directory:

```bash
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET_KEY=your_api_secret_key_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_here
```

## Running Tests

### Unit Tests

Unit tests mock external dependencies and test individual components:

```bash
# Run all unit tests
bun test

# Run specific test file
bun test src/services/__tests__/MessageService.test.ts

# Run specific pattern
bun test --pattern "MessageService"

# Run in watch mode
bun test --watch
```

### E2E Tests

End-to-end tests require real Twitter API credentials:

```bash
# Run E2E tests (requires .env.test file)
bun test src/__tests__/e2e

# Skip E2E tests (run only unit tests)
bun test --pattern "^(?!.*e2e).*$"
```

## Test Coverage

### 1. Authentication Tests (`auth.test.ts`)

- ✅ Twitter API v2 initialization
- ✅ Credential validation
- ✅ Profile fetching
- ❌ Username/password login (removed)
- ❌ Guest authentication (removed)

### 2. Service Tests

#### MessageService Tests

- ✅ Fetching direct messages
- ✅ Sending direct messages
- ✅ Fetching mentions
- ✅ Message filtering
- ✅ Error handling

#### PostService Tests

- ✅ Creating posts/tweets
- ✅ Deleting posts
- ✅ Fetching posts
- ✅ Liking posts
- ✅ Reposting/retweeting
- ❌ Media upload (not implemented in v2 wrapper)
- ❌ Unlike/unrepost (not implemented)

### 3. Environment Tests

- ✅ Configuration validation
- ✅ Target user filtering
- ✅ Required credentials check

## Manual Testing

### 1. Basic Tweet Operations

```typescript
// Test creating a tweet
const post = await postService.createPost({
  text: "Hello from ElizaOS!",
  agentId: "agent-123",
  roomId: "room-123",
});

// Test fetching tweets
const posts = await postService.getPosts({
  agentId: "agent-123",
  limit: 20,
});

// Test liking a tweet
await postService.likePost("tweet-id", "agent-123");
```

### 2. Direct Messages

```typescript
// Test fetching mentions
const mentions = await messageService.getMentions("agent-123", {
  limit: 10,
});

// Test sending a DM
const message = await messageService.sendMessage({
  recipientId: "user-id",
  text: "Hello!",
  type: MessageType.DM,
  agentId: "agent-123",
  roomId: "room-123",
});
```

## Debugging Tips

### 1. Check Authentication

```typescript
const isLoggedIn = await client.isLoggedIn();
console.log("Authenticated:", isLoggedIn);

const profile = await client.me();
console.log("Profile:", profile);
```

### 2. Enable Debug Logging

```bash
DEBUG=elizaos:* bun test
```

### 3. Common Issues

**Issue: "Missing required Twitter API credentials"**

- Ensure all 4 credentials are set in environment
- Check for typos in environment variable names

**Issue: "401 Unauthorized"**

- Verify credentials are correct
- Check if tokens have proper permissions
- Ensure app has read/write access

**Issue: "Rate limit exceeded"**

- Twitter API v2 has rate limits
- Wait 15 minutes before retrying
- Use pagination for large requests

## API Limitations

With Twitter API v2 only:

### Available Features

- ✅ Create tweets
- ✅ Delete tweets
- ✅ Like tweets
- ✅ Retweet
- ✅ Get tweets
- ✅ Get mentions
- ✅ Search tweets

### Unavailable Features

- ❌ Twitter Spaces (removed)
- ❌ Media upload (requires additional implementation)
- ❌ Unlike/unretweet (requires additional implementation)
- ❌ Fetch retweeters list

## Bun Test Setup

This project uses Bun as the test runner instead of Vitest. Here's how the test environment is configured:

### Test Runner Configuration

- Tests use `bun:test` imports for test utilities (`test`, `describe`, `expect`, etc.)
- The test setup is configured in `bunfig.toml` and `src/test-setup.ts`

### Mocking

- Bun's native mocking system is used with `mock()` and `mock.module()` instead of Vitest's `vi.mock()`
- External dependencies are mocked via module mocks in `test-setup.ts`:

```typescript
// Example from test-setup.ts
import { mock } from 'bun:test';

mock.module('@elizaos/core', () => {
  return {
    createUniqueUuid: (runtime: any, id: string) => `uuid-${id}`,
    logger: { /* mock methods */ },
    // Other mocked exports...
  };
});
```

- Additional manual mocks are located in `src/__mocks__/`

### TypeScript Compatibility

- UUID string template literals use a utility function for type compatibility:

```typescript
// Type for UUID template strings
type UuidString = `${string}-${string}-${string}-${string}-${string}`;
    
// Helper function to cast any string to UUID format for type compatibility
const asUuid = (id: string): UuidString => id as UuidString;
```

### Test Patterns

- Unit tests are in `__tests__` directories next to the code they test
- E2E tests are in `__tests__/e2e/` and require valid Twitter API credentials
- The tests use the `.env.test` file for test configuration
- ❌ Trends API
- ❌ Direct message conversations (requires additional permissions)

## Performance Testing

```bash
# Run performance benchmarks
npm run benchmark

# Test rate limiting
npm run test:rate-limits
```

## CI/CD Integration

For GitHub Actions:

```yaml
- name: Run Twitter Plugin Tests
  env:
    TWITTER_API_KEY: ${{ secrets.TWITTER_API_KEY }}
    TWITTER_API_SECRET_KEY: ${{ secrets.TWITTER_API_SECRET_KEY }}
    TWITTER_ACCESS_TOKEN: ${{ secrets.TWITTER_ACCESS_TOKEN }}
    TWITTER_ACCESS_TOKEN_SECRET: ${{ secrets.TWITTER_ACCESS_TOKEN_SECRET }}
  run: npm test
```

## Future Improvements

1. **Media Upload**: Implement Twitter API v2 media upload endpoint
2. **Unlike/Unretweet**: Add support for undoing actions
3. **DM Conversations**: Implement full conversation support with proper permissions
4. **Streaming API**: Add real-time tweet streaming support
5. **Analytics**: Add tweet performance metrics tracking

## Resources

- [Twitter API v2 Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [twitter-api-v2 Library](https://github.com/PLhery/node-twitter-api-v2)
- [ElizaOS Documentation](https://github.com/elizaos/eliza)
