const webcamElement = document.getElementById('webcam');
const classifier = knnClassifier.create();

let net;

async function app() {
  console.log('Loading mobilenet..');

  // Load the model.
  net = await mobilenet.load();
  console.log('Sucessfully loaded model');

  await setupWebcam();

  // Reads an image from the webcam and associates it with a specific class
  // index.
  const addExample = (classId) => {
    // Get the intermediate activation of MobileNet 'conv_preds' and pass that
    // to the KNN classifier.
    const activation = net.infer(webcamElement, 'conv_preds');

    // Pass the intermediate activation to the classifier.
    classifier.addExample(activation, classId);
  };

  const saveNet = () => {
    saveknn('knnModel.json');
  };

  // When clicking a button, add an example for that class.
  document.getElementById('class-a').addEventListener('click', () => addExample(0));
  document.getElementById('class-b').addEventListener('click', () => addExample(1));
  document.getElementById('class-c').addEventListener('click', () => addExample(2));
  document.getElementById('save').addEventListener('click', () => saveNet());
  document.getElementById('fileInput').addEventListener('change', handleFileSelect, false);

  while (true) {
    if (classifier.getNumClasses() > 0) {
      // Get the activation from mobilenet from the webcam.
      const activation = net.infer(webcamElement, 'conv_preds');
      // Get the most likely class and confidences from the classifier module.
      const result = await classifier.predictClass(activation);
      if (result && result.label && result.confidences) {
        document.getElementById('console').innerText = `
                label: ${result.label}
                confidence: ${result.confidences[result.label]}
                `;
      }
    }

    await tf.nextFrame();
  }
}

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

function saveknn(filename) {
  const dataset = classifier.getClassifierDataset();
  const datasetObj = {};
  Object.keys(dataset).forEach((key) => {
    const data = dataset[key].dataSync();
    datasetObj[key] = Array.from(data);
  });
  const jsonStr = JSON.stringify(datasetObj);
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
  const tensorObj = JSON.parse(rawdata);
  // covert back to tensor
  Object.keys(tensorObj).forEach((key) => {
    tensorObj[key] = tf.tensor(tensorObj[key], [tensorObj[key].length / 1024, 1024]);
  });
  classifier.setClassifierDataset(tensorObj);

  // eslint-disable-next-line no-console
  console.log('classifier load success');
}

app();
