"use client";

import { useState } from "react";
import { backend } from "@/lib/backend";
import type { Profile } from "@/lib/types";

export default function AuthScreen({ onAuthed }: { onAuthed: (p: Profile) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const validate = () => {
    const nick = username.trim();
    if (nick.length < 3 || nick.length > 15) return "Kullanıcı adı 3 ile 15 karakter arasında olmalı.";
    if (!/^[a-zA-Z0-9_]+$/.test(nick)) return "Kullanıcı adı sadece harf, rakam ve alt çizgi (_) içerebilir.";
    if (backend.online && password.length < 6) return "Şifre en az 6 karakter olmalı.";
    return "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const nick = username.trim();
      const profile = mode === "login" ? await backend.signIn(nick, password) : await backend.signUp(nick, password);
      onAuthed(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const startDemo = () => {
    const nick = username.trim() || "Misafir";
    if (!/^[a-zA-Z0-9_]{3,15}$/.test(nick)) {
      setError("Demo için 3-15 karakterlik bir kullanıcı adı yaz (harf, rakam, _).");
      return;
    }
    onAuthed(backend.enterDemo(nick));
  };

  const inputCls =
    "w-full bg-slate-950/60 border border-slate-700/80 rounded-xl pl-10 pr-3 py-3 text-sm text-white placeholder-slate-500 transition focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20";
  const primaryCls =
    "w-full bg-gradient-to-b from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 disabled:opacity-60 text-slate-950 font-extrabold text-sm py-3 rounded-xl shadow-[0_8px_24px_-8px_rgba(251,191,36,0.6)] active:translate-y-px transition";
  const features = [
    ["🏙️", "Canlı Cadde", "Arkadaşlarınla gerçek zamanlı sohbet et, dolaş."],
    ["🏠", "Kendi Odan", "Eşyalarla döşe, özgürce konumlandır."],
    ["🎡", "Etkinlik & Çark", "Günlük çark, şenlikler ve ödüller."],
  ];

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white flex items-center justify-center px-4 py-8">
      {/* arka plan: izometrik ızgara + parıltılar */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(30deg, rgba(148,163,184,.5) 1px, transparent 1px), linear-gradient(150deg, rgba(148,163,184,.5) 1px, transparent 1px)",
          backgroundSize: "64px 37px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div aria-hidden className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-amber-500/20 blur-3xl" />
      <div aria-hidden className="absolute -bottom-40 -right-24 w-[30rem] h-[30rem] rounded-full bg-sky-500/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-4xl grid md:grid-cols-[1.1fr_1fr] gap-8 items-center">
        {/* sol: marka */}
        <div className="hidden md:block space-y-7 pr-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black text-3xl flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(251,191,36,0.7)] rotate-[-6deg]">
              S
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-wide leading-none">SEVALIKA</h1>
              <div className="text-sm font-bold tracking-[0.35em] text-amber-300 mt-1">WORLD</div>
            </div>
          </div>
          <p className="text-slate-300 text-lg leading-relaxed max-w-md">
            Cadde, kafe ve kulüplerin <span className="text-amber-300 font-semibold">sosyal dünyası</span>. Karakterini yarat, arkadaşlarınla buluş, kendi evini kur.
          </p>
          <ul className="space-y-3">
            {features.map(([ic, t, d]) => (
              <li key={t} className="flex items-start gap-3">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-center text-xl">{ic}</span>
                <span>
                  <span className="block text-sm font-bold text-white">{t}</span>
                  <span className="block text-xs text-slate-400">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* sağ: form kartı */}
        <div className="w-full max-w-sm mx-auto bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 sm:p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] space-y-5">
          <div className="md:hidden text-center space-y-1">
            <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow">S</div>
            <h1 className="text-xl font-black tracking-wide">SEVALIKA WORLD</h1>
          </div>
          <div className="hidden md:block">
            <h2 className="text-xl font-extrabold">{backend.online ? (mode === "login" ? "Tekrar hoş geldin 👋" : "Aramıza katıl ✨") : "Demo modu"}</h2>
            <p className="text-xs text-slate-400 mt-1">{backend.online ? (mode === "login" ? "Hesabınla giriş yap ve kaldığın yerden devam et." : "Birkaç saniyede hesabını oluştur.") : "Kaydetmeden hemen dene."}</p>
          </div>

          {backend.online ? (
            <>
              <div className="grid grid-cols-2 gap-1 bg-slate-950/60 border border-slate-800 p-1 rounded-xl text-sm font-semibold">
                {(["login", "register"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setError("");
                    }}
                    className={`py-2 rounded-lg transition ${mode === m ? "bg-amber-400 text-slate-950 shadow" : "text-slate-300 hover:text-white"}`}
                  >
                    {m === "login" ? "Giriş Yap" : "Kayıt Ol"}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="space-y-3">
                <label className="relative block">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">👤</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Kullanıcı adı"
                    maxLength={15}
                    autoComplete="username"
                    className={inputCls}
                  />
                </label>
                <label className="relative block">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔒</span>
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Şifre (en az 6 karakter)"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className={inputCls + " pr-11"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Şifreyi gizle" : "Şifreyi göster"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm"
                  >
                    {showPw ? "🙈" : "👁️"}
                  </button>
                </label>
                {error && <div role="alert" className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">{error}</div>}
                <button type="submit" disabled={loading} className={primaryCls}>
                  {loading ? "Bekle..." : mode === "login" ? "Giriş Yap" : "Hesap Oluştur"}
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 leading-relaxed">
                Supabase ayarlanmamış (<code>.env.local</code> yok). Çevrimdışı demo modundasın: her şey tarayıcında çalışır, kaydedilmez ve başka oyuncu görünmez.
              </div>
              <label className="relative block">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">👤</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Demo kullanıcı adı"
                  maxLength={15}
                  className={inputCls}
                />
              </label>
              {error && <div role="alert" className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">{error}</div>}
              <button type="button" onClick={startDemo} className={primaryCls}>
                Demo&apos;yu Başlat
              </button>
            </div>
          )}
          <p className="text-[11px] text-center text-slate-500">Devam ederek topluluk kurallarını kabul etmiş olursun.</p>
        </div>
      </div>
    </div>
  );
}
