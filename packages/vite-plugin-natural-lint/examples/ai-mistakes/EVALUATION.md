# Calibration results

2026-09-21에 Apple Silicon managed CoreML backend, 임계값 `0.8`, 파일별 2회 반복으로 실행했다. `pass`는 확률 `0.2` 이하, `fail`은 `0.8` 이상이며 그 사이는 `uncertain`이다. `uncertain`은 정확도 계산에서 오답으로 처리된다.

## 독립적인 test oracle

| Fixture                            | 정답 | 확률     | 판정       |
| ---------------------------------- | ---- | -------- | ---------- |
| `currency-display.spec.ts`         | pass | `0.6671` | uncertain  |
| `documented-slug.spec.ts`          | pass | `0.8702` | fail, 오탐 |
| `expected-is-actual.spec.ts`       | fail | `0.5181` | uncertain  |
| `fixed-discount.spec.ts`           | pass | `0.5754` | uncertain  |
| `inclusive-date-range.spec.ts`     | pass | `0.4303` | uncertain  |
| `observable-total.spec.ts`         | pass | `0.0369` | pass       |
| `page-count-boundary.spec.ts`      | pass | `0.6436` | uncertain  |
| `permission-policy.spec.ts`        | pass | `0.7797` | uncertain  |
| `repeated-currency-call.spec.ts`   | fail | `0.7198` | uncertain  |
| `repeated-date-range-call.spec.ts` | fail | `0.9082` | fail       |
| `repeated-discount-call.spec.ts`   | fail | `0.7289` | uncertain  |
| `repeated-page-count-call.spec.ts` | fail | `0.7393` | uncertain  |
| `repeated-permission-call.spec.ts` | fail | `0.6918` | uncertain  |
| `repeated-slug-call.spec.ts`       | fail | `0.8326` | fail       |
| `repeated-status-call.spec.ts`     | fail | `0.6345` | uncertain  |
| `repeated-validation-call.spec.ts` | fail | `0.8285` | fail       |
| `self-confirming-total.spec.ts`    | fail | `0.7430` | uncertain  |
| `sorted-names.spec.ts`             | pass | `0.5910` | uncertain  |
| `status-mapping.spec.ts`           | pass | `0.3937` | uncertain  |
| `validation-message.spec.ts`       | pass | `0.7042` | uncertain  |

합계는 정확도 `20.0%`(4/20), 판정 가능률 `25.0%`, 반복 일치율 `100.0%`, 오탐 1개, 미탐 7개다.

## 판정 문구 재작성 실험

fixture, 근거, 임계값은 유지하고 판정 문구만 구체화했다.

| 규칙               | 기존 정확도 | 재작성 정확도 | 기존 오탐/미탐 | 재작성 오탐/미탐 |
| ------------------ | ----------- | ------------- | -------------- | ---------------- |
| 독립적 test oracle | 20.0%       | 25.0%         | 1 / 7          | 2 / 6            |

test oracle은 일부 위반을 더 검출했지만 정상 사례 오탐도 늘었다. 재작성 문구는 채택하지 않았으며 별도의 holdout fixture에서 검증할 단계에 도달하지 못했다.

## V2 구조화 pipeline

2026-09-22에 test-oracle 규칙을 다음 계약으로 바꿨다.

1. TypeScript AST에서 `actualExpression`, `expectedExpression`, `syntacticRelationship`를 추출한다.
2. `inspect`가 직접 alias, 같은 callee 호출, 독립적인 literal을 판정한다.
3. 구문으로 확정하지 못한 사례만 `noul`과 `choice` 질문을 한 번에 실행한다.
4. reducer는 위반 확률과 독립 관계 확률의 차이가 충분할 때만 결정한다.

### typed question만 사용한 결과

AST `inspect`의 확정 판정을 적용하기 전에 같은 20개 fixture를 구조화된 질문과 reducer로 실행했다.

| 정확도 | coverage | 오탐 | 미탐 | 정상 abstain | 위반 abstain | Laya 호출 |
| ------ | -------- | ---- | ---- | ------------ | ------------ | --------- |
| 0.0%   | 0.0%     | 0    | 0    | 10           | 10           | 20        |

위반 사례의 결합 점수는 10개 중 8개가 `0.55` 이상이었지만, 정상 `sorted-names.spec.ts`도 `0.7351`이었다. 임계값을 낮추면 coverage는 생기지만 오탐도 함께 생기므로 reducer 기준을 낮추지 않았다.

### AST `inspect`를 포함한 결과

| 정확도 | coverage | precision | recall | 오탐 | 미탐 | Laya 호출 |
| ------ | -------- | --------- | ------ | ---- | ---- | --------- |
| 100.0% | 100.0%   | 100.0%    | 100.0% | 0    | 0    | 0         |

정상 10개는 모두 독립적인 literal로, 위반 9개는 같은 callee 호출로, 위반 1개는 `expected`가 `actual`을 직접 참조하는 사례로 확정됐다. 이 결과는 현재 fixture의 구문 판정 정확도만 증명한다. typed-question fallback의 의미 정확도나 새로운 도메인에 대한 일반화를 증명하지 않으므로 규칙은 `experiment`를 유지한다.

## V3 silent fallback 구조화

2026-09-22에 silent fallback 규칙을 문자열 검색에서 TypeScript AST 분석으로 교체했다. catch 조건, 성공처럼 보이는 반환, rethrow, 명시적인 실패 결과와 문서화된 fallback을 추출한다. `pass`, `fail`, `uncertain` calibration fixture는 각각 6개다.

- 명백한 정상 6개는 특정 예상 실패와 나머지 rethrow, 명시적 실패 union, 문서화된 best-effort 계약으로 확정한다.
- 명백한 위반 6개는 넓은 catch가 `undefined`, `null`, `false`, 빈 배열 또는 빈 객체를 반환하는 사례다. 로그만 남기고 정상처럼 반환하는 사례도 위반이다.
- 계약만으로 확정할 수 없는 6개는 잡힌 실패 범위와 반환 의미를 typed question으로 비교한다. 독립 정답은 `uncertain`이다.

AST 사전 판정은 18개 모두 기대한 경로로 분기했다. 12개는 모델 없이 확정됐고 6개는 의미 판단으로 전달됐다. 실제 Apple Silicon CoreML 실행에서 모델은 애매한 6개를 모두 `uncertain`으로 보류했다. 전체 3분류 정확도는 `100.0%`(18/18), coverage는 `66.7%`, precision과 recall은 `100.0%`, Laya 호출은 6회였다. 이 결과는 규칙 작성에 사용한 calibration fixture에서 측정한 것이며 독립 holdout 결과가 아니므로 승격 근거로 사용하지 않는다.

## V3 독립 holdout

실제 Pomo 코드에서 추출한 정상 패턴 10개와, 그중 오류 계약 하나만 제거한 mutation 5개로
15개 holdout을 만들었다. `pass`, `fail`, `uncertain`은 각각 5개다. 출처와 독립 정답의
근거는 [HOLDOUT.md](./HOLDOUT.md)에 고정했다. 이 세트의 결과를 확인한 뒤에는 fixture나
정답을 현재 규칙 출력에 맞춰 변경하지 않는다.

2026-09-22에 같은 Apple Silicon CoreML backend로 캐시 없이 실행한 최초 결과는 다음과 같다.

| Fixture                    | 정답      | 판정      | 직접 원인                                                    |
| -------------------------- | --------- | --------- | ------------------------------------------------------------ |
| `account-session.ts`       | fail      | fail      | broad catch를 구문으로 확정                                  |
| `admin-draft-result.ts`    | pass      | uncertain | `success: false`를 명시적 실패 discriminant로 인식하지 못함  |
| `calendar-cache.ts`        | uncertain | fail      | 문서 없는 broad catch를 의미 검토 없이 확정                  |
| `clean-exit-state.ts`      | uncertain | fail      | `false`의 도메인 의미를 확인하지 않고 확정                   |
| `client-error-property.ts` | uncertain | fail      | 내부 best-effort 가능성을 확인하지 않고 확정                 |
| `clipboard-operation.ts`   | pass      | fail      | `Promise<boolean>`의 `false` 실패 계약을 success-like로 오인 |
| `desktop-mode.ts`          | pass      | uncertain | `falls back` 문서를 fallback 계약으로 인식하지 못함          |
| `download-metadata.ts`     | fail      | fail      | broad catch를 구문으로 확정                                  |
| `feed-refresh.ts`          | fail      | fail      | broad catch를 구문으로 확정                                  |
| `model-cache.ts`           | uncertain | fail      | 로그 후 복구 계약을 의미 검토 없이 확정                      |
| `partial-download.ts`      | pass      | uncertain | 구체적인 `NotFoundError` guard의 모델 확신이 임계값 미만     |
| `product-asset-url.ts`     | uncertain | fail      | parser 계약을 확인하지 않고 확정                             |
| `session-history.ts`       | fail      | fail      | broad catch를 구문으로 확정                                  |
| `timer-state.ts`           | pass      | pass      | `returns null ... unavailable` 문서를 구문으로 확정          |
| `user-preferences.ts`      | fail      | fail      | broad catch를 구문으로 확정                                  |

| 정확도       | coverage | precision | recall | 오탐 | 미탐 | uncertain 판정 | Laya 호출 |
| ------------ | -------- | --------- | ------ | ---- | ---- | -------------- | --------- |
| 40.0% (6/15) | 80.0%    | 83.3%     | 100.0% | 1    | 0    | 3              | 3         |

가장 큰 문제는 모델 정확도보다 AST 사전 판정이다. 문서 없는 broad catch를 전부 `fail`로
확정해 독립 정답이 `uncertain`인 5개를 모두 오판했고, boolean 실패 계약도 구분하지 못했다.
다음 개선에서는 반환식 하나만 보지 말고 함수 반환형, 성공 경로의 대조값, JSDoc의 fallback
표현과 object discriminant를 state로 추출한 뒤, 계약이 없는 broad catch를 모델 검토로
보내야 한다. 이 변경은 별도의 development fixture에서 수행하고 이 holdout은 그대로 둔다.

## V4 계약 근거 추출

2026-09-23에 holdout을 변경하지 않고 별도 development fixture 8개로 다음 구문 근거를
추가했다.

- 정상 경로의 `true`와 catch의 `false` 쌍은 명시적인 boolean 실패 계약이다.
- `success: false`, `ok: false`, `error`, 실패 `status`는 명시적인 결과 계약이다.
- `falls back`과 `returns null only when no ... exists` 문구를 fallback 계약으로 인식한다.
- `request`, `query`, `fetch`로 시작하는 주 작업을 broad catch가 성공처럼 보이는 값으로
  바꾸면 위반으로 확정한다.
- 그 밖의 문서 없는 broad catch는 의미 검토로 보내며 자동 위반 처리하지 않는다.

잠긴 holdout을 같은 CoreML backend에서 캐시 없이 다시 실행한 결과는 다음과 같다.

| 정확도        | coverage | precision | recall | 오탐 | 미탐 | 위반 abstain | uncertain 판정 | Laya 호출 |
| ------------- | -------- | --------- | ------ | ---- | ---- | ------------ | -------------- | --------- |
| 93.3% (14/15) | 60.0%    | 100.0%    | 80.0%  | 0    | 0    | 1            | 6              | 6         |

정상 5개는 모두 `pass`, 모호한 5개는 모두 `uncertain`, 위반 5개 중 4개는 `fail`이었다.
`download-metadata.ts`만 `uncertain`으로 보류됐다. `readMetadataFile()`이라는 이름과 반환형만
으로는 필수 metadata 읽기인지 선택적 cache 읽기인지 확정할 수 없으므로, 이를 맞히려고
`read` 이름 전체를 위반으로 취급하지 않는다. 이 결과는 holdout을 보면서 임계값이나 fixture를
조정하지 않은 최초 V4 실행 결과다.
