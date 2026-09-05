import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn("input", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn("input", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn("input", "cursor-pointer", className)} {...props} />;
}

/**
 * Labelled control wrapper (the design system's `.field`). Renders
 * validation messages from a server action and wires `aria-describedby` /
 * `aria-invalid` so screen readers announce them.
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
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {React.isValidElement<Record<string, unknown>>(children)
        ? React.cloneElement(children, {
            id: name,
            name,
            "aria-invalid": hasError || undefined,
            "aria-describedby": hasError ? errorId : hint ? hintId : undefined,
          })
        : children}
      {hint && !hasError && (
        <p id={hintId} className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
          {hint}
        </p>
      )}
      {hasError && (
        <p
          id={errorId}
          style={{ fontSize: 11, marginTop: 4, color: "var(--color-accent-700)" }}
          role="alert"
        >
          {errors!.join(" ")}
        </p>
      )}
    </div>
  );
}
