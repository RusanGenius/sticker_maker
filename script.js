document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    lucide.createIcons();

    // State
    let videoUrl = null;
    let outputUrl = null;
    let isProcessing = false;
    let startTime = 0;
    let endTime = 3;
    let duration = 0;
    let isRoundMask = false;
    let playbackRate = 1;
    let scaleMode = 'fill';
    let transparentBg = true;
    let videoDimensions = { w: 0, h: 0 };

    // DOM Elements
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const editorArea = document.getElementById('editor-area');
    const outputArea = document.getElementById('output-area');
    const videoPreview = document.getElementById('video-preview');
    const outputVideo = document.getElementById('output-video');
    const downloadLink = document.getElementById('download-link');
    const btnReset = document.getElementById('btn-reset');
    const previewContainer = document.getElementById('preview-container');
    
    // Controls
    const btnScaleFill = document.getElementById('btn-scale-fill');
    const btnScaleFit = document.getElementById('btn-scale-fit');
    const btnBgTransparent = document.getElementById('btn-bg-transparent');
    const btnBgBlack = document.getElementById('btn-bg-black');
    const speedBtns = document.querySelectorAll('.speed-btn');
    const btnShapeSquare = document.getElementById('btn-shape-square');
    const btnShapeRound = document.getElementById('btn-shape-round');
    
    // Timeline
    const inputStartTime = document.getElementById('start-time');
    const inputEndTime = document.getElementById('end-time');
    const textStartTime = document.getElementById('start-time-text');
    const textEndTime = document.getElementById('end-time-text');
    const trimOutputText = document.getElementById('trim-output-text');
    
    // Generate
    const btnGenerate = document.getElementById('btn-generate');
    const generateText = document.getElementById('generate-text');
    const generateSpinner = document.getElementById('generate-spinner');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const errorMsg = document.getElementById('error-msg');
    const unsupportedWarning = document.getElementById('unsupported-warning');

    // Check support
    const isSupported = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm; codecs=vp9');
    if (!isSupported) {
        unsupportedWarning.classList.remove('hidden');
        uploadArea.classList.add('opacity-50', 'pointer-events-none');
        fileInput.disabled = true;
    }

    // Helpers for UI updates
    const updateActiveButton = (activeBtn, inactiveBtn) => {
        activeBtn.className = "flex-1 py-1.5 px-2 rounded-lg text-sm font-medium transition-colors bg-tg-primary text-white";
        inactiveBtn.className = "flex-1 py-1.5 px-2 rounded-lg text-sm font-medium transition-colors bg-tg-bg text-tg-textMuted hover:bg-tg-border";
    };

    const updateShapeButton = (activeBtn, inactiveBtn) => {
        activeBtn.className = "flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors bg-tg-primary text-white";
        inactiveBtn.className = "flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors bg-tg-bg text-tg-textMuted hover:bg-tg-border";
    };

    const updateTimelineText = () => {
        textStartTime.textContent = `Start: ${startTime.toFixed(1)}s`;
        textEndTime.textContent = `End: ${endTime.toFixed(1)}s`;
        trimOutputText.textContent = `Output: ${((endTime - startTime) / playbackRate).toFixed(1)}s / 3.0s`;
    };

    // Event Listeners - Upload
    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('border-tg-primary', 'bg-tg-primary/10');
        uploadArea.classList.remove('border-tg-border', 'bg-tg-panel');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('border-tg-primary', 'bg-tg-primary/10');
        uploadArea.classList.add('border-tg-border', 'bg-tg-panel');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-tg-primary', 'bg-tg-primary/10');
        uploadArea.classList.add('border-tg-border', 'bg-tg-panel');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    const handleFile = (file) => {
        if (!file.type.startsWith('video/')) return;
        
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        videoUrl = URL.createObjectURL(file);
        videoPreview.src = videoUrl;
        
        // Reset state
        startTime = 0;
        endTime = 3;
        playbackRate = 1;
        scaleMode = 'fill';
        transparentBg = true;
        isRoundMask = false;
        outputUrl = null;
        
        // Update UI
        uploadArea.classList.add('hidden');
        editorArea.classList.remove('hidden');
        outputArea.classList.add('hidden');
        errorMsg.classList.add('hidden');
        
        // Reset buttons
        updateActiveButton(btnScaleFill, btnScaleFit);
        updateActiveButton(btnBgTransparent, btnBgBlack);
        updateShapeButton(btnShapeSquare, btnShapeRound);
        speedBtns.forEach(btn => {
            if(btn.dataset.speed === "1") {
                btn.className = "speed-btn flex-1 py-1.5 px-2 rounded-lg text-sm font-medium transition-colors bg-tg-primary text-white";
            } else {
                btn.className = "speed-btn flex-1 py-1.5 px-2 rounded-lg text-sm font-medium transition-colors bg-tg-bg text-tg-textMuted hover:bg-tg-border";
            }
        });
        
        previewContainer.className = "relative w-64 h-64 overflow-hidden flex items-center justify-center transition-all duration-300 rounded-lg border border-tg-border checkerboard";
        previewContainer.style.backgroundColor = 'transparent';
        videoPreview.style.objectFit = 'cover';
    };

    btnReset.addEventListener('click', () => {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        videoUrl = null;
        fileInput.value = '';
        uploadArea.classList.remove('hidden');
        editorArea.classList.add('hidden');
        outputArea.classList.add('hidden');
    });

    // Video Preview Listeners
    videoPreview.addEventListener('loadedmetadata', () => {
        duration = videoPreview.duration;
        endTime = Math.min(3 * playbackRate, duration);
        videoPreview.playbackRate = playbackRate;
        videoDimensions = {
            w: videoPreview.videoWidth,
            h: videoPreview.videoHeight
        };
        
        inputStartTime.max = duration;
        inputEndTime.max = duration;
        inputStartTime.value = startTime;
        inputEndTime.value = endTime;
        updateTimelineText();
    });

    videoPreview.addEventListener('timeupdate', () => {
        if (!isProcessing) {
            if (videoPreview.currentTime >= endTime) {
                videoPreview.currentTime = startTime;
                videoPreview.play().catch(() => {});
            } else if (videoPreview.currentTime < startTime) {
                videoPreview.currentTime = startTime;
            }
        }
    });

    // Controls Listeners
    btnScaleFill.addEventListener('click', () => {
        scaleMode = 'fill';
        updateActiveButton(btnScaleFill, btnScaleFit);
        videoPreview.style.objectFit = 'cover';
    });

    btnScaleFit.addEventListener('click', () => {
        scaleMode = 'fit';
        updateActiveButton(btnScaleFit, btnScaleFill);
        videoPreview.style.objectFit = 'contain';
    });

    btnBgTransparent.addEventListener('click', () => {
        transparentBg = true;
        updateActiveButton(btnBgTransparent, btnBgBlack);
        previewContainer.classList.add('checkerboard');
        previewContainer.style.backgroundColor = 'transparent';
    });

    btnBgBlack.addEventListener('click', () => {
        transparentBg = false;
        updateActiveButton(btnBgBlack, btnBgTransparent);
        previewContainer.classList.remove('checkerboard');
        previewContainer.style.backgroundColor = '#000';
    });

    speedBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rate = parseFloat(e.target.dataset.speed);
            playbackRate = rate;
            videoPreview.playbackRate = rate;
            
            speedBtns.forEach(b => {
                b.className = "speed-btn flex-1 py-1.5 px-2 rounded-lg text-sm font-medium transition-colors bg-tg-bg text-tg-textMuted hover:bg-tg-border";
            });
            e.target.className = "speed-btn flex-1 py-1.5 px-2 rounded-lg text-sm font-medium transition-colors bg-tg-primary text-white";
            
            const maxAllowed = 3 * rate;
            if (endTime - startTime > maxAllowed) {
                endTime = Math.min(duration, startTime + maxAllowed);
                inputEndTime.value = endTime;
            }
            updateTimelineText();
        });
    });

    inputStartTime.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (val < endTime) {
            startTime = val;
            const maxAllowed = 3 * playbackRate;
            if (endTime - val > maxAllowed) {
                endTime = Math.min(duration, val + maxAllowed);
                inputEndTime.value = endTime;
            }
            videoPreview.currentTime = val;
            videoPreview.play().catch(() => {});
            updateTimelineText();
        } else {
            e.target.value = startTime;
        }
    });

    inputEndTime.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (val > startTime) {
            endTime = val;
            const maxAllowed = 3 * playbackRate;
            if (val - startTime > maxAllowed) {
                startTime = Math.max(0, val - maxAllowed);
                inputStartTime.value = startTime;
            }
            videoPreview.currentTime = Math.max(startTime, val - 0.1);
            videoPreview.play().catch(() => {});
            updateTimelineText();
        } else {
            e.target.value = endTime;
        }
    });

    btnShapeSquare.addEventListener('click', () => {
        isRoundMask = false;
        updateShapeButton(btnShapeSquare, btnShapeRound);
        previewContainer.className = "relative w-64 h-64 overflow-hidden flex items-center justify-center transition-all duration-300 rounded-lg border border-tg-border " + (transparentBg ? "checkerboard" : "");
    });

    btnShapeRound.addEventListener('click', () => {
        isRoundMask = true;
        updateShapeButton(btnShapeRound, btnShapeSquare);
        previewContainer.className = "relative w-64 h-64 overflow-hidden flex items-center justify-center transition-all duration-300 rounded-full border-4 border-tg-primary " + (transparentBg ? "checkerboard" : "");
    });

    // Generate Logic
    const getDrawParams = () => {
        const cw = 512;
        const ch = 512;
        const vw = videoDimensions.w || 512;
        const vh = videoDimensions.h || 512;

        let scale = 1;
        if (scaleMode === 'fit') {
            scale = Math.min(cw / vw, ch / vh);
        } else {
            scale = Math.max(cw / vw, ch / vh); // fill
        }

        const dw = vw * scale;
        const dh = vh * scale;
        const dx = (cw - dw) / 2;
        const dy = (ch - dh) / 2;

        return { dw, dh, dx, dy };
    };

    btnGenerate.addEventListener('click', async () => {
        if (!videoUrl || isProcessing || !isSupported) return;
        
        isProcessing = true;
        outputArea.classList.add('hidden');
        errorMsg.classList.add('hidden');
        btnGenerate.disabled = true;
        generateText.textContent = 'Processing... 0%';
        generateSpinner.classList.remove('hidden');
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error("Canvas 2D context not supported");

            const hiddenVideo = document.createElement('video');
            hiddenVideo.src = videoUrl;
            hiddenVideo.muted = true;
            hiddenVideo.playsInline = true;
            hiddenVideo.crossOrigin = "anonymous";
            hiddenVideo.playbackRate = playbackRate;
            
            await new Promise((resolve, reject) => {
                hiddenVideo.onloadedmetadata = resolve;
                hiddenVideo.onerror = reject;
            });

            hiddenVideo.currentTime = startTime;
            await new Promise((resolve) => {
                hiddenVideo.onseeked = resolve;
            });

            const stream = canvas.captureStream(30);
            const recorder = new MediaRecorder(stream, {
                mimeType: 'video/webm; codecs=vp9',
                videoBitsPerSecond: 400000 
            });

            const chunks = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            const processingPromise = new Promise((resolve, reject) => {
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    resolve(URL.createObjectURL(blob));
                };
                recorder.onerror = (e) => reject(e);
            });

            recorder.start();
            await hiddenVideo.play();

            const durationMs = ((endTime - startTime) / playbackRate) * 1000;
            const startRealTime = performance.now();

            const drawFrame = () => {
                const elapsed = performance.now() - startRealTime;
                const progress = Math.min(100, (elapsed / durationMs) * 100);
                
                generateText.textContent = `Processing... ${Math.round(progress)}%`;
                progressBar.style.width = `${progress}%`;

                if (elapsed >= durationMs || hiddenVideo.currentTime >= endTime) {
                    hiddenVideo.pause();
                    recorder.stop();
                    return;
                }

                ctx.clearRect(0, 0, 512, 512);
                const { dw, dh, dx, dy } = getDrawParams();

                ctx.save();
                
                if (isRoundMask) {
                    ctx.beginPath();
                    ctx.arc(256, 256, 256, 0, Math.PI * 2);
                    ctx.clip();
                }

                if (!transparentBg) {
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, 512, 512);
                }

                ctx.drawImage(hiddenVideo, dx, dy, dw, dh);
                ctx.restore();

                requestAnimationFrame(drawFrame);
            };

            drawFrame();

            outputUrl = await processingPromise;
            
            outputVideo.src = outputUrl;
            downloadLink.href = outputUrl;
            outputArea.classList.remove('hidden');
            
        } catch (error) {
            console.error("Error processing video:", error);
            errorMsg.textContent = error.message || "Failed to process video";
            errorMsg.classList.remove('hidden');
        }
        
        isProcessing = false;
        btnGenerate.disabled = false;
        generateText.textContent = 'Generate Sticker';
        generateSpinner.classList.add('hidden');
        progressContainer.classList.add('hidden');
    });
});
