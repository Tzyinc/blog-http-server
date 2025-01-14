let timeoutId;
let shouldStopTimed = false;
let lastClick = 0;
let interval = 1000;
const POLLING_RATE_MULT = 4;
onmessage = (e) => {
  console.log("onMessage", e.data);
  const now = +new Date();
  switch (e.data.message) {
    case "start":
      shouldStopTimed = false;
      timeoutId = setInterval(() => {
        postMessage({ message: "tick", interval });
      }, interval / POLLING_RATE_MULT);
      break;
    case "set_interval":
      interval = e.data.interval;
      break;
    case "stop":
      postMessage({ message: "stop" });
      clearInterval(timeoutId);
      break;
    default:
      break;
  }
};
