const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function shown(e: Element): boolean {
  return !e.closest('[hidden]') && e.getClientRects().length > 0;
}

/** How high an element is stacked among the UI's layers: the z-index of its outermost stacked container below `root`. */
function layer(e: HTMLElement, root: HTMLElement): number {
  let z = 0;
  for (let at: HTMLElement | null = e; at && at !== root; at = at.parentElement) {
    const n = Number.parseInt(getComputedStyle(at).zIndex, 10);
    if (Number.isFinite(n)) z = n;
  }
  return z;
}

/** The open modal dialog drawn on top: the highest stacked one, and of those the last in the page. */
function topModal(root: HTMLElement): HTMLElement | null {
  const open = [...root.querySelectorAll<HTMLElement>('[aria-modal="true"]')].filter(shown);
  let top: HTMLElement | null = null;
  let topLayer = -Infinity;
  for (const m of open) {
    const z = layer(m, root);
    if (z >= topLayer) {
      top = m;
      topLayer = z;
    }
  }
  return top;
}

function focusables(modal: HTMLElement): HTMLElement[] {
  return [...modal.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(shown);
}

/**
 * Keep keyboard focus inside the open modal dialog, so Tab cannot reach the Site's controls behind it
 * (tickets 04 and 19). Elements matching `allowed` (the tutorial guide) stay reachable.
 */
export function containFocus(root: HTMLElement, allowed = '.tutorial'): void {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const modal = topModal(root);
    if (!modal) return;
    const list = focusables(modal);
    if (list.length === 0) {
      e.preventDefault();
      return;
    }
    const first = list[0]!;
    const last = list.at(-1)!;
    const active = document.activeElement;
    const inside = active instanceof Element && modal.contains(active);
    if (e.shiftKey && (!inside || active === first)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (!inside || active === last)) {
      e.preventDefault();
      first.focus();
    }
  });
  // Focus that still escapes (a click or a script) goes back into the dialog.
  document.addEventListener('focusin', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const modal = topModal(root);
    if (!modal || modal.contains(target) || target.closest(allowed)) return;
    focusables(modal)[0]?.focus();
  });
}
