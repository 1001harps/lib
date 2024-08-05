import { createDynamicWorker } from "./worker";

type SchedulerListener = (timestamp: number) => void;

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

export class Scheduler {
  audioContext: AudioContext;
  bpm = 120;

  listeners: SchedulerListener[] = [];

  lookaheadTimeMs = 50.0;
  scheduleAheadTime = 0.1;
  nextNoteTime = 0.0;

  worker: Worker;

  playing = false;

  constructor(audioContext: AudioContext, initialBPM: number) {
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
    while (
      this.nextNoteTime <
      this.audioContext.currentTime + this.scheduleAheadTime
    ) {
      this.listeners.forEach((l) => l(this.nextNoteTime));
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

  addEventListener(listener: SchedulerListener) {
    this.listeners.push(listener);
  }

  removeEventListener(listener: SchedulerListener) {
    this.listeners = this.listeners.filter((x) => x !== listener);
  }
}
