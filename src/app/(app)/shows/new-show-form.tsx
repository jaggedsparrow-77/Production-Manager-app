"use client";

import { useActionState, useState } from "react";

import { createShow, type ActionState } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = { ok: true };

export function NewShowForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createShow, initialState);

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New show</Button>;
  }

  return (
    <form
      action={formAction}
      className="card"
      style={{ width: "min(480px, 100%)", marginBottom: "var(--space-4)" }}
    >
      <h4>New show</h4>

      <Field label="Title" name="title" errors={state.errors?.title}>
        <Input required placeholder="Twelfth Night" />
      </Field>
      <Field label="Venue" name="venue" errors={state.errors?.venue}>
        <Input required placeholder="Main House" />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        <Field label="Opens" name="openDate" errors={state.errors?.openDate}>
          <Input type="date" required />
        </Field>
        <Field label="Closes" name="closeDate" errors={state.errors?.closeDate}>
          <Input type="date" required />
        </Field>
      </div>

      <Field
        label="Phase"
        name="phase"
        errors={state.errors?.phase}
        hint="e.g. Pre-production, Build, Production week"
      >
        <Input required placeholder="Pre-production" />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        <Field label="Director" name="director" errors={state.errors?.director}>
          <Input placeholder="Optional" />
        </Field>
        <Field label="Designer" name="designer" errors={state.errors?.designer}>
          <Input placeholder="Optional" />
        </Field>
      </div>

      <Field label="Company size" name="companySize" errors={state.errors?.companySize}>
        <Input type="number" min={1} placeholder="Optional" />
      </Field>

      {state.message && !state.ok && (
        <p role="alert" style={{ fontSize: 13, color: "var(--color-accent-700)" }}>
          {state.message}
        </p>
      )}

      <div className="dialog-actions" style={{ justifyContent: "flex-start" }}>
        <SubmitButton pendingLabel="Creating…">Create show</SubmitButton>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
