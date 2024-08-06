export * from "./events.ts";

export const midiNoteToFrequency = (note: number): number => {
  const a4 = 69;
  return 440 * Math.pow(2, (note - a4) / 12);
};
