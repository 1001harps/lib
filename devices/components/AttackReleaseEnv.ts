export class AttackReleaseEnv {
  context: AudioContext;
  attack: number = 0;
  release: number = 0.5;

  output: ConstantSourceNode;

  constructor(context: AudioContext) {
    this.context = context;

    this.output = this.context.createConstantSource();
    this.output.offset.value = 0;
  }

  connect(param: AudioParam, amount: number): GainNode {
    const amountNode = this.context.createGain();
    amountNode.gain.value = amount;
    this.output.connect(amountNode);
    amountNode.connect(param);
    return amountNode;
  }

  trigger(timestamp: number) {
    if (timestamp === 0) {
      timestamp = this.context.currentTime;
    }

    this.output.offset.setValueAtTime(0, timestamp);

    if (this.attack === 0) {
      this.output.offset.setValueAtTime(1, timestamp);
    } else {
      this.output.offset.linearRampToValueAtTime(
        1,
        timestamp + this.attack,
      );
    }
    this.output.offset.linearRampToValueAtTime(
      0,
      timestamp + this.attack + this.release,
    );

    this.output.start(timestamp);
    this.output.stop(timestamp + this.attack + this.release);
  }
}
