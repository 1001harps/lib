import { EventListener } from "../common/events.ts";

export type Device = {
  name: string;
  init(context?: AudioContext): Promise<void>;
  trigger(note: number, timestamp: number): void;
  noteOn(note: number, timestamp: number): void;
  noteOff(note: number, timestamp: number): void;
  params: DeviceParam[];
  state: Record<string, number | string>;
  update<T extends DeviceParam>(param: T, value: number | string): void;
} & EventListener<DeviceEvent>;

export type DeviceParam =
  | {
      name: string;
      type: "number";
      min: number;
      max: number;
      step?: number;
    }
  | {
      name: string;
      type: "select";
      options: string[];
    };

export type DeviceEvent = {
  type: "param_change";
  param: DeviceParam;
};

export const numberParam = (
  name: string,
  min = 0,
  max = 1,
  step?: number,
): DeviceParam => ({
  name,
  type: "number",
  min,
  max,
  step,
});

export const selectParam = (name: string, options: string[]): DeviceParam => ({
  name,
  type: "select",
  options,
});
