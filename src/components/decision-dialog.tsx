"use client";

import { useActionState, useRef, useState } from "react";

import { logDecision, type ActionState } from "@/server/actions";
import { DECISION_DEPARTMENTS } from "@/lib/constants";
import { useCloseFormOnSuccess } from "@/hooks/use-close-form-on-success";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ActionState = { ok: true };

/**
 * "Log a decision" — opens from the header on every page. Pre-selects the
 * current show when opened from a show's own pages; requires a choice from
 * the portfolio, where there is no "current show" to imply one.
 */
export function DecisionDialogButton({
  shows,
  defaultShowId,
}: {
  shows: Array<{ id: string; title: string }>;
  defaultShowId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(logDecision, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useCloseFormOnSuccess(state, formRef, setOpen);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Log a decision
      </Button>

      {open && (
        <div className="dialog-backdrop" onClick={() => setOpen(false)} role="presentation">
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="decision-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div id="decision-dialog-title" className="dialog-title">
              Log a decision
            </div>

            <form ref={formRef} action={formAction} className="flex flex-col gap-3">
              <Field label="Production" name="showId" errors={state.errors?.showId}>
                <Select required defaultValue={defaultShowId ?? shows[0]?.id}>
                  {shows.map((show) => (
                    <option key={show.id} value={show.id}>
                      {show.title}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Department" name="department" errors={state.errors?.department}>
                <Select required defaultValue="Staging">
                  {DECISION_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="What was decided" name="text" errors={state.errors?.text}>
                <Textarea required placeholder="e.g. SR truck runs manual — no automation" />
              </Field>

              {state.message && !state.ok && (
                <p role="alert" style={{ fontSize: 13, color: "var(--color-accent-700)" }}>
                  {state.message}
                </p>
              )}

              <div className="dialog-actions">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <SubmitButton pendingLabel="Logging…">Log it</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
