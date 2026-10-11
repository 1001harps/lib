export interface ManagedVoice {
  stop(timestamp: number, fadeOut?: boolean): void;
}

export type ActiveVoice = {
  voice: ManagedVoice;
  endTime: number;
};

export class VoiceManager {
  active: ActiveVoice[] = [];

  add(
    voice: ManagedVoice,
    startTime: number,
    endTime: number,
    polyphonic: boolean,
  ): void {
    this.active = this.active.filter((active) => active.endTime > startTime);

    if (!polyphonic) {
      this.active.forEach((active) => active.voice.stop(startTime, true));
      this.active = [];
    }

    this.active.push({ voice, endTime });
    voice.stop(endTime);
  }
}
