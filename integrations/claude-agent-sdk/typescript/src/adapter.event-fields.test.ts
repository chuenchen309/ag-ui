import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock("@ag-ui/client", () => {
  class AbstractAgent {
    constructor(_config?: Record<string, unknown>) {}
    clone() {
      return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    }
  }
  return {
    AbstractAgent,
    EventType: {
      RUN_STARTED: "RUN_STARTED",
      RUN_FINISHED: "RUN_FINISHED",
      RUN_ERROR: "RUN_ERROR",
      TEXT_MESSAGE_START: "TEXT_MESSAGE_START",
      TEXT_MESSAGE_CONTENT: "TEXT_MESSAGE_CONTENT",
      TEXT_MESSAGE_END: "TEXT_MESSAGE_END",
      TOOL_CALL_START: "TOOL_CALL_START",
      TOOL_CALL_ARGS: "TOOL_CALL_ARGS",
      TOOL_CALL_END: "TOOL_CALL_END",
      TOOL_CALL_RESULT: "TOOL_CALL_RESULT",
      STATE_SNAPSHOT: "STATE_SNAPSHOT",
      MESSAGES_SNAPSHOT: "MESSAGES_SNAPSHOT",
      CUSTOM: "CUSTOM",
      REASONING_START: "REASONING_START",
      REASONING_MESSAGE_START: "REASONING_MESSAGE_START",
      REASONING_MESSAGE_CONTENT: "REASONING_MESSAGE_CONTENT",
      REASONING_MESSAGE_END: "REASONING_MESSAGE_END",
      REASONING_END: "REASONING_END",
      REASONING_ENCRYPTED_VALUE: "REASONING_ENCRYPTED_VALUE",
    },
    randomUUID: () => crypto.randomUUID(),
  };
});

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: queryMock,
  createSdkMcpServer: vi.fn(() => ({})),
}));

vi.mock("@anthropic-ai/sdk/resources/beta/messages/messages", () => ({}));

import { ClaudeAgentAdapter } from "./adapter";

// #3367 did this for the Python adapter: the 1.0 schemas declare threadId and
// runId only on the RUN_* lifecycle events, so on anything else they are
// unrecognised keys that @ag-ui/client strips with a warning per event.
async function runAdapter() {
  const adapter = new ClaudeAgentAdapter({
    model: "claude-haiku-4-5",
    includePartialMessages: true,
  });
  const events: Array<Record<string, unknown>> = [];
  await new Promise<void>((resolve, reject) => {
    adapter
      .run({
        threadId: "thread-1",
        runId: "run-1",
        messages: [{ id: "u1", role: "user", content: "hi" }],
        tools: [],
        context: [],
      } as never)
      .subscribe({
        next: (event) => events.push(event as Record<string, unknown>),
        error: reject,
        complete: resolve,
      });
  });
  return events;
}

describe("ClaudeAgentAdapter event fields", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps threadId and runId off text and tool-call events", async () => {
    queryMock.mockImplementation(() =>
      (async function* () {
        yield {
          type: "stream_event",
          event: { type: "message_start", message: { id: "msg-1" } },
        };
        yield {
          type: "stream_event",
          event: {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "Looking it up" },
          },
        };
        yield {
          type: "stream_event",
          event: {
            type: "content_block_start",
            content_block: { type: "tool_use", id: "tc-1", name: "search" },
          },
        };
        yield {
          type: "stream_event",
          event: {
            type: "content_block_delta",
            delta: { type: "input_json_delta", partial_json: '{"q":"x"}' },
          },
        };
        yield { type: "stream_event", event: { type: "content_block_stop" } };
        yield { type: "stream_event", event: { type: "message_stop" } };
        yield {
          type: "user",
          message: {
            content: [
              { type: "tool_result", tool_use_id: "tc-1", content: "found" },
            ],
          },
        };
        yield { type: "result", result: "ok", is_error: false };
      })(),
    );

    const events = await runAdapter();
    const types = new Set(events.map((e) => e.type));
    for (const type of [
      "TEXT_MESSAGE_START",
      "TEXT_MESSAGE_CONTENT",
      "TEXT_MESSAGE_END",
      "TOOL_CALL_START",
      "TOOL_CALL_ARGS",
      "TOOL_CALL_END",
      "TOOL_CALL_RESULT",
    ]) {
      expect(types).toContain(type);
    }

    const decorated = events
      .filter((e) => !String(e.type).startsWith("RUN_"))
      .filter((e) => "threadId" in e || "runId" in e)
      .map((e) => e.type);
    expect(decorated).toEqual([]);

    const started = events.find((e) => e.type === "RUN_STARTED");
    expect(started).toMatchObject({ threadId: "thread-1", runId: "run-1" });
  });
});
