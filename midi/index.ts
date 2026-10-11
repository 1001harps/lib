import { EventListener } from "../common/events.ts";

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

export const NOTE_ON = 0x90;
export const NOTE_OFF = 0x80;

export type MidiMessageEvent =
  | {
      type: "note_on";
      channel: number;
      note: number;
      velocity: number;
    }
  | {
      type: "note_off";
      channel: number;
      note: number;
      velocity: number;
    }
  // TODO: other message types
  | {
      type: "other";
      raw: Uint8Array<ArrayBuffer>;
    };

/**
 * Provides access to Web MIDI input and output devices and emits incoming MIDI messages.
 */
export class MIDI extends EventListener<MidiMessageEvent> {
  #midi?: MIDIAccess;

  inputId = "";
  outputId = "";

  constructor() {
    super();
  }

  async init() {
    this.#midi = await navigator.requestMIDIAccess();

    const inputs = this.inputs();
    for (const input of inputs) {
      this.inputId = input.id;
      break;
    }

    const outputs = this.outputs();
    for (const output of outputs) {
      this.outputId = output.id;
      break;
    }

    const input = this.midi().inputs.get(this.inputId);

    if (input) {
      input.onmidimessage = this.#onmessage.bind(this);
    }
  }

  static async create(): Promise<MIDI> {
    const midi = new MIDI();
    await midi.init();
    return midi;
  }

  #onmessage(ev: MIDIMessageEvent) {
    if (!ev.data) return;

    const [status, note, velocity] = ev.data;
    const channel = status & 0x0f;
    const command = status & 0xf0;

    if (command === NOTE_ON) {
      this.notify({
        type: velocity === 0 ? "note_off" : "note_on",
        channel,
        note,
        velocity,
      });
    } else if (command === NOTE_OFF) {
      this.notify({ type: "note_off", channel, note, velocity });
    } else {
      this.notify({ type: "other", raw: ev.data });
    }
  }

  midi(): MIDIAccess {
    if (!this.#midi) throw "MIDIAccess not initialised";
    return this.#midi;
  }

  inputs(): IterableIterator<MIDIInput> {
    return this.midi().inputs.values();
  }

  outputs(): IterableIterator<MIDIOutput> {
    return this.midi().outputs.values();
  }

  input(): MIDIInput {
    const input = this.midi().inputs.get(this.inputId);
    if (!input) throw new Error(`MIDI input ${this.inputId} not found`);
    return input;
  }

  output(): MIDIOutput {
    const output = this.midi().outputs.get(this.outputId);
    if (!output) throw new Error(`MIDI output ${this.outputId} not found`);
    return output;
  }

  selectInput(id: string) {
    // clear prev listener
    const previous = this.midi().inputs.get(this.inputId);
    if (previous) previous.onmidimessage = null;

    this.inputId = id;

    const input = this.midi().inputs.get(id);
    if (!input) throw new Error(`MIDI input ${id} not found`);
    input.onmidimessage = this.#onmessage.bind(this);
  }

  selectOutput(id: string) {
    this.outputId = id;
  }

  send(data: Iterable<number>, timestamp?: number | undefined) {
    this.output().send(data, timestamp);
  }

  noteOn(channel: number, note: number, velocity: number = 127) {
    this.send([NOTE_ON | channel, note, velocity]);
  }

  noteOff(channel: number, note: number, velocity: number = 127) {
    this.send([NOTE_OFF | channel, note, velocity]);
  }

  trigger(channel: number, note: number, velocity: number = 127) {
    this.noteOn(channel, note, velocity);

    setTimeout(() => {
      this.noteOff(channel, note, velocity);
    }, 1);
  }
}
