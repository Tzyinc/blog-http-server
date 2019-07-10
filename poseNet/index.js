const imageScaleFactor = 1;
const flipHorizontal = false;
const outputStride = 16;

const scale = 1;

const webcamElement = document.getElementById('webcam');
const c = document.getElementById('drawCanvas');
const ctx = c.getContext('2d');

const rectSize = 10;
const halfRect = rectSize / 2;

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
  console.log('Loading posenet..');

  // Load the model.
  const net = await posenet.load();
  await setupWebcam();
  console.log('Sucessfully loaded model');

  while (true) {
    const res = await net.estimateSinglePose(
      c,
      imageScaleFactor,
      flipHorizontal,
      outputStride,
    );
    ctx.drawImage(webcamElement, 0, 0, 640, 512);
    const poses = res.keypoints;

    for (let i = 0; i < poses.length; i += 1) {
      const pose = poses[i];
      const { position } = pose;
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(position.x - halfRect, position.y - halfRect, rectSize, rectSize);
    }
  }
}


app();
