// whisper-worker.js
import { pipeline, env } from './libs/transformers.min.js';

// Configure transformers.js
env.allowLocalModels = false; // We want to pull from the Hugging Face Hub (cached after first download)
env.useBrowserCache = true; // Cache in IndexedDB

let transcriber = null;

async function initTranscriber(progressCallback) {
    if (transcriber) return transcriber;
    
    // Using the multilingual tiny whisper model for English + Hindi support
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
        progress_callback: progressCallback
    });
    
    return transcriber;
}

self.onmessage = async (e) => {
    if (e.data.type === 'transcribe') {
        try {
            const audioData = e.data.audio;
            
            self.postMessage({ status: 'progress', file: 'Xenova/whisper-tiny', progress: 0 });
            
            const tr = await initTranscriber(data => {
                if (data.status === 'progress') {
                    self.postMessage({ status: 'progress', file: data.file, progress: data.progress });
                }
            });
            
            self.postMessage({ status: 'ready' });
            
            // Run inference
            const result = await tr(audioData, {
                chunk_length_s: 30,
                stride_length_s: 5,
                return_timestamps: true,
                callback_function: (output) => {
                    // Send live updates if possible
                    if (output && output.chunks) {
                        self.postMessage({ status: 'update', output: output.chunks });
                    }
                }
            });
            
            self.postMessage({ status: 'complete', output: result.chunks });
            
        } catch (err) {
            console.error('Whisper Worker Error:', err);
            self.postMessage({ status: 'error', data: err.message });
        }
    }
};
