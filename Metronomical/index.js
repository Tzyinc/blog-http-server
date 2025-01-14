const SCHEDULE_AHEAD = 1;

class BaseMetronome {
  constructor(tempo = 60) {
    this.tempo = tempo;
    this.playing = false;

    this.audioCtx = null;
    this.tick = null;
    this.tickVolume = null;
    this.soundHz = 1000;
    this.scheduled = [];
  }

  initAudio() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.tick = this.audioCtx.createOscillator();
    this.tickVolume = this.audioCtx.createGain();

    this.tick.type = "sine";
    this.tick.frequency.value = this.soundHz;
    this.tickVolume.gain.value = 0;

    this.tick.connect(this.tickVolume);
    this.tickVolume.connect(this.audioCtx.destination);
    this.tick.start(0); // No offset, start immediately.
  }

  click(callbackFn) {
    const time = this.audioCtx.currentTime;
    this.clickAtTime(time);

    if (callbackFn) {
      callbackFn(time);
    }
  }

  clickAtTime(time) {
    // Silence the click.
    // this.tickVolume.gain.cancelScheduledValues(time);
    this.tickVolume.gain.setValueAtTime(0, time);

    // Audible click sound.
    this.tickVolume.gain.linearRampToValueAtTime(1, time + 0.001);
    this.tickVolume.gain.linearRampToValueAtTime(0, time + 0.001 + 0.01);
    // housekeeping
    this.scheduled.push(time);
  }

  start(callbackFn) {
    this.playing = true;
    this.initAudio();
  }

  stop(callbackFn) {
    this.playing = false;
    this.tickVolume.gain.value = 0;
  }

  isPlaying() {
    return this.playing;
  }
}

class WorkerMetronome extends BaseMetronome {
  constructor(tempo) {
    super(tempo);
    this.worker = new Worker("./worker.js");
  }

  start(callbackFn) {
    super.start();
    const timeoutDuration = (60 / this.tempo) * 1000;

    this.worker.postMessage({
      message: "set_interval",
      interval: timeoutDuration,
    });
    this.worker.postMessage({ message: "start" });

    this.worker.onmessage = (props) => {
      const { message, interval } = props.data;
      console.log(
        "received",
        props.data,
        this.scheduled,
        this.audioCtx.currentTime
      );
      if (message === "tick") {
        const gap = interval / 1000;
        const len = this.scheduled.length;
        if (len) {
          if (len <= SCHEDULE_AHEAD) {
            this.clickAtTime(this.scheduled[len - 1] + gap);
          }
        } else {
          this.clickAtTime(this.audioCtx.currentTime + gap);
        }
      } else if (message === "stop") {
        this.scheduled = [];
      }
      //housekeeping
      this.scheduled = this.scheduled.filter(
        (item) => item > this.audioCtx.currentTime
      );
    };
  }

  changeTempo(newTempo) {
    this.tempo = newTempo;

    const timeoutDuration = (60 / this.tempo) * 1000;
    this.worker.postMessage({
      message: "set_interval",
      interval: timeoutDuration,
    });
  }

  stop() {
    super.stop();
    this.worker.postMessage({ message: "stop" });
  }
}

const startBtn = document.getElementById("startBtn");

const tempos = [40, 60, 120, 240];
const tempoButtons = [];
tempos.forEach((item) => {
  const button = document.createElement("button");
  button.setAttribute("id", item);
  button.appendChild(document.createTextNode(item));
  tempoButtons.push(button);
  document.getElementById("tempoBtns").appendChild(button);
});

startBtn.addEventListener("click", handleStart);
tempoButtons.forEach((button) => {
  button.addEventListener("click", handleTempo);
});
let metronome;
function handleStart(e) {
  if (!metronome) {
    metronome = new WorkerMetronome(120);
    metronome.initAudio();
  }
  if (!metronome.isPlaying()) {
    metronome.start();
  } else {
    metronome.stop();
  }
}

function handleTempo(e) {
  if (!metronome) {
    metronome = new WorkerMetronome(120);
    metronome.initAudio();
  }

  metronome.changeTempo(Number(e.target.id));
  console.log(e.target.id);
}
