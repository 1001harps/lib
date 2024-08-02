import { midiNoteToFrequency } from "./midi.ts";

export const fetchSample = (
  context: AudioContext,
  path: string,
  name: string
): Promise<{
  buffer: AudioBuffer;
  name: string;
}> => {
  return new Promise<{ buffer: AudioBuffer; name: string }>((resolve, reject) =>
    fetch(path)
      .then((r) => r.arrayBuffer())
      .then((buffer) => context.decodeAudioData(buffer))
      .then((buffer) => resolve({ buffer, name }))
      .catch((err) => reject(err))
  );
};

export class Sample {
  context: AudioContext;
  name: string;
  buffer: AudioBuffer;

  constructor(context: AudioContext, name: string, buffer: AudioBuffer) {
    this.context = context;
    this.name = name;
    this.buffer = buffer;
  }

  play(destination: AudioNode, note: number, timestamp: number) {
    const source = this.context.createBufferSource();
    source.buffer = this.buffer;

    const rootFrequency = midiNoteToFrequency(60);
    const targetFrequency = midiNoteToFrequency(note);

    const rate = targetFrequency / rootFrequency;
    source.playbackRate.value = rate;

    source.connect(destination);
    source.start(timestamp);
  }
}
