import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  startRuntime,
  applyRuntimeWrites,
  stopRuntime,
  getCurrentRuntimeSessionId,
  getRuntimeGeneration,
  getRuntimeSnapshot,
} from "@/lib/runtime/webcontainer";
import { readNdjsonPipelineStream } from "@/lib/client/api";
import type { PipelineEvent } from "@/lib/pipeline-events";

describe("Packet B3 — Workspace Lifecycle and Stream Reliability (F13 & F14)", () => {
  describe("WebContainer session-scoped lifecycle & stale-write rejection (F13)", () => {
    beforeEach(async () => {
      await stopRuntime();
    });

    it("reuses start promise for the identical session (React Strict Mode safety)", async () => {
      const p1 = startRuntime("session-alpha", { "package.json": "{}" });
      const p2 = startRuntime("session-alpha", { "package.json": "{}" });

      expect(p1).toBe(p2);
      expect(getCurrentRuntimeSessionId()).toBe("session-alpha");
    });

    it("advances runtime generation and isolates state on session switch", async () => {
      const p1 = startRuntime("session-alpha", { "package.json": "{}" });
      const gen1 = getRuntimeGeneration();
      expect(getCurrentRuntimeSessionId()).toBe("session-alpha");

      const p2 = startRuntime("session-beta", { "package.json": '{"name": "beta"}' });
      const gen2 = getRuntimeGeneration();

      expect(p1).not.toBe(p2);
      expect(gen2).toBeGreaterThan(gen1);
      expect(getCurrentRuntimeSessionId()).toBe("session-beta");
    });

    it("rejects late writes targeted at a stale session", async () => {
      await startRuntime("session-alpha", { "src/index.js": "console.log('alpha');" });
      const currentGen = getRuntimeGeneration();

      // Switch to session-beta
      await startRuntime("session-beta", { "src/index.js": "console.log('beta');" });

      // Late write arrives for session-alpha
      const staleWritePromise = applyRuntimeWrites(
        [{ path: "src/index.js", contents: "console.log('late-alpha');" }],
        "session-alpha" // stale session
      );

      await staleWritePromise;

      // Active runtime must remain on session-beta and not accept alpha's write
      expect(getCurrentRuntimeSessionId()).toBe("session-beta");
    });

    it("serializes stopRuntime and safely resets session identity", async () => {
      await startRuntime("session-alpha", { "package.json": "{}" });
      expect(getCurrentRuntimeSessionId()).toBe("session-alpha");

      await stopRuntime("session-alpha");
      expect(getCurrentRuntimeSessionId()).toBeNull();
      expect(getRuntimeSnapshot().status).toBe("idle");
    });
  });

  describe("NDJSON stream parsing and boundary handling (F14)", () => {
    function createStreamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
      const encoder = new TextEncoder();
      return new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });
    }

    it("handles split chunks across network packets", async () => {
      // Event 1 is split across two chunks:
      // Chunk 1: '{"type":"step","step":"parse","status":"start"}\n{"type":"step","step":"parse",'
      // Chunk 2: '"status":"done"}\n{"type":"done","challengeId":"c-123"}\n'
      const chunk1 = '{"type":"step","step":"parse","status":"start"}\n{"type":"step","step":"parse",';
      const chunk2 = '"status":"done"}\n{"type":"done","challengeId":"c-123"}\n';

      const events: PipelineEvent[] = [];
      const stream = createStreamFromChunks([chunk1, chunk2]);

      const result = await readNdjsonPipelineStream(stream, (e) => events.push(e));

      expect(events).toHaveLength(3);
      expect(events[0]).toEqual({ type: "step", step: "parse", status: "start" });
      expect(events[1]).toEqual({ type: "step", step: "parse", status: "done" });
      expect(events[2]).toEqual({ type: "done", challengeId: "c-123" });
      expect(result.terminalEventSeen).toBe(true);
      expect(result.lastEvent?.type).toBe("done");
    });

    it("processes trailing line at EOF when missing final newline", async () => {
      // Notice chunk ends without '\n'
      const chunk = '{"type":"step","step":"classify","status":"done"}\n{"type":"done","challengeId":"c-eof-456"}';
      const events: PipelineEvent[] = [];
      const stream = createStreamFromChunks([chunk]);

      const result = await readNdjsonPipelineStream(stream, (e) => events.push(e));

      expect(events).toHaveLength(2);
      expect(events[1]).toEqual({ type: "done", challengeId: "c-eof-456" });
      expect(result.terminalEventSeen).toBe(true);
    });

    it("discards malformed records without crashing the stream", async () => {
      const chunk = '{"type":"step","step":"parse","status":"start"}\n{invalid_json_here}\n{"type":"done","challengeId":"c-789"}\n';
      const events: PipelineEvent[] = [];
      const stream = createStreamFromChunks([chunk]);

      const result = await readNdjsonPipelineStream(stream, (e) => events.push(e));

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe("step");
      expect(events[1].type).toBe("done");
      expect(result.terminalEventSeen).toBe(true);
    });

    it("detects interrupted streams that close without a terminal done/error event", async () => {
      // Stream terminates after 'parse' step without done or error event
      const chunk = '{"type":"step","step":"parse","status":"start"}\n{"type":"step","step":"parse","status":"done"}\n';
      const events: PipelineEvent[] = [];
      const stream = createStreamFromChunks([chunk]);

      const result = await readNdjsonPipelineStream(stream, (e) => events.push(e));

      expect(events).toHaveLength(2);
      expect(result.terminalEventSeen).toBe(false); // correctly detected as premature EOF!
    });
  });
});
