/**
 * CookedCat.ts — Mascot State Machine
 * States: 'idle' | 'thinking' | 'cooked' | 'error' | 'sleep'
 * Handles CSS steps animation and frame cycling for 16x16 pixel cat SVGs.
 */

export type CatState = 'idle' | 'thinking' | 'cooked' | 'error' | 'sleep';

export interface CookedCatOptions {
  container: HTMLElement;
  initialState?: CatState;
  interactive?: boolean;
  onStateChange?: (newState: CatState) => void;
}

export class CookedCat {
  private container: HTMLElement;
  private state: CatState;
  private frame: number = 0;
  private intervalId: number | null = null;
  private sleepTimerId: number | null = null;
  private imgElement: HTMLImageElement;
  private onStateChange?: (newState: CatState) => void;
  private isHidden: boolean = false;

  private static readonly SPRITE_MAP: Record<CatState, { src: string; frames: number; frameWidth: number; speedMs: number }> = {
    idle: { src: '/cat/idle.svg', frames: 2, frameWidth: 32, speedMs: 500 },
    thinking: { src: '/cat/thinking.svg', frames: 2, frameWidth: 32, speedMs: 350 },
    cooked: { src: '/cat/cooked.svg', frames: 3, frameWidth: 32, speedMs: 250 },
    error: { src: '/cat/error.svg', frames: 2, frameWidth: 32, speedMs: 600 },
    sleep: { src: '/cat/sleep.svg', frames: 2, frameWidth: 32, speedMs: 800 },
  };

  constructor(options: CookedCatOptions) {
    this.container = options.container;
    this.state = options.initialState || 'idle';
    this.onStateChange = options.onStateChange;

    this.container.classList.add('cat-container');
    if (options.interactive) {
      this.container.classList.add('interactive');
      this.container.addEventListener('click', () => this.handleInteraction());
    }

    this.imgElement = document.createElement('img');
    this.imgElement.className = 'pixel-art';
    this.imgElement.alt = 'Cooked Cat Mascot';
    this.container.appendChild(this.imgElement);

    this.applyState(this.state);
    this.resetSleepTimer();
  }

  public setState(newState: CatState, autoReturnMs?: number): void {
    if (this.state === newState && this.intervalId !== null) return;

    this.state = newState;
    this.frame = 0;
    this.applyState(newState);

    if (this.onStateChange) {
      this.onStateChange(newState);
    }

    this.resetSleepTimer();

    if (autoReturnMs && autoReturnMs > 0 && newState !== 'idle') {
      setTimeout(() => {
        if (this.state === newState) {
          this.setState('idle');
        }
      }, autoReturnMs);
    }
  }

  public getState(): CatState {
    return this.state;
  }

  public toggleHide(hide?: boolean): void {
    this.isHidden = hide !== undefined ? hide : !this.isHidden;
    this.container.style.display = this.isHidden ? 'none' : 'block';
  }

  private applyState(state: CatState): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const config = CookedCat.SPRITE_MAP[state];
    this.imgElement.src = config.src;

    // Sprite animation frame cycler via CSS clip/transform style
    this.intervalId = window.setInterval(() => {
      this.frame = (this.frame + 1) % config.frames;
      // Offset sprite container or object-position if multi-frame SVG sheet
      const percent = (this.frame / config.frames) * 100;
      this.imgElement.style.objectFit = 'cover';
      this.imgElement.style.objectPosition = `${percent}% 0%`;
    }, config.speedMs);
  }

  private handleInteraction(): void {
    if (this.state === 'sleep') {
      this.setState('idle');
    } else if (this.state === 'idle') {
      // Fun easter egg interaction: temporary 'cooked' pose on click
      this.setState('cooked', 1500);
    }
  }

  private resetSleepTimer(): void {
    if (this.sleepTimerId !== null) {
      clearTimeout(this.sleepTimerId);
      this.sleepTimerId = null;
    }

    // Enter sleep pose after 10 minutes of inactivity
    this.sleepTimerId = window.setTimeout(() => {
      if (this.state === 'idle') {
        this.setState('sleep');
      }
    }, 10 * 60 * 1000);
  }

  public destroy(): void {
    if (this.intervalId !== null) clearInterval(this.intervalId);
    if (this.sleepTimerId !== null) clearTimeout(this.sleepTimerId);
    this.container.innerHTML = '';
  }
}
