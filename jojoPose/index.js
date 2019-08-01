const classifier = knnClassifier.create();

const imageScaleFactor = 1;
const flipHorizontal = false;
const outputStride = 16;

const scale = 1;

const bodyParts = [
  'nose',
  'leftEye',
  'rightEye',
  'leftEar',
  'rightEar',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
];

const webcamElement = document.getElementById('webcam');
const c = document.getElementById('drawCanvas');
const ctx = c.getContext('2d');

const poseInput = document.getElementById('poseName');
const addPose = document.getElementById('add');

const savePose = [];

const rectSize = 10;
const halfRect = rectSize / 2;

let jojoFilter = false;
let delay = 0;

const drawing = new Image();
drawing.src = './jojoOverlay.png';
drawing.crossOrigin = 'anonymous';
drawing.width = '640';
drawing.height = '512';

let poses;

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

const poseMap = p => [bodyParts.indexOf(p.part), Math.floor(p.position.x), Math.floor(p.position.y)];

const addExample = () => {
  // const input = poses;
  const classId = poseInput.value;

  const poseArray = poses.map(poseMap);
  const logits = tf.tensor2d(poseArray);
  // Pass the intermediate activation to the classifier.
  savePose.push({ poseArray, classId });
  classifier.addExample(logits, classId);
};

const addExampleFromFile = (poseArray, classId) => {
  const logits = tf.tensor2d(poseArray);
  classifier.addExample(logits, classId);
};

const detectExample = async () => {
  try {
    const poseArray = poses.map(poseMap);
    const logits = tf.tensor2d(poseArray);
    const res = await classifier.predictClass(logits);
    return res.label !== 'default';
  } catch (err) {
    return false;
  }
};

const saveNet = () => {
  saveknn('knnModel.json');
};

// When clicking a button, add an example for that class.
addPose.addEventListener('click', () => addExample());
document.getElementById('save').addEventListener('click', () => saveNet());
document.getElementById('fileInput').addEventListener('change', handleFileSelect, false);

async function app() {
  console.log('Loading posenet..');

  // Load the model.
  const net = await posenet.load();
  await setupWebcam();
  const firstknn = await fetchInsertKnn();
  await loadknn(JSON.stringify(firstknn));
  console.log('Sucessfully loaded model');

  while (true) {
    const res = await net.estimateSinglePose(
      c,
      imageScaleFactor,
      flipHorizontal,
      outputStride,
    );
    // ctx.clearRect(0, 0, 640, 512);
    ctx.drawImage(webcamElement, 0, 0, 640, 512);
    if (jojoFilter) {
      ctx.drawImage(drawing, 0, 0);
      processbw();
    }
    poses = res.keypoints;
    if (poses) {
      const isJojo = await detectExample();
      // console.log(jojoFilter, delay);
      if (isJojo) {
        jojoFilter = true;
        delay = 10;
      }
      delay--;
      if (delay <= 0) {
        delay = 0;
        jojoFilter = false;
      }
    }
  }
}

function saveknn(filename) {
  const jsonStr = JSON.stringify(savePose);
  download(jsonStr, filename, 'text/plain');
}

function download(content, fileName, contentType) {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

function handleFileSelect(event) {
  const selectedFile = document.getElementById('fileInput').files[0];
  if (selectedFile) {
    const reader = new FileReader();
    reader.readAsText(selectedFile, 'UTF-8');
    reader.onload = function (evt) {
      // document.getElementById("fileContents").innerHTML = evt.target.result;
      const result = evt.target.result;
      loadknn(result);
    };
    reader.onerror = function (evt) {
      // document.getElementById("fileContents").innerHTML = "error reading file";
      console.log('error reading file');
    };
  }
}

async function loadknn(rawdata) {
  const loadObj = JSON.parse(rawdata);
  // covert back to tensor
  console.log(loadObj);
  if (loadObj && loadObj.length > 0) {
    for (const item of loadObj) {
      console.log(item);
      addExampleFromFile(item.poseArray, item.classId);
    }
  } else {
    console.log('error loading');
  }

  // eslint-disable-next-line no-console
  console.log('classifier load success');
}


function processbw() {
  // get current image data
  const imageData = ctx.getImageData(0, 0, 640, 512);
  // return pixels;
  for (let i = 0; i < imageData.data.length; i += 4) {
    // change image colors
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    // CIE luminance for the RGB
    // The human eye is bad at seeing red and blue, so we de-emphasize them.
    const v = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
  }
  // put image data back to context
  ctx.putImageData(imageData, 0, 0);
}

async function fetchInsertKnn() {
  const url = './jojoposes.json';
  const output = await fetch(url);
  let data = await output.json();

  return data;
}

app();
