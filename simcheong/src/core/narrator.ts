import type { Caption } from './types';

/**
 * 나레이션 재생.
 *
 * 음성은 로컬에서 미리 만들어 `public/audio/`에 커밋해 둔 mp3다 — 이 사이트는
 * 정적 호스팅이라 브라우저에서 TTS API를 부를 수 없다(키가 공개된다).
 * 여기는 그 파일들을 필름의 시계에 맞춰 트는 일만 한다.
 *
 * 어려운 점은 **필름은 시간의 순수 함수인데 오디오는 아니라는 것**이다. 막은
 * 어느 시각으로든 즉시 스크럽되지만 `HTMLAudioElement`는 자기 속도로 흐른다.
 * 그래서 규칙을 세 개 둔다.
 *
 *   1. 재생 중일 때만 소리를 낸다. 스크러버를 끄는 동안 오디오가 따라다니면
 *      긁는 소리가 난다.
 *   2. 자막이 바뀔 때만 클립을 바꾼다. 자막 창(`until`)이 끝났다고 말을 자르지
 *      않는다 — 음성이 창보다 길면 단어 중간에서 잘리는데, 다음 대사와 살짝
 *      겹치는 편이 훨씬 낫다.
 *   3. 필름 시각과 클립 위치가 벌어지면 다시 맞춘다. 프레임 드롭이나
 *      스크럽 후 재생에서 생기는 어긋남을 이걸로 흡수한다.
 */

interface ManifestClip {
  readonly file: string;
  readonly style: string;
  readonly hash: string;
}

interface Manifest {
  readonly version: number;
  readonly clips: Readonly<Record<string, ManifestClip>>;
}

/** 이보다 벌어지면 클립 위치를 필름 시각에 다시 맞춘다. */
const DRIFT_TOLERANCE = 0.25;

/**
 * 한 채널. 아니리·창은 한 채널을 쓰고 추임새는 별도 채널을 쓴다 — 고수는
 * 소리꾼을 기다리지 않고 그 위에 받침을 던지기 때문이다.
 */
class Channel {
  private element: HTMLAudioElement | null = null;
  private clipId = '';
  private startedAt = 0;

  constructor(private readonly gain: number) {}

  play(element: HTMLAudioElement, clipId: string, captionAt: number, offset: number): void {
    if (this.clipId !== clipId) {
      this.stop();
      this.element = element;
      this.clipId = clipId;
      this.startedAt = captionAt;
      element.currentTime = Math.max(0, offset);
    }
    if (this.element && this.element.paused) {
      // 자동재생 정책으로 거절될 수 있다. 조용히 흘려보낸다 — 첫 사용자
      // 제스처에서 unlock()이 이미 돌았어야 하고, 여기서 예외를 던지면
      // 렌더 루프가 죽는다.
      void this.element.play().catch(() => undefined);
    }
  }

  /** 필름 시각과 클립 위치가 벌어졌으면 맞춘다. */
  resync(filmTime: number): void {
    const element = this.element;
    if (!element || element.paused || !Number.isFinite(element.duration)) return;

    const expected = filmTime - this.startedAt;
    if (expected < 0 || expected > element.duration) return;
    if (Math.abs(element.currentTime - expected) > DRIFT_TOLERANCE) {
      element.currentTime = expected;
    }
  }

  pause(): void {
    this.element?.pause();
  }

  stop(): void {
    if (!this.element) return;
    this.element.pause();
    this.element.currentTime = 0;
    this.element = null;
    this.clipId = '';
  }

  setMuted(muted: boolean, master: number): void {
    if (this.element) this.element.volume = muted ? 0 : this.gain * master;
  }

  applyVolume(element: HTMLAudioElement, muted: boolean, master: number): void {
    element.volume = muted ? 0 : this.gain * master;
  }
}

export class Narrator {
  private manifest: Manifest | null = null;
  private readonly cache = new Map<string, HTMLAudioElement>();
  private readonly spoken = new Channel(1);
  // 추임새는 받침이지 대사가 아니다. 조금 낮춰야 소리꾼을 덮지 않는다.
  private readonly shout = new Channel(0.72);

  private muted = false;
  private master = 0.9;
  private unlocked = false;

  constructor(private readonly base = './audio/') {}

  /**
   * 매니페스트를 읽는다. 없으면 조용히 비활성 상태로 남는다 — 음성을 아직
   * 생성하지 않은 클론에서도 영화는 그대로 돌아가야 한다.
   */
  async load(): Promise<boolean> {
    try {
      const response = await fetch(`${this.base}manifest.json`, { cache: 'no-cache' });
      if (!response.ok) return false;
      const parsed = (await response.json()) as Manifest;
      if (!parsed?.clips || typeof parsed.clips !== 'object') return false;
      this.manifest = parsed;
      return true;
    } catch {
      return false;
    }
  }

  get available(): boolean {
    return this.manifest !== null;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /**
   * 첫 사용자 제스처에서 호출한다. 브라우저는 제스처 없이 소리를 못 내게
   * 막는데, 커버의 "첫 마당 열기" 버튼이 정확히 그 제스처다.
   */
  unlock(): void {
    if (this.unlocked || !this.manifest) return;
    this.unlocked = true;
    // 무음 재생을 한 번 태워 오디오 컨텍스트를 연다.
    const primer = new Audio();
    primer.muted = true;
    void primer.play().catch(() => undefined);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.spoken.setMuted(muted, this.master);
    this.shout.setMuted(muted, this.master);
  }

  /** 다음 막의 클립을 미리 받아 둔다. 막 전환 때 첫 대사가 늦지 않도록. */
  warm(actId: string, captions: readonly Caption[]): void {
    if (!this.manifest) return;
    for (const caption of captions) {
      this.element(`${actId}:${caption.at}`);
    }
  }

  /**
   * 매 프레임 디렉터가 부른다. 자막 렌더러와 같은 인자를 받고 같은 규칙으로
   * 활성 자막을 고른다 — 그래야 들리는 것과 보이는 것이 어긋나지 않는다.
   */
  update(actId: string, captions: readonly Caption[], t: number, playing: boolean): void {
    if (!this.manifest) return;

    if (!playing) {
      // 스크러빙 중에는 소리를 내지 않는다. 클립은 버리지 않고 멈추기만 하므로
      // 재생을 누르면 있던 자리에서 이어진다.
      this.spoken.pause();
      this.shout.pause();
      return;
    }

    let spokenCaption: Caption | null = null;
    let shoutCaption: Caption | null = null;
    for (const caption of captions) {
      if (t < caption.at || t >= caption.until) continue;
      if (caption.style === 'chuimsae') shoutCaption = caption;
      else spokenCaption = caption;
    }

    this.drive(this.spoken, actId, spokenCaption, t);
    this.drive(this.shout, actId, shoutCaption, t);
  }

  /** 막이 바뀌거나 영화가 멈출 때. 남은 소리를 끊는다. */
  stop(): void {
    this.spoken.stop();
    this.shout.stop();
  }

  private drive(channel: Channel, actId: string, caption: Caption | null, t: number): void {
    if (!caption) {
      // 활성 자막이 없어도 클립을 자르지 않는다. 음성이 자막 창보다 길면
      // 여기서 끊기는데, 그러면 단어 중간에서 잘린다. 다음 자막이 올 때
      // play()가 알아서 바꾼다.
      channel.resync(t);
      return;
    }

    const clipId = `${actId}:${caption.at}`;
    const element = this.element(clipId);
    if (!element) return;

    channel.applyVolume(element, this.muted, this.master);
    channel.play(element, clipId, caption.at, t - caption.at);
    channel.resync(t);
  }

  private element(clipId: string): HTMLAudioElement | null {
    const cached = this.cache.get(clipId);
    if (cached) return cached;

    const clip = this.manifest?.clips[clipId];
    if (!clip) return null;

    const element = new Audio(`${this.base}${clip.file}`);
    element.preload = 'auto';
    element.volume = this.muted ? 0 : this.master;
    this.cache.set(clipId, element);
    return element;
  }

  dispose(): void {
    this.stop();
    this.cache.clear();
  }
}
