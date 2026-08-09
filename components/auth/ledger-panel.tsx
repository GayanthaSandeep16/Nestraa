"use client";

import { usePathname } from "next/navigation";
import { Leaf } from "lucide-react";

const ledgerRows = [
  { sku: "RAW-TUR-014", label: "Turmeric Finger", qty: "480 kg", status: "QC PASS" },
  { sku: "PRO-CIN-008", label: "Ceylon Cinnamon Bark", qty: "60 kg", status: "IN PROCESS" },
  { sku: "FG-CAR-021", label: "Cardamom Blend 250g", qty: "120 pk", status: "PACKED" },
  { sku: "RAW-CLV-006", label: "Clove Whole", qty: "25 kg", status: "IN TRANSIT" },
];

const copy = {
  "/signup": {
    eyebrow: "New entry",
    headline: "Every batch, traced from intake to shelf.",
    subhead: "Create an account to start logging inventory, production, and orders.",
  },
  default: {
    eyebrow: "Access log",
    headline: "Every batch, traced from intake to shelf.",
    subhead: "Sign in to manage inventory, production, and orders.",
  },
};

function manifestNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}${d}`;
}

export function LedgerPanel() {
  const pathname = usePathname();
  const { eyebrow, headline, subhead } = copy[pathname as keyof typeof copy] ?? copy.default;

  return (
    <aside className="relative hidden md:flex md:w-[420px] lg:w-[460px] shrink-0 flex-col justify-between overflow-hidden bg-on-surface px-xl py-xl text-inverse-on-surface">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, currentColor 0, currentColor 1px, transparent 1px, transparent 32px)",
        }}
      />

      <div className="relative flex flex-col gap-md">
        <div className="flex items-center gap-xs">
          <span className="flex size-7 items-center justify-center rounded-sm bg-primary-fixed-dim font-mono text-label-sm font-bold text-on-primary-fixed">
            N
          </span>
          <span className="text-headline-md tracking-tight">Nestraa</span>
        </div>

        <span className="font-mono text-label-sm uppercase tracking-[0.15em] text-tertiary-fixed">
          {eyebrow} · No. {manifestNo()}
        </span>

        <h1 className="max-w-[20rem] text-display text-balance">{headline}</h1>
        <p className="max-w-[20rem] text-body-md text-inverse-on-surface/70">{subhead}</p>
      </div>

      <div className="relative border-t border-inverse-on-surface/15 pt-sm">
        <table className="w-full font-mono text-label-sm">
          <tbody>
            {ledgerRows.map((row) => (
              <tr key={row.sku} className="border-b border-inverse-on-surface/10 last:border-0">
                <td className="py-xs pr-sm tabular-nums text-inverse-on-surface/60">{row.sku}</td>
                <td className="py-xs pr-sm font-sans normal-case tracking-normal text-inverse-on-surface/40">
                  {row.label}
                </td>
                <td className="py-xs pr-sm text-right tabular-nums text-inverse-on-surface/60">{row.qty}</td>
                <td className="py-xs text-right text-inverse-on-surface/60">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConsignmentSeal />
    </aside>
  );
}

function ConsignmentSeal() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -bottom-6 -right-6 size-36 text-tertiary-fixed/35"
    >
      <svg viewBox="0 0 140 140" className="seal-ring size-full">
        <defs>
          <path id="seal-ring-path" d="M 70,70 m -52,0 a 52,52 0 1,1 104,0 a 52,52 0 1,1 -104,0" />
        </defs>
        <circle cx="70" cy="70" r="64" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
        <circle cx="70" cy="70" r="40" fill="none" stroke="currentColor" strokeWidth="1" />
        <text fontSize="8.5" letterSpacing="2" fill="currentColor" className="font-mono uppercase">
          <textPath href="#seal-ring-path" startOffset="0%">
            NESTRAA · VERIFIED ENTRY · NESTRAA · VERIFIED ENTRY ·
          </textPath>
        </text>
      </svg>
      <Leaf className="absolute inset-0 m-auto" size={22} strokeWidth={1.5} />
    </div>
  );
}
