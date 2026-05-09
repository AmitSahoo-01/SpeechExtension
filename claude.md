# Project Context: Auto-Subtitle Chrome Extension

## Main Goal
A production-ready Chrome Extension that automatically generates subtitles/captions from a video’s voice/audio without using any paid AI API or API key. Runs completely locally.

## Core Requirements
- No paid AI APIs, no OpenAI API, no external backend.
- Everything runs locally in the browser.
- Fast, clean UI, modern responsive design.
- Dark modern theme, Glassmorphism, smooth animations.

## Tech Stack
- Chrome Extension Manifest V3
- HTML, CSS, JavaScript
- FFmpeg.wasm for video/audio processing (audio extraction, video export)
- Web Speech API for speech-to-text (Requires internet but no model downloads)
- Canvas API for live subtitle rendering and preview overlay
- IndexedDB/Local Storage for temporary storage

## Features
1. Upload video from local system / Drag-and-drop support
2. Extract audio automatically
3. Convert speech to subtitles (English + Hindi support)
4. Show live generated captions & Overlay subtitles on video preview
5. Customize Subtitles: Color, Font Size, Position, Background Opacity
6. Export/download final captioned video
7. Progress loader while processing
8. Uses built-in browser APIs to minimize extension size (requires internet)
9. Clean popup UI

## Extension Pages
- popup.html & popup.js: Main UI and logic
- background.js: Background tasks (model loading, processing if possible)
- content.js: Optional page interaction (if needed)
- styles.css: Styling

## Bonus Features
- Auto subtitle timing sync
- Subtitle templates & One-click Instagram Reel caption style
- Export subtitles as .srt file
- Multi-language subtitle support
