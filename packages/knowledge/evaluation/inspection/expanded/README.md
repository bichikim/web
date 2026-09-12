# 확장 진단 평가

사용자 승인에 따라 기본 동작은 버전 3으로 복원했다. 후보 6의 구현·평가 기록은 보존하고, [분류·근거 분리 후보 7](../runs/prompt-7/README.md)을 별도 평가한다. 아래 후보 3·4·5·6 기록은 과거 실행 이력이며 채택 상태는 이 문단과 후보 7 기록을 기준으로 본다.

연속 인용 [후보 버전 5](../workplace/runs/prompt-5/README.md)도 1회 평가에서 12/16으로 회귀해 채택하지 않았다. 현재 버전 3을 유지한다.

순서형 지침 후보 버전 4는 매회 12/16으로 회귀해 채택하지 않았다. 현재 실행 프롬프트는 버전 3이다.

최신 프롬프트 버전 3은 캐시를 분리한 3회 평가에서 매회 14/16(87.5%)을 맞혔다. 버전 2의 12/16보다 2쌍 개선됐지만 오분류 2쌍은 남았다. 아래 버전 2 기록과 기준선은 보존한다.

[golden.json](golden.json)은 2026-09-06에 사용자가 승인한 정답 16쌍이다. 승인 전 [draft.json](draft.json)은 보존한다. 문서 11개를 기존 4쌍 golden과 별도 scope인 `demo/inspection-expanded`에 색인했다. 프롬프트 버전 2를 고정하고 캐시를 분리한 3회 평가를 완료했으며, 기존 정답·기준선·프롬프트는 유지했다.

## 승인된 분류 기준

- duplicate: 언어·표현이 달라도 같은 조건에서 같은 규칙을 요구한다.
- conflict: 같은 조건과 대상에 대해 동시에 만족할 수 없는 요구를 명시한다.
- uncertain: 비교에 필요한 규칙의 정의나 조건을 알 수 없다.
- unrelated: 서로 다른 대상, 서로 겹치지 않는 적용 조건, 또는 독립적인 요구 사항이다. 같은 주제를 다룬다는 이유만으로 중복이나 충돌은 아니다.

특히 **독립적인 규칙과 정보 부족을 구분**한다. 순차 실행과 감사 로그 의무는 함께 지킬 수 있는 별도 요구다. 반면 정의가 없는 정책 R은 어떤 요구인지 알 수 없어 일치·충돌 여부를 결정할 수 없다. production과 staging은 이 자료에서 서로 다른 환경이며 각 문서가 자기 환경에만 적용된다고 명시한다.

## 승인된 16쌍

| 번호 | 비교 원문                                                                                               | 제안 정답 | 근거                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------- |
| 1    | [영문 순차 실행](repository/docs/serial.md) ↔ [한글 순차 실행](repository/docs/korean.md)               | duplicate | 모두 동시에 최대 한 요청만 허용한다.                                 |
| 2    | [영문 30초](repository/docs/timeout.md) ↔ [한글 30초](repository/docs/korean-timeout.md)                | duplicate | 모든 요청에 정확히 30초를 요구한다.                                  |
| 3    | [순차 실행](repository/docs/serial.md) ↔ [동시 실행](repository/docs/concurrent.md)                     | conflict  | 최대 한 요청과 여러 요청의 동시 실행 의무가 충돌한다.                |
| 4    | [한글 순차 실행](repository/docs/korean.md) ↔ [동시 실행](repository/docs/concurrent.md)                | conflict  | 언어가 달라도 3번과 같은 모순이다.                                   |
| 5    | [30초](repository/docs/timeout.md) ↔ [60초](repository/docs/long-timeout.md)                            | conflict  | 같은 요청의 제한 시간이 두 값에 동시에 정확히 일치할 수 없다.        |
| 6    | [한글 30초](repository/docs/korean-timeout.md) ↔ [60초](repository/docs/long-timeout.md)                | conflict  | 언어가 달라도 5번과 같은 모순이다.                                   |
| 7    | [순차 실행](repository/docs/serial.md) ↔ [정책 R](repository/docs/unspecified.md)                       | uncertain | R의 내용이 없어 동시성 요구를 비교할 수 없다.                        |
| 8    | [한글 순차 실행](repository/docs/korean.md) ↔ [정책 R](repository/docs/unspecified.md)                  | uncertain | 언어가 달라도 필요한 정의가 없다.                                    |
| 9    | [production 순차 실행](repository/docs/production.md) ↔ [정책 R](repository/docs/unspecified.md)        | uncertain | R이 production에서 어떤 동시성 요구를 정하는지 알 수 없다.           |
| 10   | [staging 동시 실행](repository/docs/staging.md) ↔ [정책 R](repository/docs/unspecified.md)              | uncertain | R이 staging에서 어떤 동시성 요구를 정하는지 알 수 없다.              |
| 11   | [순차 실행](repository/docs/serial.md) ↔ [환불 승인](repository/docs/refund.md)                         | unrelated | 토큰 갱신과 결제 환불은 별도 대상이다.                               |
| 12   | [한글 순차 실행](repository/docs/korean.md) ↔ [환불 승인](repository/docs/refund.md)                    | unrelated | 언어가 달라도 별도 대상이다.                                         |
| 13   | [순차 실행](repository/docs/serial.md) ↔ [감사 로그](repository/docs/audit.md)                          | unrelated | 실행 방식과 완료 후 로그 의무는 독립적이며 함께 지킬 수 있다.        |
| 14   | [한글 순차 실행](repository/docs/korean.md) ↔ [감사 로그](repository/docs/audit.md)                     | unrelated | 언어가 달라도 13번과 같은 보완 관계다.                               |
| 15   | [production 순차 실행](repository/docs/production.md) ↔ [staging 동시 실행](repository/docs/staging.md) | unrelated | 적용 환경이 서로 다르며 다른 환경에 대한 요구는 명시적으로 제외했다. |
| 16   | [순차 실행](repository/docs/serial.md) ↔ [30초 제한](repository/docs/timeout.md)                        | unrelated | 동시성과 요청 제한 시간은 독립적인 요구다.                           |

분포는 duplicate 2쌍, conflict 4쌍, uncertain 4쌍, unrelated 6쌍이다. 소규모 진단용 사례이며 실제 업무 문서의 분포나 일반 정확도를 대표하지 않는다.

## 실행 조건

문서는 실제 [색인 준비 코드](../../../src/indexing/prepare.ts)로 파싱하고 내용을 해시했다. 정답 파일에는 docId·unitId·contentHash를 고정한다. 이는 자료 구조와 원본 연결 검증이지 색인 성공이나 모델 분류 정확도 검증이 아니다.

2026-09-06에 사용자 승인을 기록하고 [repository](repository) 사본을 `/private/tmp/knowledge-expanded.ZZPA5Q`의 별도 Git 저장소 main 브랜치로 초기화했다. commit은 `b4829ce26409a79162cc6b035329745fbe666278`이다. 실제 `know index` 결과는 documents 11, points 11, embedded 11, diagnostics 0이다. web 저장소 안의 이 폴더를 바로 색인하지 않는다.

프롬프트 버전 2와 `--limit 100`을 고정하고 실행한다. 각 회차에 서로 다른 새 `--cache-dir`를 지정해 분류 결과 캐시를 재사용하지 않는다. 이는 Ollama 프로세스나 모델 로딩까지 초기화한다는 뜻은 아니다.

```sh
know doctor /private/tmp/knowledge-expanded.ZZPA5Q \
  --model gemma4:latest --limit 100 \
  --cache-dir /private/tmp/knowledge-expanded.ZZPA5Q-cache-01 --json
```

2·3회차는 캐시 경로 끝을 각각 `02`, `03`으로 바꾼다. 재현 실행에서도 이미 사용한 디렉터리 대신 새 경로를 지정한다. 각 회차의 `diagnostic.json`은 실제 진단 출력이며 `execution.json`은 시작·종료 시각과 종료 코드를 기록한다.

새 corpus의 평가 결과를 기존 4쌍 기준선과 직접 비교하지 않는다. scope·원본·정답이 다르므로 별도 기준선이 필요하다. 원래 4쌍의 회귀 평가는 별도로 유지한다. 평가 결과에 맞춰 정답을 바꾸거나 승인 없이 프롬프트를 수정하지 않는다.

## 3회 평가 결과

| 회차 | 진단 원본                       | 평가                        | 전체 선택 | 중복·충돌 정답 선택 | 정답 일치   | 캐시 재사용 |
| ---- | ------------------------------- | --------------------------- | --------- | ------------------- | ----------- | ----------- |
| 1    | [진단](runs/01/diagnostic.json) | [새 기준선](baseline.json)  | 55/55     | 6/6                 | 12/16 (75%) | 0           |
| 2    | [진단](runs/02/diagnostic.json) | [비교](runs/02/report.json) | 55/55     | 6/6                 | 12/16 (75%) | 0           |
| 3    | [진단](runs/03/diagnostic.json) | [비교](runs/03/report.json) | 55/55     | 6/6                 | 12/16 (75%) | 0           |

세 회차 모두 정상 종료했고 진단·검색 오류가 없었다. 모델은 `gemma4:latest`, digest는 `c6eb396dbd5992bbe3f5cdb947e8bbc0ee413d7c17e2beaae69f5d569cf982eb`이다. 정답·원본 해시, 모델 digest, 프롬프트 버전, 검사 예산, 선택된 쌍이 세 회차에서 일치함을 확인했다. 정답 16쌍뿐 아니라 전체 55쌍의 분류도 세 회차 모두 같았다. 이는 이번 실행의 반복 일치 결과이지 일반적인 재현성이나 정확도 보장은 아니다. 정답이 없는 나머지 39쌍은 정확도 계산에서 제외한다.

다음 4쌍은 세 회차 모두 같은 오분류가 발생했다.

| 사례                        | 승인 정답 | 실제 분류 |
| --------------------------- | --------- | --------- |
| bilingual-undefined-policy  | uncertain | unrelated |
| production-undefined-policy | uncertain | unrelated |
| staging-undefined-policy    | uncertain | unrelated |
| complementary-audit         | unrelated | conflict  |

감사 로그 사례의 실제 설명은 “동시성을 정하지 않는다”는 문장과 순차 실행 요구가 충돌한다고 판단했다. 원문에 요구가 없다는 사실을 반대 요구로 해석한 오분류다. 정책 R 세 사례와 함께 다음 프롬프트 개선의 검증 대상으로 남긴다. 이번 단계에서는 정답이나 프롬프트를 바꾸지 않았다.

2·3회차는 1회차 기준선 대비 회귀가 없지만, 이는 기존 오분류 4쌍도 유지됐다는 뜻이다. 원래 4쌍의 저장된 프롬프트 버전 2 진단을 별도로 재평가한 결과는 정답 일치 4/4, 회귀 없음이었다. 원래 자료로 모델을 새로 실행한 결과는 아니다.

저장된 결과는 모델 접속 없이 재평가할 수 있다.

```sh
know eval-inspection packages/knowledge/evaluation/inspection/expanded/golden.json \
  --report packages/knowledge/evaluation/inspection/expanded/runs/03/diagnostic.json \
  --baseline packages/knowledge/evaluation/inspection/expanded/baseline.json
```

## 프롬프트 버전 3

[프롬프트](../../../src/adapters/inspection.ts)에 정의가 없는 공통 주제의 참조는 uncertain, 독립적인 요구 사항이나 명시적으로 겹치지 않는 조건은 unrelated라는 지침을 추가했다. 요구 사항을 명시하지 않는 것은 금지가 아니라는 점도 구분했다. 특정 문서명·정책명 예외는 없다. [캐시 버전](../../../src/inspection/pairs.ts)은 3으로 올렸으며, golden과 버전 2 기준선은 변경하지 않았다.

2026-09-06에 같은 임시 저장소·원본·모델 digest·검사 예산으로 다시 실행했다. 각 캐시는 `/private/tmp/knowledge-expanded.ZZPA5Q-prompt-3-01`, `-02`, `-03`으로 분리했다. 다음 결과는 버전 2 [기준선](baseline.json)과 비교한다.

| 회차 | 진단 원본                                | 비교 결과                            | 전체 선택 | 중복·충돌 정답 선택 | 정답 일치     | 캐시 재사용 |
| ---- | ---------------------------------------- | ------------------------------------ | --------- | ------------------- | ------------- | ----------- |
| 1    | [진단](runs/prompt-3/01/diagnostic.json) | [비교](runs/prompt-3/01/report.json) | 55/55     | 6/6                 | 14/16 (87.5%) | 0           |
| 2    | [진단](runs/prompt-3/02/diagnostic.json) | [비교](runs/prompt-3/02/report.json) | 55/55     | 6/6                 | 14/16 (87.5%) | 0           |
| 3    | [진단](runs/prompt-3/03/diagnostic.json) | [비교](runs/prompt-3/03/report.json) | 55/55     | 6/6                 | 14/16 (87.5%) | 0           |

세 회차 모두 정상 종료했고 오류와 기준선 대비 회귀가 없었다. 정답·원본 해시와 선택 쌍, 모델 digest, 검사 예산이 기준선과 일치함을 확인했다. 전체 55쌍의 분류가 이번 세 회차에서도 모두 같았다. 정확도는 정답이 있는 16쌍만 계산했다.

| 사례                        | 승인 정답 | 버전 2    | 버전 3    |
| --------------------------- | --------- | --------- | --------- |
| bilingual-undefined-policy  | uncertain | unrelated | uncertain |
| production-undefined-policy | uncertain | unrelated | uncertain |
| staging-undefined-policy    | uncertain | unrelated | unrelated |
| complementary-audit         | unrelated | conflict  | conflict  |

남은 오분류도 세 회차에서 반복됐다. staging 사례는 정책의 적용 범위를 몰라 비교하기 어렵다고 설명하면서 unrelated로 분류했다. 감사 로그 사례는 원문에 없는 비순차 실행 가능성을 가정해 conflict로 분류했다. 이번 지침 변경은 2쌍을 개선했지만 이 2쌍을 해결하지 못했다. 후속 개선은 이 실패 기록을 기준으로 검증해야 한다.

기존 승인 4쌍도 [새 실제 모델 실행](../runs/prompt-3/diagnostic.json)으로 4/4를 유지했다. [버전 2 대비 비교](../runs/prompt-3/report.json)에 회귀가 없고 캐시 재사용은 0건이다. 단위 테스트 315개와 타입·lint 검사는 통과했다. 단위 테스트는 전송 지침과 캐시 분리 등을 검증하며 위 모델 품질을 증명하지 않는다. 이 자료는 개선에 사용한 작은 평가 자료이므로 보지 않은 업무 문서의 정확도를 나타내지 않는다.

## 후보 버전 4: 회귀로 미채택

2026-09-06에 대상 차이 → 정의·범위 부족 → 분리된 조건·독립적인 요구 → 같은 요구 → 양립 불가능한 요구 순서로 먼저 해당하는 기준을 적용하도록 실험했다. [후보 소스와 해시](runs/prompt-4/policy.json)를 보존했다. 현재 소스는 이 후보가 아니라 버전 3이다. 이후 다른 후보에는 버전 4를 재사용하지 않는다.

모델 digest·정답·원본 해시·선택 쌍·검사 예산은 버전 3과 같았다. 캐시는 `/private/tmp/knowledge-expanded.ZZPA5Q-prompt-4-01`, `-02`, `-03`으로 분리했다.

| 회차 | 진단 원본                                | 버전 3 대비 평가                     | 정답 일치   | 중복·충돌 정답 선택 | 캐시 재사용 |
| ---- | ---------------------------------------- | ------------------------------------ | ----------- | ------------------- | ----------- |
| 1    | [진단](runs/prompt-4/01/diagnostic.json) | [비교](runs/prompt-4/01/report.json) | 12/16 (75%) | 6/6                 | 0           |
| 2    | [진단](runs/prompt-4/02/diagnostic.json) | [비교](runs/prompt-4/02/report.json) | 12/16 (75%) | 6/6                 | 0           |
| 3    | [진단](runs/prompt-4/03/diagnostic.json) | [비교](runs/prompt-4/03/report.json) | 12/16 (75%) | 6/6                 | 0           |

세 회차 모두 오류 없이 전체 55쌍을 분류했으며 모든 쌍의 분류가 반복 실행 간 일치했다. 하지만 버전 3 대비 `bilingual-undefined-policy`, `production-undefined-policy`가 uncertain에서 unrelated로 회귀했다. 기존 `staging-undefined-policy`와 `complementary-audit` 오분류도 해결하지 못했다. 정답 일치율이 12.5%p 낮아져 후보를 제외하고 버전 3의 프롬프트와 캐시 버전을 복원했다. 정답이나 이전 결과는 바꾸지 않았다.

기존 4쌍 자료의 [최초 진단](../runs/prompt-4/diagnostic.json)은 1쌍에서 `inspection-pair-unavailable`이 발생해 partial이었다. 평가 실행기가 이를 거부했으므로 최초 실행의 정확도는 계산하지 않았다. 같은 캐시로 실패한 쌍을 한 번 [재시도](../runs/prompt-4/retry/diagnostic.json)한 결과는 complete이며, [평가](../runs/prompt-4/retry/report.json)는 4/4·회귀 없음이다. 재시도는 9쌍의 캐시를 사용했으므로 캐시 없이 완주한 단일 실행으로 해석하지 않는다.

이번 실험은 순서형 지침만으로 남은 2쌍을 해결하지 못했다. 다음 후보를 진행하더라도 버전 3을 비교 기준으로 유지하고, 현재 자료에 대한 반복 조정 결과와 별도 업무 문서의 검증을 구분한다.

버전 3 복원 후 테스트 315개·타입·lint·포맷 검사는 통과했다. 추가 실환경 재확인 시 임시 저장소 `/private/tmp/knowledge-expanded.ZZPA5Q`와 버전 3 캐시 경로가 존재하지 않아 `repository-or-config-unavailable`이 발생했다. 따라서 복원 후 캐시 재실행은 검증하지 못했다. 위 모델 평가 결과는 파일로 보존된 실행 기록이며, 다시 실행하려면 별도 저장소와 색인을 준비해야 한다.
