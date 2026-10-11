import { Sample } from "../../audio.ts";
import { SynthVoiceOutput } from "./SynthVoiceOutput.ts";
import type { SynthVoiceOutputParams } from "./SynthVoiceOutput.ts";
import type { ManagedVoice } from "./VoiceManager.ts";

const OUTPUT_GAIN = 0.8 * 1.5;

export class SampleSynthVoice implements ManagedVoice {
  output: SynthVoiceOutput;
  source?: AudioBufferSourceNode;
  sample: Sample;

  constructor(context: AudioContext, sample: Sample, output?: AudioNode) {
    this.sample = sample;
    this.output = new SynthVoiceOutput(context, output);
  }

  apply(
    params: SynthVoiceOutputParams,
    outputGainMultiplier: number,
    timestamp: number,
  ): void {
    this.output.apply(params, timestamp, OUTPUT_GAIN * outputGainMultiplier);
  }

  trigger(note: number, timestamp: number): void {
    this.output.trigger(timestamp);
    this.source = this.sample.play(this.output.input, note, timestamp);
  }

  stop(timestamp: number, fadeOut = false): void {
    const stopTime = fadeOut ? this.output.fadeOut(timestamp) : timestamp;
    this.source?.stop(stopTime);
  }
}
