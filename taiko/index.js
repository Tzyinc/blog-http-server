const gamepads = {};
const kadondonka = [6, 10, 11, 7].map(String);
const visualMapping = ["drumLKa", "drumLDon", "drumRDon", "drumRKa"];
const audioMapping = [
  new Audio("./ka.ogg"),
  new Audio("./dong.ogg"),
  new Audio("./dong.ogg"),
  new Audio("./ka.ogg"),
];
let prevStateMapping = [false, false, false, false];
let stateMapping = [false, false, false, false];
let touchMapping = [false, false, false, false];

const tapDon = document.getElementById("tapDon");
const tapKa = document.getElementById("tapKa");
tapDon.addEventListener("pointerdown", (e) => {
  if (e.pageX < window.innerWidth / 2) {
    touchMapping[1] = true;
  } else {
    touchMapping[2] = true;
  }
});
tapKa.addEventListener("pointerdown", (e) => {
  if (e.pageX < window.innerWidth / 2) {
    touchMapping[0] = true;
  } else {
    touchMapping[3] = true;
  }
});

tapDon.addEventListener("pointerup", (e) => {
  console.log(e, "don", window.innerWidth);
  if (e.pageX < window.innerWidth / 2) {
    touchMapping[1] = false;
  } else {
    touchMapping[2] = false;
  }
});
tapKa.addEventListener("pointerup", (e) => {
  console.log(e, "ka", window.innerWidth);
  if (e.pageX < window.innerWidth / 2) {
    touchMapping[0] = false;
  } else {
    touchMapping[3] = false;
  }
});

function gamepadHandler(event, connected) {
  const gamepad = event.gamepad;
  // Note:
  // gamepad === navigator.getGamepads()[gamepad.index]

  if (connected) {
    gamepads[gamepad.index] = gamepad;
  } else {
    delete gamepads[gamepad.index];
  }
}

window.addEventListener(
  "gamepadconnected",
  (e) => {
    gamepadHandler(e, true);
  },
  false
);
window.addEventListener(
  "gamepaddisconnected",
  (e) => {
    gamepadHandler(e, false);
  },
  false
);

let interval;

if (!("ongamepadconnected" in window)) {
  // No gamepad events available, poll instead.
  interval = setInterval(pollGamepads, 30);
}

function pollGamepads() {
  const gamepads = navigator.getGamepads();
  for (const gp of gamepads) {
    gameLoop();
    clearInterval(interval);
  }
}

function buttonPressed(b) {
  if (typeof b === "object") {
    return b.pressed;
  }
  return b === 1.0;
}

function gameLoop() {
  const gamepads = navigator.getGamepads();
  if (!gamepads) {
    return;
  }

  const gp = gamepads[0];

  for (let divid of visualMapping) {
    const toChangeDiv = document.getElementById(divid);
    toChangeDiv.style.visibility = "hidden";
  }

  stateMapping = [false, false, false, false];

  if (gp) {
    for (let index in gp.buttons) {
      const button = gp.buttons[index];
      if (buttonPressed(button)) {
        const toChangeIndex = kadondonka.indexOf(index);

        stateMapping[toChangeIndex] = true;
        if (toChangeIndex != -1) {
          const beingHit = visualMapping[toChangeIndex];
          const toChangeDiv = document.getElementById(beingHit);
          toChangeDiv.style.visibility = "visible";
        }
      }
    }
  }

  for (let i in stateMapping) {
    if (touchMapping[i] === true) {
      stateMapping[i] = true;
      const beingHit = visualMapping[i];
      const toChangeDiv = document.getElementById(beingHit);
      toChangeDiv.style.visibility = "visible";
    }
    if (stateMapping[i] === true && prevStateMapping[i] !== stateMapping[i]) {
      audioMapping[i].currentTime = 0;
      audioMapping[i].play();
    }
  }

  prevStateMapping = [...stateMapping];

  start = requestAnimationFrame(gameLoop);
}
