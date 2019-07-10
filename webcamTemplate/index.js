
const webcamElement = document.getElementById('webcam');
// const c = document.getElementById('drawCanvas');
// const ctx = c.getContext('2d');

async function setupWebcam() {
  return new Promise((resolve, reject) => {
    const navigatorAny = navigator;
    navigator.getUserMedia = navigator.getUserMedia
            || navigatorAny.webkitGetUserMedia || navigatorAny.mozGetUserMedia
            || navigatorAny.msGetUserMedia;
    if (navigator.getUserMedia) {
      navigator.getUserMedia({ video: true },
        (stream) => {
          webcamElement.srcObject = stream;
          webcamElement.addEventListener('loadeddata', () => resolve(), false);
        },
        error => reject());
    } else {
      reject();
    }
  });
}

async function app() {
  console.log('Loading model..');
  // Load the model here
  await setupWebcam();
  console.log('Sucessfully loaded model');

  // while (true) {
  //   // do estimation here
  //   // ctx.drawImage(webcamElement, 0, 0, 640, 512);
  // }
}

app();
