"use client";

import { useEffect, useState } from "react";
import { backend } from "@/lib/backend";
import type { Profile } from "@/lib/types";
import AuthScreen from "./AuthScreen";
import Game from "./Game";

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let alive = true;
    backend
      .restoreSession()
      .then((p) => {
        if (alive) setProfile(p);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setBooting(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (booting) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
        Sevalika World yükleniyor...
      </div>
    );
  }

  if (!profile) return <AuthScreen onAuthed={setProfile} />;
  return <Game initialProfile={profile} onLogout={() => setProfile(null)} />;
}
