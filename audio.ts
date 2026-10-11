import { midiNoteToFrequency } from "./midi/index.ts";

export type SampleSource =
  | string
  | {
    path: string;
    name?: string;
    rootNote?: number;
  };

export const fetchSample = (
  context: AudioContext,
  path: string,
  name: string,
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

export const loadSample = async (
  context: AudioContext,
  source: SampleSource,
): Promise<Sample> => {
  if (typeof source === "string") {
    source = { path: source };
  }

  const { path, name = path, rootNote = 60 } = source;
  const sample = await fetchSample(context, path, name);

  return new Sample(context, sample.name, sample.buffer, rootNote);
};

export class Sample {
  context: AudioContext;
  name: string;
  buffer: AudioBuffer;
  rootNote: number;

  constructor(
    context: AudioContext,
    name: string,
    buffer: AudioBuffer,
    rootNote = 60,
  ) {
    this.context = context;
    this.name = name;
    this.buffer = buffer;
    this.rootNote = rootNote;
  }

  play(destination: AudioNode, note: number, timestamp: number) {
    const source = this.context.createBufferSource();
    source.buffer = this.buffer;

    const rootFrequency = midiNoteToFrequency(this.rootNote);
    const targetFrequency = midiNoteToFrequency(note);

    const rate = targetFrequency / rootFrequency;
    source.playbackRate.value = rate;

    source.connect(destination);
    source.start(timestamp);

    return source;
  }
}
