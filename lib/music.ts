/**
 * Basit, telifsiz, prosedürel oda müziği (WebAudio). Dosya gerektirmez.
 * Tarayıcılar sesi otomatik başlatmaya izin vermez; bu yüzden kullanıcı butona basınca başlar.
 */
interface Mood {
  notes: number[];
  tempoMs: number;
  wave: OscillatorType;
}

const MOODS: Record<string, Mood> = {
  "cadde-1": { notes: [261.6, 293.7, 329.6, 392, 440, 523.3], tempoMs: 900, wave: "triangle" },
  "vip-cati-kati": { notes: [220, 261.6, 293.7, 329.6, 392, 440], tempoMs: 1300, wave: "sine" },
  "monako-kulup": { notes: [293.7, 349.2, 392, 440, 523.3, 587.3], tempoMs: 520, wave: "sawtooth" },
  iskele: { notes: [196, 246.9, 293.7, 329.6, 392, 493.9], tempoMs: 1500, wave: "sine" },
  restoran: { notes: [220, 277.2, 329.6, 440, 554.4, 659.3], tempoMs: 700, wave: "triangle" },
  "tetris-arena": { notes: [329.6, 392, 466.2, 523.3, 587.3, 659.3], tempoMs: 300, wave: "square" },
  "parti-oyunu": { notes: [329.6, 392, 440, 523.3, 659.3, 784], tempoMs: 420, wave: "square" },
  "hain-avi": { notes: [110, 123.5, 130.8, 146.8, 164.8, 98], tempoMs: 1800, wave: "sawtooth" },
  "sahil-kasabasi": { notes: [293.7, 329.6, 370, 440, 493.9, 587.3], tempoMs: 800, wave: "triangle" },
  "kis-koyu": { notes: [329.6, 392, 493.9, 587.3, 659.3, 784], tempoMs: 1700, wave: "sine" },
  avm: { notes: [261.6, 329.6, 392, 440, 523.3, 659.3], tempoMs: 750, wave: "triangle" },
  "avm-kat2": { notes: [261.6, 329.6, 392, 440, 523.3, 659.3], tempoMs: 750, wave: "triangle" },
  oyunika: { notes: [329.6, 392, 440, 523.3, 659.3, 784], tempoMs: 480, wave: "square" },
  ciftlik: { notes: [196, 220, 261.6, 293.7, 392, 440], tempoMs: 1200, wave: "triangle" },
  maden: { notes: [130.8, 146.8, 164.8, 196, 220, 261.6], tempoMs: 1600, wave: "sawtooth" },
  "emlak-ofisi": { notes: [261.6, 293.7, 349.2, 392, 440, 523.3], tempoMs: 1000, wave: "sine" },
  home: { notes: [174.6, 196, 220, 261.6, 293.7, 349.2], tempoMs: 1100, wave: "sine" },
};

export class AmbientMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private mood: Mood = MOODS["cadde-1"];
  private step = 0;
  running = false;
  private vol = 0.6;

  setVolume(v: number) {
    this.vol = Math.min(1, Math.max(0, v));
    if (this.master) this.master.gain.value = 0.85 * this.vol;
  }

  private ensure() {
    if (this.ctx) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = 0.85 * this.vol;
    // Hafif yankı
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.34;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    delay.connect(fb);
    fb.connect(delay);
    master.connect(ctx.destination);
    master.connect(delay);
    delay.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
  }

  setRoom(slug: string) {
    this.mood = MOODS[slug] ?? MOODS[slug.startsWith("home-") ? "home" : "cadde-1"];
  }

  start(slug: string) {
    this.setRoom(slug);
    this.ensure();
    if (!this.ctx) return;
    void this.ctx.resume();
    if (this.running) return;
    this.running = true;
    this.tick();
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    void this.ctx?.suspend();
  }

  private tick() {
    if (!this.running || !this.ctx || !this.master) return;
    const { notes, tempoMs, wave } = this.mood;
    this.step++;
    const note = notes[Math.floor(Math.random() * notes.length)];
    this.play(note, wave, 0.05, 1.6);
    // Ara sıra alçak bir "pad" notası
    if (this.step % 4 === 1) this.play(notes[0] / 2, "sine", 0.06, 3.2);
    this.timer = setTimeout(() => this.tick(), tempoMs * (0.8 + Math.random() * 0.6));
  }

  private play(freq: number, wave: OscillatorType, vol: number, dur: number) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}
