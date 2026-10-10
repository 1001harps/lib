import { fetchSample, Sample } from "../audio";
import { EventListener } from "../common/events";
import { AttackReleaseEnv } from "./components/AttackReleaseEnv";
import { numberParam } from "./types";
import type { Device, DeviceParam, DeviceEvent } from "./types";

export class SampleSynth extends EventListener<DeviceEvent> implements Device {
  name = "SampleSynth";

  context: AudioContext | undefined;
  samples: Sample[] = [];
  outputGainMultiplier = 1;

  sampleFiles: string[];

  static initialState = {
    volume: 0.75,
    sample: 0,
    octave: 0,
    filterCutoff: 0.5,
    filterRes: 0,
    filterEnvMod: 0,
    attack: 0,
    release: 0.3,
  };

  state = SampleSynth.initialState;

  params: DeviceParam[] = [
    numberParam("volume"),
    numberParam("sample"),
    numberParam("octave", -2, 2, 1),
    numberParam("filterCutoff"),
    numberParam("filterRes"),
    numberParam("filterEnvMod"),
    numberParam("attack"),
    numberParam("release"),
  ];

  constructor(sampleFiles: string[]) {
    super();
    this.sampleFiles = sampleFiles;
  }

  private getSampleIndex() {
    return Math.floor(this.state.sample * (this.samples.length - 1));
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
      }),
    );

    this.samples = samples.map((x) => x.sample);
  }

  trigger(note: number, timestamp: number): void {
    if (!this.context) return;

    const sample = this.samples[this.getSampleIndex()] as Sample;

    const env = new AttackReleaseEnv(this.context);
    env.attack = this.state.attack;
    env.release = this.state.release;

    // filter, TODO: replace this with something nicer
    const filter = this.context.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = this.state.filterCutoff * 7000;
    filter.Q.value = this.state.filterRes * 30;

    // gain node
    const gainNode = this.context.createGain();
    gainNode.gain.value =
      0.8 * this.state.volume * 1.5 * this.outputGainMultiplier;

    env.destination.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.context.destination);

    const offset = Math.floor(this.state.octave) * 12;

    env.trigger(timestamp);
    sample.play(env.destination, note + offset, timestamp);
  }

  noteOn(_note: number, _timestamp: number): void {
    throw new Error("Method not implemented.");
  }

  noteOff(_note: number): void {
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
