const Camera = {
    stream: null,
    recorder: null,
    chunks: [],

    async startRecording() {
        const preview = document.getElementById('recording-preview');

        // Get camera stream
        this.stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 }
            },
            audio: true
        });

        // Try to apply native zoom to avoid ultra-wide angle
        const videoTrack = this.stream.getVideoTracks()[0];
        try {
            const capabilities = videoTrack.getCapabilities();
            if (capabilities.zoom) {
                // Zoom to ~1.5x to get normal 1x field of view
                const targetZoom = Math.min(capabilities.zoom.max, 1.5);
                await videoTrack.applyConstraints({
                    advanced: [{ zoom: targetZoom }]
                });
            }
        } catch (e) {
            // Zoom not supported - continue with default view
        }

        preview.srcObject = this.stream;
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

    stopRecording() {
        if (this.recorder && this.recorder.state === 'recording') {
            this.recorder.stop();
        }
    },

    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        const preview = document.getElementById('recording-preview');
        preview.srcObject = null;
    }
};
