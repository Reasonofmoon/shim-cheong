/**
 * 대사별 감정 태그.
 *
 * Fish Audio S2는 `[대괄호]` 안에 태그를 받는다. 고정 어휘(`[sad]`, `[shouting]`,
 * `[sobbing]` …)와 자유 서술(`[holding back tears, trying to sound normal]`)을
 * 모두 받으며, 감정은 문장 앞에 둘 때 가장 잘 먹고 톤·효과음은 아무 데나 놓을
 * 수 있다. 한 문장에 3개까지가 권장치다. (S1은 `(소괄호)`를 쓰지만, 웹 UI에서
 * S2를 고르면 소괄호를 대괄호로 자동 변환해 준다.)
 *
 * 여기서 지킨 연출 원칙 하나: **아니리는 눌러 둔다.**
 *
 * 판소리에서 아니리는 말로 하는 대목이고 창은 소리로 하는 대목이다. 둘의 낙차가
 * 이 형식의 동력이므로, 아니리까지 감정을 실으면 창이 터질 자리가 없어진다.
 * 그래서 아니리 31줄 대부분은 `[calm]`이나 `[serious]` 정도로 두고, 눈물과
 * 고함은 창 23줄에 몰아 뒀다. 추임새 13줄은 고수가 던지는 것이라 거의 전부
 * `[shouting]`이 붙는다.
 *
 * 키는 `<actId>:<자막 인덱스>`다. 인덱스는 `narration.ts`의 배열 순서와 같다.
 * 생성기가 개수를 대조하므로 자막을 넣거나 빼면 즉시 드러난다.
 */
export default {
  // ---- 1막 · 곽씨부인 세상을 뜨다 ------------------------------------------
  // 이야기의 문을 여는 대목. 아직 아무 일도 일어나지 않았으므로 담담하게 시작해야
  // 뒤의 상여가 무겁다.
  'farewell:0': '[calm][nostalgic]',
  'farewell:1': '[warm, fond]',
  'farewell:2': '[sad][voice breaking]',
  'farewell:3': '[sighing][sad]',
  'farewell:4': '[serious][subdued]',
  // 1막의 정점. 눈먼 남편이 이미 죽은 아내를 부른다.
  'farewell:5': '[sobbing][pleading]',
  'farewell:6': '[sobbing]',
  'farewell:7': '[lonely][soft]',
  // 이름을 붙이는 자리. 슬픔에서 살짝 돌아서 다음 막으로 넘긴다.
  'farewell:8': '[tender, quiet]',

  // ---- 2막 · 동냥젖으로 자란 청이 ------------------------------------------
  // 이야기 전체에서 유일하게 따뜻한 대목이다. 여기가 밝아야 4막이 아프다.
  'growing:0': '[serious]',
  'growing:1': '[pleading][desperate]',
  'growing:2': '[shouting][excited]',
  'growing:3': '[warm, relieved]',
  'growing:4': '[moved][proud]',
  'growing:5': '[shouting][delighted]',
  'growing:6': '[warm]',
  'growing:7': '[proud][confident]',

  // ---- 3막 · 공양미 삼백 석 ------------------------------------------------
  'vow:0': '[hurried][anxious]',
  // 화주승의 말. 스님이므로 흔들림 없이.
  'vow:1': '[solemn][calm]',
  // 눈을 뜬다는 말에 넋이 나가 되뇌는 자리.
  'vow:2': '[astonished][hopeful]',
  'vow:3': '[sighing]',
  'vow:4': '[hurried]',
  // 제정신이 돌아와 가슴을 친다.
  'vow:5': '[panicked][regretful]',
  // 이 막에서 가장 조용하고 가장 무거운 한 줄. 청이는 아무 말도 하지 않는다.
  'vow:6': '[soft][grave]',

  // ---- 4막 · 몸을 팔아 삼백 석 ---------------------------------------------
  'merchants:0': '[serious]',
  'merchants:1': '[serious]',
  // 여기서 울리면 안 된다. 청이는 결심한 사람이지 애원하는 사람이 아니다.
  'merchants:2': '[determined][confident]',
  'merchants:3': '[sad][sighing]',
  'merchants:4': '[moved][subdued]',
  // 마지막 아침상. 아버지는 모른다 — 그래서 태연한 척해야 하고, 그 척이
  // 무너지려는 상태가 이 줄의 전부다. 자유 서술이 고정 어휘보다 잘 맞는 자리.
  'merchants:5': '[holding back tears, trying to sound normal]',
  'merchants:6': '[grave]',

  // ---- 5막 · 인당수에 몸을 던지다 -------------------------------------------
  'indangsu:0': '[serious][ominous]',
  'indangsu:1': '[shouting][panicked]',
  'indangsu:2': '[shouting][scared]',
  // 두 번 절하는 대목. 폭풍 한가운데인데 여기만 고요해야 한다.
  'indangsu:3': '[solemn][soft]',
  // 영화 전체가 향하는 한 줄.
  'indangsu:4': '[sobbing][sincere]',
  'indangsu:5': '[hurried][tense]',
  // 한 단어. 물에 닿는 소리.
  'indangsu:6': '[shouting]',
  'indangsu:7': '[crying loudly]',
  // 뒤집히는 자리. 바람이 자고 물이 거울이 된다 — 숨을 죽이고.
  'indangsu:8': '[soft][astonished]',

  // ---- 6막 · 수정궁, 어머니를 만나다 ----------------------------------------
  'dragonPalace:0': '[serious]',
  'dragonPalace:1': '[astonished][delighted]',
  'dragonPalace:2': '[shouting][delighted]',
  // 용왕의 말. 권위가 실려야 한다.
  'dragonPalace:3': '[confident][solemn]',
  'dragonPalace:4': '[astonished][moved]',
  'dragonPalace:5': '[shouting][excited]',
  // 어머니. 십오 년 동안 못 한 말을 한 번에 한다.
  'dragonPalace:6': '[sobbing][moved]',
  'dragonPalace:7': '[sad][soft]',

  // ---- 7막 · 연꽃으로 돌아오다 ---------------------------------------------
  'lotus:0': '[calm]',
  'lotus:1': '[delighted][astonished]',
  'lotus:2': '[shouting][joyful]',
  'lotus:3': '[curious]',
  'lotus:4': '[calm]',
  'lotus:5': '[astonished][soft]',
  'lotus:6': '[delighted]',

  // ---- 8막 · 맹인잔치, 눈을 뜨다 --------------------------------------------
  'feast:0': '[sad][soft]',
  'feast:1': '[serious]',
  'feast:2': '[anxious][disappointed]',
  // 일부러 아무 색도 넣지 않는다. 늙은 봉사 하나가 그냥 들어오는 것처럼 읽혀야
  // 다음 줄의 "아버지!"가 터진다. 여기에 감정을 실으면 미리 알려주는 꼴이 된다.
  'feast:3': '[calm]',
  'feast:4': '[shouting][crying]',
  'feast:5': '[shouting][excited]',
  // 참지 못하고 눈에 힘을 주는 순간. 소리가 아니라 힘이 들어가야 한다.
  'feast:6': '[groaning][straining]',
  // 개안. 영화의 흰 프레임과 같은 자리.
  'feast:7': '[shouting][astonished][joyful]',
  'feast:8': '[shouting][joyful]',
  'feast:9': '[joyful][moved]',
  // 주제를 말하는 줄. 읊는 것이지 우는 것이 아니다.
  'feast:10': '[proud][sincere]',
  // 판을 닫는 말. 처음의 담담함으로 돌아온다.
  'feast:11': '[calm][sincere]',
};
