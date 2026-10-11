import type { AttackReleaseEnv } from "./AttackReleaseEnv.ts";

export type SynthFilterParams = {
  filterCutoff: number;
  filterRes: number;
  filterEnvMod: number;
};

const MIN_FREQUENCY = 40;
const FREQUENCY_RANGE = 7000;
const MAX_Q = 12;

export class SynthFilter {
  node: BiquadFilterNode;

  envelopeAmount: GainNode;

  constructor(context: AudioContext, envelope: AttackReleaseEnv) {
    this.node = context.createBiquadFilter();
    this.node.type = "lowpass";

    this.envelopeAmount = envelope.connect(this.node.frequency, 0);
  }

  apply(params: SynthFilterParams, timestamp: number): void {
    const cutoff = Math.max(0, Math.min(1, params.filterCutoff));
    const envelope = Math.max(0, Math.min(1, params.filterEnvMod));
    const resonance = Math.max(0, Math.min(1, params.filterRes));

    const frequency = MIN_FREQUENCY + cutoff * FREQUENCY_RANGE;

    this.node.frequency.setValueAtTime(frequency, timestamp);
    this.node.Q.setValueAtTime(0.5 + resonance ** 2 * (MAX_Q - 0.5), timestamp);
    this.envelopeAmount.gain.setValueAtTime(
      envelope * FREQUENCY_RANGE,
      timestamp,
    );
  }
}
