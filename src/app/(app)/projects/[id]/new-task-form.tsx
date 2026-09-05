"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";

import { createTask, type ActionState } from "@/server/actions";
import { PRIORITY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = { ok: true };

export function NewTaskForm({
  projectId,
  statuses,
  members,
}: {
  projectId: string;
  statuses: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createTask, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form after a successful create so the next task starts blank.
  useEffect(() => {
    if (state.ok && state.message) formRef.current?.reset();
  }, [state]);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="size-4" aria-hidden />
        New task
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 p-5 dark:border-slate-800"
    >
      <h2 className="font-medium">New task</h2>
      <input type="hidden" name="projectId" value={projectId} />

      <Field label="Title" name="title" errors={state.errors?.title}>
        <Input required placeholder="Migrate the pricing page" />
      </Field>

      <Field label="Description" name="description" errors={state.errors?.description}>
        <Textarea placeholder="Optional detail" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status" name="statusId" errors={state.errors?.statusId}>
          <Select required defaultValue={statuses[0]?.id}>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Priority" name="priority" errors={state.errors?.priority}>
          <Select defaultValue="medium">
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Assignee" name="assigneeId" errors={state.errors?.assigneeId}>
          <Select defaultValue="">
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Due date" name="dueDate" errors={state.errors?.dueDate}>
          <Input type="date" />
        </Field>
      </div>

      {state.message && (
        <p
          role="status"
          className={
            state.ok
              ? "text-sm text-emerald-600 dark:text-emerald-400"
              : "text-sm text-rose-600 dark:text-rose-400"
          }
        >
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <SubmitButton pendingLabel="Creating…">Create task</SubmitButton>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Done
        </Button>
      </div>
    </form>
  );
}
