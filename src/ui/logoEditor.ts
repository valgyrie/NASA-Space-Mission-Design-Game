import { type CompanyLogo, DEFAULT_LOGO, LOGO_ICONS, LOGO_SHAPES, logoUrl, uploadLogo } from '../company/logo';
import { t } from '../strings';

/** A small editor shared by setup and the Site dialog. Changes stay in its draft until saved. */
export function makeLogoEditor(initial: CompanyLogo) {
  let logo = initial;
  let recipe = initial.kind === 'maker' ? { ...initial } : { ...DEFAULT_LOGO };
  let request = 0;
  let loading = false;
  const root = document.createElement('fieldset');
  root.className = 'logo-editor';
  const legend = document.createElement('legend');
  legend.textContent = t('logo.heading');
  const preview = document.createElement('img');
  preview.className = 'logo-preview';
  preview.alt = t('logo.preview');
  preview.width = preview.height = 128;
  const controls = document.createElement('div');
  controls.className = 'logo-controls';
  const error = document.createElement('p');
  error.className = 'error';
  error.setAttribute('role', 'alert');
  const update = () => { preview.src = logoUrl(logo); error.textContent = ''; };
  const made = () => { request++; loading = false; logo = { ...recipe }; update(); };
  for (const [key, choices] of [['shape', LOGO_SHAPES], ['icon', LOGO_ICONS]] as const) {
    const label = document.createElement('label');
    label.append(t(`logo.${key}`));
    const select = document.createElement('select');
    select.setAttribute('aria-label', t(`logo.${key}`));
    for (const choice of choices) {
      const option = document.createElement('option');
      option.value = choice;
      option.textContent = t(`logo.${choice}`);
      select.append(option);
    }
    select.value = recipe[key];
    select.addEventListener('change', () => {
      recipe = { ...recipe, [key]: select.value };
      made();
    });
    label.append(select);
    controls.append(label);
  }
  for (const key of ['background', 'ink'] as const) {
    const label = document.createElement('label');
    label.append(t(`logo.${key}`));
    const input = document.createElement('input');
    input.type = 'color';
    input.setAttribute('aria-label', t(`logo.${key}`));
    input.value = recipe[key];
    input.addEventListener('input', () => { recipe = { ...recipe, [key]: input.value }; made(); });
    label.append(input);
    controls.append(label);
  }
  const body = document.createElement('div');
  body.className = 'logo-editor-body';
  body.append(preview, controls);
  const warning = document.createElement('p');
  warning.className = 'note';
  warning.textContent = t('logo.uploadNote');
  const label = document.createElement('label');
  label.append(t('logo.upload'));
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'image/png,image/jpeg,image/webp';
  file.addEventListener('change', async () => {
    const selected = file.files?.[0];
    if (!selected) return;
    const id = ++request;
    loading = true;
    error.textContent = t('logo.loading');
    const result = await uploadLogo(selected);
    file.value = '';
    if (id !== request) return;
    loading = false;
    if (typeof result === 'string') error.textContent = t(`logo.error.${result}`);
    else { logo = result; update(); }
  });
  label.append(file);
  root.append(legend, body, warning, label, error);
  update();
  return { root, value: () => logo, ready: () => { if (loading) file.focus(); return !loading; }, cancelUpload: () => { request++; loading = false; } };
}

export function showLogoDialog(root: HTMLElement, company: { logo: CompanyLogo }, hooks: { onOpen(): void; onClose(): void; onSave(): void }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop logo-backdrop';
  backdrop.hidden = true;
  const panel = document.createElement('div');
  panel.className = 'panel dialog logo-dialog';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', t('logo.heading'));
  backdrop.append(panel);
  root.append(backdrop);
  let editor: ReturnType<typeof makeLogoEditor>;
  let previous: HTMLElement | null = null;
  const api = {
    get isOpen() { return !backdrop.hidden; },
    open() {
      if (api.isOpen) return;
      previous = document.activeElement as HTMLElement | null;
      editor = makeLogoEditor(company.logo);
      const buttons = document.createElement('div');
      buttons.className = 'row';
      for (const key of ['save', 'cancel'] as const) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = t(`logo.${key}`);
        button.addEventListener('click', () => {
          if (key === 'save') {
            if (!editor.ready()) return;
            company.logo = editor.value();
            hooks.onSave();
          }
          api.close();
        });
        buttons.append(button);
      }
      panel.replaceChildren(editor.root, buttons);
      backdrop.hidden = false;
      hooks.onOpen();
      panel.querySelector('select')?.focus();
    },
    close() {
      if (!api.isOpen) return;
      editor.cancelUpload();
      backdrop.hidden = true;
      hooks.onClose();
      previous?.focus();
    },
  };
  return api;
}
