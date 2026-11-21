"use client";

import { useEffect, useState } from "react";
import { MAX_CHAT_LENGTH, ROLE_LABEL } from "@/lib/constants";
import type { AdminLogEntry, Report, UserRole } from "@/lib/types";

type Tab = "tools" | "quiz" | "reports" | "log";

const input = "bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400";

export default function AdminPanel(props: {
  onClose: () => void;
  onAnnounce: (text: string) => void;
  onGrantRole: (target: string, role: UserRole) => void;
  onGift: (target: string, amount: number) => void;
  onKick: (target: string) => void;
  onMute: (target: string, minutes: number) => void;
  onUnmute: (target: string) => void;
  onBan: (target: string, hours: number) => void;
  onUnban: (target: string) => void;
  onDanceAll: (on: boolean) => void;
  onClearRoom: () => void;
  onStartQuiz: (q: string, a: string, reward: number, seconds: number) => void;
  onStartTournament: (minutes: number) => void;
  onStartFlag: (prize: number, seconds: number) => void;
  onStartHide: (seconds: number) => void;
  loadReports: () => Promise<Report[]>;
  loadLog: () => Promise<AdminLogEntry[]>;
  onCloseReport: (id: number) => Promise<void>;
  onTarget: (name: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("tools");
  const [text, setText] = useState("");
  const [target, setTarget] = useState("");
  const [role, setRole] = useState<UserRole>("vip");
  const [amount, setAmount] = useState(1000);
  const [minutes, setMinutes] = useState(10);
  const [hours, setHours] = useState(24);
  const [qText, setQText] = useState("");
  const [qAnswer, setQAnswer] = useState("");
  const [qReward, setQReward] = useState(250);
  const [qSeconds, setQSeconds] = useState(60);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [log, setLog] = useState<AdminLogEntry[] | null>(null);
  const [err, setErr] = useState("");

  const { loadReports, loadLog } = props;
  useEffect(() => {
    let alive = true;
    if (tab === "reports") {
      loadReports()
        .then((r) => alive && setReports(r))
        .catch((e) => alive && setErr(String(e.message ?? e)));
    } else if (tab === "log") {
      loadLog()
        .then((r) => alive && setLog(r))
        .catch((e) => alive && setErr(String(e.message ?? e)));
    }
    return () => {
      alive = false;
    };
  }, [tab, loadReports, loadLog]);

  const tabBtn = (t: Tab, label: string) => (
    <button
      key={t}
      onClick={() => {
        setErr("");
        setTab(t);
      }}
      className={`flex-1 py-1 rounded text-[11px] font-bold ${tab === t ? "bg-amber-400 text-slate-950" : "text-slate-300"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-slate-900/95 backdrop-blur border border-amber-400/50 p-3.5 rounded-2xl w-64 md:w-72 space-y-3 shadow-2xl max-h-[75vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-black text-amber-400 tracking-wide">👑 YÖNETİM PANELİ</span>
        <button onClick={props.onClose} className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800">
          ✕
        </button>
      </div>

      <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
        {tabBtn("tools", "Araçlar")}
        {tabBtn("quiz", "Yarışma")}
        {tabBtn("reports", "Şikayet")}
        {tabBtn("log", "Kayıt")}
      </div>
      {err && <div className="text-[11px] text-rose-300">{err}</div>}

      {tab === "tools" && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) props.onAnnounce(text.trim());
              setText("");
            }}
            className="space-y-1.5"
          >
            <label className="block text-[11px] font-semibold text-slate-300">Herkese Resmi Duyuru</label>
            <div className="flex gap-1.5">
              <input value={text} maxLength={MAX_CHAT_LENGTH} onChange={(e) => setText(e.target.value)} placeholder="Duyuru metni..." className={`flex-1 min-w-0 ${input}`} />
              <button type="submit" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-2.5 py-1 rounded-lg">
                Yayınla
              </button>
            </div>
          </form>

          <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
            <label className="block text-[11px] font-semibold text-slate-300">Oyuncu İşlemleri</label>
            <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Hedef kullanıcı adı..." className={`w-full ${input}`} />
            <div className="flex gap-1.5">
              <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={`flex-1 ${input}`}>
                <option value="vip">💎 VIP (+ Özel Mesaj)</option>
                <option value="suvari">⚔️ Süvari (+ At)</option>
                <option value="admin">👑 Admin</option>
                <option value="user">👤 {ROLE_LABEL.user}</option>
              </select>
              <button onClick={() => props.onGrantRole(target, role)} className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] px-2.5 py-1 rounded-lg">
                Yetki Ver
              </button>
            </div>
            <div className="flex gap-1.5">
              <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={`w-20 ${input} text-yellow-400 font-bold`} />
              <button onClick={() => props.onGift(target, amount)} className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold py-1 rounded-lg">
                + Sanil
              </button>
              <button onClick={() => props.onKick(target)} className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                At
              </button>
            </div>
            <div className="flex gap-1.5 items-center">
              <input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={`w-14 ${input}`} />
              <span className="text-[10px] text-slate-500">dk</span>
              <button onClick={() => props.onMute(target, minutes)} className="flex-1 bg-slate-800 text-amber-300 border border-slate-700 text-[11px] font-bold py-1 rounded-lg">
                🔇 Sustur
              </button>
              <button onClick={() => props.onUnmute(target)} className="bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold px-2 py-1 rounded-lg">
                Aç
              </button>
            </div>
            <div className="flex gap-1.5 items-center">
              <input type="number" min={0} value={hours} onChange={(e) => setHours(Number(e.target.value))} className={`w-14 ${input}`} />
              <span className="text-[10px] text-slate-500">saat (0=süresiz)</span>
              <button onClick={() => props.onBan(target, hours)} className="flex-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold py-1 rounded-lg">
                ⛔ Yasakla
              </button>
              <button onClick={() => props.onUnban(target)} className="bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold px-2 py-1 rounded-lg">
                Aç
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => props.onDanceAll(true)} className="bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold py-1.5 rounded-lg text-sky-300 border border-slate-700">
                🕺 Herkes Dans
              </button>
              <button onClick={() => props.onDanceAll(false)} className="bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold py-1.5 rounded-lg text-amber-300 border border-slate-700">
                ⏹️ Dansı Durdur
              </button>
            </div>
            <button onClick={props.onClearRoom} className="w-full bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold py-1.5 rounded-lg text-rose-300 border border-slate-700">
              🧹 Odayı Temizle
            </button>
          </div>
        </>
      )}

      {tab === "quiz" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            props.onStartQuiz(qText, qAnswer, qReward, qSeconds);
          }}
          className="space-y-1.5"
        >
          <div className="text-[11px] text-slate-400">Herkese soru gider; doğru cevabı ilk veren ödülü kazanır. Cevap sunucuda saklanır, istemciden okunamaz.</div>
          <input value={qText} maxLength={140} onChange={(e) => setQText(e.target.value)} placeholder="Soru" className={`w-full ${input}`} />
          <input value={qAnswer} onChange={(e) => setQAnswer(e.target.value)} placeholder="Doğru cevap" className={`w-full ${input}`} />
          <div className="flex gap-1.5 items-center">
            <input type="number" min={1} value={qReward} onChange={(e) => setQReward(Number(e.target.value))} className={`w-20 ${input} text-yellow-400 font-bold`} />
            <span className="text-[10px] text-slate-500">Sanil</span>
            <input type="number" min={10} max={600} value={qSeconds} onChange={(e) => setQSeconds(Number(e.target.value))} className={`w-16 ${input}`} />
            <span className="text-[10px] text-slate-500">sn</span>
          </div>
          <button type="submit" className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs py-1.5 rounded-lg">
            🎯 Yarışmayı Başlat
          </button>
          <div className="border-t border-slate-700 pt-2 space-y-1.5">
            <div className="text-[11px] text-slate-400">🏆 Balık Turnuvası: süre boyunca en çok değerde balık tutan kazanır (500/250/100 Sanil).</div>
            <div className="flex gap-1.5">
              {[5, 10, 20].map((m) => (
                <button key={m} type="button" onClick={() => props.onStartTournament(m)} className="flex-1 bg-orange-400 hover:bg-orange-300 text-slate-950 font-bold text-xs py-1.5 rounded-lg">
                  🏆 {m} dk
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-700 pt-2 space-y-1.5">
            <div className="text-[11px] text-slate-400">🚩 Bayrak kapma (bulunduğun odada rastgele kareye bayrak çıkar) · 🙈 Ebelemece (odadan rastgele ebe seçilir, dokunduğu kişiyi yakalar).</div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => props.onStartFlag(300, 60)} className="flex-1 bg-red-400 hover:bg-red-300 text-slate-950 font-bold text-xs py-1.5 rounded-lg">
                🚩 Bayrak 300 S
              </button>
              <button type="button" onClick={() => props.onStartHide(90)} className="flex-1 bg-fuchsia-400 hover:bg-fuchsia-300 text-slate-950 font-bold text-xs py-1.5 rounded-lg">
                🙈 Ebe 90 sn
              </button>
            </div>
          </div>
        </form>
      )}

      {tab === "reports" && (
        <div className="space-y-2">
          {reports === null && !err && <div className="text-[11px] text-slate-400">Yükleniyor...</div>}
          {reports?.length === 0 && <div className="text-[11px] text-slate-400">Açık şikayet yok. 🎉</div>}
          {reports?.map((r) => (
            <div key={r.id} className="bg-slate-800/80 border border-slate-700 rounded-xl p-2 space-y-1">
              <div className="text-[11px]">
                <b className="text-rose-300">{r.target}</b> <span className="text-slate-400">← {r.reporter}</span>
              </div>
              <div className="text-[11px] text-amber-200">{r.reason}</div>
              {r.context.length > 0 && (
                <div className="text-[10px] text-slate-400 space-y-0.5 max-h-16 overflow-y-auto">
                  {r.context.map((c, i) => (
                    <div key={i} className="truncate">
                      • {c.text}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-1">
                <button onClick={() => props.onTarget(r.target)} className="flex-1 text-[10px] bg-slate-700 rounded py-1">
                  Hedefe al
                </button>
                <button
                  onClick={async () => {
                    await props.onCloseReport(r.id);
                    setReports((cur) => cur?.filter((x) => x.id !== r.id) ?? null);
                  }}
                  className="flex-1 text-[10px] bg-emerald-500/20 text-emerald-300 rounded py-1"
                >
                  Kapat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "log" && (
        <div className="space-y-1">
          {log === null && !err && <div className="text-[11px] text-slate-400">Yükleniyor...</div>}
          {log?.length === 0 && <div className="text-[11px] text-slate-400">Kayıt yok.</div>}
          {log?.map((l) => (
            <div key={l.id} className="text-[10px] text-slate-300 border-b border-slate-800 pb-1">
              <span className="text-slate-500">{new Date(l.created_at).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>{" "}
              <b className="text-amber-300">{l.admin}</b> {l.action}
              {l.target ? <> → <b>{l.target}</b></> : null}
              {l.detail ? <span className="text-slate-400"> ({l.detail})</span> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
