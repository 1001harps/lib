import { EventListener } from "../common/events";
import { createDynamicWorker } from "./worker";

const createTimerWorker = () => {
  const script = `
  let timer = null;
  
  self.onmessage = function (e) {
    switch (e.data.type) {
      case "start": {
        timer = setInterval(() => postMessage("tick"), e.data.lookaheadTimeMs);
        break;
      }
      case "stop": {
        clearInterval(timer);
        break;
      }
    }
  };
  `;

  return createDynamicWorker(script);
};

export class Scheduler extends EventListener<number> {
  audioContext: AudioContext;
  bpm = 120;

  lookaheadTimeMs = 50.0;
  scheduleAheadTime = 0.1;
  nextNoteTime = 0.0;

  worker: Worker;

  playing = false;

  constructor(audioContext: AudioContext, initialBPM: number) {
    super();

    this.audioContext = audioContext;
    this.bpm = initialBPM;

    this.worker = createTimerWorker();

    this.nextNoteTime = this.audioContext.currentTime;

    this.worker.onmessage = (e) => {
      if (e.data === "tick") {
        this.tick();
      }
    };
  }

  private tick() {
    const now = this.audioContext.currentTime;

    // If we're behind, resync to current time
    if (this.nextNoteTime < now) {
      this.nextNoteTime = now;
    }

    while (this.nextNoteTime < now + this.scheduleAheadTime) {
      this.notify(this.nextNoteTime);
      const secondsPerBeat = 60.0 / this.bpm;
      this.nextNoteTime += 0.25 * secondsPerBeat;
    }
  }
  start() {
    this.nextNoteTime = this.audioContext.currentTime;

    this.worker.postMessage({
      type: "start",
      lookaheadTimeMs: this.lookaheadTimeMs,
    });

    this.playing = true;
  }

  stop() {
    this.worker.postMessage({
      type: "stop",
      lookaheadTimeMs: this.lookaheadTimeMs,
    });

    this.playing = false;
  }

  togglePlaying() {
    this.playing ? this.stop() : this.start();
  }

  setBPM(bpm: number) {
    this.bpm = bpm;
  }
}
