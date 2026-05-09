// popup.js
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const uploadSection = document.getElementById('upload-section');
const previewSection = document.getElementById('preview-section');
const videoPlayer = document.getElementById('video-player');
const subtitleCanvas = document.getElementById('subtitle-canvas');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const progressStatus = document.getElementById('progress-status');

let videoFile = null;
let audioBuffer = null;
let subtitles = []; // array of { text, timestamp }
let isProcessing = false;

// UI Setup
browseBtn.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (!file.type.startsWith('video/')) {
        alert('Please upload a valid video file.');
        return;
    }
    videoFile = file;
    const url = URL.createObjectURL(file);
    videoPlayer.src = url;
    
    uploadSection.classList.add('hidden');
    uploadSection.classList.remove('active');
    previewSection.classList.remove('hidden');
    previewSection.classList.add('active');

    startProcessing(file);
}

function updateProgress(status, percent) {
    progressContainer.classList.remove('hidden');
    progressStatus.textContent = status;
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${Math.round(percent)}%`;
    if (percent >= 100) {
        setTimeout(() => progressContainer.classList.add('hidden'), 2000);
    }
}

// Processing Logic
async function startProcessing(file) {
    isProcessing = true;
    updateProgress('Extracting Audio...', 10);
    
    // We will use an AudioContext to quickly extract the audio buffer without needing FFmpeg
    // This is much faster in-browser than FFmpeg for simple audio extraction
    try {
        updateProgress('Reading file...', 20);
        const arrayBuffer = await file.arrayBuffer();
        
        updateProgress('Decoding audio (this may take a moment)...', 40);
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Extract channel data (mono)
        const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, 16000);
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start();
        
        const renderedBuffer = await offlineCtx.startRendering();
        const float32Array = renderedBuffer.getChannelData(0);
        
        updateProgress('Audio extracted. Initializing AI Model...', 50);
        runWhisper(float32Array);

    } catch (e) {
        console.error('Audio extraction failed:', e);
        updateProgress('Audio extraction failed.', 0);
        alert('Could not decode video audio. See console for details.');
    }
}

function runWhisper(audioData) {
    const worker = new Worker('whisper-worker.js', { type: 'module' });
    
    worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.status === 'progress') {
            // Model downloading progress
            updateProgress(`Downloading AI Model (${msg.file})...`, 50 + (msg.progress * 0.2));
        } else if (msg.status === 'ready') {
            updateProgress('AI Model ready. Transcribing...', 75);
        } else if (msg.status === 'update') {
            // Live updates of transcription
            updateProgress('Transcribing audio...', 80);
            subtitles = msg.output;
            renderSubtitles();
        } else if (msg.status === 'complete') {
            updateProgress('Transcription Complete!', 100);
            subtitles = msg.output;
            renderSubtitles();
            worker.terminate();
        } else if (msg.status === 'error') {
            alert('Transcription error: ' + msg.data);
        }
    };
    
    worker.postMessage({ type: 'transcribe', audio: audioData });
}

// Subtitle Rendering
let currentSubtitle = null;

videoPlayer.addEventListener('timeupdate', () => {
    const currentTime = videoPlayer.currentTime;
    // Find the subtitle that matches current time
    const activeSub = subtitles.find(s => {
        const start = s.timestamp[0];
        const end = s.timestamp[1] || start + 5; // fallback
        return currentTime >= start && currentTime <= end;
    });
    
    if (activeSub !== currentSubtitle) {
        currentSubtitle = activeSub;
        renderSubtitles();
    }
});

function renderSubtitles() {
    const ctx = subtitleCanvas.getContext('2d');
    
    // Resize canvas to match video intrinsic size
    if (videoPlayer.videoWidth && subtitleCanvas.width !== videoPlayer.videoWidth) {
        subtitleCanvas.width = videoPlayer.videoWidth;
        subtitleCanvas.height = videoPlayer.videoHeight;
    }
    
    ctx.clearRect(0, 0, subtitleCanvas.width, subtitleCanvas.height);
    
    if (!currentSubtitle || !currentSubtitle.text) return;
    
    // Get Styles
    const color = document.getElementById('style-color').value;
    const bgColor = document.getElementById('style-bg').value;
    const bgOpacity = parseFloat(document.getElementById('style-opacity').value);
    const rawSize = parseInt(document.getElementById('style-size').value, 10);
    const posY = parseInt(document.getElementById('style-y').value, 10); // 10 to 100 percentage
    
    // Scale font size based on video height (assuming 1080p base for rawSize)
    const scaleFactor = subtitleCanvas.height / 1080;
    const fontSize = Math.max(16, rawSize * scaleFactor * 2);
    
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const text = currentSubtitle.text.trim();
    const x = subtitleCanvas.width / 2;
    const y = (subtitleCanvas.height * posY) / 100;
    
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.2;
    
    // Draw Background
    if (bgOpacity > 0) {
        ctx.fillStyle = hexToRgba(bgColor, bgOpacity);
        const paddingX = 20 * scaleFactor;
        const paddingY = 10 * scaleFactor;
        ctx.beginPath();
        ctx.roundRect(
            x - (textWidth / 2) - paddingX, 
            y - (textHeight / 2) - paddingY, 
            textWidth + (paddingX * 2), 
            textHeight + (paddingY * 2), 
            10 * scaleFactor
        );
        ctx.fill();
    }
    
    // Draw Text
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0; // reset
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Re-render when styles change
['style-color', 'style-bg', 'style-opacity', 'style-size', 'style-y'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderSubtitles);
});

// Instagram Reels Preset
document.getElementById('preset-reels-btn').addEventListener('click', () => {
    document.getElementById('style-color').value = '#FFFF00'; // Yellow text
    document.getElementById('style-bg').value = '#000000'; // Black bg
    document.getElementById('style-opacity').value = '0.8'; // High opacity
    document.getElementById('style-size').value = '42'; // Large text
    document.getElementById('style-y').value = '75'; // Middle-lower third
    renderSubtitles();
});

// Resize observer to keep canvas matching video layout in the DOM
const resizeObserver = new ResizeObserver(() => {
    renderSubtitles();
});
resizeObserver.observe(videoPlayer);

// Export SRT functionality
document.getElementById('export-srt-btn').addEventListener('click', () => {
    if (!subtitles.length) return alert('No subtitles generated yet.');
    
    let srtContent = '';
    subtitles.forEach((sub, index) => {
        const start = formatTime(sub.timestamp[0]);
        const end = formatTime(sub.timestamp[1] || sub.timestamp[0] + 5);
        srtContent += `${index + 1}\n${start} --> ${end}\n${sub.text.trim()}\n\n`;
    });
    
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.srt';
    a.click();
    URL.revokeObjectURL(url);
});

function formatTime(seconds) {
    const date = new Date(0);
    date.setSeconds(Math.floor(seconds));
    date.setMilliseconds((seconds % 1) * 1000);
    const timeString = date.toISOString().substr(11, 12);
    return timeString.replace('.', ',');
}

// Export Video (Canvas MediaRecorder)
document.getElementById('export-video-btn').addEventListener('click', async () => {
    if (!subtitles.length) return alert('No subtitles generated yet.');
    
    const confirmExport = confirm('To export the video, we need to play it from start to finish to record the subtitles. Do you want to proceed?');
    if (!confirmExport) return;

    // Reset video
    videoPlayer.currentTime = 0;
    
    // Capture streams
    const canvasStream = subtitleCanvas.captureStream(30); // 30 fps
    
    // Attempt to get audio stream from video element
    // Note: Due to cross-origin/local file restrictions, captureStream() on a video might sometimes omit audio.
    let audioStream;
    try {
        if (videoPlayer.captureStream) {
            const vidStream = videoPlayer.captureStream();
            const audioTracks = vidStream.getAudioTracks();
            if (audioTracks.length > 0) {
                canvasStream.addTrack(audioTracks[0]);
            }
        } else if (videoPlayer.mozCaptureStream) {
            const vidStream = videoPlayer.mozCaptureStream();
            const audioTracks = vidStream.getAudioTracks();
            if (audioTracks.length > 0) {
                canvasStream.addTrack(audioTracks[0]);
            }
        }
    } catch(e) {
        console.warn('Could not capture audio track from video:', e);
    }

    const mediaRecorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm' });
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'captioned_video.webm';
        a.click();
        URL.revokeObjectURL(url);
        
        updateProgress('Export complete!', 100);
    };

    // UI Updates
    updateProgress('Recording video export...', 0);
    
    mediaRecorder.start();
    videoPlayer.play();

    // Stop recording when video ends
    videoPlayer.onended = () => {
        mediaRecorder.stop();
        videoPlayer.onended = null; // cleanup
    };
});
