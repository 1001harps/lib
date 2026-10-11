import { SynthVoiceOutput } from "./SynthVoiceOutput.ts";
import type { SynthVoiceOutputParams } from "./SynthVoiceOutput.ts";
import type { ManagedVoice } from "./VoiceManager.ts";

export type SubtractiveSynthVoiceParams = SynthVoiceOutputParams & {
  waveform: string;
  detune: number;
  lfoSpeed: number;
  lfoIntensity: number;
  lfoDestination: string;
};

const LFO_SCALES = {
  freq: 50,
  filterCutoff: 3500,
  volume: 0.25,
};

// Keeps the normal patch comfortably audible while leaving pre-filter
// headroom for two oscillators and resonant peaks.
const OSCILLATOR_MIX_GAIN = 0.6;

export class SubtractiveSynthVoice implements ManagedVoice {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  oscillatorMix: GainNode;
  output: SynthVoiceOutput;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  context: AudioContext;

  constructor(context: AudioContext, output?: AudioNode) {
    this.context = context;
    this.osc1 = context.createOscillator();
    this.osc2 = context.createOscillator();
    this.oscillatorMix = context.createGain();
    this.oscillatorMix.gain.value = OSCILLATOR_MIX_GAIN;
    this.output = new SynthVoiceOutput(context, output);

    this.lfo = context.createOscillator();
    this.lfo.type = "triangle";
    this.lfoGain = context.createGain();
    this.lfo.connect(this.lfoGain);

    this.osc1.connect(this.oscillatorMix);
    this.osc2.connect(this.oscillatorMix);
    this.oscillatorMix.connect(this.output.input);
  }

  trigger(timestamp: number): void {
    const startTime = timestamp === 0 ? this.context.currentTime : timestamp;
    this.osc1.start(startTime);
    this.osc2.start(startTime);
    this.lfo.start(startTime);
    this.output.trigger(timestamp);
  }

  stop(timestamp: number, fadeOut = false): void {
    const stopTime = fadeOut ? this.output.fadeOut(timestamp) : timestamp;

    this.osc1.stop(stopTime);
    this.osc2.stop(stopTime);
    this.lfo.stop(stopTime);
  }

  setPitch(freq: number, timestamp: number): void {
    this.osc1.frequency.setValueAtTime(freq, timestamp);
    this.osc2.frequency.setValueAtTime(freq, timestamp);
  }

  apply(params: SubtractiveSynthVoiceParams, timestamp: number): void {
    const waveform = params.waveform as OscillatorType;
    this.osc1.type = waveform;
    this.osc2.type = waveform;

    this.osc2.detune.setValueAtTime(params.detune * 50, timestamp);
    this.output.apply(params, timestamp);

    this.lfo.frequency.setValueAtTime(params.lfoSpeed, timestamp);
    const lfoIntensity = Math.max(0, Math.min(1, params.lfoIntensity));
    const lfoAmount = lfoIntensity *
      LFO_SCALES[params.lfoDestination as keyof typeof LFO_SCALES];
    this.lfoGain.gain.setValueAtTime(lfoAmount, timestamp);

    switch (params.lfoDestination) {
      case "freq":
        this.lfoGain.connect(this.osc1.detune);
        this.lfoGain.connect(this.osc2.detune);
        break;
      case "filterCutoff":
        this.lfoGain.connect(this.output.filter.node.frequency);
        break;
      case "volume":
        this.lfoGain.connect(this.output.volume.gain);
        break;
    }
  }
}
