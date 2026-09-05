"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { createProject, type ActionState } from "@/server/actions";
import { suggestProjectKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = { ok: true };

export function NewProjectForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createProject, initialState);
  const [name, setName] = useState("");
  // Once the user edits the key by hand, stop overwriting it from the name.
  const [keyTouched, setKeyTouched] = useState(false);
  const [key, setKey] = useState("");

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        New project
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 p-5 dark:border-slate-800"
    >
      <h2 className="font-medium">New project</h2>

      <Field label="Name" name="name" errors={state.errors?.name}>
        <Input
          required
          value={name}
          onChange={(event) => {
            const next = event.target.value;
            setName(next);
            if (!keyTouched) setKey(suggestProjectKey(next));
          }}
          placeholder="Website Relaunch"
        />
      </Field>

      <Field
        label="Key"
        name="key"
        errors={state.errors?.key}
        hint="Used in task refs, e.g. WEB-42."
      >
        <Input
          required
          value={key}
          onChange={(event) => {
            setKeyTouched(true);
            setKey(event.target.value.toUpperCase());
          }}
          maxLength={10}
          placeholder="WEB"
          className="font-mono uppercase"
        />
      </Field>

      <Field label="Description" name="description" errors={state.errors?.description}>
        <Textarea placeholder="What is this project for?" />
      </Field>

      {state.message && !state.ok && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <SubmitButton pendingLabel="Creating…">Create project</SubmitButton>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
