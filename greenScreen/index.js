let outputStride = 2;
const segmentationThreshold = 0.5;
const maskBackground = true;
const strides = [8, 16, 32];

const webcamElement = document.getElementById('webcam');

const c = document.getElementById('drawCanvas');
const ctx = c.getContext('2d');

let maskCanvas;

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

function changeStride() {
  if (outputStride <= 0) {
    outputStride = 2;
  } else {
    outputStride--;
  }
  document.getElementById('stride').innerHTML = `output stride: ${strides[outputStride]}`;
}

async function app() {
  console.log('Loading model..');
  const net = await bodyPix.load();
  await setupWebcam();
  maskCanvas = document.createElement('canvas');
  console.log('Sucessfully loaded model');


  document.getElementById('stride').addEventListener('click', () => changeStride());

  while (true) {
    const personSegmentation = await net.estimatePersonSegmentation(
      c,
      strides[outputStride],
      segmentationThreshold,
    );
    ctx.drawImage(webcamElement, 0, 0, 640, 512);
    const maskImage = bodyPix.toMaskImageData(personSegmentation, maskBackground);
    // draw the mask image to an offscreen canvas.
    maskCanvas.width = maskImage.width;
    maskCanvas.height = maskImage.height;
    const maskContext = maskCanvas.getContext('2d');
    maskContext.putImageData(maskImage, 0, 0);

    ctx.filter = 'blur(10px)';
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.filter = 'blur(0px)';
  }
}

app();
