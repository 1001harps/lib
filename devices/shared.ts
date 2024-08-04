export class AttackReleaseEnv {
  context: AudioContext;
  attack: number = 0;
  release: number = 0.5;

  public gainNode: GainNode;

  constructor(context: AudioContext) {
    this.context = context;

    this.gainNode = this.context.createGain();
    this.gainNode.gain.value = 0;
  }

  trigger(timestamp: number) {
    this.gainNode.gain.cancelScheduledValues(0);
    this.gainNode.gain.value = 0;

    if (timestamp === 0) {
      timestamp = this.context.currentTime;
    }

    if (this.attack === 0) {
      this.gainNode.gain.setValueAtTime(0.3, timestamp);
    } else {
      this.gainNode.gain.linearRampToValueAtTime(0.3, timestamp + this.attack);
    }
    this.gainNode.gain.linearRampToValueAtTime(
      0,
      timestamp + this.attack + this.release
    );
  }
}
