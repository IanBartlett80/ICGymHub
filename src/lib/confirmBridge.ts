/**
 * Imperative bridge to the styled confirmation dialog (ConfirmProvider).
 *
 * The ConfirmProvider registers its `confirm` function here on mount so that
 * non-component code (e.g. the helpers in `@/lib/toast`) can trigger the
 * standardized confirmation modal instead of the native `window.confirm`.
 *
 * Falls back to `window.confirm` if the provider has not registered yet
 * (e.g. during SSR or before hydration).
 */

export interface BridgeConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

type ConfirmFn = (options: BridgeConfirmOptions) => Promise<boolean>;

let registeredConfirm: ConfirmFn | null = null;

export function registerConfirm(fn: ConfirmFn | null): void {
  registeredConfirm = fn;
}

export function confirmViaBridge(options: BridgeConfirmOptions): Promise<boolean> {
  if (registeredConfirm) {
    return registeredConfirm(options);
  }

  // Fallback for SSR or before the provider has mounted.
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    const text = options.title
      ? `${options.title}\n\n${options.message}`
      : options.message;
    return Promise.resolve(window.confirm(text));
  }

  return Promise.resolve(false);
}
