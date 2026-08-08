import type { Act } from './types';
import type { Director } from './director';
import type { Narrator } from './narrator';

/**
 * The player chrome: chapter title, transport, scrubber, and act chips.
 *
 * Deliberately sparse and deliberately fading — it hides itself after a few
 * seconds of no input so the film can be watched, and comes back on any mouse
 * move. Everything is also on the keyboard, because scrubbing frame by frame
 * with the arrow keys is how the shots in this film actually got checked.
 */

const HIDE_AFTER = 3200;

export class PlayerUi {
  private readonly root: HTMLElement;
  private readonly chapterEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly playBtn: HTMLButtonElement;
  private readonly timeEl: HTMLElement;
  private readonly scrub: HTMLInputElement;
  private readonly chipsEl: HTMLElement;
  private readonly chips: HTMLButtonElement[] = [];
  private readonly cardEl: HTMLElement;

  private readonly muteBtn: HTMLButtonElement;
  private director: Director | null = null;
  private narrator: Narrator | null = null;
  private idleTimer = 0;
  private scrubbing = false;

  constructor(container: HTMLElement, acts: readonly Act[]) {
    this.root = document.createElement('div');
    this.root.className = 'player';

    // ---- Title card, shown briefly at the top of each act ----------------
    this.cardEl = document.createElement('div');
    this.cardEl.className = 'actcard';
    this.chapterEl = document.createElement('div');
    this.chapterEl.className = 'actcard__chapter';
    this.titleEl = document.createElement('div');
    this.titleEl.className = 'actcard__title';
    this.cardEl.append(this.chapterEl, this.titleEl);
    container.appendChild(this.cardEl);

    // ---- Transport --------------------------------------------------------
    const bar = document.createElement('div');
    bar.className = 'player__bar';

    const prevBtn = this.button('◀◀', '이전 막 (←)', () => this.director?.previous());
    this.playBtn = this.button('▶', '재생 / 일시정지 (Space)', () => this.director?.toggle());
    this.playBtn.classList.add('player__btn--primary');
    const nextBtn = this.button('▶▶', '다음 막 (→)', () => this.director?.next());

    this.scrub = document.createElement('input');
    this.scrub.type = 'range';
    this.scrub.min = '0';
    this.scrub.max = '1000';
    this.scrub.value = '0';
    this.scrub.className = 'player__scrub';
    this.scrub.setAttribute('aria-label', '재생 위치');
    this.scrub.addEventListener('pointerdown', () => {
      this.scrubbing = true;
    });
    this.scrub.addEventListener('pointerup', () => {
      this.scrubbing = false;
    });
    this.scrub.addEventListener('input', () => {
      const d = this.director;
      if (!d) return;
      d.seekGlobal((Number(this.scrub.value) / 1000) * d.totalDuration);
    });

    this.timeEl = document.createElement('span');
    this.timeEl.className = 'player__time';
    this.timeEl.textContent = '0:00 / 0:00';

    // 음성이 생성돼 있을 때만 나타난다. attachAudio()가 켠다.
    this.muteBtn = this.button('♪', '소리 켜기 / 끄기 (M)', () => this.toggleMute());
    this.muteBtn.hidden = true;

    bar.append(prevBtn, this.playBtn, nextBtn, this.scrub, this.timeEl, this.muteBtn);

    // ---- Act chips ---------------------------------------------------------
    this.chipsEl = document.createElement('div');
    this.chipsEl.className = 'player__chips';
    acts.forEach((act, i) => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.type = 'button';
      const num = document.createElement('span');
      num.className = 'chip__num';
      num.textContent = String(i + 1);
      const label = document.createElement('span');
      label.className = 'chip__label';
      label.textContent = act.title;
      chip.append(num, label);
      chip.title = `${act.chapter} · ${act.title}`;
      chip.addEventListener('click', () => this.director?.goTo(i));
      this.chipsEl.appendChild(chip);
      this.chips.push(chip);
    });

    this.root.append(this.chipsEl, bar);
    container.appendChild(this.root);

    this.bindPointerIdle(container);
    this.bindKeys();
  }

  attach(director: Director): void {
    this.director = director;
  }

  /** 나레이션 음성이 실제로 있을 때만 호출된다. */
  attachAudio(narrator: Narrator): void {
    this.narrator = narrator;
    this.muteBtn.hidden = false;
    this.reflectMute();
  }

  private toggleMute(): void {
    if (!this.narrator) return;
    this.narrator.setMuted(!this.narrator.isMuted);
    this.reflectMute();
  }

  private reflectMute(): void {
    if (!this.narrator) return;
    const muted = this.narrator.isMuted;
    this.muteBtn.textContent = muted ? '♪̸' : '♪';
    this.muteBtn.classList.toggle('is-off', muted);
    this.muteBtn.title = muted ? '소리 켜기 (M)' : '소리 끄기 (M)';
  }

  onActChange(index: number, act: Act): void {
    this.chapterEl.textContent = act.chapter;
    this.titleEl.textContent = act.title;

    // Replay the card animation.
    this.cardEl.classList.remove('is-showing');
    void this.cardEl.offsetWidth;
    this.cardEl.classList.add('is-showing');

    this.chips.forEach((chip, i) => chip.classList.toggle('is-active', i === index));
    if (window.location.hash !== `#${act.id}`) {
      history.replaceState(null, '', `#${act.id}`);
    }
  }

  onProgress(actTime: number, actDuration: number, total: number, totalDuration: number): void {
    if (!this.scrubbing) {
      this.scrub.value = String(Math.round((total / Math.max(totalDuration, 1)) * 1000));
    }
    this.timeEl.textContent = `${fmt(actTime)} / ${fmt(actDuration)}`;
  }

  onPlayStateChange(playing: boolean): void {
    this.playBtn.textContent = playing ? '❚❚' : '▶';
  }

  private button(label: string, title: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'player__btn';
    btn.textContent = label;
    btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private bindPointerIdle(container: HTMLElement): void {
    const wake = (): void => {
      this.root.classList.remove('is-idle');
      window.clearTimeout(this.idleTimer);
      this.idleTimer = window.setTimeout(() => {
        if (this.director?.isPlaying) this.root.classList.add('is-idle');
      }, HIDE_AFTER);
    };
    container.addEventListener('pointermove', wake);
    container.addEventListener('pointerdown', wake);
    wake();
  }

  private bindKeys(): void {
    window.addEventListener('keydown', (e) => {
      const d = this.director;
      if (!d) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          d.toggle();
          break;
        case 'ArrowRight':
          e.preventDefault();
          // Shift steps a frame at a time for checking a specific pose.
          if (e.shiftKey) d.seek(d.actTime + 1 / 30);
          else if (e.altKey) d.seek(d.actTime + 1);
          else d.next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) d.seek(d.actTime - 1 / 30);
          else if (e.altKey) d.seek(d.actTime - 1);
          else d.previous();
          break;
        case 'KeyR':
          d.seek(0);
          break;
        case 'KeyM':
          this.toggleMute();
          break;
        default:
          if (e.code.startsWith('Digit')) {
            const n = Number(e.code.slice(5));
            if (n >= 1 && n <= 8) d.goTo(n - 1);
          }
      }
    });
  }
}

function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
