const Camera = {
    stream: null,
    recorder: null,
    chunks: [],
    _orientationHandler: null,
    _maxDuration: 600,
    _timerInterval: null,
    _elapsed: 0,
    _cachedDeviceId: null,

    /**
     * Try to find the "normal" (non-wide-angle) front camera.
     * If iPad exposes 2 front cameras, pick the non-wide one.
     * Otherwise fallback to facingMode: 'user'.
     */
    async _getFrontCameraId() {
        try {
            // Try enumerateDevices directly (labels available if permission already granted)
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter(d => d.kind === 'videoinput');

            console.log('[Camera] Video devices found:', videoInputs.length);
            videoInputs.forEach((d, i) => {
                console.log(`[Camera]   ${i}: "${d.label}" (${d.deviceId.slice(0, 8)}...)`);
            });

            // Look for front cameras (EN: "front", FR: "avant")
            const label = d => d.label.toLowerCase();
            const frontCams = videoInputs.filter(d =>
                label(d).includes('front') || label(d).includes('avant')
            );

            // Exclude back cameras (EN: "back"/"rear", FR: "arrière")
            const frontOnly = frontCams.filter(d =>
                !label(d).includes('back') &&
                !label(d).includes('rear') &&
                !label(d).includes('arrière') &&
                !label(d).includes('arriere')
            );

            console.log('[Camera] Front cameras found:', frontOnly.map(d => d.label));

            if (frontOnly.length >= 2) {
                // iPad with 2 front cameras: pick the normal one (not ultra/wide/grand angle)
                const normalCam = frontOnly.find(d =>
                    !label(d).includes('wide') &&
                    !label(d).includes('ultra') &&
                    !label(d).includes('grand angle')
                );
                if (normalCam) {
                    console.log('[Camera] Selected normal front camera:', normalCam.label);
                    return normalCam.deviceId;
                }
            }

            if (frontOnly.length === 1) {
                console.log('[Camera] Single front camera:', frontOnly[0].label);
                return frontOnly[0].deviceId;
            }
        } catch (e) {
            console.log('[Camera] enumerateDevices failed, using facingMode fallback');
        }
        return null;
    },

    async startRecording() {
        const preview = document.getElementById('recording-preview');

        // Reset inline styles so CSS defaults (fullscreen) apply immediately
        preview.removeAttribute('style');

        // Try to select the best front camera (use cached if available)
        const deviceId = this._cachedDeviceId || await this._getFrontCameraId();

        // Build video constraints
        const videoConstraints = {
            frameRate: { ideal: 30, max: 30 },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        };

        if (deviceId) {
            videoConstraints.deviceId = { exact: deviceId };
        } else {
            videoConstraints.facingMode = 'user';
        }

        // Try 1080p@30, fallback to 720p@30
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraints,
                audio: true
            });
        } catch (e) {
            console.log('[Camera] 1080p failed, trying 720p fallback');
            videoConstraints.width = { ideal: 1280 };
            videoConstraints.height = { ideal: 720 };
            // If deviceId failed, fallback to facingMode
            if (deviceId) {
                delete videoConstraints.deviceId;
                videoConstraints.facingMode = 'user';
            }
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraints,
                audio: true
            });
        }

        // Log actual settings for debugging
        const track = this.stream.getVideoTracks()[0];
        const settings = track.getSettings();
        console.log('[Camera] Actual settings:', JSON.stringify(settings));
        console.log(`[Camera] Resolution: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);

        // If we couldn't identify cameras before (no labels), check now and switch if needed
        if (!deviceId) {
            const betterDeviceId = await this._getFrontCameraId();
            if (betterDeviceId && betterDeviceId !== settings.deviceId) {
                console.log('[Camera] Switching to correct front camera:', betterDeviceId);
                this.stream.getTracks().forEach(t => t.stop());
                const betterConstraints = {
                    frameRate: { ideal: 30, max: 30 },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                };
                betterConstraints.deviceId = { exact: betterDeviceId };
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: betterConstraints,
                    audio: true
                });
                const newTrack = this.stream.getVideoTracks()[0];
                const newSettings = newTrack.getSettings();
                console.log('[Camera] Switched. New settings:', JSON.stringify(newSettings));
                this._cachedDeviceId = betterDeviceId;
            } else if (betterDeviceId) {
                // Already on the right camera, cache it
                this._cachedDeviceId = settings.deviceId;
            }
        }

        // Fix PWA rotation BEFORE showing the stream
        this._applyOrientationFix(preview);

        preview.srcObject = this.stream;

        this._orientationHandler = () => this._applyOrientationFix(preview);
        window.addEventListener('orientationchange', this._orientationHandler);
        window.addEventListener('resize', this._orientationHandler);

        this.chunks = [];

        // Use mp4 if supported, otherwise webm
        const mimeType = MediaRecorder.isTypeSupported('video/mp4')
            ? 'video/mp4'
            : 'video/webm;codecs=vp8,opus';

        this.recorder = new MediaRecorder(this.stream, { mimeType });

        this.recorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.chunks.push(e.data);
        };

        this.recorder.onstop = () => {
            const blob = new Blob(this.chunks, { type: this.recorder.mimeType });
            this.cleanup();
            App.onRecordingComplete(blob);
        };

        this.recorder.start(1000);

        // Start max duration timer
        this._maxDuration = Config.get('maxRecording') || 600;
        this._elapsed = 0;
        const timerEl = document.getElementById('recording-timer');
        timerEl.textContent = '';
        timerEl.className = 'recording-timer';
        timerEl.hidden = true;

        this._timerInterval = setInterval(() => {
            this._elapsed++;
            const remaining = this._maxDuration - this._elapsed;

            if (remaining <= 60) {
                // Show timer in last minute
                timerEl.hidden = false;
                const min = Math.floor(remaining / 60);
                const sec = remaining % 60;
                timerEl.textContent = `${min}:${String(sec).padStart(2, '0')}`;

                if (remaining === 10) {
                    timerEl.classList.add('urgent');
                    // Beep to signal last 10 seconds
                    App.playBeep();
                }
            }

            if (remaining <= 0) {
                this.stopRecording();
            }
        }, 1000);
    },

    /**
     * Fix camera rotation in PWA mode on iOS.
     * Detects screen orientation angle and applies CSS rotation to compensate.
     * Combines with scaleX(-1) mirror for front camera.
     */
    _applyOrientationFix(videoEl) {
        let angle = 0;

        if (window.orientation !== undefined) {
            angle = window.orientation;
        } else if (screen.orientation && screen.orientation.angle !== undefined) {
            angle = screen.orientation.angle;
        }

        const isStandalone = window.navigator.standalone === true ||
            window.matchMedia('(display-mode: standalone)').matches;

        // Detect actual landscape by screen dimensions
        // iOS PWA may report 0° even when physically in landscape
        const isActuallyLandscape = window.innerWidth > window.innerHeight;
        const reportsPortrait = (angle === 0 || angle === 180);
        const needsRotation = isStandalone && isActuallyLandscape && reportsPortrait;

        // Force LTR to prevent RTL (Arabic) from shifting the video
        videoEl.style.direction = 'ltr';
        videoEl.style.margin = '0';
        videoEl.style.padding = '0';
        videoEl.style.transformOrigin = 'center center';

        if (needsRotation) {
            // PWA bug: screen is landscape but iOS reports portrait
            // Camera feed comes in portrait, we need to rotate to landscape
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            videoEl.style.position = 'fixed';
            videoEl.style.inset = 'auto';
            videoEl.style.top = '50%';
            videoEl.style.left = '50%';
            videoEl.style.width = vh + 'px';
            videoEl.style.height = vw + 'px';
            videoEl.style.transform = 'translate(-50%, -50%) rotate(-90deg) scaleX(-1)';
            console.log(`[Camera] PWA rotation fix applied: rotate(-90deg), swapped to ${vh}x${vw}`);
        } else {
            // Safari or PWA with correct orientation: just mirror
            videoEl.style.position = 'fixed';
            videoEl.style.inset = '0';
            videoEl.style.width = '100%';
            videoEl.style.height = '100%';
            videoEl.style.transform = 'scaleX(-1)';
        }

        console.log(`[Camera] Orientation: ${angle}°, standalone: ${isStandalone}, landscape: ${isActuallyLandscape}, needsRotation: ${needsRotation}`);
    },

    stopRecording() {
        if (this.recorder && this.recorder.state === 'recording') {
            this.recorder.stop();
        }
    },

    cleanup() {
        // Cleanup audio
        App.cleanupAudio();

        // Clear timer
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
        const timerEl = document.getElementById('recording-timer');
        timerEl.hidden = true;

        // Remove orientation listeners
        if (this._orientationHandler) {
            window.removeEventListener('orientationchange', this._orientationHandler);
            window.removeEventListener('resize', this._orientationHandler);
            this._orientationHandler = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        const preview = document.getElementById('recording-preview');
        preview.srcObject = null;
    }
};
