/**
 * 판소리 세 목소리.
 *
 * 「심청가」는 한 사람이 다 하지 않는다. 소리꾼이 말로 하는 대목(아니리)과
 * 소리로 하는 대목(창)을 오가고, 고수가 그 사이를 추임새로 받는다. 자막은 이미
 * 이 세 register를 서로 다르게 조판하고 있으므로(`styles.css` 참조), 음성도
 * 나누면 구조가 귀로도 들린다. 한 목소리로 전부 읽으면 그 구분이 사라진다.
 *
 * API 키는 이 파일에 두지 않는다. 이 파일은 커밋되기 때문이다. 키는 환경변수
 * `FISH_API_KEY`나 gitignore된 `simcheong/.fish-audio-key`에서만 읽는다.
 *
 * `reference_id`는 fish.audio의 음성 모델 ID다. https://fish.audio/discovery 에서
 * 한국어 음성을 고르고 URL 끝의 ID를 여기에 붙인다. null로 두면 기본 음성이
 * 쓰이는데, 세 목소리가 전부 같아지므로 위의 취지가 사라진다.
 */
export default {
  /** s1 | s2-pro | s2.1-pro | s2.1-pro-free */
  model: 's2.1-pro',
  format: 'mp3',
  /** 64 kbps 모노면 이 분량(약 6분)이 3 MB 안쪽이다. 말소리에는 충분하다. */
  mp3Bitrate: 64,

  voices: {
    /** 아니리 — 이야기를 끌고 가는 목소리. 담담하고 또렷하게. */
    aniri: {
      referenceId: null,
      speed: 1.0,
      volume: 0,
      // 낮은 temperature = 안정적인 낭독. 서사를 나르는 역할이라 튀면 안 된다.
      temperature: 0.55,
      topP: 0.7,
    },

    /** 창 — 감정이 실리는 대목. 느리고 폭이 넓게. */
    changgeuk: {
      referenceId: null,
      speed: 0.9,
      volume: 1,
      // 높은 temperature = 억양의 진폭. 여기가 우는 대목이다.
      temperature: 0.9,
      topP: 0.8,
    },

    /** 추임새 — 고수가 던지는 짧은 받침. 빠르고 툭 튀어나오게. */
    chuimsae: {
      referenceId: null,
      speed: 1.12,
      volume: -2,
      temperature: 0.95,
      topP: 0.85,
    },
  },
};
