import * as React from "react";
import { cn } from "@/lib/utils";

const controlStyles =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none " +
  "disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 " +
  "dark:focus:border-slate-100 dark:focus:ring-slate-100";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("block text-sm font-medium text-slate-700 dark:text-slate-300", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(controlStyles, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(controlStyles, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(controlStyles, "cursor-pointer", className)} {...props} />;
}

/**
 * Labelled control wrapper. Renders validation messages from a server action
 * and wires `aria-describedby`/`aria-invalid` so screen readers announce them.
 */
export function Field({
  label,
  name,
  errors,
  hint,
  children,
}: {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
  children: React.ReactNode;
}) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const hasError = Boolean(errors?.length);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      {React.isValidElement<Record<string, unknown>>(children)
        ? React.cloneElement(children, {
            id: name,
            name,
            "aria-invalid": hasError || undefined,
            "aria-describedby": hasError ? errorId : hint ? hintId : undefined,
          })
        : children}
      {hint && !hasError && (
        <p id={hintId} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
      {hasError && (
        <p id={errorId} className="text-xs text-rose-600 dark:text-rose-400">
          {errors!.join(" ")}
        </p>
      )}
    </div>
  );
}
