// Menu Dropdown
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
        item.querySelector('.submenu').style.display = 'block';
    });

    item.addEventListener('mouseleave', () => {
        item.querySelector('.submenu').style.display = 'none';
    });
});

// Tuner
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioCtx.createAnalyser();

analyser.fftSize = 2048;

const bufferLength = analyser.fftSize;
const buffer = new Float32Array(bufferLength);

let running = false;

document.getElementById('startBtn').onclick = async () => {
    if (!running) {
        try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        running = true;
        audioCtx.resume();
        update();
        } catch(err) {
        console.error('Mic access denied:', err);
        }
    }
};

function autoCorrelate(buffer, sampleRate) {
const n = buffer.length;
let bestOffset = -1;
let bestCorrelation = 0;
let rms = 0;

// Compute root-mean-square to check signal strength
for (let i = 0; i < n; i++) {
    const val = buffer[i];
    rms += val * val;
}

rms = Math.sqrt(rms/n);

if (rms < 0.01) {
    // Signal too weak – no reliable pitch
    return null;
}

// Autocorrelation: for each possible offset, calculate sum of products
for (let offset = 1; offset < n; offset++) {
    let correlation = 0;
    for (let i = 0; i < n - offset; i++) {
        correlation += buffer[i] * buffer[i + offset];
    }

    correlation = correlation / (n - offset);  // normalize

    if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
    }
}

if (bestCorrelation < 0.01 || bestOffset === -1) {
    // No strong correlation found
    return null;
}

    // The period of the signal is bestOffset samples
    const frequency = sampleRate / bestOffset;
    return frequency;
}

function noteFromFrequency(freq) {
    const noteNum = 12 * (Math.log2(freq / 440));
    return Math.round(noteNum) + 69;
}

function frequencyFromNoteNumber(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
}

function centsOffFromPitch(freq, noteNum) {
    const fRef = frequencyFromNoteNumber(noteNum);
    return Math.floor(1200 * Math.log2(freq / fRef));
}

function update() {
    requestAnimationFrame(update);
    analyser.getFloatTimeDomainData(buffer);

    const freq = autoCorrelate(buffer, audioCtx.sampleRate);
    const noteElem = document.getElementById('note');
    const octaveElem = document.getElementById('octave');
    const detuneAmtElem = document.getElementById('detune_amt');
    const directionElem = document.getElementById('direction');

    if (freq === null) {
        // No signal
        noteElem.textContent = "--";
        octaveElem.textContent = "";
        detuneAmtElem.textContent = "--";
        directionElem.textContent = "";
    } else {
        const noteNumber = noteFromFrequency(freq);
        const noteName = noteNames[noteNumber % 12];
        const octave = Math.floor(noteNumber / 12) - 1;

        noteElem.textContent = noteName;
        octaveElem.textContent = octave;

        const detune = centsOffFromPitch(freq, noteNumber);

        if (Math.abs(detune) < 5) { 
        detuneDirectionElem.textContent = "✓"; 
        detuneDirectionElem.className = "in-tune"; 
        detuneAmountElem.textContent = "--";
        } else if (detune < 0) {
        detuneDirectionElem.textContent = "♭";
        detuneDirectionElem.className = "flat";
        detuneAmountElem.textContent = Math.abs(detune);
        } else if (detune > 0) {
        detuneDirectionElem.textContent = "♯";
        detuneDirectionElem.className = "sharp";
        detuneAmountElem.textContent = detune;
        }
    }
}

function updateTuner() {
    requestAnimationFrame(updateTuner);
    analyser.getFloatTimeDomainData(buffer);

    const pitch = autoCorrelate(buffer, audioCtx.sampleRate);

    if (pitch) {
        updateUIWithPitch(pitch);
    } else {
        // No pitch detected – possibly silence or noise
        displayNoSignal();
    }
}