"use client";

import { useActionState } from "react";

import { addOrganizationMember, type ActionState } from "@/server/actions";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = { ok: true };

export function AddMemberForm() {
  const [state, formAction] = useActionState(addOrganizationMember, initialState);

  return (
    <form action={formAction} className="card" style={{ marginTop: "var(--space-6)" }}>
      <h4 style={{ margin: 0, fontSize: 16 }}>Add a member</h4>
      <p className="text-muted" style={{ fontSize: 12 }}>
        They must already have signed in to Callboard at least once.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "var(--space-3)",
          alignItems: "end",
        }}
      >
        <Field label="Email" name="email" errors={state.errors?.email}>
          <Input type="email" required placeholder="name@company.example" />
        </Field>
        <Field label="Role" name="role" errors={state.errors?.role}>
          <Select defaultValue="member">
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </Select>
        </Field>
      </div>

      {state.message && (
        <p
          role="status"
          style={{
            fontSize: 12,
            color: state.ok ? "var(--color-neutral-700)" : "var(--color-accent-700)",
          }}
        >
          {state.message}
        </p>
      )}

      <SubmitButton pendingLabel="Adding…">Add member</SubmitButton>
    </form>
  );
}
