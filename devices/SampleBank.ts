import { numberParam } from "./types.ts";
import type { Device, DeviceEvent, DeviceParam } from "./types.ts";
import { Sample, fetchSample } from "../audio.ts";
import { EventListener } from "../common/events.ts";

export class SampleBank extends EventListener<DeviceEvent> implements Device {
  name = "SampleBank";

  files: string[];

  context?: AudioContext;
  samples: Sample[] = [];

  static initialState = {
    volume: 0.75,
  };

  state = SampleBank.initialState;

  params = [numberParam("volume")];

  constructor(files: string[]) {
    super();
    this.files = files;
  }

  async init(context: AudioContext): Promise<void> {
    this.context = context;

    const sampleData = await Promise.all(
      this.files.map((filename) => fetchSample(context, filename, filename)),
    );

    this.samples = sampleData.map((s) => new Sample(context, s.name, s.buffer));
  }

  trigger(note: number, timestamp: number): void {
    const sample = this.samples[note];

    if (!sample || !this.context) return;

    const gainNode = this.context.createGain();
    gainNode.gain.value = this.state.volume;
    gainNode.connect(this.context.destination);

    sample.play(gainNode, 60, timestamp);
  }

  noteOn(_note: number, _timestamp: number): void {
    throw new Error("Method not implemented.");
  }

  noteOff(_note: number, _timestamp: number): void {
    throw new Error("Method not implemented.");
  }

  update<T extends DeviceParam>(param: T, value: number | string): void {
    // @ts-ignore
    this.state[param.name] = value;

    this.notify({
      type: "param_change",
      param,
    });
  }
}
