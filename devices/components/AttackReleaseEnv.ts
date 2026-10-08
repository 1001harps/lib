export class AttackReleaseEnv {
  context: AudioContext;
  attack: number = 0;
  release: number = 0.5;

  public destination: GainNode;

  constructor(context: AudioContext) {
    this.context = context;

    this.destination = this.context.createGain();
    this.destination.gain.value = 0;
  }

  trigger(timestamp: number) {
    this.destination.gain.cancelScheduledValues(0);
    this.destination.gain.value = 0;

    if (timestamp === 0) {
      timestamp = this.context.currentTime;
    }

    if (this.attack === 0) {
      this.destination.gain.setValueAtTime(0.3, timestamp);
    } else {
      this.destination.gain.linearRampToValueAtTime(
        0.3,
        timestamp + this.attack,
      );
    }
    this.destination.gain.linearRampToValueAtTime(
      0,
      timestamp + this.attack + this.release,
    );
  }
}
