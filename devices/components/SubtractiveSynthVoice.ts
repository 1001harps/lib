import { AttackReleaseEnv } from "./AttackReleaseEnv";

export type SubtractiveSynthVoiceParams = {
  waveform: string;
  detune: number;
  filterCutoff: number;
  filterRes: number;
  filterEnvMod: number;
  volume: number;
  attack: number;
  release: number;
  lfoSpeed: number;
  lfoIntensity: number;
  lfoDestination: string;
};

const LFO_SCALES = {
  freq: 50,
  filterCutoff: 3500,
  volume: 0.25,
};

export class SubtractiveSynthVoice {
  env: AttackReleaseEnv;
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  filter: BiquadFilterNode;
  filterEnvGain: GainNode;
  gain: GainNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  lastFreq = 0;

  constructor(context: AudioContext) {
    this.env = new AttackReleaseEnv(context);

    this.osc1 = context.createOscillator();
    this.osc2 = context.createOscillator();

    this.filter = context.createBiquadFilter();
    this.filter.type = "lowpass";

    this.gain = context.createGain();

    this.lfo = context.createOscillator();
    this.lfo.type = "triangle";
    this.lfoGain = context.createGain();
    this.lfo.connect(this.lfoGain);

    this.filterEnvGain = context.createGain();
    this.env.destination.connect(this.filterEnvGain);
    this.filterEnvGain.connect(this.filter.frequency);

    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);
    this.filter.connect(this.env.destination);
    this.env.destination.connect(this.gain);
    this.gain.connect(context.destination);

    this.osc1.start();
    this.osc2.start();
    this.lfo.start();
  }

  trigger(timestamp: number): void {
    this.env.trigger(timestamp);
  }

  setPitch(freq: number, glide: number, now: number): void {
    this.osc1.frequency.cancelScheduledValues(now);
    this.osc2.frequency.cancelScheduledValues(now);
    if (glide === 0 || this.lastFreq === 0) {
      this.osc1.frequency.setValueAtTime(freq, now);
      this.osc2.frequency.setValueAtTime(freq, now);
    } else {
      this.osc1.frequency.setValueAtTime(this.lastFreq, now);
      this.osc2.frequency.setValueAtTime(this.lastFreq, now);
      this.osc1.frequency.linearRampToValueAtTime(freq, now + glide);
      this.osc2.frequency.linearRampToValueAtTime(freq, now + glide);
    }
    this.lastFreq = freq;
  }

  apply(params: SubtractiveSynthVoiceParams): void {
    this.osc1.type = params.waveform as OscillatorType;
    this.osc2.type = params.waveform as OscillatorType;
    this.osc2.detune.value = params.detune * 50;

    this.filter.frequency.value = params.filterCutoff * 7000;
    this.filter.Q.value = params.filterRes * 30;
    this.filterEnvGain.gain.value = params.filterEnvMod * 7000;
    this.gain.gain.value = params.volume;

    this.env.attack = params.attack;
    this.env.release = params.release;

    this.lfo.frequency.value = params.lfoSpeed;
    this.lfoGain.disconnect();
    this.lfoGain.gain.value =
      params.lfoIntensity *
      LFO_SCALES[params.lfoDestination as keyof typeof LFO_SCALES];
    switch (params.lfoDestination) {
      case "freq":
        this.lfoGain.connect(this.osc1.detune);
        this.lfoGain.connect(this.osc2.detune);
        break;
      case "filterCutoff":
        this.lfoGain.connect(this.filter.frequency);
        break;
      case "volume":
        this.lfoGain.connect(this.gain.gain);
        break;
    }
  }
}
