import { EventListener } from "../common/events.ts";
import { midiNoteToFrequency } from "../midi/index.ts";
import { SubtractiveSynthVoice } from "./components/SubtractiveSynthVoice.ts";
import { VoiceManager } from "./components/VoiceManager.ts";
import { numberParam, selectParam } from "./types.ts";
import type { Device, DeviceEvent, DeviceParam } from "./types.ts";

export class SubtractiveSynth extends EventListener<DeviceEvent>
  implements Device {
  name = "SubtractiveSynth";

  context?: AudioContext;
  polyphonic = false;

  voices = new VoiceManager();

  static initialState = {
    volume: 0.5,
    waveform: "sine",
    octave: 0,
    attack: 0.01,
    release: 0.1,
    filterCutoff: 0.5,
    filterRes: 0,
    filterEnvMod: 0,
    detune: 0,
    lfoSpeed: 4,
    lfoIntensity: 0,
    lfoDestination: "freq",
  };

  state = { ...SubtractiveSynth.initialState };

  params: DeviceParam[] = [
    numberParam("volume", 0, 1),
    selectParam("waveform", ["sine", "triangle", "sawtooth", "square"]),
    numberParam("attack", 0.01, 2),
    numberParam("release", 0.1, 2),
    numberParam("octave", -2, 2, 1),
    numberParam("filterCutoff"),
    numberParam("filterRes"),
    numberParam("filterEnvMod"),
    numberParam("detune"),
    numberParam("lfoSpeed", 0.1, 20),
    numberParam("lfoIntensity"),
    selectParam("lfoDestination", ["freq", "filterCutoff", "volume"]),
  ];

  async init(context: AudioContext) {
    this.context = context;
  }

  trigger(note: number, timestamp: number): void {
    if (!this.context) return;

    const now = timestamp === 0 ? this.context.currentTime : timestamp;
    const voice = new SubtractiveSynthVoice(this.context);
    const endTime = now + this.state.attack + this.state.release;

    const offset = Math.floor(this.state.octave) * 12;
    const freq = midiNoteToFrequency(note + offset);

    voice.setPitch(freq, now);
    voice.apply(this.state, now);
    voice.trigger(timestamp);

    this.voices.add(voice, now, endTime, this.polyphonic);
  }

  noteOn(_note: number, _timestamp: number): void {
    throw new Error("Method not implemented.");
  }

  noteOff(_note: number, _timestamp: number): void {
    throw new Error("Method not implemented.");
  }

  update<T extends DeviceParam>(param: T, value: number | string) {
    // @ts-ignore
    this.state[param.name] = value;
    this.notify({ type: "param_change", param });
  }
}
