import { EventListener } from "../common/events";
import { MidiEvent } from "../midi/events";

const KEYS = "awsedftgyhujk".split("");

const OCTAVE_UP_KEY = "z";
const OCTAVE_DOWN_KEY = "x";

export class ComputerMidiKeyboard extends EventListener<MidiEvent> {
  octave = 4;

  constructor() {
    super();

    document.addEventListener("keydown", this.keyDownListener);
    document.addEventListener("keyup", this.keyUpListener);
  }

  [Symbol.dispose](): void {
    document.removeEventListener("keydown", this.keyDownListener);
    document.removeEventListener("keyup", this.keyUpListener);
  }

  private octaveUp() {
    this.octave = Math.min(this.octave + 1, 12);
  }

  private octaveDown() {
    this.octave = Math.max(this.octave - 1, 0);
  }

  private keyDownListener = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();

    if (KEYS.includes(key)) {
      this.notify({
        type: "note_on",
        note: KEYS.indexOf(key),
      });
    } else if (key === OCTAVE_UP_KEY) {
      this.octaveUp();
    } else if (key === OCTAVE_DOWN_KEY) {
      this.octaveDown();
    }
  };

  private keyUpListener = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();

    if (KEYS.includes(key)) {
      this.notify({
        type: "note_off",
        note: KEYS.indexOf(key),
      });
    }
  };
}
