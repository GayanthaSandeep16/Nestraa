import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
  className?: string;
}

const toneClasses: Record<StatusTone, string> = {
  success: "bg-success-container text-on-success-container",
  warning: "bg-warning-container text-on-warning-container",
  error: "bg-error-container text-on-error-container",
  info: "bg-info-container text-on-info-container",
  neutral: "bg-surface-container text-on-surface-variant",
};

export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-sm py-[2px] text-label-md",
        toneClasses[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
