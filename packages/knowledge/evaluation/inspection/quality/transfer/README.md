# 새 주제의 사전 고정 평가

## 목적과 판정 기준

Pomo·SolidJS 기반 개발에 사용하지 않은 HTTP 캐시 주제에서 research v19를 검증한다. 새로 작성한 평가용 문서이므로 실제 운영 문서나 모델의 학습 데이터에 없던 자료라고 주장하지 않는다. 제품 지침을 고치지 않고 먼저 측정한다.

[기준](cases.json)은 모델 실행 전에 고정한 실험 가설이며 사용자 승인 golden이 아니다. MDN의 [Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)과 [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)를 확인해 짧은 요약을 작성했다. 아카이브 사례는 실행 조건을 의도적으로 정하지 않은 가상 요구다. 모두 실험용이며 서비스 정책을 변경하지 않는다.

| 비교                                             | 제안 기준 | 검토할 핵심                                |
| ------------------------------------------------ | --------- | ------------------------------------------ |
| no-cache 지시 준수 ↔ 검증 없이 재사용            | conflict  | 같은 요청·행위에서 검증 의무가 충돌하는가  |
| max-age/s-maxage 우선순위 준수 ↔ 공유 캐시 300초 | duplicate | 명시적인 우선순위를 적용하면 같은 규칙인가 |
| HTTP 캐시 저장 금지 ↔ Cache API에 저장           | unrelated | 같은 응답이어도 서로 다른 저장 동작인가    |
| 자동 정리 금지 ↔ 자동 여부 미정인 아카이브 정리  | uncertain | 모르는 실행 조건을 추정하지 않는가         |

## 실행 계획

- 별도 임시 Git 저장소와 Qdrant collection에 corpus만 색인한다. 기준·설명·실행 결과는 색인하지 않는다.
- 같은 모델 digest와 v19를 고정하고 4쌍을 3회, 실제 검색 모드로 새로 실행한다. 연결 근거·조사 이력을 이전 회차에서 넘기지 않는다.
- 모델에는 원문과 실제 검색 결과만 전달한다. 기대 라벨·기준 이유·기대 근거 ID는 전달하지 않는다.
- 원문·기준·제품 코드 해시를 실행 전후 확인하고, 요청·응답·검색·최종 인용을 저장한다.
- 12회는 독립 사례 12개가 아니라 같은 4쌍의 반복이다. 라벨 일치, 오류, 실제 검색 여부, 기대 문서의 검색·인용 여부, 회차별 일관성을 분리한다. 근거 ID가 맞아도 내용의 논리적 충분성은 별도로 검토한다.
- 실패가 나오더라도 이 평가 안에서 정답이나 프롬프트를 바꾸지 않는다. 먼저 실패 기록을 검토하고 변경 필요성을 보고한다.

## 실행과 재현

저장소 루트에서 실행한다. 로컬 Qdrant와 `gemma4:31b-mlx`, `bge-m3`를 제공하는 Ollama가 필요하다. 출력 디렉터리는 새 경로여야 한다. 실행기는 평가 corpus만 임시 Git 저장소에 복사하고 전용 collection을 만든다. 제품 저장소에는 커밋하지 않는다.

```sh
node packages/knowledge/evaluation/inspection/quality/transfer/run.mjs packages/knowledge/evaluation/inspection/quality/transfer/runs/01
node packages/knowledge/evaluation/inspection/quality/transfer/verify.mjs packages/knowledge/evaluation/inspection/quality/transfer/runs/01 packages/knowledge/evaluation/inspection/quality/transfer/runs/01/verified.json
```

`input.json`은 실행 전 원문·기준·제품 코드 해시와 모델 digest를 보관한다. 회차별 파일에는 요청·응답·검색 기록을 남긴다. `summary.json`은 전체 실행이 끝나고 불변 조건을 확인한 뒤 생성한다. `verified.json`은 저장한 응답으로 현재 제품 흐름을 재실행해 요청·검색·최종 결과가 일치하는지 확인한 기록이며, 새 모델 실행 결과가 아니다.

오류 결과에는 조사 이력이 없을 수 있다. 이때 실행 요약의 `contextCharacters: 0`, `referenceSelected: false`는 최종 이력이 없다는 뜻이며 모델에 보조 문서를 전달하지 않았다는 뜻이 아니다. 실제 전달 여부는 회차별 요청에서 확인한다. 검증 결과의 `referenceCited: null` 역시 최종 인용을 확인할 수 없는 오류 결과를 뜻한다.

## 01차 결과 — 2026-09-08

[실제 실행 요약](runs/01/summary.json): 7문서·15구간, `gemma4:31b-mlx`와 research v19에서 4쌍을 3회 실행했다. 사전 기준과 일치한 결과는 9회이고 처리 오류는 3회다. 독립 사례 12개의 정답률이 아니며, 사용자 승인 정답에 대한 점수도 아니다. 모델 생성 68회와 실제 검색 14회가 발생했다. 사례별 실행 시간의 합은 약 13.8분이다.

| 사례           | 1회차     | 2회차     | 3회차     | 보조 문서 사용                                               |
| -------------- | --------- | --------- | --------- | ------------------------------------------------------------ |
| 재검증 의무    | conflict  | conflict  | conflict  | 1회차 검색 없음, 2·3회차 검색 및 인용                        |
| 캐시 유효기간  | 처리 오류 | 처리 오류 | 처리 오류 | 모두 문서를 검색하고 응답에서 인용했지만 최종 결과 생성 실패 |
| 저장 주체      | unrelated | unrelated | unrelated | 모두 검색 없이 원문으로 종료                                 |
| 자동 여부 미정 | uncertain | uncertain | uncertain | 모두 미정 조건 문서를 검색하고 조사 이력에 인용              |

[재생 검증](runs/01/verified.json)에서 12회 모두 현재 제품의 요청·검색·최종 결과가 기록과 일치했다. 같은 사례의 최초 요청도 세 회차가 동일했다. 실행 전후 기준·corpus·제품 코드 해시, 색인 snapshot, 모델 digest는 같았다. 이 검증은 저장된 응답으로 제어 흐름을 확인한 것이며 추가 독립 모델 평가가 아니다.

### 확인된 실패와 다음 개선

유효기간 사례는 세 번 모두 `invalid-inquiry-findings`로 끝났고 마지막 모델 응답도 동일했다. [1회차 기록](runs/01/1-lifetime.json)의 두 번째 검색은 우선순위 문서를 찾았다. 모델은 `s-maxage`를 우선 적용한다는 문장을 `confirmed`에 쓰고 인용했지만, `remaining`은 빈 문자열로 두면서 `kind`를 `uncertain`으로 반환했다. [판정 검사](../../../../src/inspection/inquiry.ts)는 미해결 조건 없는 `uncertain`을 거부한다. 따라서 이 사례는 검색 실패나 유효한 uncertain이 아니라 출력 일관성 오류다.

재검증 의무 사례의 1회차는 원문에 풀어 쓰지 않은 `no-cache`의 검증 의무를 판정 이유에 사용했지만 보조 문서를 조회하지 않았다. 2·3회차는 그 정의를 질문하고 검색·독립 근거 확인·답변 검토를 거쳤다. 최종 라벨이 같다는 사실만으로 근거 확보 과정까지 일정하다고 평가할 수 없다.

다음 작업은 다음 순서로 진행한다.

1. 이번 불일치 출력을 회귀 재현 자료로 사용해 판정과 미해결 조건을 함께 표현하는 생성 계약을 개선한다. 오류를 임의의 정답이나 uncertain으로 치환하지 않는다.
2. 보조 정의가 필요한데 검색 없이 종료하는 경로를 분리 검증한다. 검색 횟수를 늘리는 것 자체를 목표로 삼지 않는다.
3. 변경 후 이 사례와 기존 승인 사례·문맥 평가를 다시 실행한다. 이번 자료를 개선에 사용한 뒤에는 다시 미사용 평가 자료라고 부르지 않는다.

이번 작업에서는 제품·기본 모델·승인 정답을 바꾸지 않았다. 실행기 구문 검사, 실행기 oxlint, `pnpm format`, 기록 재생을 확인했다. 제품 전체 단위 테스트는 이번 문서·평가 실행기 작업에서 재실행하지 않았다.

## 출력 일관성 개선 평가

이제 이 자료는 개선에 사용했으므로 미사용 평가 자료가 아니다. 기존 기준·corpus·모델·색인을 유지하고 제품 변경 전후를 비교하는 회귀 자료로 사용한다.

02차(v20)는 공통 필수 필드와 판정 조건을 별도 JSON Schema 항목으로 결합했다. [유효기간 응답](runs/02/1-lifetime.json)이 `findings`와 `kind`만 반환해 `invalid-inspection-response`로 실패했으므로 실행을 중단했다. 완성된 3개 사례 기록은 보존했고 전체 평가로 집계하지 않는다. 누락 원인을 로컬 서버 내부 구현으로 단정하지 않는다.

03차(v21)는 각 분기에 필수 필드를 모두 포함하고, uncertain 분기에는 공백이 아닌 `remaining`을 가진 항목이 적어도 하나 있어야 한다는 `contains` 조건을 둔다. [JSON Schema 배열 조건](https://json-schema.org/understanding-json-schema/reference/array#contains)과 [Ollama 구조화 출력](https://docs.ollama.com/capabilities/structured-outputs)을 참고했다. 모델의 조건 준수를 가정하지 않고 기존 런타임 오류 검사를 유지한다. 지침도 uncertain과 미해결 이유의 양방향 조건만 명시하며, 특정 사례의 기대 답을 넣지 않는다.

기존 입력 snapshot을 재사용하는 실행은 다음과 같다. 버전은 명시적으로 검사하며 원문·기준 해시와 모델 digest, 색인 구간이 이전 입력과 같아야 시작한다.

```sh
node packages/knowledge/evaluation/inspection/quality/transfer/run.mjs packages/knowledge/evaluation/inspection/quality/transfer/runs/03 21 packages/knowledge/evaluation/inspection/quality/transfer/runs/01/input.json
node packages/knowledge/evaluation/inspection/quality/transfer/verify.mjs packages/knowledge/evaluation/inspection/quality/transfer/runs/03 packages/knowledge/evaluation/inspection/quality/transfer/runs/03/verified.json
```

### 03차 결과

[실제 실행](runs/03/summary.json)은 기준 일치 12/12회, 오류 0회였다. 같은 4쌍의 반복이며 변경에 사용한 자료이므로 일반 정확도를 뜻하지 않는다. [재생 검증](runs/03/verified.json)에서 12회의 요청·검색·결과 전체가 일치했고, 실행 전후 원문·기준·제품 코드 해시와 모델·색인 snapshot이 유지됐다.

| 사례           | v19의 세 번 결과 | v21의 세 번 결과 | v21 근거                              |
| -------------- | ---------------- | ---------------- | ------------------------------------- |
| 재검증 의무    | conflict 3회     | conflict 3회     | 보조 문서 인용 3회                    |
| 캐시 유효기간  | 처리 오류 3회    | duplicate 3회    | 우선순위 문서 인용과 두 검토 통과 3회 |
| 저장 주체      | unrelated 3회    | unrelated 3회    | 원문 비교만으로 종료 3회              |
| 자동 여부 미정 | uncertain 3회    | uncertain 3회    | 미정 조건 문서 인용 3회               |

[유효기간 1회차](runs/03/1-lifetime.json)의 모델은 우선순위 정의를 찾은 뒤 이를 300초 값에 적용해 같은 요구라고 판정했다. 제품은 빈 미해결 이유를 채우거나 결과 라벨을 교체하지 않았다. 이전 실패 응답처럼 `uncertain`과 빈 이유가 함께 오면 여전히 `invalid-inquiry-findings`로 거부하며 공백만 있는 이유도 회귀 테스트에서 거부했다.

생성 호출은 68→78회, 검색은 14→15회였다. 이전 오류 3건은 검토 전에 끝났지만 현재는 각 두 번의 검토를 완료한다. 실행 시간 합계는 약 13.8→22.1분이지만 통제된 속도 비교는 아니다. 호출 한도는 늘리지 않았다. 검색 시작 단계는 수정하지 않았으므로 재검증 사례의 검색 일관성이 이번에 좋아졌다는 사실만으로 그 단계의 문제가 해결됐다고 주장하지 않는다.

수정 후 Wallaby 관련 53테스트, Vitest 전체 54파일·474테스트, 타입 검사를 통과했다. 일부 질문만 미해결인 경우 확인된 답을 보존하는 테스트도 포함한다. 최초 전체 검사에서 나타난 CLI 테스트의 이전 버전 기대값은 새 판정 버전에 맞춰 갱신했다.

기존 Pomo·SolidJS 6쌍의 실제 검색 조건도 [33차 실행](../context/runs/33/summary.json)에서 6/6회 기준 일치, 오류 0회를 유지했다. [이전 32차와 대조 및 재생](../context/runs/33/verified.json)에서 원문·모델·기준·최초 요청이 같았고 현재 코드의 요청·검색·결과·조사 이력이 기록과 일치했다. 기존 18조건 중 실제 검색 6조건만 이번에 재실행했다. 발췌·직접 제공 나머지 12조건 전체를 새 모델 응답으로 재실행한 결과는 아니다.

남은 과제는 정의가 필요한데도 검색 없이 종료하는 경로다. 이번 수정은 해당 시작 단계를 바꾸지 않았으며, 이 평가 결과를 미사용 문서에 대한 일반화 성능으로 확대하지 않는다.

## 정의 검색 시작 평가

research v22에서는 질문 생성에 초기 모델 판정을 전달하지 않는다. 연구 모드 질문은 원문만 보고, 비교에 필요한 이름 붙은 지시·규칙·수식의 의미가 원문에 없으면 익숙한 용어라도 정의를 묻는다. 비교에 필요하지 않은 용어는 질문하지 않는다. 일반 contextual 모드의 초기 판정 전달은 유지한다. 추가 생성 호출이나 검색 한도 확대는 없다.

기준·원문을 바꾸지 않고 다음을 나눠 확인한다.

- `live`: 기존 4쌍을 3회 실제 검색한다. no-cache 비교는 정의를 검색·인용해야 하고, 저장 주체가 명시적으로 다른 사례는 불필요한 검색 여부를 따로 본다.
- `withheld`: no-cache 쌍만 3회 실행하며 검색 포트가 항상 빈 결과를 반환하도록 통제한다. 정의 질문·검색 요청을 만들되 근거가 없으므로 uncertain을 유지해야 한다. 모델 생성은 실제 로컬 모델을 사용하지만 검색 backend를 호출한 평가는 아니다. corpus 자체에서 문서를 삭제한 실험도 아니다.

```sh
node packages/knowledge/evaluation/inspection/quality/transfer/run.mjs packages/knowledge/evaluation/inspection/quality/transfer/runs/04-withheld 22 packages/knowledge/evaluation/inspection/quality/transfer/runs/03/input.json withheld
node packages/knowledge/evaluation/inspection/quality/transfer/run.mjs packages/knowledge/evaluation/inspection/quality/transfer/runs/04-live 22 packages/knowledge/evaluation/inspection/quality/transfer/runs/03/input.json live
```

`searches`는 검색 포트에 요청한 횟수, `networkSearches`는 실제 검색 backend를 호출한 횟수다. 대조 조건에서 둘을 혼동하지 않는다. 판정 기준과 모델·원문·색인이 같은지 검사하고, 실행기 해시도 보관한다. 이 자료는 이미 개선에 사용한 회귀 자료이며 사용자 승인 정답이나 미사용 평가 자료가 아니다.

### 검색어 보완 과정

v22의 [빈 결과 대조](runs/04-withheld/summary.json)는 3/3회 정의 질문과 두 번의 검색 요청 뒤 uncertain을 유지했다. 하지만 [실제 검색 첫 사례](runs/04-live/1-revalidation.json)는 영어 검색어 두 개가 정의 문서를 상위 3개 결과에서 찾지 못해 uncertain으로 끝났다. v23에서 질문 언어 유지 지침을 보완해도 [같은 영어 검색어](runs/05-live/1-revalidation.json)가 나왔다. 두 실제 검색 후보는 첫 불일치 확인 뒤 중단했으며 전체 평가로 집계하지 않는다.

같은 검색 포트에서 `Cache-Control: no-cache 응답 지시 정의`는 `reference/http`를 첫 결과로 반환했다. [저장한 한 요청의 두 지침 비교](runs/05-live/query.json)에서 코드 식별자 언어와 주변 문장 언어를 구분하라는 지침이 이 검색어를 생성했다. 다른 지침은 `Cache-Control: no-cache 응답 지시`를 생성했다. 이 비교만으로 언어별 일반 검색 성능이나 전체 판정 개선을 주장하지 않는다.

v24는 특정 지시나 정답 문서를 지정하지 않고, 질문의 일반 문장 언어와 원문 식별자를 유지하도록 했다. 아래 명령은 당시 후보 실행 기록이며, 현재 제품 버전과 달라 그대로 재실행할 수 없다.

```sh
node packages/knowledge/evaluation/inspection/quality/transfer/run.mjs packages/knowledge/evaluation/inspection/quality/transfer/runs/06-withheld 24 packages/knowledge/evaluation/inspection/quality/transfer/runs/03/input.json withheld
node packages/knowledge/evaluation/inspection/quality/transfer/run.mjs packages/knowledge/evaluation/inspection/quality/transfer/runs/06-live 24 packages/knowledge/evaluation/inspection/quality/transfer/runs/03/input.json live
```

### 후보 미채택

v24의 [빈 결과 대조](runs/06-withheld/summary.json)는 3/3회 uncertain을 유지했다. [실제 검색 재검증 사례](runs/06-live/1-revalidation.json)는 정의 문서를 찾아 conflict, [유효 기간 사례](runs/06-live/1-lifetime.json)는 duplicate로 판정했다. 하지만 [저장 동작 사례](runs/06-live/1-mechanism.json)는 원문과 보조 문서가 동작을 구분하는데도 저장소 포함 관계의 정의를 요구하여 기대값 unrelated 대신 uncertain을 반환했다. 전체 12회 평가 완료 결과로 집계하지 않는다.

[질문 지시만 교체한 세 요청 비교](runs/06-live/questions.json)에서도 저장 동작 사례의 포함 관계 질문이 반복됐다. 이 비교는 전체 판정 재실행이 아니다. 후보 v22–24는 채택하지 않고 제품 프롬프트를 v21로 복원했다. 실패 기록과 비교 도구는 보존한다. 다음 실험은 필수 정의와 불필요한 배경 지식을 구분하는 질문 기준부터 검증해야 한다. 기존 원문과 기대값은 바꾸지 않았다.

### v25 전제 감사

이후 최신 문맥 충분성·추가 질문 연구를 조사하고, 초기 판정을 유지하되 그 전제가 원문에 있는지 감사하는 방식을 비교했다. [결과와 적용 범위](../necessity/README.md)에 정리했다. 실제 검색 12/12회 기대 판정을 유지하고 검색 합계는 15→12회, 모델 호출 합계는 78→69회였다. 빈 검색 결과 대조 3회는 uncertain을 유지했다. 두 조건의 기록 재생도 일치했다. 이 수치를 일반 정확도 향상으로 해석하지 않는다.

v25는 기존 정리 정책에서 퇴행하여 최종 채택하지 않았다. 현재 v26은 초기 unrelated에 적용 범위 감사를 보강한다. HTTP 미변경 9건은 정확한 요청·결과 재생, 변경된 저장 동작 3건은 [실제 재실행](runs/08-live/summary.json)으로 검증해 판정과 검색·호출 합계를 유지했다. 전체 12건의 새 실시간 실행이 아니라는 점을 구분한다.
