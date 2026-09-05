"use client";

import { useActionState, useEffect, useRef } from "react";

import { createComment, type ActionState } from "@/server/actions";
import { Field, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = { ok: true };

export function CommentForm({ taskId }: { taskId: string }) {
  const [state, formAction] = useActionState(createComment, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Empty the textarea once the comment has been persisted.
  useEffect(() => {
    if (state.ok && !state.errors) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="taskId" value={taskId} />

      <Field label="Add a comment" name="body" errors={state.errors?.body}>
        <Textarea required placeholder="Share an update…" />
      </Field>

      {state.message && !state.ok && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {state.message}
        </p>
      )}

      <SubmitButton size="sm" pendingLabel="Posting…">
        Comment
      </SubmitButton>
    </form>
  );
}
