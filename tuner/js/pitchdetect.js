window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = null;
var sourceNode = null;
var analyser = null;
var theBuffer = null;
var DEBUGCANVAS = null;
var mediaStreamSource = null;
var detectorElem, 
	canvasElem,
	waveCanvas,
	pitchElem,
	noteElem,
	detuneElem,
	detuneAmount,
	selectList,
	notesDisplay;
var noteHistory = ['-', '-', '-', '-', '-', '-', '-'];

let currentSelected = {
	played: [],
	scaleNotes: []
};

var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function scaleFromPattern(pattern, root, octaves = 2, startOctave = 3) {
	let scale = [];
	let pos = noteStrings.indexOf(root);
	scale.push(noteStrings[pos] + startOctave);
	for (let i = 0; i < octaves; i++) {
		let patternClone = JSON.parse(JSON.stringify(pattern));
		while (patternClone.length > 0) {
			let jump = patternClone.shift();
			if (jump === "W") {
				pos += 2;
			} else if (!isNaN(jump)) {
				console.log(jump);
				pos += Number(jump);
			}else {
				// everything else is halfstep
				pos++;
			}
			scale.push(noteStrings[pos % 12] + startOctave)
			if (patternClone.length === 1) {
				startOctave++;
			}
		}
	}
	return scale;
}

const SCALES = [
	{
		name: "Select scale below",
		notes: []
	},
	...['C', 'E', 'G#', 'C#', 'F', 'A', 'D', 'F#', 'A#', 'D#', 'G', 'B'].flatMap(root => {
		return [{
			name: `Guitar ${root} maj scale, asc`,
			notes: scaleFromPattern('W–W–H–W–W–W–H'.split('–'), root)
		}, {
				name: `Guitar ${root} maj scale, desc`,
				notes: scaleFromPattern('W–W–H–W–W–W–H'.split('–'), root).reverse()
		}];
	}),
	...['C', 'E', 'G#', 'C#', 'F', 'A', 'D', 'F#', 'A#', 'D#', 'G', 'B'].flatMap(root => {
		return [{ 
			name: `Guitar ${root} maj pentatonic scale, asc`,
			notes: scaleFromPattern('W-W-3-W-3'.split('-'), root, 3)
		}, {
			name: `Guitar ${root} maj pentatonic scale, desc`,
			notes: scaleFromPattern('W-W-3-W-3'.split('-'), root, 3).reverse()
		}];
	})
];



function checkNote() {
	// update notes played here
	let allNote = Array.from(new Set(noteHistory));
	let playedNoteIndex = currentSelected.scaleNotes.findIndex(item => item === allNote[0]);
	if (allNote.length === 1 && playedNoteIndex !== -1) {
		currentSelected.played[playedNoteIndex] =1
	}
	renderNotes();
}

function renderNotes() {
	notesDisplay.innerHTML = "";
	for (let noteIndex in currentSelected.scaleNotes) {
		notesDisplay.innerHTML += `<span style="color: ${currentSelected.played[noteIndex] ? "green" : "red"}">${currentSelected.scaleNotes[noteIndex]} </span>`
	}
}

function selectChange(e) {
	const selectedName = e.target.value;
	let selectedScale = SCALES.find(item => item.name === selectedName);
	currentSelected = {
		played: new Array(selectedScale.notes.length).fill(0),
		scaleNotes: selectedScale.notes
	}
	renderNotes();
}

window.onload = function() {
	detectorElem = document.getElementById( "detector" );
	canvasElem = document.getElementById( "output" );
	DEBUGCANVAS = document.getElementById( "waveform" );
	if (DEBUGCANVAS) {
		waveCanvas = DEBUGCANVAS.getContext("2d");
		waveCanvas.strokeStyle = "black";
		waveCanvas.lineWidth = 1;
	}
	pitchElem = document.getElementById( "pitch" );
	noteElem = document.getElementById( "note" );
	detuneElem = document.getElementById( "detune" );
	detuneAmount = document.getElementById( "detune_amt" );
	selectList = document.getElementById("mySelect");
	selectList.addEventListener("change", selectChange);
	notesDisplay = document.getElementById("notesDisplay");
	populateSelect();
}

function populateSelect() {
	for (let scale of SCALES) {
		var z = document.createElement("option");
		z.setAttribute("value", scale.name);
		var t = document.createTextNode(scale.name);
		z.appendChild(t);
		document.getElementById("mySelect").appendChild(z);
	}
}

function error() {
    alert('Stream generation failed.');
}

function getUserMedia(dictionary, callback) {
    try {
		navigator.mediaDevices.getUserMedia(dictionary).then(callback);
    } catch (e) {
        alert('getUserMedia threw exception :' + e);
    }
}

function gotStream(stream) {
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);

    // Connect it to the destination.
	analyser = audioContext.createAnalyser();

	mediaStreamSource.connect(audioContext.destination);
    analyser.fftSize = 2048;
    mediaStreamSource.connect( analyser );
    updatePitch();
}

function toggleLiveInput() {
	audioContext = audioContext || new AudioContext();
	MAX_SIZE = Math.max(4, Math.floor(audioContext.sampleRate / 5000));	// corresponds to a 5kHz signal
    getUserMedia({ "audio": true }, gotStream);
}

function updateDisplay(note, pitch, exactNote) {
	let allNote = Array.from(new Set(noteHistory));
	if (allNote.length === 1) {
		pitchElem.innerText = Math.round(pitch);
		noteElem.innerHTML = exactNote;
		var detune = centsOffFromPitch(pitch, note);
		if (detune == 0) {
			detuneElem.className = "";
			detuneAmount.innerHTML = "--";
		} else {
			if (detune < 0)
				detuneElem.className = "flat";
			else
				detuneElem.className = "sharp";
			detuneAmount.innerHTML = Math.abs(detune);
		}
	}
}

var rafID = null;
var tracks = null;
var buflen = 1024;
var buf = new Float32Array( buflen );

function noteFromPitch( frequency ) {
	var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
	return Math.round( noteNum ) + 69;
}

function frequencyFromNoteNumber( note ) {
	return 440 * Math.pow(2,(note-69)/12);
}

function centsOffFromPitch( frequency, note ) {
	return Math.floor( 1200 * Math.log( frequency / frequencyFromNoteNumber( note ))/Math.log(2) );
}

var MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.
var GOOD_ENOUGH_CORRELATION = 0.9; // this is the "bar" for how close a correlation needs to be

function autoCorrelate( buf, sampleRate ) {
	var SIZE = buf.length;
	var MAX_SAMPLES = Math.floor(SIZE/2);
	var best_offset = -1;
	var best_correlation = 0;
	var rms = 0;
	var foundGoodCorrelation = false;
	var correlations = new Array(MAX_SAMPLES);

	for (var i=0;i<SIZE;i++) {
		var val = buf[i];
		rms += val*val;
	}
	rms = Math.sqrt(rms/SIZE);
	if (rms<0.01) // not enough signal
		return -1;

	var lastCorrelation=1;
	for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
		var correlation = 0;

		for (var i=0; i<MAX_SAMPLES; i++) {
			correlation += Math.abs((buf[i])-(buf[i+offset]));
		}
		correlation = 1 - (correlation/MAX_SAMPLES);
		correlations[offset] = correlation; // store it, for the tweaking we need to do below.
		if ((correlation>GOOD_ENOUGH_CORRELATION) && (correlation > lastCorrelation)) {
			foundGoodCorrelation = true;
			if (correlation > best_correlation) {
				best_correlation = correlation;
				best_offset = offset;
			}
		} else if (foundGoodCorrelation) {
			// short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
			// Now we need to tweak the offset - by interpolating between the values to the left and right of the
			// best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
			// we need to do a curve fit on correlations[] around best_offset in order to better determine precise
			// (anti-aliased) offset.

			// we know best_offset >=1, 
			// since foundGoodCorrelation cannot go to true until the second pass (offset=1), and 
			// we can't drop into this clause until the following pass (else if).
			var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];  
			return sampleRate/(best_offset+(8*shift));
		}
		lastCorrelation = correlation;
	}
	if (best_correlation > 0.01) {
		// console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
		return sampleRate/best_offset;
	}
	return -1;
//	var best_frequency = sampleRate/best_offset;
}

function updatePitch( time ) {
	var cycles = new Array;
	analyser.getFloatTimeDomainData( buf );
	var ac = autoCorrelate( buf, audioContext.sampleRate );
	// TODO: Paint confidence meter on canvasElem here.

	if (DEBUGCANVAS) {  // This draws the current waveform, useful for debugging
		waveCanvas.clearRect(0,0,512,256);
		waveCanvas.strokeStyle = "red";
		waveCanvas.beginPath();
		waveCanvas.moveTo(0,0);
		waveCanvas.lineTo(0,256);
		waveCanvas.moveTo(128,0);
		waveCanvas.lineTo(128,256);
		waveCanvas.moveTo(256,0);
		waveCanvas.lineTo(256,256);
		waveCanvas.moveTo(384,0);
		waveCanvas.lineTo(384,256);
		waveCanvas.moveTo(512,0);
		waveCanvas.lineTo(512,256);
		waveCanvas.stroke();
		waveCanvas.strokeStyle = "black";
		waveCanvas.beginPath();
		waveCanvas.moveTo(0,buf[0]);
		for (var i=1;i<512;i++) {
			waveCanvas.lineTo(i,128+(buf[i]*128));
		}
		waveCanvas.stroke();
	}

 	if (ac != -1) {
	 	detectorElem.className = "confident";
		pitch = ac;
		var note =  noteFromPitch( pitch ); // 69 (hurhur) is a4, this makes 60 c4
		var noteVal = note % 12;
		var octave = Math.ceil(note/12) -2;
		var exactNote = `${noteStrings[noteVal]}${noteVal ===0 ? octave + 1 : octave}`;
		noteHistory.push(exactNote);
		noteHistory.shift();
		checkNote();
		updateDisplay(note, pitch, exactNote);
	}

	if (!window.requestAnimationFrame)
		window.requestAnimationFrame = window.webkitRequestAnimationFrame;
	rafID = window.requestAnimationFrame( updatePitch );
}
