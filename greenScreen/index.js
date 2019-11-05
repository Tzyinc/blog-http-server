let outputStride = 2;
let segmentationThreshold = 0.75;
const maskBackground = false;
const strides = [8, 16, 32];

const webcamElement = document.getElementById('webcam');
const colorPicker = document.getElementById('jscolor');
const rangePicker = document.getElementById('range');

const c = document.getElementById('drawCanvas');
const ctx = c.getContext('2d');

let blur = 8;

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
  document.getElementById('stride').innerHTML = `${strides[outputStride]}`;
}

function changeSegmentationThreshold() {
  let slider = document.getElementById('segmentationThreshold');
  let value = slider.value / 1000;
  segmentationThreshold = value;
  document.getElementById('segtreshval').innerHTML = value;
}

function changeColor() {
  c.style.backgroundColor = `#${colorPicker.value}`;
}

function changeBlur() {
  blur = rangePicker.value;
}

async function app() {
  console.log('Loading model..');
  const net = await bodyPix.load();
  await setupWebcam();
  maskCanvas = document.createElement('canvas');
  console.log('Sucessfully loaded model');


  document.getElementById('stride').addEventListener('click', () => changeStride());
  document.getElementById('segmentationThreshold').addEventListener('change', () => changeSegmentationThreshold());
  colorPicker.addEventListener('change', () => changeColor());
  rangePicker.addEventListener('change', () => changeBlur());

  while (true) {
    const personSegmentation = await net.estimatePersonSegmentation(
      c,
      strides[outputStride],
      segmentationThreshold,
    );
    ctx.globalCompositeOperation = 'source-over';
    // ctx.clearRect(0, 0, 640, 512);
    ctx.drawImage(webcamElement, 0, 0, 640, 512);

    const maskImage = bodyPix.toMaskImageData(personSegmentation, maskBackground);
    const maskContext = maskCanvas.getContext('2d');
    // draw the mask image to an offscreen canvas.
    maskCanvas.width = maskImage.width;
    maskCanvas.height = maskImage.height;

    maskContext.globalCompositeOperation = 'source-over';
    maskContext.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    maskContext.beginPath();
    maskContext.globalCompositeOperation = 'source-in';
    maskContext.putImageData(maskImage, 0, 0);

    maskContext.rect(0, 0, maskCanvas.width, maskCanvas.height);
    maskContext.fillStyle = 'black'; // shouldnt matter
    maskContext.fill();
    maskContext.closePath();
    ctx.filter = `blur(${blur}px)`;

    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.filter = 'blur(0px)';
  }
}

app();
