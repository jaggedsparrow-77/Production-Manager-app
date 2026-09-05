"use client";

import { useRef } from "react";
import type { ActionState } from "@/server/actions";

/**
 * A checkbox row that submits itself on change — used for "Key tasks" and
 * meeting actions. The whole row is the click target, matching the mockup's
 * `<label>`-wraps-`<input>` pattern.
 */
export function ToggleRow({
  id,
  done,
  action,
  children,
}: {
  id: string;
  done: boolean;
  action: (formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  // A plain <form action> must resolve to void; the page re-renders from
  // revalidatePath, so the returned ActionState has nowhere to go.
  async function handleAction(formData: FormData) {
    await action(formData);
  }

  return (
    <form ref={formRef} action={handleAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="done" value={String(!done)} />
      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          padding: "var(--space-3) 0",
          borderTop: "1px solid var(--color-divider)",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          defaultChecked={done}
          onChange={() => formRef.current?.requestSubmit()}
          style={{ marginTop: 2, width: 15, height: 15, flex: "none" }}
        />
        {children}
      </label>
    </form>
  );
}
