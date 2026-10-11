import { numberParam } from "./types.ts";
import type { Device, DeviceEvent, DeviceParam } from "./types.ts";
import { loadSample, Sample } from "../audio.ts";
import { EventListener } from "../common/events.ts";

export class SampleBank extends EventListener<DeviceEvent> implements Device {
  name = "SampleBank";

  files: string[];

  context?: AudioContext;
  output?: AudioNode;
  samples: Sample[] = [];
  outputGainMultiplier = 1;

  static initialState = {
    volume: 0.75,
  };

  state = SampleBank.initialState;

  params = [numberParam("volume")];

  constructor(files: string[]) {
    super();
    this.files = files;
  }

  async init(
    context: AudioContext,
    output: AudioNode = context.destination,
  ): Promise<void> {
    this.context = context;
    this.output = output;

    this.samples = await Promise.all(
      this.files.map((filename) => loadSample(context, filename)),
    );
  }

  trigger(note: number, timestamp: number): void {
    const sample = this.samples[note];

    if (!sample || !this.context || !this.output) return;

    const gainNode = this.context.createGain();
    gainNode.gain.value = this.state.volume * this.outputGainMultiplier;
    gainNode.connect(this.output);

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
