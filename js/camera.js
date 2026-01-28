const Camera = {
    stream: null,
    recorder: null,
    chunks: [],
    canvas: null,
    ctx: null,
    animationId: null,

    // Zoom factor to crop ultra-wide to normal (1x) view
    ZOOM: 1.5,
    // Output resolution
    OUTPUT_WIDTH: 1920,
    OUTPUT_HEIGHT: 1080,

    async startRecording() {
        const preview = document.getElementById('recording-preview');

        // Request high resolution from the ultra-wide sensor
        this.stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 3840 },
                height: { ideal: 2160 },
                frameRate: { ideal: 30 }
            },
            audio: true
        });

        // Create offscreen canvas for cropping
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.OUTPUT_WIDTH;
        this.canvas.height = this.OUTPUT_HEIGHT;
        this.ctx = this.canvas.getContext('2d');

        // Hidden video element to receive raw camera feed
        this._rawVideo = document.createElement('video');
        this._rawVideo.srcObject = this.stream;
        this._rawVideo.muted = true;
        this._rawVideo.playsInline = true;
        await this._rawVideo.play();

        // Draw cropped frames to canvas
        const drawFrame = () => {
            if (!this._rawVideo) return;
            const vw = this._rawVideo.videoWidth;
            const vh = this._rawVideo.videoHeight;
            if (vw && vh) {
                // Crop center portion (1/ZOOM of the full frame)
                const cropW = vw / this.ZOOM;
                const cropH = vh / this.ZOOM;
                const sx = (vw - cropW) / 2;
                const sy = (vh - cropH) / 2;

                // Mirror horizontally for front camera
                this.ctx.save();
                this.ctx.scale(-1, 1);
                this.ctx.drawImage(this._rawVideo, sx, sy, cropW, cropH, -this.OUTPUT_WIDTH, 0, this.OUTPUT_WIDTH, this.OUTPUT_HEIGHT);
                this.ctx.restore();
            }
            this.animationId = requestAnimationFrame(drawFrame);
        };
        drawFrame();

        // Show cropped canvas in preview
        const canvasStream = this.canvas.captureStream(30);
        preview.srcObject = canvasStream;

        // Combine cropped video with original audio for recording
        const audioTrack = this.stream.getAudioTracks()[0];
        const recordStream = new MediaStream([
            canvasStream.getVideoTracks()[0],
            ...(audioTrack ? [audioTrack] : [])
        ]);

        this.chunks = [];

        const mimeType = MediaRecorder.isTypeSupported('video/mp4')
            ? 'video/mp4'
            : 'video/webm;codecs=vp8,opus';

        this.recorder = new MediaRecorder(recordStream, { mimeType });

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
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this._rawVideo) {
            this._rawVideo.srcObject = null;
            this._rawVideo = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        this.canvas = null;
        this.ctx = null;
        const preview = document.getElementById('recording-preview');
        preview.srcObject = null;
    }
};
