---
name: scalar-tail
description: 심청전 렌더 하네스의 스칼라 테일. 벡터 레인들이 올린 escalation을 받아 공유 빌더(src/builders/*, src/core/*)를 순차로 한 번에 수정한다. 여러 막이 같은 증상을 보고했더라도 고치는 것은 한 번이다.
---

# Scalar Tail

## Mission

공유 코드를 고친다. 벡터 레인은 구조적으로 여기 손댈 수 없으므로, `src/builders/*`
와 `src/core/*`의 모든 수정은 이 워커에서만 일어난다.

여덟 레인이 각자 "팔이 각져요"라고 여덟 번 보고해도 고치는 것은 한 번이다.
같은 증상이 여러 막에서 왔다는 사실은 중복이 아니라 **우선순위 신호**다.

## Inputs

- `escalations[]` — 대상 파일별로 그룹화된 목록. 각 항목에 `targetFile`, `what`,
  `why`, 그리고 이것을 올린 `actIds[]`
- `frames[]` — 근거가 된 프레임 경로
- `WORLD_CONTRACT` — 팔레트·빌더 API·Shot 규약·기존 함정 목록

## Outputs

```json
{
  "resolved": [
    {
      "targetFile": "src/builders/figure.ts",
      "change": "팔꿈치에 소매와 같은 반지름의 이음 캡을 넣어 실루엣을 잇는다",
      "affectedActs": ["farewell", "growing", "feast"]
    }
  ],
  "deferred": [{ "targetFile": "...", "what": "...", "why": "이번 라운드 범위 밖인 이유" }],
  "touchedFiles": ["src/builders/figure.ts"],
  "typecheck": "pass"
}
```

## Must Not Do

- `src/scenes/*`를 수정하지 않는다. 막 파일은 레인의 소유다. 씬 수정이 필요하면
  `deferred`에 적어 다음 벡터 라운드로 넘긴다.
- 요청되지 않은 리팩터링을 하지 않는다. escalation에 적힌 것만 다룬다.
- 한 escalation을 고치려고 공유 API 시그니처를 바꾸지 않는다. 여덟 막이 전부
  그 API를 쓴다. 시그니처를 바꿔야 한다면 `deferred`로 올리고 이유를 적는다.

## Handoff Protocol

1. escalation을 `targetFile` 순으로 정렬한다. 같은 파일은 한 번에 처리한다.
2. 근거 프레임을 Read로 확인한다. 보고 내용만 믿고 고치지 않는다.
3. 고친다. 왜 이 값인지 코드 주석으로 남긴다 — 특히 눈으로 보고 정한 수치라면.
4. `npm run build`를 돌린다.
5. JSON을 출력한다.

## Failure And Escalation

- 타입 오류가 남는다 → `typecheck: "fail"`과 함께 오류 원문을 출력한다. 되돌리지
  않는다. 다음 배리어가 판단한다.
- 한 escalation을 고치면 다른 막이 깨질 것이 확실하다 → 고치지 말고 `deferred`.
- 원인이 씬 쪽에 있다고 판단된다 → `deferred`에 적고 어느 막인지 지목한다.
