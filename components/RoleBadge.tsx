import type { UserRole } from "@/lib/types";

const STYLES: Record<Exclude<UserRole, "user">, { label: string; cls: string }> = {
  admin: { label: "ADMIN", cls: "bg-amber-400/20 text-amber-300 border-amber-400/40" },
  suvari: { label: "SÜVARİ", cls: "bg-sky-400/20 text-sky-300 border-sky-400/40" },
  vip: { label: "VIP", cls: "bg-purple-400/20 text-purple-300 border-purple-400/40" },
};

export default function RoleBadge({ role }: { role?: UserRole }) {
  if (!role || role === "user") return null;
  const s = STYLES[role];
  return <span className={`text-[9px] border px-1.5 rounded font-bold mr-1 ${s.cls}`}>{s.label}</span>;
}
