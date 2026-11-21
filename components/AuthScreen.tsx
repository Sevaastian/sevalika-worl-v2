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

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 rounded-xl bg-yellow-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow">
            S
          </div>
          <h1 className="text-xl font-black tracking-wide text-white">SEVALIKA WORLD</h1>
          <p className="text-xs text-slate-400">Cadde, kafe ve kulüplerin sosyal dünyası</p>
        </div>

        {backend.online ? (
          <>
            <div className="grid grid-cols-2 gap-1 bg-slate-800 p-1 rounded-xl text-sm font-semibold">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError("");
                  }}
                  className={`py-1.5 rounded-lg transition ${mode === m ? "bg-yellow-400 text-slate-950" : "text-slate-300 hover:text-white"}`}
                >
                  {m === "login" ? "Giriş Yap" : "Kayıt Ol"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-3">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Kullanıcı adı"
                maxLength={15}
                autoComplete="username"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifre (en az 6 karakter)"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
              {error && <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-slate-950 font-bold text-sm py-2.5 rounded-lg transition"
              >
                {loading ? "Bekle..." : mode === "login" ? "Giriş Yap" : "Hesap Oluştur"}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 leading-relaxed">
              Supabase ayarlanmamış (<code>.env.local</code> yok). Çevrimdışı demo modundasın: her şey tarayıcında çalışır, kaydedilmez ve başka oyuncu görünmez.
            </div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Demo kullanıcı adı"
              maxLength={15}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
            {error && <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</div>}
            <button
              type="button"
              onClick={startDemo}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-sm py-2.5 rounded-lg transition"
            >
              Demo&apos;yu Başlat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
