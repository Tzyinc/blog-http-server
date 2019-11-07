
let context = new AudioContext();
let o = context.createOscillator();
let g = context.createGain();
o.connect(g);
g.connect(context.destination);

let freq = 440;
let isDown = false;
let isPlaying = false;

let otaClose = document.getElementById('otaClose');
let otaOpen = document.getElementById('otaOpen');

function playNote() {
    o = context.createOscillator();
    g = context.createGain();

    o.connect(g);
    g.connect(context.destination);
    o.start(0);
    o.frequency.setValueAtTime(freq, context.currentTime);
    isPlaying = true;
}

function setNote(newFreq) {
    freq = newFreq;
    if (isPlaying) {
        o.frequency.setValueAtTime(newFreq, context.currentTime);
    }
}

function stopNote() {
    g.gain.exponentialRampToValueAtTime(
        0.00001, context.currentTime + 0.04
    );
}


let mydiv = document.getElementById('body');
mydiv.addEventListener('mousemove', moveHandler, false);
mydiv.addEventListener('touchmove', function (e) {
    // stop touch event
    e.stopPropagation();
    e.preventDefault();
    // or just handle touch event
    moveHandler(e);
}, false);

mydiv.addEventListener('mousedown', downHandler, false);
mydiv.addEventListener('touchstart', function (e) {
    // stop touch event
    e.stopPropagation();
    e.preventDefault();

    // translate to mouse event

    // or just handle touch event
    downHandler(e);
}, false);

mydiv.addEventListener('mouseup', upHandler, false);
mydiv.addEventListener('mouseleave', upHandler, false);
mydiv.addEventListener('touchend', function (e) {
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
        setNote(scaleHeight(clientY));
        otaClose.style.display = "none";
        otaOpen.style.display = "block";
        // console.log(`${freq}hz`)
    }
}

function downHandler(e) {
    if (!isDown) {
        clientY = e.clientY || e && e.targetTouches && e.targetTouches[0] && e.targetTouches[0].clientY;
        setNote(scaleHeight(clientY));
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

const scaleHeight = (num) => {
    //full range, but ot is split into 3 sets of 2octaves 
    // const out_min = 55;
    // const out_max = 3800;
    const out_min = 0;
    const out_max = 24; // steps
    const in_min = 0;
    const in_max = screen.availHeight;
    // cant be linear as hz are not lineraly scaling
    const scaleMap = (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    // every octave is *2
    // using root note as 440hz
    const hertz = 440 * Math.pow(1.059463094359, scaleMap);
    console.log(scaleMap, hertz, num, screen)
    return hertz ;
}
