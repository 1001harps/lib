export * from "./events.ts";

/**
   * Get the frequency of a MIDI note number 
   *
+  * @param note The MIDI note number
+  * @returns The frequency of the MIDI note
   */
export const midiNoteToFrequency = (note: number): number => {
  const a4 = 69;
  return 440 * Math.pow(2, (note - a4) / 12);
};
