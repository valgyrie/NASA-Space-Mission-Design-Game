/**
 * A fold: one short line with an arrow; pressing it opens the details underneath. Keeps busy screens calm, so
 * players read the idea first and open only what they want to know more about. Built on <details>, so it works
 * with the keyboard and screen readers. Opened folds stay open while the screen is redrawn.
 */
export function fold(summary: string | Node, ...details: (string | Node)[]): HTMLDetailsElement {
  const box = document.createElement('details');
  box.className = 'fold';
  const head = document.createElement('summary');
  head.className = 'fold-summary';
  head.append(summary);
  const body = document.createElement('div');
  body.className = 'fold-body';
  for (const d of details) body.append(typeof d === 'string' ? para(d) : d);
  box.append(head, body);
  return box;
}

function para(text: string): HTMLParagraphElement {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}
