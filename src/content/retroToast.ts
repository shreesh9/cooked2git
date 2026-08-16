/**
 * retroToast.ts — In-Page Retro HUD Toast Banner
 * Displays HUD notification on LeetCode/NeetCode page when submission is intercepted & pushed.
 * Scoped Shadow DOM to prevent CSS collisions with host site.
 */

export class RetroToast {
  private static hostElement: HTMLElement | null = null;
  private static shadowRoot: ShadowRoot | null = null;

  public static show(options: { title: string; subtitle?: string; type: 'success' | 'error' | 'thinking'; catPose?: string }): void {
    this.ensureMount();
    if (!this.shadowRoot) return;

    const container = this.shadowRoot.querySelector('#toastContainer');
    if (!container) return;

    const catIcon = options.type === 'success' ? '🔥' : options.type === 'error' ? '😿' : '🐱';
    const borderCol = options.type === 'success' ? 'var(--ok-green)' : options.type === 'error' ? 'var(--error-red)' : 'var(--crimson)';

    const toast = document.createElement('div');
    toast.className = 'retro-hud-toast';
    toast.style.borderColor = borderCol;

    toast.innerHTML = `
      <div class="toast-cat">${catIcon}</div>
      <div class="toast-content">
        <div class="toast-title">${options.title}</div>
        ${options.subtitle ? `<div class="toast-sub">${options.subtitle}</div>` : ''}
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 200);
    }, 4000);
  }

  private static ensureMount(): void {
    if (this.hostElement && this.shadowRoot) return;

    this.hostElement = document.createElement('div');
    this.hostElement.id = 'cooked2git-hud-root';
    this.hostElement.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 2147483647; pointer-events: none;';

    this.shadowRoot = this.hostElement.attachShadow({ mode: 'closed' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          font-family: 'JetBrains Mono', 'Consolas', monospace;
        }
        #toastContainer {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .retro-hud-toast {
          background: #09090B;
          color: #F2F2F0;
          border: 1px solid #FF0B3A;
          border-radius: 6px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.8), 0 0 10px rgba(255, 11, 58, 0.2);
          pointer-events: auto;
          min-width: 240px;
          animation: slide-in 180ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .toast-cat {
          font-size: 20px;
        }
        .toast-title {
          font-family: 'Silkscreen', monospace;
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .toast-sub {
          font-size: 10px;
          color: #8A8A93;
          margin-top: 2px;
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .toast-exit {
          opacity: 0;
          transform: translateY(-8px);
          transition: all 180ms ease-in;
        }
      </style>
      <div id="toastContainer"></div>
    `;

    document.body.appendChild(this.hostElement);
  }
}
