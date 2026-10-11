import { AttackReleaseEnv } from "./AttackReleaseEnv.ts";
import { SynthFilter } from "./SynthFilter.ts";
import type { SynthFilterParams } from "./SynthFilter.ts";

export type SynthVoiceOutputParams = SynthFilterParams & {
  volume: number;
  attack: number;
  release: number;
};

const AMPLITUDE_ENV_AMOUNT = 0.3;
const VOICE_STEAL_FADE_SECONDS = 0.005;

export class SynthVoiceOutput {
  filter: SynthFilter;
  volume: GainNode;
  env: AttackReleaseEnv;
  amplitude: GainNode;
  voiceGain: GainNode;

  constructor(
    context: AudioContext,
    output: AudioNode = context.destination,
  ) {
    this.env = new AttackReleaseEnv(context);
    this.filter = new SynthFilter(context, this.env);
    this.amplitude = context.createGain();
    this.amplitude.gain.value = 0;
    this.volume = context.createGain();
    this.voiceGain = context.createGain();

    this.filter.node.connect(this.amplitude);
    this.amplitude.connect(this.volume);
    this.volume.connect(this.voiceGain);
    this.voiceGain.connect(output);

    this.env.connect(this.amplitude.gain, AMPLITUDE_ENV_AMOUNT);
  }

  get input(): AudioNode {
    return this.filter.node;
  }

  apply(
    params: SynthVoiceOutputParams,
    timestamp: number,
    volumeMultiplier = 1,
  ): void {
    this.env.attack = params.attack;
    this.env.release = params.release;
    this.filter.apply(params, timestamp);
    this.volume.gain.setValueAtTime(
      params.volume * volumeMultiplier,
      timestamp,
    );
  }

  trigger(timestamp: number): void {
    this.env.trigger(timestamp);
  }

  fadeOut(timestamp: number): number {
    const stopTime = timestamp + VOICE_STEAL_FADE_SECONDS;
    this.voiceGain.gain.cancelScheduledValues(timestamp);
    this.voiceGain.gain.setValueAtTime(1, timestamp);
    this.voiceGain.gain.linearRampToValueAtTime(0, stopTime);
    return stopTime;
  }
}
