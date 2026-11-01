import { useEffect, useRef } from 'react';
/** Keep keyboard focus inside a dialog and return it to the trigger on close. */
export function useDialogFocus(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const getFocusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el => el.getClientRects().length > 0);
    dialog.focus({ preventScroll: true });
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = getFocusable();
      const first = items[0], last = items[items.length - 1];
      if (!first) { e.preventDefault(); return; }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { e.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('keydown', trap);
    return () => { dialog.removeEventListener('keydown', trap); previous?.focus({ preventScroll: true }); };
  }, [open]);
  return ref;
}
