const Camera = {
    stream: null,
    recorder: null,
    chunks: [],
    _orientationHandler: null,

    /**
     * Try to find the "normal" (non-wide-angle) front camera.
     * If iPad exposes 2 front cameras, pick the non-wide one.
     * Otherwise fallback to facingMode: 'user'.
     */
    async _getFrontCameraId() {
        try {
            // Need a temporary stream to get labels (iOS requires permission first)
            const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            tempStream.getTracks().forEach(t => t.stop());

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

        // Try to select the best front camera
        const deviceId = await this._getFrontCameraId();

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

        preview.srcObject = this.stream;

        // Fix PWA rotation
        this._applyOrientationFix(preview);
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

        // Just mirror for front camera - same behavior in Safari and PWA
        // iOS handles camera orientation automatically in both modes
        videoEl.style.transform = 'scaleX(-1)';

        console.log(`[Camera] Orientation: ${angle}°, standalone: ${isStandalone}, transform: scaleX(-1)`);

        console.log(`[Camera] Orientation: ${angle}°, standalone: ${isStandalone}`);
    },

    stopRecording() {
        if (this.recorder && this.recorder.state === 'recording') {
            this.recorder.stop();
        }
    },

    cleanup() {
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
        preview.style.transform = '';
        preview.style.width = '';
        preview.style.height = '';
    }
};
