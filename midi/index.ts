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

const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;

/**
 * Returns the first available MIDI output
 *
 * @returns MIDIOutput
 */
export const getFirstMidiOutput = async (): Promise<WebMidi.MIDIOutput> => {
  const midiAccess = await navigator.requestMIDIAccess();

  const outputs = midiAccess.outputs.values();

  for (let output of outputs) {
    return output;
  }

  throw "failed to get midi output";
};

//
/**
 * Simple note trigger, note on with immediate note off
 *
 * @param midiOutput MIDIOutput to send the trigger on
 * @param note The MIDI note number
 * @param number The MIDI channel number
 */
export const triggerNote = function (
  midiOutput: WebMidi.MIDIOutput,
  channel: number,
  note: number
) {
  if (!midiOutput) {
    throw "no midi output";
  }

  midiOutput.send([NOTE_ON | channel, note, 127]);

  setTimeout(() => {
    midiOutput.send([NOTE_OFF | channel, note, 127]);
  }, 1);
};
