import { EventListener } from "../common/events.ts";
import { createDynamicWorker } from "./worker.ts";

const createTimerWorker = () => {
  const script = `
  let timer = null;

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }
  
  self.onmessage = function (e) {
    switch (e.data.type) {
      case "start": {
        stopTimer();
        timer = setInterval(() => postMessage("tick"), e.data.lookaheadTimeMs);
        break;
      }
      case "stop": {
        stopTimer();
        break;
      }
    }
  };
  `;

  return createDynamicWorker(script);
};

export class Scheduler extends EventListener<number> {
  audioContext: AudioContext;

  lookaheadTimeMs = 25.0;
  scheduleAheadTime = 0.2;
  startDelay = 0.05;
  nextNoteTime = 0.0;

  worker: Worker;

  playing = false;

  private _bpm = 120;
  private anchorTime = 0.0;
  private nextStep = 0;
  private lastScheduledTime: number | null = null;
  private disposed = false;

  private static readonly MAX_EVENTS_PER_TICK = 1_000;

  constructor(audioContext: AudioContext, initialBPM: number) {
    super();

    this.audioContext = audioContext;
    this.setBPM(initialBPM);

    this.worker = createTimerWorker();

    this.nextNoteTime = this.audioContext.currentTime;

    this.worker.onmessage = (e) => {
      if (e.data === "tick" && this.playing) {
        this.tick();
      }
    };
  }

  get bpm() {
    return this._bpm;
  }

  set bpm(bpm: number) {
    this.setBPM(bpm);
  }

  private get secondsPerStep() {
    return 15.0 / this._bpm;
  }

  private updateNextNoteTime() {
    this.nextNoteTime = this.anchorTime + this.nextStep * this.secondsPerStep;
  }

  private tick(allowCurrentTime = false) {
    const now = this.audioContext.currentTime;
    const scheduleAheadTime = this.requireFinitePositive(
      this.scheduleAheadTime,
      "scheduleAheadTime",
    );
    const secondsPerStep = this.secondsPerStep;

    // Skip missed steps while keeping the original musical grid. Resetting to
    // `now` here would turn every delayed timer callback into permanent drift.
    if (
      this.nextNoteTime < now ||
      (!allowCurrentTime && this.nextNoteTime === now)
    ) {
      const nextFutureStep =
        Math.floor((now - this.anchorTime) / secondsPerStep) + 1;
      this.nextStep = Math.max(this.nextStep, nextFutureStep);
      this.updateNextNoteTime();
    }

    const horizon = now + scheduleAheadTime;
    let eventsScheduled = 0;

    while (
      this.nextNoteTime < horizon &&
      eventsScheduled < Scheduler.MAX_EVENTS_PER_TICK
    ) {
      const scheduledTime = this.nextNoteTime;

      // Advance before notifying so a faulty listener cannot cause the same
      // step to be emitted repeatedly on subsequent timer callbacks.
      this.nextStep += 1;
      this.updateNextNoteTime();
      eventsScheduled += 1;
      this.lastScheduledTime = scheduledTime;

      this.notify(scheduledTime);
    }
  }

  start() {
    if (this.disposed) {
      throw new Error("Cannot start a disposed Scheduler");
    }
    if (this.playing) return;

    const lookaheadTimeMs = this.requireFinitePositive(
      this.lookaheadTimeMs,
      "lookaheadTimeMs",
    );
    const startDelay = this.requireFiniteNonNegative(
      this.startDelay,
      "startDelay",
    );
    this.requireFinitePositive(this.scheduleAheadTime, "scheduleAheadTime");

    this.anchorTime = this.audioContext.currentTime + startDelay;
    this.nextStep = 0;
    this.lastScheduledTime = null;
    this.updateNextNoteTime();
    this.playing = true;

    this.worker.postMessage({
      type: "start",
      lookaheadTimeMs,
    });

    // Fill the lookahead window immediately rather than waiting for the first
    // worker callback, whose arrival time is intentionally not precise.
    this.tick(true);
  }

  stop() {
    this.playing = false;

    this.worker.postMessage({
      type: "stop",
    });
  }

  togglePlaying() {
    this.playing ? this.stop() : this.start();
  }

  setBPM(bpm: number) {
    this.requireFinitePositive(bpm, "bpm");
    if (bpm === this._bpm) return;

    if (this.playing) {
      const now = this.audioContext.currentTime;
      const oldSecondsPerStep = this.secondsPerStep;
      const newSecondsPerStep = 15.0 / bpm;

      if (this.lastScheduledTime === null) {
        this.anchorTime = now;
      } else if (this.lastScheduledTime >= now) {
        this.anchorTime = this.lastScheduledTime + newSecondsPerStep;
      } else {
        const elapsed = now - this.lastScheduledTime;
        const plannedStepDuration = this.nextNoteTime - this.lastScheduledTime;
        const currentStepDuration =
          plannedStepDuration > 0 ? plannedStepDuration : oldSecondsPerStep;
        const progress = Math.min(elapsed / currentStepDuration, 1);
        this.anchorTime = now + (1 - progress) * newSecondsPerStep;
      }

      this.nextStep = 0;
    }

    this._bpm = bpm;
    if (this.playing) {
      this.updateNextNoteTime();
      this.tick(true);
    }
  }

  dispose() {
    if (this.disposed) return;

    this.stop();
    this.worker.onmessage = null;
    this.worker.terminate();
    this.disposed = true;
  }

  private requireFinitePositive(value: number, name: string) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${name} must be a finite number greater than zero`);
    }
    return value;
  }

  private requireFiniteNonNegative(value: number, name: string) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} must be a finite non-negative number`);
    }
    return value;
  }
}
