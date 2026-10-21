let ctx: AudioContext | null = null;

export const getSoundOn = () =>
  typeof window !== "undefined" && localStorage.getItem("soundOff") !== "1";
export const saveSoundOn = (on: boolean) =>
  localStorage.setItem("soundOff", on ? "0" : "1");

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine") {
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function buzz(pattern: number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

// Call from a button tap so the browser allows sound.
export const unlockSound = () => { getCtx(); };

export const playSuccess = () => {
  if (!getSoundOn()) return;
  tone(880, 0, 0.12);
  tone(1320, 0.13, 0.18);
  buzz([80]);
};

export const playError = () => {
  if (!getSoundOn()) return;
  tone(220, 0, 0.25, "square");
  tone(180, 0.28, 0.3, "square");
  buzz([200, 100, 200]);
};

export const playCaptured = () => {
  if (!getSoundOn()) return;
  tone(1000, 0, 0.15);
  buzz([60]);
};
