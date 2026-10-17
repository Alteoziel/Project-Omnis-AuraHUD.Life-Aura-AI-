export function createVoice({ onLevel, onState } = {}) {
  let context = null;
  let analyser = null;
  let data = null;
  let stream = null;
  let enabled = false;

  const sample = () => {
    if (!analyser || !data) {
      onLevel?.(0);
      return 0;
    }
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    onLevel?.(rms);
    return rms;
  };

  const start = async () => {
    if (enabled) {
      return true;
    }
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    });
    context = new AudioContext();
    analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    data = new Uint8Array(analyser.fftSize);
    if (context.state === "suspended") {
      await context.resume();
    }
    enabled = true;
    onState?.("live");
    return true;
  };

  const stop = () => {
    enabled = false;
    stream?.getTracks().forEach((track) => track.stop());
    context?.close();
    stream = null;
    context = null;
    analyser = null;
    onState?.("standby");
  };

  return {
    start,
    stop,
    sample,
    get enabled() {
      return enabled;
    },
  };
}
