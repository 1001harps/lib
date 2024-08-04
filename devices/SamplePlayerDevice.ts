import { fetchSample, Sample } from "../audio";
import { AttackReleaseEnv } from "./shared";
import { Device } from "./types";

export interface SamplePlayerParams {
  volume: number;
  sample: number;
  octave: number;
  filterCutoff: number;
  filterRes: number;
  filterEnvMod: number;
  attack: number;
  release: number;
}

export class SamplePlayerDevice implements Device {
  context: AudioContext | undefined;
  samples: Sample[] = [];

  sampleFiles: string[];

  static defaultParams = {
    volume: 0.75,
    sample: 0,
    octave: 0.4,
    filterCutoff: 0.5,
    filterRes: 0,
    filterEnvMod: 0,
    attack: 0,
    release: 0.3,
  };

  params = SamplePlayerDevice.defaultParams;

  constructor(sampleFiles: string[]) {
    this.sampleFiles = sampleFiles;
  }

  setParam(param: keyof SamplePlayerParams, value: number) {
    this.params[param] = value;
  }

  getSampleIndex() {
    return Math.floor(this.params.sample * (this.samples.length - 1));
  }

  async init(context: AudioContext): Promise<void> {
    this.context = context;

    const samples = await Promise.all(
      this.sampleFiles.map(async (x) => {
        const sample = await fetchSample(context, x, x);
        return {
          name: sample.name,
          sample: new Sample(context, sample.name, sample.buffer),
        };
      })
    );

    this.samples = samples.map((x) => x.sample);
  }

  trigger(note: number, timestamp: number): void {
    if (!this.context) return;

    const sample = this.samples[this.getSampleIndex()] as Sample;

    const env = new AttackReleaseEnv(this.context);
    env.attack = this.params.attack;
    env.release = this.params.release;

    // filter, TODO: replace this with something nicer
    const filter = this.context.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = this.params.filterCutoff * 7000;
    filter.Q.value = this.params.filterRes * 30;

    // gain node
    const gainNode = this.context.createGain();
    gainNode.gain.value = 0.8 * this.params.volume * 1.5;

    env.gainNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.context.destination);

    env.trigger(timestamp);
    sample.play(env.gainNode, note, timestamp);
  }

  noteOn(note: number, timestamp: number): void {
    throw new Error("Method not implemented.");
  }

  noteOff(note: number): void {
    throw new Error("Method not implemented.");
  }
}
