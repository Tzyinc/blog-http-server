let canvas = document.getElementById("wave");
var ctx = canvas.getContext("2d");

const real = [0, 1];
const imag = [0, 0];

let o;
let g;

let freq = 440;

function playNote() {
    let context = new (window.AudioContext || window.webkitAudioContext)();
    o = context.createOscillator();
    g = context.createGain();

    let wave = context.createPeriodicWave(real, imag, { disableNormalization: true });
    o.setPeriodicWave(wave);
    // o.type = "custom"; // sine, square, sawtooth, triangle
    o.connect(g);
    g.connect(context.destination);
    o.start(0);
    // console.log(freq, firstFreqOff, o.frequency);
    o.frequency.setValueAtTime(freq, context.currentTime);
    o.stop(1);
}

function calculateChange() {
    for (let i=0; i< real.length -1; i++) {
        const realRange = document.getElementById(`real${i}`);
        const realDiv = document.getElementById(`divreal${i}`);
        const imagRange = document.getElementById(`imag${i}`);
        const imagDiv = document.getElementById(`divimag${i}`);
        real[i + 1] = Number(realRange.value);
        imag[i + 1] = Number(imagRange.value);
        realDiv.innerHTML = realRange.value;
        imagDiv.innerHTML = imagRange.value;
    }
    draw();
}

function addFourier() {
    const indexToAdd = real.length - 1;
    const sliderSection = document.getElementById("rangeSliders");
    const divSect = document.createElement("div");
    divSect.className = "section";
    const divDoubleDiv = document.createElement("div");
    divDoubleDiv.className = "double";
    const divReal = document.createElement("div");
    divReal.id = `divreal${indexToAdd}`;
    divReal.innerHTML = 1;
    const divImag = document.createElement("div");
    divImag.id = `divimag${indexToAdd}`;
    divImag.innerHTML = 0;

    const divDoubleRange = document.createElement("div");
    divDoubleDiv.className = "double";
    const rangeReal = document.createElement("input");
    rangeReal.onchange = calculateChange;
    rangeReal.id = `real${indexToAdd}`;
    rangeReal.type = "range";
    rangeReal.min = 0;
    rangeReal.max = 1;
    rangeReal.value = 1;
    rangeReal.step = 0.01;
    const rangeImag = document.createElement("input");
    rangeImag.onchange = calculateChange;
    rangeImag.id = `imag${indexToAdd}`;
    rangeImag.type = "range";
    rangeImag.min = 0;
    rangeImag.max = 1;
    rangeImag.value = 0;
    rangeImag.step = 0.01;

    real.push(1);
    imag.push(0);

    // < input onchange = "calculateChange()" id = "real0" type = "range" min = "0" max = "1" value = "1" step = "0.01" />
    
    divSect.appendChild(divDoubleDiv);
    divDoubleDiv.appendChild(divReal);
    divDoubleDiv.appendChild(divImag);
    divSect.appendChild(divDoubleRange);
    divDoubleRange.appendChild(rangeReal);
    divDoubleRange.appendChild(rangeImag);
    sliderSection.appendChild(divSect);

    draw();

}

function draw() {
    ctx.strokeStyle = "#FF0000";
    ctx.lineWidth = 3;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCurve(real, imag);
}
draw();

function floatToPxWidth(percent) {
    return floatToPx(percent, canvas.width)
}


function floatToPxHeight(percent) {
    return floatToPx(percent, canvas.height)
}

function floatToPx(percent, maxVal) {
    return percent * maxVal
}

function drawCurve(a, b) {
    ctx.beginPath();
    for (let i=0; i< 100; i++) {
        let t = i/100;
        // ignore j=0 https://webaudio.github.io/web-audio-api/#dom-periodicwaveoptions-real
        let sum = 0;
        for (let k=1; k < a.length; k++) {
            sum += calculatePoint(t, a, b, k)
        }
        const inversNormalisedSum = 1 - ((sum / 3) + 0.5);
        if (i === 0) {
            ctx.moveTo(floatToPxWidth(t), floatToPxHeight(inversNormalisedSum));
        } else {
            ctx.lineTo(floatToPxWidth(t), floatToPxHeight(inversNormalisedSum));
        }
    }
    ctx.stroke();
}

function calculatePoint(t, a, b, k) {
    const twoPIkt = 2 * Math.PI * k * t;
    return (a[k] * Math.cos(twoPIkt)) +  (b[k] * Math.sin(twoPIkt));
}