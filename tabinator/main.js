var work = require('webworkify');
var chordWorker = work(require('./chordWorker.js'));

const ChordDetector = require('chord_detector');

let audioCtx;
let analyser;
let scriptNode;

let startButton = document.getElementById("start");

let currentChord = ''

let allChords = [];
let allText = [];

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

let listening = false;

const start = () => {
    recognition.start();
};
const stop = () => {
    recognition.stop();
};

const onResult = event => {
    const resultsList = event.results;
    allText = [];
    for (let i=0; i<resultsList.length; i++) {
        allText.push({transcript: resultsList[i][0].transcript, isFinal: resultsList[i].isFinal})
    }
    if (allChords.length <= allText.filter(item => item.isFinal).length) {
        allChords.push(currentChord);
    }
    const display = allText.map((item, index) => `<div style="color: ${item.isFinal ? "white" : "gray"}">[${allChords[index] ? allChords[index]:""}] ${item.transcript}</div>`).join("")

    document.getElementById('results').innerHTML= display;
}

recognition.onerror = err => {
    console.log('error', err)
}

recognition.continuous = true;
recognition.interimResults = true;

recognition.onresult = onResult;

recognition.onstart = () => {
    if (!audioCtx) {
        (async () => {
            let stream = null;

            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: false
                });

                audioCtx = new AudioContext();
                if (!scriptNode) scriptNode = audioCtx.createScriptProcessor(1024, 1, 1);
                scriptNode.onaudioprocess = function (event) {
                    var audioData = event.inputBuffer.getChannelData(0)
                    chordWorker.postMessage({ audioData: audioData, sentAt: performance.now() })
                }
                if (!analyser) analyser = audioCtx.createAnalyser();

                //connect to analyser here
                const audioSourceNode = audioCtx.createMediaStreamSource(stream);
                audioSourceNode.connect(analyser);
                analyser.connect(scriptNode);
                scriptNode.connect(audioCtx.destination);

                analyser.fftSize = 32;
                var bufferLength = analyser.frequencyBinCount;
                var dataArray = new Uint8Array(bufferLength);

                /* use the stream */
            } catch (err) {
                console.log(err);
                /* handle the error */
            }
        })();
    }
}

startButton.addEventListener("click", () => {
    start();
});

const chromaItems = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
chordWorker.addEventListener('message', function (ev) {
    currentChroma = ev.data.currentChroma
    let chromaList = ''
    let isDeliberate = false;
    const DELIBERATE_TRESHOLD = 5;
    for (let i = 0; i < currentChroma.length; i++) {
        if (Math.floor(currentChroma[i]) > DELIBERATE_TRESHOLD) {
            isDeliberate = true;
        }
        chromaList += `<p>${chromaItems[i]} ${Array(Math.floor(currentChroma[i])).fill('-').join('')}</p>`;
    }
    if (isDeliberate) {
        document.getElementById('chordText').innerText = ev.data.rootNote + " " + ev.data.quality + " " + ev.data.intervals;
        currentChord = ev.data.rootNote + " " + ev.data.quality;
    } else {
        document.getElementById('chordText').innerText = '--'
    }
    document.getElementById('chromaRep').innerHTML = chromaList;
})