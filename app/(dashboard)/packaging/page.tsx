import { PackagingOrderPanel } from "@/components/packaging/packaging-order-panel";

export default function PackagingPage() {
  return (
    <div className="flex flex-col gap-lg p-lg">
      <h1 className="text-headline-md text-on-surface">Packaging Orders</h1>
      <PackagingOrderPanel />
    </div>
  );
}
