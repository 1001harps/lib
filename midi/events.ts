export type MidiEvent =
  | {
      type: "note_on";
      note: number;
    }
  | {
      type: "note_off";
      note: number;
    };
