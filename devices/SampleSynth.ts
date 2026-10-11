import type { SampleSource } from "../audio.ts";
import { loadSample, Sample } from "../audio.ts";
import { EventListener } from "../common/events.ts";
import { SampleSynthVoice } from "./components/SampleSynthVoice.ts";
import { VoiceManager } from "./components/VoiceManager.ts";
import type { Device, DeviceEvent, DeviceParam } from "./types.ts";
import { numberParam } from "./types.ts";

export class SampleSynth extends EventListener<DeviceEvent> implements Device {
  name = "SampleSynth";

  context: AudioContext | undefined;
  samples: Sample[] = [];
  outputGainMultiplier = 1;
  polyphonic = true;

  voices = new VoiceManager();

  sampleSources: SampleSource[];

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

  state = { ...SampleSynth.initialState };

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

  constructor(sampleSources: SampleSource[]) {
    super();
    this.sampleSources = sampleSources;
  }

  private getSampleIndex() {
    return Math.floor(this.state.sample * (this.samples.length - 1));
  }

  async init(context: AudioContext): Promise<void> {
    this.context = context;

    this.samples = await Promise.all(
      this.sampleSources.map((source) => loadSample(context, source)),
    );
  }

  trigger(note: number, timestamp: number): void {
    if (!this.context) return;

    const sample = this.samples[this.getSampleIndex()] as Sample;
    if (!sample) return;

    const offset = Math.floor(this.state.octave) * 12;
    const now = timestamp === 0 ? this.context.currentTime : timestamp;
    const endTime = now + this.state.attack + this.state.release;

    const voice = new SampleSynthVoice(this.context, sample);
    voice.apply(this.state, this.outputGainMultiplier, now);
    voice.trigger(note + offset, timestamp);

    this.voices.add(voice, now, endTime, this.polyphonic);
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
