/// <reference lib="deno.ns" />

import { Scheduler } from "./scheduler.ts";

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  messages: unknown[] = [];
  terminated = false;

  constructor(_url: string | URL) {}

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  tick() {
    this.onmessage?.(new MessageEvent("message", { data: "tick" }));
  }
}

const assertEquals = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
};

const withFakeWorker = (run: (workerType: typeof FakeWorker) => void) => {
  const originalWorker = globalThis.Worker;
  Object.defineProperty(globalThis, "Worker", {
    configurable: true,
    value: FakeWorker,
  });

  try {
    run(FakeWorker);
  } finally {
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: originalWorker,
    });
  }
};

Deno.test("start and stop are idempotent", () => {
  withFakeWorker(() => {
    const clock = { currentTime: 0 };
    const scheduler = new Scheduler(clock as AudioContext, 120);
    const worker = scheduler.worker as unknown as FakeWorker;
    const scheduled: number[] = [];

    scheduler.startDelay = 0;
    scheduler.addEventListener((timestamp) => scheduled.push(timestamp));

    scheduler.start();
    scheduler.start();
    scheduler.stop();
    worker.tick();

    assertEquals(worker.messages, [
      { type: "start", lookaheadTimeMs: 50 },
      { type: "stop" },
    ]);
    assertEquals(scheduled, [0]);
  });
});

Deno.test("late callbacks skip steps without moving the beat grid", () => {
  withFakeWorker(() => {
    const clock = { currentTime: 0 };
    const scheduler = new Scheduler(clock as AudioContext, 120);
    const worker = scheduler.worker as unknown as FakeWorker;
    const scheduled: number[] = [];

    scheduler.startDelay = 0;
    scheduler.addEventListener((timestamp) => scheduled.push(timestamp));
    scheduler.start();

    clock.currentTime = 0.6;
    worker.tick();

    // Sixteenth notes at 120 BPM land every 0.125 seconds. The late tick
    // skips missed notes, then resumes on that original grid at 0.625.
    assertEquals(scheduled, [0, 0.625]);
  });
});

Deno.test("tempo changes begin at the first unscheduled step", () => {
  withFakeWorker(() => {
    const clock = { currentTime: 0 };
    const scheduler = new Scheduler(clock as AudioContext, 120);
    const worker = scheduler.worker as unknown as FakeWorker;
    const scheduled: number[] = [];

    scheduler.startDelay = 0;
    scheduler.addEventListener((timestamp) => scheduled.push(timestamp));
    scheduler.start();
    scheduler.setBPM(60);

    clock.currentTime = 0.1;
    worker.tick();
    clock.currentTime = 0.3;
    worker.tick();

    assertEquals(scheduled, [0, 0.125, 0.375]);
  });
});

Deno.test("rejects invalid BPM values", () => {
  for (const bpm of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    let threw = false;
    try {
      new Scheduler({ currentTime: 0 } as AudioContext, bpm);
    } catch (error) {
      threw = error instanceof RangeError;
    }
    assertEquals(threw, true);
  }
});
