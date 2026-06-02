const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

class AudioChordPoc {
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
    this.chordCandidate = [];
    this.chordEvidence = new Map();
    this.lastAboveGateAt = 0;
    this.releaseHoldMs = 180;
    this.thresholdDb = -78;
    this.minMidi = 36;
    this.maxMidi = 96;
    this.maxDetectedNotes = 10;
    this.maxChordNotes = 5;
    this.salienceThreshold = 0.04;
    this.relativeSalienceThreshold = 0.5;
    this.maxHarmonics = 6;
    this.harmonicWeights = [1, 0.82, 0.67, 0.54, 0.42, 0.33];
    this.suppressionFactor = 0.45;
    this.whiteningRadius = 10;
    this.conflictSemitones = 1;
    this.binNeighborhood = 2;

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
      this.analyser.smoothingTimeConstant = 0.75;
      this.analyser.minDecibels = -100;
      this.analyser.maxDecibels = -10;
      this.source.connect(this.analyser);

      this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
      this.timeDomainData = new Float32Array(this.analyser.fftSize);
      this.isRunning = true;
      this.isSignalActive = false;
      this.chordCandidate = [];
      this.chordEvidence = new Map();
      this.setStatus("Listening for chords...");
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
    this.renderNotes(this.liveNotes, liveNotes, false);

    const now = performance.now();
    if (levelDb >= this.gateDb && liveNotes.length > 0) {
      if (!this.isSignalActive) {
        this.isSignalActive = true;
        this.chordCandidate = this.cloneNotes(liveNotes);
        this.chordEvidence = new Map();
        this.accumulateChordEvidence(liveNotes);
      } else if (this.isBetterChordSnapshot(liveNotes, this.chordCandidate)) {
        this.chordCandidate = this.cloneNotes(liveNotes);
        this.accumulateChordEvidence(liveNotes);
      } else {
        this.accumulateChordEvidence(liveNotes);
      }
      this.lastAboveGateAt = now;
    } else if (this.isSignalActive && now - this.lastAboveGateAt > this.releaseHoldMs) {
      this.isSignalActive = false;
      const finalizedChord = this.buildChordFromEvidence();
      if (finalizedChord.length > 0) {
        if (!this.freezeLatestChord) {
          this.latestChord = finalizedChord;
          this.latestChordSummary = this.buildChordSummaryFromEvidence();
          this.renderLatestChordSummary(this.latestChordSummary);
        }
      }
      this.chordCandidate = [];
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

  cloneNotes(notes) {
    return notes.map((note) => ({ ...note }));
  }

  isBetterChordSnapshot(candidate, currentBest) {
    if (candidate.length !== currentBest.length) {
      return candidate.length > currentBest.length;
    }

    const candidateScore = candidate.reduce((sum, note) => sum + (Number.isFinite(note.db) ? note.db : -120), 0);
    const currentScore = currentBest.reduce((sum, note) => sum + (Number.isFinite(note.db) ? note.db : -120), 0);
    return candidateScore > currentScore;
  }

  accumulateChordEvidence(notes) {
    for (const note of notes) {
      const key = String(note.midi);
      const current = this.chordEvidence.get(key) ?? {
        midi: note.midi,
        name: note.name,
        frequency: note.frequency,
        bestDb: note.db,
        hits: 0,
        totalDb: 0
      };

      current.hits += 1;
      current.totalDb += Number.isFinite(note.db) ? note.db : -120;
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
    if (evidence.length === 0) return this.cloneNotes(this.chordCandidate);

    const maxHits = evidence.reduce((max, note) => Math.max(max, note.hits), 0);
    const hitThreshold = Math.max(1, Math.ceil(maxHits * 0.28));

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

  buildChordSummary(notes) {
    const sorted = [...notes].sort((a, b) => a.midi - b.midi);
    const bassNote = sorted[0] ?? null;
    const topNote = sorted.length > 1 ? sorted[sorted.length - 1] : bassNote;
    const interior = sorted.slice(1, -1);
    const pitchClassMap = new Map();

    for (const note of interior) {
      const pitchClass = NOTE_NAMES[((note.midi % 12) + 12) % 12];
      const existing = pitchClassMap.get(pitchClass);
      if (!existing || note.midi < existing.midi || note.db > existing.db) {
        pitchClassMap.set(pitchClass, { pitchClass, midi: note.midi, db: note.db });
      }
    }

    const pitchClasses = [...pitchClassMap.values()]
      .sort((a, b) => a.midi - b.midi)
      .map((entry) => entry.pitchClass);

    return {
      bassNote,
      topNote,
      pitchClasses
    };
  }

  buildChordSummaryFromEvidence() {
    const evidence = [...this.chordEvidence.values()];
    if (evidence.length === 0) return this.buildChordSummary(this.latestChord);

    const maxHits = evidence.reduce((max, note) => Math.max(max, note.hits), 0);
    const hitThreshold = Math.max(1, Math.ceil(maxHits * 0.22));
    const supported = evidence
      .filter((note) => note.hits >= hitThreshold)
      .map((note) => ({
        midi: note.midi,
        name: note.name,
        frequency: note.frequency,
        db: note.bestDb,
        hits: note.hits
      }))
      .sort((a, b) => a.midi - b.midi);

    if (supported.length === 0) return this.buildChordSummary(this.latestChord);

    const bassNote = supported[0] ?? null;
    const topNote = supported.length > 1 ? supported[supported.length - 1] : bassNote;
    const interior = supported.filter((note) => note !== bassNote && note !== topNote);
    const pitchClassMap = new Map();

    for (const note of interior) {
      const pitchClass = NOTE_NAMES[((note.midi % 12) + 12) % 12];
      const existing = pitchClassMap.get(pitchClass);
      if (!existing || note.hits > existing.hits || note.db > existing.db) {
        pitchClassMap.set(pitchClass, {
          pitchClass,
          midi: note.midi,
          db: note.db,
          hits: note.hits
        });
      }
    }

    const pitchClasses = [...pitchClassMap.values()]
      .sort((a, b) => a.midi - b.midi)
      .slice(0, this.maxChordNotes)
      .map((entry) => entry.pitchClass);

    return {
      bassNote,
      topNote,
      pitchClasses
    };
  }

  detectNotes() {
    const sampleRate = this.audioContext.sampleRate;
    const linearSpectrum = this.dbSpectrumToLinear(this.frequencyData);
    const whitenedSpectrum = this.whitenSpectrum(linearSpectrum);
    const accepted = this.selectNotesFromSalience(whitenedSpectrum, linearSpectrum, sampleRate);

    return accepted
      .map((candidate) => this.candidateToNote(candidate))
      .filter(Boolean)
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
      whitened[i] = Math.max(0, linearSpectrum[i] - baseline * 0.92);
    }
    return whitened;
  }

  selectNotesFromSalience(whitenedSpectrum, linearSpectrum, sampleRate) {
    const workingSpectrum = new Float32Array(whitenedSpectrum);
    const selected = [];
    let topSalience = 0;

    for (let iteration = 0; iteration < this.maxDetectedNotes; iteration += 1) {
      const bestCandidate = this.findBestCandidate(workingSpectrum, linearSpectrum, sampleRate, selected);
      if (!bestCandidate || bestCandidate.salience < this.salienceThreshold) break;
      if (iteration === 0) {
        topSalience = bestCandidate.salience;
      } else {
        const relativeThreshold = iteration >= 3 ? this.relativeSalienceThreshold * 0.8 : this.relativeSalienceThreshold;
        if (topSalience > 0 && bestCandidate.salience < topSalience * relativeThreshold) {
          break;
        }
      }
      selected.push(bestCandidate);
      this.suppressCandidate(workingSpectrum, bestCandidate, sampleRate);
    }

    return selected;
  }

  findBestCandidate(workingSpectrum, linearSpectrum, sampleRate, selected) {
    let bestCandidate = null;
    for (let midi = this.minMidi; midi <= this.maxMidi; midi += 1) {
      if (selected.some((candidate) => Math.abs(candidate.midi - midi) <= this.conflictSemitones)) continue;

      const candidate = this.scoreCandidate(midi, workingSpectrum, linearSpectrum, sampleRate);
      if (!candidate) continue;
      if (!bestCandidate || candidate.salience > bestCandidate.salience) {
        bestCandidate = candidate;
      }
    }
    return bestCandidate;
  }

  scoreCandidate(midi, workingSpectrum, linearSpectrum, sampleRate) {
    const frequency = this.midiToFrequency(midi);
    const nyquist = sampleRate / 2;
    let weightTotal = 0;
    let salience = 0;
    let strongestFundamentalDb = -Infinity;
    let strongestFundamentalFrequency = frequency;

    for (let harmonic = 1; harmonic <= this.maxHarmonics; harmonic += 1) {
      const harmonicFrequency = frequency * harmonic;
      if (harmonicFrequency >= nyquist) break;

      const weight = this.harmonicWeights[harmonic - 1] ?? 0;
      const sample = this.sampleSpectrumAtFrequency(workingSpectrum, harmonicFrequency, sampleRate);
      const rawDb = this.sampleSpectrumAtFrequency(this.frequencyData, harmonicFrequency, sampleRate);

      salience += sample * weight;
      weightTotal += weight;

      if (harmonic === 1 && rawDb > strongestFundamentalDb) {
        strongestFundamentalDb = rawDb;
        strongestFundamentalFrequency = harmonicFrequency;
      }
    }

    if (weightTotal === 0) return null;

    return {
      midi,
      frequency: strongestFundamentalFrequency,
      db: strongestFundamentalDb,
      salience: salience / weightTotal
    };
  }

  sampleSpectrumAtFrequency(spectrum, frequency, sampleRate) {
    const bin = (frequency * this.analyser.fftSize) / sampleRate;
    const center = Math.round(bin);
    let total = 0;
    let totalWeight = 0;

    for (let offset = -this.binNeighborhood; offset <= this.binNeighborhood; offset += 1) {
      const index = center + offset;
      if (index < 1 || index >= spectrum.length - 1) continue;
      const distance = Math.abs(bin - index);
      const weight = Math.max(0.05, 1 - distance / (this.binNeighborhood + 1));
      total += spectrum[index] * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? total / totalWeight : 0;
  }

  suppressCandidate(workingSpectrum, candidate, sampleRate) {
    for (let harmonic = 1; harmonic <= this.maxHarmonics; harmonic += 1) {
      const harmonicFrequency = candidate.frequency * harmonic;
      const bin = Math.round((harmonicFrequency * this.analyser.fftSize) / sampleRate);
      const radius = harmonic === 1 ? 1 : 2;
      const factor = harmonic === 1 ? 0.72 : this.suppressionFactor;

      for (let offset = -radius; offset <= radius; offset += 1) {
        const index = bin + offset;
        if (index < 0 || index >= workingSpectrum.length) continue;
        workingSpectrum[index] *= factor;
      }
    }
  }

  frequencyToMidi(frequency) {
    return 69 + 12 * Math.log2(frequency / 440);
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

  renderNotes(container, notes, latest) {
    if (!notes.length) {
      container.className = "note-list empty";
      container.textContent = latest ? "Nothing detected yet" : "No notes";
      return;
    }

    container.className = "note-list";
    container.replaceChildren(
      ...notes.map((note) => {
        const chip = document.createElement("div");
        chip.className = latest ? "note-chip latest" : "note-chip";
        chip.textContent = `${note.name} ${note.frequency.toFixed(1)} Hz ${note.db.toFixed(1)} dB`;
        return chip;
      })
    );
  }
}

new AudioChordPoc();
