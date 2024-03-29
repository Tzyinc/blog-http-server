const AudioContext = window.AudioContext || window.webkitAudioContext;// Safari and old versions of Chrome

let context;
let o;
let g;

let freq = 440;
let isDown = false;
let isPlaying = false;
let ROOT_NOTE = 440;
const SEMITONES_COUNT = 24;
let SUBSEQUENT_NOTES = [];
for (let i =0; i<SEMITONES_COUNT; i++) {
    SUBSEQUENT_NOTES.push(ROOT_NOTE * Math.pow(1.059463094359, i));
}
// console.log('SUBSEQUENT_NOTES', SUBSEQUENT_NOTES)

let otaClose = document.getElementById('otaClose');
let otaOpen = document.getElementById('otaOpen');

let uploadSection = document.getElementById('uploadSection');

let firstFreqOff = undefined;

let real = new Float32Array([0, -1, -1, -1, -1, -1]);
let imag = new Float32Array([0, 0.93, 0.82, 0.63, 0.36, 0.14]);

document.getElementById('fileReader').addEventListener('change', handleFileSelect, false);

function calculateChange() {
    const sliderValue = document.getElementById('slider0').value;
    ROOT_NOTE = 110 * Math.pow(4, sliderValue);
    SUBSEQUENT_NOTES = [];
    for (let i = 0; i < SEMITONES_COUNT; i++) {
        SUBSEQUENT_NOTES.push(ROOT_NOTE * Math.pow(1.059463094359, i));
    }
}

function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object

    // files is a FileList of File objects. List some properties.
    var output = [];
    for (var i = 0, f; f = files[i]; i++) {
        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function (theFile) {
            return function (e) {
                try {
                    const json = JSON.parse(e.target.result);
                    if (Array.isArray(json.real) && Array.isArray(json.imag) && json.real.length === json.imag.length) {
                        real = new Float32Array(json.real);
                        imag = new Float32Array(json.imag);
                    } else {
                        throw 'file uploaded is not of correct format';
                    }

                    // alert('json global var has been set to parsed json of this file here it is unevaled = \n' + JSON.stringify(json));
                } catch (ex) {
                    alert('ex when trying to parse json: ' + ex);
                }
            }
        })(f);
        reader.readAsText(f);
    }
}

function customClicked() {
    let radiocustom = document.getElementById('wave5');
    if (radiocustom.checked) {
        uploadSection.style.display = "block";
    } else {
        uploadSection.style.display = "none";
    }
}

function playNote() {
    o = context.createOscillator();
    g = context.createGain();

    const selectedWave = document.querySelector('input[name="wave"]:checked').value;
    if (selectedWave === 'otamatone') {
        real = new Float32Array([0, -1, -1, -1, -1, -1]);
        imag = new Float32Array([0, 0.93, 0.82, 0.63, 0.36, 0.14]);
        let wave = context.createPeriodicWave(real, imag, { disableNormalization: false });
        o.setPeriodicWave(wave);
    } else if (selectedWave === 'custom') {
        let wave = context.createPeriodicWave(real, imag, { disableNormalization: false });
        o.setPeriodicWave(wave);
    }else {
        o.type = selectedWave; // sine, square, sawtooth, triangle
    }
    o.connect(g);
    g.connect(context.destination);
    o.start(0);
    o.frequency.setValueAtTime(freq, context.currentTime);
    isPlaying = true;
}

function setFirst(newFreq) {
    // console.log('asdf');
    
    const closest = SUBSEQUENT_NOTES.reduce(function (prev, curr) {
        return (Math.abs(curr - newFreq) < Math.abs(prev - newFreq) ? curr : prev);
    });

    const selectedPitch = document.querySelector('input[name="pitch"]:checked').value;
    if (selectedPitch === '2') {
        freq = closest;
    } else if (selectedPitch === '1') {
        if (firstFreqOff === undefined) {
            firstFreqOff = newFreq - closest;
            freq = closest;
        } else {
            freq = newFreq - firstFreqOff
        }
        // console.log(freq, firstFreqOff);
    } else {
        freq = newFreq;
    }
}

function setNote(newFreq) {
    setFirst(newFreq);
    if (isPlaying) {
        // console.log(freq, firstFreqOff);
        o.frequency.setValueAtTime(freq, context.currentTime);
    }
}

function setGain(value) {
    if (isPlaying) {
        // g.gain.value = value;
    }
}

function stopNote() {
    g.gain.exponentialRampToValueAtTime(
        0.00001, context.currentTime + 0.04
    );
    firstFreqOff = undefined;
    setTimeout(function () {
        o.stop();
        isPlaying = false;
    }, 41);
}


let otamaDiv = document.getElementById('body');
let menuOpen = document.getElementById('menuOpen');
let menuClose = document.getElementById('menuClose');
let menuDiv = document.getElementById('menuDiv');
menuOpen.addEventListener('mousedown', menuDown, false);
menuOpen.addEventListener('touchstart', function(e) {
    e.stopPropagation();
    e.preventDefault();
    menuDown(e);
}, false);

menuOpen.addEventListener('mouseup', menuOpenUp, false);
menuOpen.addEventListener('touchend', function (e) {
    e.stopPropagation();
    e.preventDefault();
    menuOpenUp(e);
}, false);

menuClose.addEventListener('mousedown', menuDown, false);
menuClose.addEventListener('touchstart', function (e) {
    e.stopPropagation();
    e.preventDefault();
    menuDown(e);
}, false);

menuClose.addEventListener('mouseup', menuCloseUp, false);
menuClose.addEventListener('touchend', function (e) {
    e.stopPropagation();
    e.preventDefault();
    menuCloseUp(e);
}, false);

function menuOpenUp(e) {
    e.stopPropagation();
    e.preventDefault();
    menuDiv.style.display="block";
}

function menuCloseUp(e) {
    e.stopPropagation();
    e.preventDefault();
    menuDiv.style.display = "none";
}

function menuDown(e) {
    e.stopPropagation();
    e.preventDefault();
}

otamaDiv.addEventListener('mousemove', moveHandler, false);
otamaDiv.addEventListener('touchmove', function (e) {
    // stop touch event
    e.stopPropagation();
    e.preventDefault();
    // or just handle touch event
    moveHandler(e);
}, false);

otamaDiv.addEventListener('mousedown', downHandler, false);
otamaDiv.addEventListener('touchstart', function (e) {
    // stop touch event
    e.stopPropagation();
    e.preventDefault();

    // translate to mouse event

    // or just handle touch event
    downHandler(e);
}, false);

otamaDiv.addEventListener('mouseup', upHandler, false);
otamaDiv.addEventListener('mouseleave', upHandler, false);
otamaDiv.addEventListener('touchend', function (e) {
    // stop touch event
    e.stopPropagation();
    e.preventDefault();

    // translate to mouse event

    // or just handle touch event
    upHandler(e);
}, false);

function moveHandler(e) {
    if (isDown) {
        // availWidth: 1680, availHeight: 948
        clientY = e.clientY || e && e.targetTouches && e.targetTouches[0] && e.targetTouches[0].clientY;
        // console.log('movvv', clientY);
        clientX = e.clientX || e && e.targetTouches && e.targetTouches[0] && e.targetTouches[0].clientX;
        setNote(scaleHeight(clientY));
        const piVal = (clientX) * (Math.PI) / (screen.availWidth);
        setGain(Math.sin(piVal))
        otaClose.style.display = "none";
        otaOpen.style.display = "block";
        // console.log(`${freq}hz`)
    }
}

function downHandler(e) {
    if (!isDown) {
        if (!context) {
            context = new AudioContext();
        }
        clientY = e.clientY || e && e.targetTouches && e.targetTouches[0] && e.targetTouches[0].clientY;
        clientX = e.clientX || e && e.targetTouches && e.targetTouches[0] && e.targetTouches[0].clientX;
        setNote(scaleHeight(clientY));
        const piVal = (clientX) * (Math.PI) / (screen.availWidth);
        setGain(Math.sin(piVal))
        playNote();
        otaClose.style.display = "none";
        otaOpen.style.display = "block";
    }
    isDown = true;
    // console.log(`${freq}hz`)
}

function upHandler(e) {
    if (isDown) {
        stopNote();
        otaClose.style.display = "block";
        otaOpen.style.display = "none";
    }
    isDown = false;
}

//full range, but ot is split into 3 sets of 2octaves 
// const out_min = 55;
// const out_max = 3800;
const scaleHeight = (
        num,
        out_min = 0,
        out_max = 24, // semitones in 2 octaves
        in_min = 0,
        in_max = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) //viewport height
    ) => {
    // console.log('scaleHeight', num, in_max, screen)
    // cant be linear as hz are not lineraly scaling
    const scaleMap = (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    // every octave is *2
    // using root note as 440hz (a4)
    const hertz = ROOT_NOTE * Math.pow(1.059463094359, scaleMap);
    return hertz; 
}
