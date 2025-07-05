// Mock of @elizaos/core for tests
import { mock } from 'bun:test';

// Define types and enums that external code depends on
export type UUID = `${string}-${string}-${string}-${string}-${string}`;

export enum ChannelType {
  TEXT = "text",
  VOICE = "voice",
  VIDEO = "video",
  GROUP = "group",
  FEED = "feed"
}

// Create mock functions
const createUniqueUuid = mock<(runtime: unknown, id: string) => UUID>(
  (_runtime, id) => `uuid-${id}` as UUID,
);
const mockError = mock();
const mockDebug = mock();
const mockInfo = mock();
const mockWarn = mock();

// Export logger mock
export const logger = {
  error: mockError,
  debug: mockDebug,
  info: mockInfo,
  warn: mockWarn,
};

// Export event types constants
export const EventType = {
  WORLD_JOINED: 'WORLD_JOINED',
  MESSAGE_CREATED: 'MESSAGE_CREATED',
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
  CHANNEL_CREATED: 'CHANNEL_CREATED',
  ENTITY_CREATED: 'ENTITY_CREATED',
  ENTITY_UPDATED: 'ENTITY_UPDATED',
  ENTITY_DELETED: 'ENTITY_DELETED',
  AGENT_CREATED: 'AGENT_CREATED',
  AGENT_UPDATED: 'AGENT_UPDATED',
  AGENT_DELETED: 'AGENT_DELETED',
};

// Export main function
export { createUniqueUuid };
