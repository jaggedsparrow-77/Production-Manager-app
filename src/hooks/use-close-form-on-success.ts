import { useEffect, useState, type RefObject } from "react";
import type { ActionState } from "@/server/actions";

/**
 * Standard behaviour for a toggle-open inline form backed by a server
 * action: reset it and close it once the action succeeds.
 *
 * Closing is a state adjustment computed during render, by comparing the
 * latest action result against the previous one — React's documented
 * alternative to calling setState from inside an effect (see "Adjusting
 * some state when a prop changes" at react.dev/learn/you-might-not-need-an-effect).
 * Resetting the actual <form> element is a genuine DOM side effect, so that
 * part stays in an effect — it just doesn't call setState.
 */
export function useCloseFormOnSuccess(
  state: ActionState,
  formRef: RefObject<HTMLFormElement | null>,
  setOpen: (open: boolean) => void,
) {
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.ok && !state.errors) setOpen(false);
  }

  useEffect(() => {
    if (state.ok && !state.errors) formRef.current?.reset();
  }, [state, formRef]);
}
