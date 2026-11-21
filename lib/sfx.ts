/** Basit WebAudio ses efektleri (dosya gerekmez). Tarayıcı izin verene kadar sessiz kalır. */
type Kind = "coin" | "catch" | "level" | "pop" | "error" | "click" | "win";

const TONES: Record<Kind, { notes: number[]; dur: number; wave: OscillatorType; vol: number }> = {
  coin: { notes: [988, 1319], dur: 0.07, wave: "square", vol: 0.05 },
  catch: { notes: [523, 659, 784], dur: 0.09, wave: "triangle", vol: 0.09 },
  level: { notes: [523, 659, 784, 1047], dur: 0.12, wave: "triangle", vol: 0.1 },
  win: { notes: [659, 784, 988, 1319], dur: 0.1, wave: "square", vol: 0.06 },
  pop: { notes: [520], dur: 0.04, wave: "sine", vol: 0.05 },
  error: { notes: [220, 165], dur: 0.1, wave: "sawtooth", vol: 0.04 },
  click: { notes: [700], dur: 0.025, wave: "sine", vol: 0.04 },
};

class Sfx {
  enabled = true;
  private ctx: AudioContext | null = null;

  private audio(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.ctx = new Ctor();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  play(kind: Kind) {
    if (!this.enabled) return;
    const ctx = this.audio();
    if (!ctx || ctx.state !== "running") return;
    const t = TONES[kind];
    t.notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * t.dur;
      osc.type = t.wave;
      osc.frequency.value = f;
      gain.gain.setValueAtTime(t.vol, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + t.dur * 0.95);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + t.dur);
    });
  }
}

export const sfx = new Sfx();
