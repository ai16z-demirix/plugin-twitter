// test-setup.ts - Preload file for Bun tests
import { mock } from 'bun:test';

// Define UUID type for module mock
type UUID = `${string}-${string}-${string}-${string}-${string}`;

// Mock the @elizaos/core module
mock.module('@elizaos/core', () => {
  return {
    createUniqueUuid: (runtime: any, id: string) => `uuid-${id}`,
    logger: {
      error: mock(),
      debug: mock(),
      info: mock(),
      warn: mock()
    },
    EventType: {
      WORLD_JOINED: 'WORLD_JOINED',
      MESSAGE_CREATED: 'MESSAGE_CREATED',
      MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
      CHANNEL_CREATED: 'CHANNEL_CREATED',
      ENTITY_CREATED: 'ENTITY_CREATED',
      ENTITY_UPDATED: 'ENTITY_UPDATED',
      ENTITY_DELETED: 'ENTITY_DELETED',
      AGENT_CREATED: 'AGENT_CREATED',
      AGENT_UPDATED: 'AGENT_UPDATED',
      AGENT_DELETED: 'AGENT_DELETED'
    },
    ChannelType: {
      TEXT: "text",
      VOICE: "voice",
      VIDEO: "video",
      GROUP: "group",
      FEED: "feed"
    }
  };
});

// Add any other global mocks or setup needed for tests here
