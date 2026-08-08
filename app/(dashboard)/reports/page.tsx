import { ReportsPanel } from "@/components/reports/reports-panel";

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-lg p-lg">
      <h1 className="text-headline-md text-on-surface">Reports</h1>
      <ReportsPanel />
    </div>
  );
}
