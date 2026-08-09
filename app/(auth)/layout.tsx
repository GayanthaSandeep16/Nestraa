import { LedgerPanel } from "@/components/auth/ledger-panel";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-1 bg-surface">
      <LedgerPanel />
      <div className="flex flex-1 items-center justify-center p-lg">{children}</div>
    </div>
  );
}
