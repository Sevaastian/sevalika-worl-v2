import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Look, Tile } from "./types";

export interface PresenceState extends Look {
  /** Sunucudaki hesap kimliği; sohbet balonlarını doğru karaktere bağlamak için */
  uid: string;
  name: string;
  gx: number;
  gy: number;
  isRidingHorse: boolean;
  isSitting: boolean;
  isDancing: boolean;
  tool?: string | null;
  pet?: string | null;
  isFishing?: boolean;
  lay?: boolean;
}

export type ConnStatus = "connecting" | "connected" | "demo" | "error";

export interface NetHandlers {
  onStatus(s: ConnStatus): void;
  onPresence(list: (PresenceState & { id: string })[]): void;
  onMove(p: { id: string; from: Tile; path: Tile[] }): void;
  onAction(p: { id: string; isDancing?: boolean; isSitting?: boolean; isRidingHorse?: boolean; isFishing?: boolean }): void;
  onEmote(p: { id: string; emoji: string }): void;
  onFx(p: { id: string; kind: string; gx?: number; gy?: number }): void;
}

/**
 * Bir odanın gerçek zamanlı kanalı (Supabase Realtime presence + broadcast).
 * Yalnızca geçici/görsel veriler burada akar: konum, animasyon, emote.
 * Sohbet, Sanil, eşya, rütbe gibi her şey sunucuda (RPC + tablolar) doğrulanır.
 * Supabase yoksa (demo) hiçbir şey yapmaz.
 */
export class RoomNetwork {
  private channel: RealtimeChannel | null = null;
  private last: PresenceState | null = null;
  private closed = false;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private retries = 0;
  private beat: ReturnType<typeof setInterval> | null = null;
  private onVis = () => {
    if (typeof document !== "undefined" && document.visibilityState === "visible" && !this.closed) {
      // Sekme arka plandan dönünce bağlantıyı doğrula ve varlığı yeniden duyur
      if (!this.channel) this.connect();
      else if (this.last) void this.channel.track(this.last);
    }
  };

  constructor(
    private sb: SupabaseClient | null,
    private slug: string,
    private clientId: string,
    private h: NetHandlers,
  ) {}

  join(initial: PresenceState) {
    if (!this.sb) {
      this.h.onStatus("demo");
      return;
    }
    this.last = initial;
    this.closed = false;
    this.connect();
    // Presence'ı düzenli tazele: sunucu zaman aşımına uğratsa bile geri gelir
    this.beat = setInterval(() => {
      if (this.channel && this.last) void this.channel.track(this.last);
    }, 20000);
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", this.onVis);
  }

  private reconnect() {
    if (this.closed || this.retry) return;
    const old = this.channel;
    this.channel = null;
    if (old && this.sb) void this.sb.removeChannel(old);
    const wait = Math.min(15000, 1000 * 2 ** this.retries++);
    this.retry = setTimeout(() => {
      this.retry = null;
      if (!this.closed) this.connect();
    }, wait);
  }

  private connect() {
    const sb = this.sb;
    if (!sb) return;
    this.h.onStatus("connecting");
    const initial = this.last as PresenceState;
    const ch = sb.channel(`sevalika:${this.slug}`, {
      config: { presence: { key: this.clientId }, broadcast: { self: false } },
    });
    this.channel = ch;

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<PresenceState>();
      const list = Object.entries(state)
        .map(([id, metas]) => ({ id, ...(metas[0] as PresenceState) }))
        .filter((p) => p.name);
      this.h.onPresence(list);
    })
      .on("broadcast", { event: "move" }, ({ payload }) => this.h.onMove(payload))
      .on("broadcast", { event: "action" }, ({ payload }) => this.h.onAction(payload))
      .on("broadcast", { event: "emote" }, ({ payload }) => this.h.onEmote(payload))
      .on("broadcast", { event: "fx" }, ({ payload }) => this.h.onFx(payload))
      .subscribe(async (status, err) => {
        if (status === "SUBSCRIBED") {
          this.retries = 0;
          this.h.onStatus("connected");
          await ch.track(this.last ?? initial);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (this.closed) return;
          this.h.onStatus("error");
          this.reconnect();
        }
      });
  }

  send(event: "move" | "action" | "emote" | "fx", payload: Record<string, unknown>) {
    void this.channel?.send({ type: "broadcast", event, payload });
  }

  track(state: PresenceState) {
    this.last = state;
    void this.channel?.track(state);
  }

  leave() {
    this.closed = true;
    if (this.retry) clearTimeout(this.retry);
    this.retry = null;
    if (this.beat) clearInterval(this.beat);
    this.beat = null;
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.onVis);
    if (this.channel && this.sb) void this.sb.removeChannel(this.channel);
    this.channel = null;
  }
}
