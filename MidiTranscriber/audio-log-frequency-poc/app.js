const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

class AudioLogFrequencyPoc {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.frequencyData = null;
    this.timeDomainData = null;
    this.animationFrame = null;

    this.gateDb = -52;
    this.isRunning = false;
    this.isSignalActive = false;
    this.freezeLatestChord = false;
    this.lastLiveNotes = [];
    this.latestChord = [];
    this.latestChordSummary = null;
    this.chordEvidence = new Map();
    this.lastAboveGateAt = 0;
    this.releaseHoldMs = 180;

    this.thresholdDb = -84;
    this.minMidi = 36;
    this.maxMidi = 96;
    this.maxDetectedNotes = 10;
    this.maxChordNotes = 5;
    this.logGridStep = 0.5;
    this.maxHarmonics = 5;
    this.harmonicWeights = [1, 0.78, 0.6, 0.44, 0.32];
    this.salienceThreshold = 0.05;
    this.relativeSalienceThreshold = 0.46;
    this.conflictSemitones = 1;
    this.whiteningRadius = 8;
    this.noteSmoothRadius = 1;

    this.startButton = document.getElementById("startButton");
    this.stopButton = document.getElementById("stopButton");
    this.freezeButton = document.getElementById("freezeButton");
    this.gateInput = document.getElementById("gateInput");
    this.gateValue = document.getElementById("gateValue");
    this.fftSizeSelect = document.getElementById("fftSizeSelect");
    this.statusText = document.getElementById("statusText");
    this.levelText = document.getElementById("levelText");
    this.liveNotes = document.getElementById("liveNotes");
    this.latestChordEl = document.getElementById("latestChord");
    this.bassNoteText = document.getElementById("bassNoteText");
    this.topNoteText = document.getElementById("topNoteText");
    this.pitchClassesList = document.getElementById("pitchClassesList");

    this.startButton.addEventListener("click", () => this.startMicrophone());
    this.stopButton.addEventListener("click", () => this.stop());
    this.freezeButton.addEventListener("click", () => this.toggleFreeze());
    this.gateInput.addEventListener("input", () => {
      this.gateDb = Number(this.gateInput.value);
      this.gateValue.textContent = `${this.gateDb} dB`;
    });
    this.syncFreezeButton();
  }

  setStatus(text) {
    this.statusText.textContent = text;
  }

  toggleFreeze() {
    this.freezeLatestChord = !this.freezeLatestChord;
    this.syncFreezeButton();
  }

  syncFreezeButton() {
    this.freezeButton.textContent = this.freezeLatestChord ? "Resume Chord Updates" : "Freeze Chord Updates";
    this.freezeButton.className = this.freezeLatestChord ? "secondary active" : "secondary";
  }

  async startMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      this.setStatus("Browser does not support microphone audio input.");
      return;
    }

    this.stop();

    try {
      this.audioContext = new AudioContext();
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = Number(this.fftSizeSelect.value);
      this.analyser.smoothingTimeConstant = 0.72;
      this.analyser.minDecibels = -100;
      this.analyser.maxDecibels = -10;
      this.source.connect(this.analyser);

      this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
      this.timeDomainData = new Float32Array(this.analyser.fftSize);
      this.isRunning = true;
      this.isSignalActive = false;
      this.chordEvidence = new Map();
      this.setStatus("Listening on note-aligned grid...");
      this.startButton.disabled = true;
      this.stopButton.disabled = false;
      this.loop();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      this.setStatus(`Microphone unavailable: ${reason}`);
      this.stop();
    }
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;

    if (this.source) this.source.disconnect();
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }

    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.frequencyData = null;
    this.timeDomainData = null;
    this.chordEvidence = new Map();
    this.latestChordSummary = null;
    this.startButton.disabled = false;
    this.stopButton.disabled = true;
    if (!this.statusText.textContent.startsWith("Microphone unavailable")) {
      this.setStatus("Idle");
    }
    this.levelText.textContent = "-inf dB";
    this.renderLatestChordSummary(null);
  }

  loop() {
    if (!this.isRunning || !this.analyser || !this.audioContext) return;

    this.analyser.getFloatFrequencyData(this.frequencyData);
    this.analyser.getFloatTimeDomainData(this.timeDomainData);

    const rms = this.calculateRms(this.timeDomainData);
    const levelDb = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
    this.levelText.textContent = Number.isFinite(levelDb) ? `${levelDb.toFixed(1)} dB` : "-inf dB";

    const liveNotes = levelDb >= this.gateDb ? this.detectNotes() : [];
    this.lastLiveNotes = liveNotes;
    this.renderNotes(this.liveNotes, liveNotes);

    const now = performance.now();
    if (levelDb >= this.gateDb && liveNotes.length > 0) {
      this.isSignalActive = true;
      this.accumulateChordEvidence(liveNotes);
      this.lastAboveGateAt = now;
    } else if (this.isSignalActive && now - this.lastAboveGateAt > this.releaseHoldMs) {
      this.isSignalActive = false;
      const finalizedChord = this.buildChordFromEvidence();
      if (finalizedChord.length > 0 && !this.freezeLatestChord) {
        this.latestChord = finalizedChord;
        this.latestChordSummary = this.buildChordSummaryFromEvidence();
        this.renderLatestChordSummary(this.latestChordSummary);
      }
      this.chordEvidence = new Map();
    }

    this.animationFrame = requestAnimationFrame(() => this.loop());
  }

  calculateRms(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i += 1) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  detectNotes() {
    const sampleRate = this.audioContext.sampleRate;
    const linearSpectrum = this.dbSpectrumToLinear(this.frequencyData);
    const whitenedSpectrum = this.whitenSpectrum(linearSpectrum);
    const noteGrid = this.projectToLogFrequencyGrid(whitenedSpectrum, sampleRate);
    const smoothedGrid = this.smoothNoteGrid(noteGrid);
    const selected = this.selectNotesFromNoteGrid(smoothedGrid, sampleRate);
    return selected
      .map((candidate) => this.candidateToNote(candidate))
      .sort((a, b) => a.midi - b.midi);
  }

  dbSpectrumToLinear(magnitudesDb) {
    const magnitudes = new Float32Array(magnitudesDb.length);
    let maxMagnitude = 0;
    for (let i = 0; i < magnitudesDb.length; i += 1) {
      const db = magnitudesDb[i];
      const magnitude = db <= this.thresholdDb ? 0 : 10 ** (db / 20);
      magnitudes[i] = magnitude;
      if (magnitude > maxMagnitude) maxMagnitude = magnitude;
    }

    if (maxMagnitude > 0) {
      for (let i = 0; i < magnitudes.length; i += 1) {
        magnitudes[i] /= maxMagnitude;
      }
    }
    return magnitudes;
  }

  whitenSpectrum(linearSpectrum) {
    const whitened = new Float32Array(linearSpectrum.length);
    for (let i = 0; i < linearSpectrum.length; i += 1) {
      let localAverage = 0;
      let count = 0;
      const start = Math.max(0, i - this.whiteningRadius);
      const end = Math.min(linearSpectrum.length - 1, i + this.whiteningRadius);
      for (let j = start; j <= end; j += 1) {
        localAverage += linearSpectrum[j];
        count += 1;
      }
      const baseline = count > 0 ? localAverage / count : 0;
      whitened[i] = Math.max(0, linearSpectrum[i] - baseline * 0.9);
    }
    return whitened;
  }

  projectToLogFrequencyGrid(spectrum, sampleRate) {
    const noteCount = this.maxMidi - this.minMidi + 1;
    const grid = new Float32Array(noteCount);

    for (let midi = this.minMidi; midi <= this.maxMidi; midi += 1) {
      const index = midi - this.minMidi;
      const samples = [
        this.sampleSpectrumAtMidi(spectrum, midi - this.logGridStep, sampleRate),
        this.sampleSpectrumAtMidi(spectrum, midi, sampleRate),
        this.sampleSpectrumAtMidi(spectrum, midi + this.logGridStep, sampleRate)
      ];
      grid[index] = samples[0] * 0.25 + samples[1] * 0.5 + samples[2] * 0.25;
    }

    return grid;
  }

  smoothNoteGrid(noteGrid) {
    const smoothed = new Float32Array(noteGrid.length);
    for (let i = 0; i < noteGrid.length; i += 1) {
      let total = 0;
      let totalWeight = 0;
      for (let offset = -this.noteSmoothRadius; offset <= this.noteSmoothRadius; offset += 1) {
        const index = i + offset;
        if (index < 0 || index >= noteGrid.length) continue;
        const weight = offset === 0 ? 1 : 0.45;
        total += noteGrid[index] * weight;
        totalWeight += weight;
      }
      smoothed[i] = totalWeight > 0 ? total / totalWeight : 0;
    }
    return smoothed;
  }

  sampleSpectrumAtMidi(spectrum, midi, sampleRate) {
    const frequency = this.midiToFrequency(midi);
    const bin = (frequency * this.analyser.fftSize) / sampleRate;
    const lower = Math.floor(bin);
    const upper = Math.ceil(bin);
    if (lower < 0 || upper >= spectrum.length) return 0;
    if (lower === upper) return spectrum[lower];
    const blend = bin - lower;
    return spectrum[lower] * (1 - blend) + spectrum[upper] * blend;
  }

  selectNotesFromNoteGrid(noteGrid, sampleRate) {
    const workingGrid = new Float32Array(noteGrid);
    const selected = [];
    let topSalience = 0;

    for (let iteration = 0; iteration < this.maxDetectedNotes; iteration += 1) {
      const candidate = this.findBestCandidate(workingGrid, sampleRate, selected);
      if (!candidate || candidate.salience < this.salienceThreshold) break;
      if (iteration === 0) {
        topSalience = candidate.salience;
      } else {
        const relativeThreshold = iteration >= 3 ? this.relativeSalienceThreshold * 0.82 : this.relativeSalienceThreshold;
        if (topSalience > 0 && candidate.salience < topSalience * relativeThreshold) break;
      }
      selected.push(candidate);
      this.suppressCandidate(workingGrid, candidate);
    }

    return selected;
  }

  findBestCandidate(noteGrid, sampleRate, selected) {
    let bestCandidate = null;
    for (let midi = this.minMidi; midi <= this.maxMidi; midi += 1) {
      if (selected.some((candidate) => Math.abs(candidate.midi - midi) <= this.conflictSemitones)) continue;
      const candidate = this.scoreCandidate(midi, noteGrid, sampleRate);
      if (!candidate) continue;
      if (!bestCandidate || candidate.salience > bestCandidate.salience) bestCandidate = candidate;
    }
    return bestCandidate;
  }

  scoreCandidate(midi, noteGrid, sampleRate) {
    let weightedTotal = 0;
    let weightSum = 0;
    let strongestDb = -Infinity;

    for (let harmonic = 1; harmonic <= this.maxHarmonics; harmonic += 1) {
      const harmonicMidi = midi + 12 * Math.log2(harmonic);
      if (harmonicMidi > this.maxMidi + 1) break;
      const harmonicEnergy = this.sampleNoteGridAtMidi(noteGrid, harmonicMidi);
      const weight = this.harmonicWeights[harmonic - 1] ?? 0;
      weightedTotal += harmonicEnergy * weight;
      weightSum += weight;

      if (harmonic === 1) {
        strongestDb = this.sampleSpectrumAtMidi(this.frequencyData, midi, sampleRate);
      }
    }

    if (weightSum === 0) return null;
    return {
      midi,
      frequency: this.midiToFrequency(midi),
      db: strongestDb,
      salience: weightedTotal / weightSum
    };
  }

  sampleNoteGridAtMidi(noteGrid, midi) {
    const gridIndex = midi - this.minMidi;
    const lower = Math.floor(gridIndex);
    const upper = Math.ceil(gridIndex);
    if (lower < 0 || upper >= noteGrid.length) return 0;
    if (lower === upper) return noteGrid[lower];
    const blend = gridIndex - lower;
    return noteGrid[lower] * (1 - blend) + noteGrid[upper] * blend;
  }

  suppressCandidate(noteGrid, candidate) {
    const baseIndex = candidate.midi - this.minMidi;
    for (let offset = -1; offset <= 1; offset += 1) {
      const index = baseIndex + offset;
      if (index >= 0 && index < noteGrid.length) noteGrid[index] *= 0.64;
    }
    for (let harmonic = 2; harmonic <= this.maxHarmonics; harmonic += 1) {
      const harmonicMidi = candidate.midi + 12 * Math.log2(harmonic);
      const center = Math.round(harmonicMidi - this.minMidi);
      if (center < 0 || center >= noteGrid.length) continue;
      noteGrid[center] *= 0.78;
    }
  }

  accumulateChordEvidence(notes) {
    for (const note of notes) {
      const key = String(note.midi);
      const current = this.chordEvidence.get(key) ?? {
        midi: note.midi,
        name: note.name,
        frequency: note.frequency,
        bestDb: note.db,
        hits: 0
      };
      current.hits += 1;
      if (!Number.isFinite(current.bestDb) || note.db > current.bestDb) {
        current.bestDb = note.db;
        current.frequency = note.frequency;
        current.name = note.name;
      }
      this.chordEvidence.set(key, current);
    }
  }

  buildChordFromEvidence() {
    const evidence = [...this.chordEvidence.values()];
    if (evidence.length === 0) return [];
    const maxHits = evidence.reduce((max, note) => Math.max(max, note.hits), 0);
    const hitThreshold = Math.max(1, Math.ceil(maxHits * 0.26));

    return evidence
      .filter((note) => note.hits >= hitThreshold)
      .sort((a, b) => {
        if (b.hits !== a.hits) return b.hits - a.hits;
        return b.bestDb - a.bestDb;
      })
      .slice(0, this.maxChordNotes)
      .map((note) => ({
        midi: note.midi,
        name: note.name,
        frequency: note.frequency,
        db: note.bestDb
      }))
      .sort((a, b) => a.midi - b.midi);
  }

  buildChordSummaryFromEvidence() {
    const evidence = [...this.chordEvidence.values()];
    if (evidence.length === 0) return null;
    const maxHits = evidence.reduce((max, note) => Math.max(max, note.hits), 0);
    const hitThreshold = Math.max(1, Math.ceil(maxHits * 0.22));
    const supported = evidence
      .filter((note) => note.hits >= hitThreshold)
      .sort((a, b) => a.midi - b.midi);

    if (supported.length === 0) return null;

    const bassNote = this.toDisplayNote(supported[0]);
    const topNote = this.toDisplayNote(supported[supported.length - 1]);
    const interior = supported.filter((note) => note.midi !== bassNote.midi && note.midi !== topNote.midi);
    const pitchClassMap = new Map();

    for (const note of interior) {
      const pitchClass = NOTE_NAMES[((note.midi % 12) + 12) % 12];
      const existing = pitchClassMap.get(pitchClass);
      if (!existing || note.hits > existing.hits || note.bestDb > existing.db) {
        pitchClassMap.set(pitchClass, {
          pitchClass,
          midi: note.midi,
          db: note.bestDb,
          hits: note.hits
        });
      }
    }

    const pitchClasses = [...pitchClassMap.values()]
      .sort((a, b) => a.midi - b.midi)
      .map((entry) => entry.pitchClass);

    return { bassNote, topNote, pitchClasses };
  }

  toDisplayNote(note) {
    return {
      midi: note.midi,
      name: note.name,
      frequency: note.frequency,
      db: Number.isFinite(note.bestDb) ? note.bestDb : note.db
    };
  }

  midiToFrequency(midi) {
    return 440 * 2 ** ((midi - 69) / 12);
  }

  candidateToNote(candidate) {
    const noteIndex = ((candidate.midi % 12) + 12) % 12;
    const octave = Math.floor(candidate.midi / 12) - 1;
    return {
      midi: candidate.midi,
      name: `${NOTE_NAMES[noteIndex]}${octave}`,
      frequency: candidate.frequency,
      db: Number.isFinite(candidate.db) ? candidate.db : -Infinity
    };
  }

  formatSummaryNote(note) {
    if (!note) return "Nothing detected yet";
    return `${note.name} ${note.frequency.toFixed(1)} Hz ${note.db.toFixed(1)} dB`;
  }

  renderLatestChordSummary(summary) {
    if (!summary) {
      this.latestChordEl.className = "summary empty";
      this.bassNoteText.textContent = "Nothing detected yet";
      this.topNoteText.textContent = "Nothing detected yet";
      this.pitchClassesList.className = "pitch-class-list empty";
      this.pitchClassesList.textContent = "No pitch classes yet";
      return;
    }

    this.latestChordEl.className = "summary";
    this.bassNoteText.textContent = this.formatSummaryNote(summary.bassNote);
    this.topNoteText.textContent = this.formatSummaryNote(summary.topNote);

    if (!summary.pitchClasses.length) {
      this.pitchClassesList.className = "pitch-class-list empty";
      this.pitchClassesList.textContent = "No middle pitch classes";
      return;
    }

    this.pitchClassesList.className = "pitch-class-list";
    this.pitchClassesList.replaceChildren(
      ...summary.pitchClasses.map((pitchClass) => {
        const chip = document.createElement("div");
        chip.className = "pitch-chip";
        chip.textContent = pitchClass;
        return chip;
      })
    );
  }

  renderNotes(container, notes) {
    if (!notes.length) {
      container.className = "note-list empty";
      container.textContent = "No notes";
      return;
    }

    container.className = "note-list";
    container.replaceChildren(
      ...notes.map((note) => {
        const chip = document.createElement("div");
        chip.className = "note-chip";
        chip.textContent = `${note.name} ${note.frequency.toFixed(1)} Hz ${note.db.toFixed(1)} dB`;
        return chip;
      })
    );
  }
}

new AudioLogFrequencyPoc();
