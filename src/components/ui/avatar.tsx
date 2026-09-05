/* eslint-disable @next/next/no-img-element -- avatar URLs come from arbitrary
   OAuth providers, so next/image would need every host allow-listed. */
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

export function Avatar({
  name,
  image,
  className,
}: {
  name?: string | null;
  image?: string | null;
  className?: string;
}) {
  const label = name ?? "Unassigned";

  if (image) {
    return (
      <img
        src={image}
        alt={label}
        title={label}
        className={cn("size-6 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300",
        className,
      )}
    >
      {initials(name, "–")}
    </span>
  );
}
