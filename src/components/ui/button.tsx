import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
};

export type ButtonProps = React.ComponentProps<"button"> & { variant?: Variant };

/** Thin wrapper over the design system's .btn classes (see globals.css). */
export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return <button className={cn("btn", VARIANT_CLASS[variant], className)} {...props} />;
}
