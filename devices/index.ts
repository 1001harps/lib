export interface Device {
  init(context?: AudioContext): Promise<void>;
  trigger(note: number, timestamp: number): void;
  noteOn(note: number, timestamp: number): void;
  noteOff(note: number, timestamp: number): void;
}
