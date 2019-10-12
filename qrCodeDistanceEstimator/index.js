let video = document.createElement("video");
let canvasElement = document.getElementById("canvas");
let canvas = canvasElement.getContext("2d");
let outputContainer = document.getElementById("output");

let distanceToMark = document.getElementById("distanceToMark");

const distances = [0, 100, 200, 300];
let currDist;
let qrDistance = [];
let ratioMarkingIndex = 0;

let outputMessage = document.getElementById("outputMessage");
let outputData = document.getElementById("outputData");
function drawLine(begin, end, color) {
    canvas.beginPath();
    canvas.moveTo(begin.x, begin.y);
    canvas.lineTo(end.x, end.y);
    canvas.lineWidth = 4;
    canvas.strokeStyle = color;
    canvas.stroke();
}
// Use facingMode: environment to attemt to get the front camera on phones
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function (stream) {
    video.srcObject = stream;
    video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
    video.play();
    requestAnimationFrame(tick);
});
function tick() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvasElement.hidden = false;
        outputContainer.hidden = false;
        canvasElement.height = video.videoHeight;
        canvasElement.width = video.videoWidth;
        canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
        var imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
        var code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });
        if (code) {
            drawLine(code.location.topLeftCorner, code.location.topRightCorner, "#FF3B58");
            drawLine(code.location.topRightCorner, code.location.bottomRightCorner, "#FF3B58");
            drawLine(code.location.bottomRightCorner, code.location.bottomLeftCorner, "#FF3B58");
            drawLine(code.location.bottomLeftCorner, code.location.topLeftCorner, "#FF3B58");
            averageDistances(code.location);
            outputMessage.hidden = true;
            outputData.parentElement.hidden = false;
            outputData.innerText = code.data;
        } else {
            outputMessage.hidden = false;
            outputData.parentElement.hidden = true;
        }
    }
    requestAnimationFrame(tick);
}

function averageDistances(location) {
    const dists = [];
    dists[0] = distBetweenTwoLines(location.topLeftCorner, location.topRightCorner);
    dists[1] = distBetweenTwoLines(location.topRightCorner, location.bottomRightCorner);
    dists[2] = distBetweenTwoLines(location.bottomRightCorner, location.bottomLeftCorner);
    dists[3] = distBetweenTwoLines(location.bottomLeftCorner, location.topLeftCorner);

    let total = 0;

    for (let dist of dists) {
        total += dist;
    }
    currDist = total/dists.length;
}

function distBetweenTwoLines(p1, p2) {
    var a = p1.x - p2.x;
    var b = p1.y - p2.y;
    var c = Math.sqrt(a * a + b * b);
    return c;
}

function markIndex() {
    qrDistance[ratioMarkingIndex] = currDist
    if (++ratioMarkingIndex >= distances/length) {
        ratioMarkingIndex = 0;
    }
    distanceToMark.innerText = distances[ratioMarkingIndex];
}