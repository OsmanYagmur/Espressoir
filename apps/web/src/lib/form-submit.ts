import { startTransition, type FormEvent } from "react";

/**
 * Submits a form through its action without the reset React does afterwards. That reset
 * puts every control back to the value it had when it mounted: an uncontrolled field
 * shows what was typed again (its default follows the values the action returns), but a
 * controlled radio or select jumps back to its first choice while the state behind it
 * stays, and the next submit sends the wrong value ("Yeni kafe" shown, "Kayıtlı kafe"
 * sent). Without JavaScript the form's own `action` submits it as before.
 */
export function submitWithoutReset(dispatch: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
}
