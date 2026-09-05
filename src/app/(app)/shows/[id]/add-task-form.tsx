"use client";

import { useActionState, useRef, useState } from "react";

import { addTask, type ActionState } from "@/server/actions";
import { FLAG_LABELS } from "@/lib/constants";
import { useCloseFormOnSuccess } from "@/hooks/use-close-form-on-success";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = { ok: true };

export function AddTaskForm({ showId }: { showId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(addTask, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useCloseFormOnSuccess(state, formRef, setOpen);

  if (!open) {
    return (
      <Button
        variant="ghost"
        style={{ marginTop: "var(--space-3)", fontSize: 12 }}
        onClick={() => setOpen(true)}
      >
        + Add task
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      style={{
        marginTop: "var(--space-3)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <input type="hidden" name="showId" value={showId} />
      <Field label="Task" name="label" errors={state.errors?.label}>
        <Input required placeholder="Confirm crew for the get-in" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
        <Field label="Owner" name="ownerName" errors={state.errors?.ownerName}>
          <Input required placeholder="Name" />
        </Field>
        <Field label="Due" name="dueDate" errors={state.errors?.dueDate}>
          <Input type="date" />
        </Field>
      </div>
      <Field label="Flag" name="tag" errors={state.errors?.tag}>
        <Select defaultValue="">
          <option value="">None</option>
          {Object.entries(FLAG_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      {state.message && !state.ok && (
        <p role="alert" style={{ fontSize: 12, color: "var(--color-accent-700)" }}>
          {state.message}
        </p>
      )}
      <div className="dialog-actions" style={{ justifyContent: "flex-start" }}>
        <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
