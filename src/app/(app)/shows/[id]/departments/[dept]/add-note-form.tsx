"use client";

import { useActionState, useRef, useState } from "react";

import { addDepartmentNote, type ActionState } from "@/server/actions";
import { useCloseFormOnSuccess } from "@/hooks/use-close-form-on-success";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = { ok: true };

export function AddDepartmentNoteForm({ departmentId }: { departmentId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(addDepartmentNote, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useCloseFormOnSuccess(state, formRef, setOpen);

  if (!open) {
    return (
      <Button
        variant="ghost"
        style={{ marginTop: "var(--space-3)", fontSize: 12 }}
        onClick={() => setOpen(true)}
      >
        + Add note
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
      <input type="hidden" name="departmentId" value={departmentId} />
      <Field label="Note" name="body" errors={state.errors?.body}>
        <Textarea required placeholder="What's happening in this department?" />
      </Field>
      {state.message && !state.ok && (
        <p role="alert" style={{ fontSize: 12, color: "var(--color-accent-700)" }}>
          {state.message}
        </p>
      )}
      <div className="dialog-actions" style={{ justifyContent: "flex-start" }}>
        <SubmitButton pendingLabel="Posting…">Post</SubmitButton>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
