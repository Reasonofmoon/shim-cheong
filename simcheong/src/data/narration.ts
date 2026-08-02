import type { Caption } from '../core/types';

/**
 * Narration, written in the register of pansori.
 *
 * `Simcheongga` is one of the five surviving pansori, and its language is not
 * modern Korean prose. It runs on four-beat phrasing, piles up parallel clauses,
 * and addresses the audience directly. The captions here follow that shape:
 * `aniri` for the spoken linking passages, `changgeuk` for the sung verse where
 * the emotion lands, and `chuimsae` for the drummer's shouted encouragement —
 * 얼씨구, 좋다, 그렇지 — which in a real performance never stops.
 *
 * Timings are act-local seconds and are hand-placed against the cut points, so
 * a line lands with the shot rather than with the clock.
 */

export const NARRATION: Record<string, readonly Caption[]> = {
  // ---------------------------------------------------------------- Act I --
  farewell: [
    { at: 1.4, until: 8.2, style: 'aniri', text: '옛날 황주 도화동에, 심학규라 하는 봉사가 살았것다.' },
    {
      at: 8.6,
      until: 15.4,
      style: 'aniri',
      text: '눈은 멀었으나 마음은 밝고,\n가난하나 그 아내 곽씨부인 어질기 그지없더라.',
    },
    {
      at: 16.0,
      until: 23.4,
      style: 'changgeuk',
      text: '딸 하나 낳아놓고 이레도 못 넘겨,\n곽씨부인 그만 세상을 버리시니—',
    },
    { at: 17.2, until: 20.0, style: 'chuimsae', text: '어허, 이런 일이' },
    {
      at: 24.2,
      until: 31.6,
      style: 'aniri',
      text: '동네 사람들 상여를 메고 나서는데,\n심봉사는 강보에 싸인 핏덩이를 안고 서 있을 뿐이라.',
    },
    {
      at: 32.4,
      until: 40.6,
      style: 'changgeuk',
      text: '여보 마누라, 어디를 가오.\n눈 어두운 이 사람 두고 어디를 간단 말이오.',
    },
    { at: 34.0, until: 36.6, style: 'chuimsae', text: '아이고' },
    {
      at: 41.6,
      until: 48.2,
      style: 'aniri',
      text: '들리는 것은 발소리뿐,\n그마저도 눈길 저편으로 멀어지더라.',
    },
    { at: 49.0, until: 53.6, style: 'changgeuk', text: '그 딸의 이름을, 청이라 하였으니.' },
  ],

  // --------------------------------------------------------------- Act II --
  growing: [
    { at: 1.2, until: 7.6, style: 'aniri', text: '심봉사 젖동냥을 다니는데, 이 집 저 집 문을 두드려—' },
    {
      at: 8.2,
      until: 15.0,
      style: 'changgeuk',
      text: '이 애기 어미 잃은 불쌍한 자식,\n한 모금만 젖을 주오, 한 모금만 주오.',
    },
    { at: 9.4, until: 11.8, style: 'chuimsae', text: '얼씨구' },
    {
      at: 16.0,
      until: 23.0,
      style: 'aniri',
      text: '동네 아낙들 마다 않고 젖을 물리니,\n청이 그 젖으로 자라 어느덧 열다섯이라.',
    },
    {
      at: 24.0,
      until: 31.4,
      style: 'changgeuk',
      text: '아버지 눈이 되고 손이 되어,\n밥을 빌어 아비를 봉양하니—',
    },
    { at: 26.0, until: 28.4, style: 'chuimsae', text: '그렇지, 좋다' },
    {
      at: 32.4,
      until: 39.6,
      style: 'aniri',
      text: '도화동 사람들 입을 모아 이르기를,\n효녀로다, 효녀 심청이로다 하더라.',
    },
    { at: 40.4, until: 46.0, style: 'changgeuk', text: '그 효성이 하늘에 닿았으니, 하늘인들 무심하랴.' },
  ],

  // -------------------------------------------------------------- Act III --
  vow: [
    { at: 1.4, until: 8.0, style: 'aniri', text: '하루는 심봉사, 청이를 기다리다 물에 빠져 허우적거리는데—' },
    {
      at: 8.6,
      until: 15.6,
      style: 'aniri',
      text: '몽운사 화주승이 지나다 건져내어 이르되,\n"공양미 삼백 석을 부처님께 올리면 눈을 뜨오리다."',
    },
    { at: 16.4, until: 23.8, style: 'changgeuk', text: '삼백 석이라, 삼백 석이라.\n눈을 뜬다는 그 말에 그만—' },
    { at: 18.0, until: 20.4, style: 'chuimsae', text: '어허' },
    { at: 24.6, until: 31.6, style: 'aniri', text: '앞뒤 헤아릴 겨를도 없이 그리하마 약조를 하고 돌아와,' },
    {
      at: 32.4,
      until: 40.0,
      style: 'changgeuk',
      text: '그제야 정신이 들어 가슴을 치니,\n쌀 서 말도 없는 집에 삼백 석이 웬 말이냐.',
    },
    { at: 41.0, until: 47.4, style: 'aniri', text: '청이 그 사연을 듣고, 아무 말 없이 고개를 숙이더라.' },
  ],

  // --------------------------------------------------------------- Act IV --
  merchants: [
    { at: 1.4, until: 8.4, style: 'aniri', text: '마침 남경 장사 뱃사람들이 마을에 들어 사람을 구하는데—' },
    {
      at: 9.0,
      until: 16.2,
      style: 'aniri',
      text: '"인당수 험한 물길에 처녀를 제물로 드리면\n무사히 다녀오리라" 하니.',
    },
    { at: 17.0, until: 24.6, style: 'changgeuk', text: '청이 나서서 이르되,\n"내 몸을 사시오. 공양미 삼백 석에 이 몸을 사시오."' },
    { at: 19.0, until: 21.4, style: 'chuimsae', text: '아이고, 이 일을' },
    {
      at: 25.4,
      until: 32.8,
      style: 'aniri',
      text: '뱃사람들 그 말에 눈물을 흘리며 쌀 삼백 석을 실어 보내고,\n떠날 날을 받아 가더라.',
    },
    {
      at: 33.6,
      until: 41.4,
      style: 'changgeuk',
      text: '아버지, 진지 잡수시오.\n오늘 아침 이 밥이 마지막인 줄, 아버지는 모르시고—',
    },
    { at: 42.4, until: 49.0, style: 'aniri', text: '심봉사 그제야 알고 붙들었으나, 배는 이미 떠나고 없더라.' },
  ],

  // ---------------------------------------------------------------- Act V --
  indangsu: [
    { at: 1.6, until: 8.4, style: 'aniri', text: '배가 인당수에 다다르니, 물빛이 검고 바람이 사납더라.' },
    {
      at: 9.2,
      until: 16.6,
      style: 'changgeuk',
      text: '하늘이 무너지는 듯 물결이 일어나고,\n배는 가랑잎처럼 떠올랐다 잠겼다—',
    },
    { at: 11.0, until: 13.4, style: 'chuimsae', text: '어이쿠' },
    { at: 17.4, until: 24.0, style: 'aniri', text: '청이 뱃머리에 올라, 서쪽 하늘을 향하여 두 번 절하고 이르되,' },
    {
      at: 24.8,
      until: 33.0,
      style: 'changgeuk',
      text: '아버지, 부디 눈을 뜨시고\n밝은 세상 보시옵소서.\n불효한 딸 청이는 여기서 하직하나이다.',
    },
    { at: 34.0, until: 39.0, style: 'aniri', text: '치마를 뒤집어쓰고, 뱃전에서 몸을 던지니—' },
    { at: 39.6, until: 45.0, style: 'changgeuk', text: '풍덩!' },
    { at: 40.2, until: 43.0, style: 'chuimsae', text: '아이고, 아이고' },
    { at: 46.0, until: 52.0, style: 'aniri', text: '그 순간 바람이 자고, 물결이 거울처럼 잔잔해지더라.' },
  ],

  // --------------------------------------------------------------- Act VI --
  dragonPalace: [
    { at: 1.6, until: 8.6, style: 'aniri', text: '가라앉는 청이를 옥황상제 명으로 사해용왕이 받으시니—' },
    {
      at: 9.4,
      until: 17.0,
      style: 'changgeuk',
      text: '수정궁 너른 뜰에 오색 등불이 밝고,\n인어와 자라가 늘어서서 맞이하더라.',
    },
    { at: 11.2, until: 13.6, style: 'chuimsae', text: '좋다' },
    { at: 18.0, until: 25.4, style: 'aniri', text: '용왕이 이르되, "네 효성이 하늘에 사무쳤으니, 어찌 죽게 두랴."' },
    {
      at: 26.4,
      until: 34.6,
      style: 'changgeuk',
      text: '그때 발 너머로 낯익은 얼굴 하나—\n어머니, 곽씨부인이 아니시오니까.',
    },
    { at: 28.0, until: 30.4, style: 'chuimsae', text: '얼씨구' },
    {
      at: 35.6,
      until: 43.4,
      style: 'changgeuk',
      text: '내 딸 청아, 이 어미가 너를 낳고 젖 한 번 못 물렸구나.\n어디 보자, 어디 얼굴 좀 보자.',
    },
    { at: 44.4, until: 51.0, style: 'aniri', text: '모녀 서로 붙들고 울다가, 날이 차매 다시 헤어질 때가 되었더라.' },
  ],

  // -------------------------------------------------------------- Act VII --
  lotus: [
    { at: 1.4, until: 8.2, style: 'aniri', text: '용왕이 청이를 연꽃 속에 넣어 물 위로 띄워 보내니—' },
    {
      at: 9.0,
      until: 16.4,
      style: 'changgeuk',
      text: '인당수 검던 물이 비단결로 바뀌고,\n난데없는 연꽃 한 송이 두둥실 떠오르더라.',
    },
    { at: 11.0, until: 13.4, style: 'chuimsae', text: '얼씨구 좋다' },
    { at: 17.2, until: 24.4, style: 'aniri', text: '남경 갔던 뱃사람들 돌아오다 그 꽃을 보고 기이히 여겨 건져 올려,' },
    { at: 25.2, until: 32.0, style: 'aniri', text: '천자께 바치니, 천자 그 꽃을 궁중에 두시더라.' },
    {
      at: 32.8,
      until: 41.0,
      style: 'changgeuk',
      text: '어느 밤 연꽃이 스스로 열리며\n그 속에서 처녀 하나 걸어 나오니—',
    },
    { at: 42.0, until: 48.6, style: 'aniri', text: '천자 크게 놀라 기뻐하시고, 마침내 황후로 삼으시니라.' },
  ],

  // ------------------------------------------------------------- Act VIII --
  feast: [
    { at: 1.4, until: 8.6, style: 'aniri', text: '황후가 되었으나 청이 하루도 아비를 잊지 못하여,' },
    {
      at: 9.2,
      until: 16.0,
      style: 'aniri',
      text: '천하의 맹인을 모두 불러 잔치를 베푸시니,\n이름하여 맹인잔치라.',
    },
    { at: 16.8, until: 24.0, style: 'changgeuk', text: '오는 이마다 살피고 살피되,\n찾는 그 얼굴은 끝내 보이지 아니하고—' },
    { at: 24.8, until: 31.6, style: 'aniri', text: '잔치 마지막 날, 다 떨어진 옷차림의 늙은 봉사 하나가 들어오더라.' },
    { at: 32.4, until: 40.4, style: 'changgeuk', text: '아버지!\n눈을 떠서 저를 보옵소서, 아버지!' },
    { at: 34.0, until: 36.4, style: 'chuimsae', text: '얼씨구!' },
    {
      at: 41.2,
      until: 48.4,
      style: 'changgeuk',
      text: '죽은 딸의 목소리라 하니 어찌 참으랴,\n두 눈을 부릅뜨는 순간—',
    },
    { at: 49.2, until: 54.0, style: 'changgeuk', text: '번쩍! 눈을 뜨는구나.' },
    { at: 49.8, until: 52.6, style: 'chuimsae', text: '얼씨구 절씨구!' },
    {
      at: 55.0,
      until: 62.0,
      style: 'aniri',
      text: '그 자리에 모인 맹인들도 모두 눈을 뜨니,\n천지가 환하게 밝아지더라.',
    },
    { at: 63.0, until: 69.0, style: 'changgeuk', text: '이렇듯 효성은 하늘도 감동케 하는 법이라.' },
    { at: 69.6, until: 75.0, style: 'aniri', text: '심청전, 여기서 그치노라.' },
  ],
};
