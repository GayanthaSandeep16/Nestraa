import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-md border bg-surface-container-lowest px-sm py-sm text-body-md text-on-surface outline-none transition-colors placeholder:text-outline",
        "focus:border-primary focus:ring-2 focus:ring-primary-container/30",
        error ? "border-error" : "border-outline-variant",
        className
      )}
      {...props}
    />
  );
});
