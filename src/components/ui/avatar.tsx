/* eslint-disable @next/next/no-img-element -- avatar URLs come from arbitrary
   OAuth providers, so next/image would need every host allow-listed. */
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

/** Square initials tile, matching the mockup's account badge in the header. */
export function Avatar({
  name,
  image,
  className,
  size = 30,
}: {
  name?: string | null;
  image?: string | null;
  className?: string;
  size?: number;
}) {
  const label = name ?? "Unassigned";
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };

  if (image) {
    return (
      <img
        src={image}
        alt={label}
        title={label}
        className={cn("object-cover", className)}
        style={style}
      />
    );
  }

  return (
    <span
      title={label}
      aria-label={label}
      className={cn("inline-flex flex-none items-center justify-center", className)}
      style={{
        ...style,
        background: "var(--color-text)",
        color: "var(--color-bg)",
        fontFamily: "var(--font-heading)",
        fontWeight: 800,
      }}
    >
      {initials(name, "–")}
    </span>
  );
}
