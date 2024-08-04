import { Device } from "./types.ts";
import { Sample, fetchSample } from "../audio.ts";

export interface SampleBankParams {
  volume: number;
}

export class SampleBankDevice implements Device {
  files: string[];

  context?: AudioContext;
  samples: Sample[] = [];

  static defaultSampleBankParams = {
    volume: 0.75,
  };

  params = SampleBankDevice.defaultSampleBankParams;

  setParam(param: keyof SampleBankParams, value: number) {
    this.params[param] = value;
  }

  constructor(files: string[]) {
    this.files = files;
  }

  async init(context: AudioContext): Promise<void> {
    this.context = context;

    const sampleData = await Promise.all(
      this.files.map((filename) => fetchSample(context, filename, filename))
    );

    this.samples = sampleData.map((s) => new Sample(context, s.name, s.buffer));
  }

  trigger(note: number, timestamp: number): void {
    const sample = this.samples[note];

    if (!sample || !this.context) return;

    const gainNode = this.context.createGain();
    gainNode.gain.value = this.params.volume;
    gainNode.connect(this.context.destination);

    sample.play(gainNode, 60, timestamp);
  }

  noteOn(note: number, timestamp: number): void {
    throw new Error("Method not implemented.");
  }

  noteOff(note: number, timestamp: number): void {
    throw new Error("Method not implemented.");
  }
}
