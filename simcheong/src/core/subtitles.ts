import type { Caption } from './types';

/**
 * The narration layer.
 *
 * Pansori is a sung story with a drummer answering it, so the captions are
 * styled by register rather than uniformly: spoken `aniri` sits plain, sung
 * `changgeuk` is set larger with wider tracking, and the drummer's `chuimsae`
 * interjections land small and off to the side. Rendering this in the DOM rather
 * than in WebGL costs nothing and gets real Korean text shaping for free.
 */
export class Subtitles {
  private readonly root: HTMLElement;
  private readonly line: HTMLElement;
  private readonly chuimsae: HTMLElement;

  private currentKey = '';
  private currentChuimsaeKey = '';

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'narration';

    this.line = document.createElement('p');
    this.line.className = 'narration__line';
    this.root.appendChild(this.line);

    this.chuimsae = document.createElement('span');
    this.chuimsae.className = 'narration__chuimsae';
    this.root.appendChild(this.chuimsae);

    container.appendChild(this.root);
  }

  /**
   * Show whichever caption covers local time `t`. Captions are authored in
   * order and rarely number more than a dozen per act, so a linear scan is both
   * simpler and faster than maintaining a cursor across scrubs.
   */
  update(actId: string, captions: readonly Caption[], t: number): void {
    let spoken: Caption | null = null;
    let shout: Caption | null = null;

    for (const cap of captions) {
      if (t < cap.at || t >= cap.until) continue;
      if (cap.style === 'chuimsae') shout = cap;
      else spoken = cap;
    }

    const key = spoken ? `${actId}:${spoken.at}` : '';
    if (key !== this.currentKey) {
      this.currentKey = key;
      if (spoken) {
        this.line.textContent = spoken.text;
        this.line.dataset['style'] = spoken.style ?? 'aniri';
        // Restart the fade-in by forcing a reflow between class swaps.
        this.line.classList.remove('is-visible');
        void this.line.offsetWidth;
        this.line.classList.add('is-visible');
      } else {
        this.line.classList.remove('is-visible');
      }
    }

    const shoutKey = shout ? `${actId}:${shout.at}` : '';
    if (shoutKey !== this.currentChuimsaeKey) {
      this.currentChuimsaeKey = shoutKey;
      if (shout) {
        this.chuimsae.textContent = shout.text;
        this.chuimsae.classList.remove('is-visible');
        void this.chuimsae.offsetWidth;
        this.chuimsae.classList.add('is-visible');
      } else {
        this.chuimsae.classList.remove('is-visible');
      }
    }
  }

  clear(): void {
    this.currentKey = '';
    this.currentChuimsaeKey = '';
    this.line.classList.remove('is-visible');
    this.chuimsae.classList.remove('is-visible');
  }
}
