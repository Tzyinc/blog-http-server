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
    this.scheduledHalf = [];
    this.scheduledQuarters = [];
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

  clickAtTime(time, beatNum) {
    // Silence the click.
    // this.tickVolume.gain.cancelScheduledValues(time);
    this.tickVolume.gain.setValueAtTime(0, time);
    console.log(beatNum);
    if (beatNum === 0) {
      this.tick.frequency.setValueAtTime(this.soundHz * 2, time);
      this.tick.frequency.setValueAtTime(this.soundHz, time + 0.001 + 0.01);
    }

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
    this.beat = 0;
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
      if (message === "tick") {
        const gap = interval / 1000;
        const len = this.scheduled.length;
        if (len) {
          if (len <= SCHEDULE_AHEAD) {
            this.clickAtTime(this.scheduled[len - 1] + gap, this.beat);
            this.beat = (this.beat + 1) % 4;
          }
        } else {
          this.clickAtTime(this.audioCtx.currentTime + gap, this.beat);
          this.beat = (this.beat + 1) % 4;
        }
      } else if (message === "stop") {
        this.scheduled = [];
      }
    };
  }

  changeTempo(newTempo) {
    this.tempo = newTempo;
    const timeoutDuration = (60 / (4 * this.tempo)) * 1000;
    this.worker.postMessage({
      message: "set_interval",
      interval: timeoutDuration,
    });
  }

  stop() {
    super.stop();
    this.worker.postMessage({ message: "stop" });
  }

  cleanScheduled() {
    const beforeScheduled = this.scheduled.length;
    this.scheduled = this.scheduled.filter(
      (item) => item > this.audioCtx.currentTime
    );

    return Boolean(this.scheduled.length - beforeScheduled);
  }
}

const startBtn = document.getElementById("startBtn");

const tempos = [40, 60, 120, 200];
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

function timestamp() {
  return window.performance && window.performance.now
    ? window.performance.now()
    : new Date().getTime();
}

let dt;
let last = timestamp();
let FPS = 120;
let fpsCount = [];

function loop() {
  let now = timestamp();
  dt = dt + Math.min(1, (now - last) / 1000);
  while (dt > FPS) {
    dt = dt - FPS;
  }
  render(dt, now);
  last = now;
  requestAnimationFrame(loop);
}

const fpsDiv = document.getElementById("fps");

const display = ["⬜️⬜️⬜️⬜️", "🔴", "🟢🟢", "🟡🟡🟡"];
let index = 0;

function render(dt, now) {
  fpsCount = fpsCount.filter((time) => now - time < 1000);
  const shouldRed = metronome?.cleanScheduled();
  if (shouldRed) {
    index = (index + 1) % 4;
  }
  fpsDiv.innerHTML = `
    fps: ${fpsCount.length}<br/>
    ${display[index]}
  `;
  fpsCount.push(timestamp());
}

requestAnimationFrame(loop);
