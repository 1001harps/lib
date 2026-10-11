export function makeResonator(
  context: BaseAudioContext,
  freq: number,
  decay: number,
  gain: number,
  hpFreq = 50,
  startTime = context.currentTime,
): GainNode | BiquadFilterNode {
  const osc = context.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;

  const env = context.createGain();
  env.gain.setValueAtTime(gain, startTime);
  env.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

  let lastNode = env;

  // optionally add a highpass to remove sub/DC
  if (hpFreq) {
    const hp = context.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = hpFreq;
    env.connect(hp);
    lastNode = hp;
  }

  osc.connect(env);

  // clean up connections after done
  osc.start(startTime);
  osc.stop(startTime + decay);
  osc.onended = () => {
    osc.disconnect();
    env.disconnect();
    if (hpFreq) lastNode.disconnect();
  };

  return lastNode;
}

export function playTom(
  context: BaseAudioContext,
  freq = 320,
  decay = 0.35,
  gain = 0.5,
  startTime = context.currentTime,
  output: AudioNode = context.destination,
): void {
  const body = makeResonator(context, freq, decay, gain, 50, startTime);
  body.connect(output);
}

export function playSnare(
  context: BaseAudioContext,
  bodyFreq = 180,
  noiseDecay = 0.1,
  bodyDecay = 0.18,
  gain = 0.6,
  startTime = context.currentTime,
  output: AudioNode = context.destination,
): void {
  // resonator for "shell"
  const body = makeResonator(context, bodyFreq, bodyDecay, gain, 0, startTime); // no highpass for shell

  // snare wires (noise burst)
  const bufferSize = Math.floor(context.sampleRate * noiseDecay);
  const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const noise = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    noise[i] = Math.random() * 2 - 1;
  }

  const noiseSource = context.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  // bandpass filter for "snare wire" snap
  const noiseFilter = context.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 2300;
  noiseFilter.Q.value = 1.0;

  const noiseEnv = context.createGain();
  noiseEnv.gain.setValueAtTime(gain * 0.7, startTime);
  noiseEnv.gain.exponentialRampToValueAtTime(0.0001, startTime + noiseDecay);

  noiseSource.connect(noiseFilter).connect(noiseEnv);

  // mix and output
  const snareMix = context.createGain();
  snareMix.gain.value = 0.3;

  body.connect(snareMix);
  noiseEnv.connect(snareMix);
  snareMix.connect(output);

  // clean up after sound ends
  noiseSource.start(startTime);
  noiseSource.stop(startTime + noiseDecay);

  noiseSource.onended = () => {
    noiseSource.disconnect();
    noiseEnv.disconnect();
    noiseFilter.disconnect();
    snareMix.disconnect();
    // body oscillator cleans up itself
  };
}

export function playClap(
  context: BaseAudioContext,
  decay = 0.16,
  gain = 1.1,
  startTime = context.currentTime,
  output: AudioNode = context.destination,
): void {
  const t = startTime;

  // noise source
  const bufferSize = Math.floor(context.sampleRate * (decay + 0.09));
  const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noiseSource = context.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  // lower bandpass filter
  const bp = context.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1250; // lower center
  bp.Q.value = 0.55; // fatter, less nasal

  // gentle highpass or none
  const hp = context.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 300; // not too high, keeps low “chunk”

  // envelope with four decaying bursts
  const env = context.createGain();
  env.gain.value = 0;

  noiseSource.connect(bp).connect(hp).connect(env);

  // multi-burst envelope
  const burstT = [0.0, 0.021, 0.047, 0.085];
  const burstA = [gain, gain * 0.8, gain * 0.6, gain * 0.45];
  burstT.forEach((delay, i) => {
    env.gain.setValueAtTime(burstA[i], t + delay);
    env.gain.linearRampToValueAtTime(0.0001, t + delay + 0.013);
  });
  env.gain.setValueAtTime(0.0006, t + 0.12);
  env.gain.linearRampToValueAtTime(0.00001, t + decay + 0.07);

  // output
  const out = context.createGain();
  out.gain.value = 0.6;
  env.connect(out);
  out.connect(output);

  // play and clean up
  noiseSource.start(t);
  noiseSource.stop(t + decay + 0.11);

  noiseSource.onended = () => {
    noiseSource.disconnect();
    bp.disconnect();
    hp.disconnect();
    env.disconnect();
    out.disconnect();
  };
}

export function playKick(
  context: BaseAudioContext,
  startFreq = 72, // lower start frequency (Hz)
  endFreq = 38, // even lower end frequency for pure sub
  pitchDecay = 0.18, // slower sweep, long "boooom"
  ampDecay = 0.62, // long ring out
  gain = 1.2,
  startTime = context.currentTime,
  output: AudioNode = context.destination,
): void {
  const t = startTime;

  // sine oscillator for the body
  const osc = context.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(startFreq, t);
  osc.frequency.exponentialRampToValueAtTime(endFreq, t + pitchDecay);

  // amplitude envelope
  const env = context.createGain();
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + ampDecay);

  osc.connect(env).connect(output);

  // start and stop
  osc.start(t);
  osc.stop(t + ampDecay + 0.02);

  // clean up
  osc.onended = () => {
    osc.disconnect();
    env.disconnect();
  };
}

export function playHat(
  context: BaseAudioContext,
  decay = 0.07, // ~0.06 for closed, 0.21 for open
  gain = 0.38,
  isOpen = false, // if true, longer decay and louder
  startTime = context.currentTime,
  output: AudioNode = context.destination,
): void {
  const t = startTime;
  const actualDecay = isOpen ? 0.23 : decay;
  const actualGain = isOpen ? gain * 1.18 : gain;

  // noise burst
  const bufferSize = Math.floor(context.sampleRate * (actualDecay + 0.05));
  const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const noise = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) noise[i] = Math.random() * 2 - 1;

  const noiseSource = context.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  // filter chain: bandpass for "metallic" hat, highpass for "air"
  const bp = context.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 10400;
  bp.Q.value = 1.4;

  const hp = context.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7000;

  // envelope
  const env = context.createGain();
  env.gain.setValueAtTime(actualGain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + actualDecay);

  noiseSource.connect(bp).connect(hp).connect(env).connect(output);

  noiseSource.start(t);
  noiseSource.stop(t + actualDecay + 0.02);

  // clean up
  noiseSource.onended = () => {
    noiseSource.disconnect();
    bp.disconnect();
    hp.disconnect();
    env.disconnect();
  };
}
