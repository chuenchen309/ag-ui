/**
 * Type definitions for AG-UI Claude SDK integration.
 *
 * Only defines types specific to this adapter.
 * For SDK types, import directly from @anthropic-ai/claude-agent-sdk or @anthropic-ai/sdk.
 */

import type { AgentConfig } from "@ag-ui/client";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import type {
  RunStartedEvent,
  RunFinishedEvent,
  RunErrorEvent,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  ToolCallStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallResultEvent,
  ReasoningStartEvent,
  ReasoningMessageStartEvent,
  ReasoningMessageContentEvent,
  ReasoningMessageEndEvent,
  ReasoningEndEvent,
  ReasoningEncryptedValueEvent,
  StateSnapshotEvent,
  MessagesSnapshotEvent,
  CustomEvent,
} from "@ag-ui/core";

/**
 * Configuration for ClaudeAgentAdapter.
 * Combines AG-UI AgentConfig with Claude SDK Options.
 *
 * AgentConfig provides: agentId (maps to Python's "name"), description
 * Options provides: model, systemPrompt, mcpServers, allowedTools, etc.
 *
 * The adapter is a thin protocol translator -- it does not manage the SDK
 * client lifecycle or API keys. Set ANTHROPIC_API_KEY via environment variable
 * or pass it directly when creating the query stream.
 *
 * @example
 * ```typescript
 * const config: ClaudeAgentAdapterConfig = {
 *   agentId: "my_agent",
 *   description: "A helpful assistant",
 *   model: "claude-haiku-4-5",
 *   systemPrompt: "You are helpful",
 *   permissionMode: "acceptEdits",
 *   allowedTools: ["Read", "Write"],
 * };
 * ```
 */
export type ClaudeAgentAdapterConfig = AgentConfig &
  Options & {
    /** Opt-in local native child recovery; independent of Intelligence or event storage. */
    nativeChildRecovery?: import("./native-recovery").NativeChildRecoveryConfig;
    /** Maximum number of idle sessions to keep. Default: 1000 */
    maxSessions?: number;
    /** Durable host binding store and trusted execution profiles. */
    sessionRecovery?: import("./recovery").SessionRecoveryConfig;
    /** TTL in ms for idle sessions. Default: 30 minutes */
    sessionTtlMs?: number;
    /** Timeout in ms for query() calls. Default: undefined (no timeout) */
    queryTimeoutMs?: number;
  };

/**
 * The `threadId`/`runId` attribution this adapter puts on its RUN_* lifecycle
 * events. `RunStartedEventSchema` and `RunFinishedEventSchema` declare both
 * fields; `RUN_ERROR` does not, so a consumer running enforcement strips them
 * there, warning once per stripped path. Text, tool-call and other events do
 * not carry them, since on those every event would be stripped and warned.
 */
type AdapterAttribution = {
  threadId?: string;
  runId?: string;
};

/**
 * Union of all AG-UI event types this adapter can emit, each carrying the
 * adapter's attribution fields.
 */
export type ProcessedEvent = AdapterAttribution &
  (
    | RunStartedEvent
    | RunFinishedEvent
    | RunErrorEvent
    | TextMessageStartEvent
    | TextMessageContentEvent
    | TextMessageEndEvent
    | ToolCallStartEvent
    | ToolCallArgsEvent
    | ToolCallEndEvent
    | ToolCallResultEvent
    | ReasoningStartEvent
    | ReasoningMessageStartEvent
    | ReasoningMessageContentEvent
    | ReasoningMessageEndEvent
    | ReasoningEndEvent
    | ReasoningEncryptedValueEvent
    | StateSnapshotEvent
    | MessagesSnapshotEvent
    | CustomEvent
  );
