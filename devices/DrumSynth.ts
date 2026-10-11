import { EventListener } from "../common/events.ts";
import { numberParam } from "./types.ts";
import type { Device, DeviceEvent, DeviceParam } from "./types.ts";
import {
  playKick,
  playSnare,
  playClap,
  playHat,
  playTom,
} from "./components/synth-drum.ts";

export class DrumSynth extends EventListener<DeviceEvent> implements Device {
  name = "DrumSynth";

  context?: AudioContext;
  gainNode?: GainNode;

  static initialState = {
    volume: 0.75,
    "kick tune": 38,
    "kick punch": 0.18,
    "kick decay": 0.62,
    "snare tune": 180,
    "snare snap": 0.1,
    "snare decay": 0.18,
    "clap decay": 0.16,
    "hh decay": 0.38,
    "tom tune": 1,
    "tom decay": 0.35,
  };

  state = DrumSynth.initialState;

  params = [
    numberParam("volume"),
    numberParam("kick tune", 25, 100),
    numberParam("kick punch", 0.02, 0.5),
    numberParam("kick decay", 0.05, 2),
    numberParam("snare tune", 80, 400),
    numberParam("snare snap", 0.02, 0.5),
    numberParam("snare decay", 0.05, 1),
    numberParam("clap decay", 0.05, 1),
    numberParam("hh decay", 0.05, 2),
    numberParam("tom tune", 0.5, 2),
    numberParam("tom decay", 0.05, 2),
  ];

  async init(context: AudioContext, output: AudioNode = context.destination) {
    this.context = context;
    this.gainNode = context.createGain();
    this.gainNode.connect(output);
  }

  trigger(note: number, timestamp: number): void {
    if (!this.context) return;

    this.gainNode.gain.value = this.state.volume;

    if (note === 0)
      playKick(
        this.context,
        72,
        this.state["kick tune"],
        this.state["kick punch"],
        this.state["kick decay"],
        0.7,
        timestamp,
        this.gainNode,
      );
    if (note === 1)
      playSnare(
        this.context,
        this.state["snare tune"],
        this.state["snare snap"],
        this.state["snare decay"],
        0.6,
        timestamp,
        this.gainNode,
      );
    if (note === 2)
      playClap(
        this.context,
        this.state["clap decay"],
        1.1,
        timestamp,
        this.gainNode,
      );
    if (note === 3)
      playHat(
        this.context,
        this.state["hh decay"],
        0.36,
        false,
        timestamp,
        this.gainNode,
      );
    if (note === 4)
      playHat(
        this.context,
        this.state["hh decay"],
        0.36,
        true,
        timestamp,
        this.gainNode,
      );
    if (note === 5)
      playTom(
        this.context,
        320 * this.state["tom tune"],
        this.state["tom decay"],
        0.5,
        timestamp,
        this.gainNode,
      );
    if (note === 6)
      playTom(
        this.context,
        500 * this.state["tom tune"],
        this.state["tom decay"],
        0.5,
        timestamp,
        this.gainNode,
      );
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
