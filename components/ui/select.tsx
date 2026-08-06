import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, error, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-md border bg-surface-container-lowest px-sm py-sm text-body-md text-on-surface outline-none transition-colors",
        "focus:border-primary focus:ring-2 focus:ring-primary-container/30",
        error ? "border-error" : "border-outline-variant",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
