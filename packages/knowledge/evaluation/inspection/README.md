# 진단 평가

[실사용 문서 14쌍](operations/README.md)에 사용자 의견을 반영했다. 1번은 conflict·uncertain 복수 정답, 2번은 uncertain 승인이다. 3번 잠정 동의·4번 의견·나머지 미검토는 채점에서 제외한다. 기존 golden이나 기본 분류 모드는 바꾸지 않는다.

보조 문맥 모드 v8 검증 (로컬 보관: `.local/evaluation/inspection/runs/prompt-8/README.md`)을 추가했다. 실제 원본 문맥을 붙인 1·2번은 미해결 조건이 남아 최종 uncertain이었으며, 모델의 제안과 코드가 보정한 결과를 구분해 기록했다. 기존 정답·보고서는 변경하지 않았다.

## 부분 검토와 복수 정답

`version: 2`, `kind: reviewed` 자료는 항목별 `proposal`에 최초 제안을 보존하고 `review`에 검토 결과를 기록한다. `approved`만 `accepted` 정답 배열과 `note`, `reviewer`, `reviewedAt`을 가진다. `tentative`(잠정 동의)와 `commented`(의견)는 `note`만 기록하고, `unreviewed`는 미검토 상태다. 승인에 붙은 복수 정답은 보류가 아니며 허용한 답 중 하나면 정답이다.

v2 보고서는 승인 수(`approvedCases`)와 제외 수(`excludedCases`)를 표시한다. 미승인 항목은 `outcome: excluded`, `expected: []`이며 정답률·회귀 판정에서 제외한다. 승인됐지만 모델이 선택하지 않은 항목은 `not-selected`로 구분한다. 분류 정확도의 분모는 모델이 선택한 승인 항목이다. `provisional: false`는 승인된 정답만 채점한다는 뜻이지 모든 항목의 승인을 뜻하지 않는다.

후보 선택 비율은 허용한 답이 **모두 duplicate 또는 conflict인 항목**만 대상으로 한다. conflict·uncertain 복수 정답처럼 충돌인지 확정되지 않은 항목은 그 분모에 넣지 않는다. 대상이 없으면 `null`(CLI에서는 n/a)이다. 정답이 없거나 미승인인 모델 응답은 `unlabelledAssessments`에 포함한다.

기존 v1 draft·golden과 저장된 기준선은 계속 읽을 수 있다. v2 기준선은 동일한 검토 자료로 만든 v2 보고서끼리 비교한다. 허용 정답의 순서는 무관하지만 정답·검토 상태·기록이 바뀌면 기존 기준선과 비교하지 않는다. 모델 결과에 맞춰 정답을 자동 변경하지 않는다.

사용자 승인에 따라 기본 동작은 버전 3으로 복원했다. 후보 6의 구현·평가 기록은 보존하고, 분류·근거 분리 후보 7 (로컬 보관: `.local/evaluation/inspection/runs/prompt-7/README.md`)을 별도 평가한다. 아래 후보 3·4·5·6 기록은 과거 실행 이력이며 채택 상태는 이 문단과 후보 7 기록을 기준으로 본다.

연속 인용 후보 버전 5 실험 (로컬 보관: `.local/evaluation/inspection/workplace/runs/prompt-5/README.md`)은 업무 문서 오류 지속과 합성 자료 회귀로 미채택했다. 현재 실행 버전은 3이며 업무 문서의 정상 기준선은 없다.

사용자가 [실제 업무 문서의 정답 8쌍](workplace/README.md)을 승인했다. 별도 scope의 버전 3 실행에서 같은 태그 비교 응답이 3회와 각 재시도 모두 검증에 실패했다. 모든 진단이 partial이라 정확도·기준선은 생성하지 않았고, 실행 기록을 해당 문서에 보존했다.

후보 버전 4는 확장 평가가 12/16으로 회귀해 제외했고 현재 버전 3을 유지한다. 기존 자료에서 발생한 부분 실패와 재시도 결과도 [확장 평가 문서](expanded/README.md)에 구분해 기록했다.

사용자가 [확장 정답 16쌍](expanded/README.md)을 승인했다. 별도 scope의 캐시 분리 3회 평가에서 버전 2는 매회 12/16, 버전 3은 매회 14/16쌍이 정답과 일치했다. 버전 3에서도 같은 2쌍이 틀렸다. 상세 결과와 남은 개선 대상은 확장 평가 문서에 기록했다.

[golden.json](golden.json)은 2026-09-06에 사용자가 원문과 분류 기준을 검토하고 승인한 4쌍의 정답이다. 정의가 없는 정책 R은 같은 주제라도 일치·충돌 여부를 결정할 정보가 부족하므로 uncertain으로 확정했다. 승인 전 [draft.json](draft.json)과 잠정 [report.json](report.json)은 이력으로 보존한다.

| 사례                 | 비교                           | 승인 정답 |
| -------------------- | ------------------------------ | --------- |
| same-concurrency     | 단일 refresh 요청과 순차 실행  | duplicate |
| opposite-concurrency | 순차 실행과 동시 실행 의무     | conflict  |
| different-domains    | refresh 동시성과 환불 승인     | unrelated |
| undefined-policy     | 순차 실행과 정의가 없는 정책 R | uncertain |

검토한 정답만 별도 파일에 `kind: golden`과 `review: {reviewer, reviewedAt}`을 기록한다. 이 메타데이터는 검토 기록이며 신원 인증 수단은 아니다. 정답이나 승인 상태를 바꾸면 기존 평가 기준선과 비교할 수 없다. 현재 파일을 자동 승인하거나 모델 출력에 맞춰 정답을 수정하지 않는다.

## 기록된 결과로 평가

저장소 루트에서 다음 명령을 실행한다. Qdrant나 Ollama에 접속하지 않는다.

```sh
know eval-inspection packages/knowledge/evaluation/inspection/golden.json \
  --report packages/knowledge/evaluation/inspection/diagnostic.json \
  --baseline packages/knowledge/evaluation/inspection/baseline.json
```

`--json`으로 전체 결과를 출력하고, `--output 새파일.json`으로 저장할 수 있다. 기존 파일과 symlink는 덮어쓰지 않는다. 평가 실패나 기준선 대비 회귀는 종료 코드 1이다. 기준선 없이 실행한 종료 코드 0은 평가 실행 완료이지 정확도 기준 통과가 아니다.

- `candidateSelectionRecall`: 정답이 duplicate/conflict인 쌍 중 분류 대상으로 선택된 비율이다. 기준 unit·이웃 수·쌍 수 제한이 모두 영향을 주므로 순수 이웃 검색 recall이나 전체 corpus recall이 아니다.
- `classificationAccuracy`: 선택되어 분류된 정답 쌍 중 정답과 일치한 비율이다. 미선택 쌍은 이 분모에 넣지 않고 `not-selected`로 표시한다. 분모가 없으면 `null`이다.
- `unlabelledAssessments`: 정답이 없는 진단 쌍 수다. 정답이 없으므로 정확도에 포함하지 않는다. 4쌍 초안 결과를 일반적인 분류 정확도로 해석하지 않는다.
- 기준선은 같은 정답 해시·scope·active 원본 목록 및 내용 해시·검사 예산이어야 한다. 저장된 개별 결과와 지표를 재계산해 검증한다. 이전에 선택된 쌍의 미선택 또는 맞혔던 쌍의 오분류를 회귀로 표시한다. 모델·digest·프롬프트 버전은 결과에 기록되며 변경 전후 비교가 가능하다.
- 기본 진단이 실패했거나 선택 진단이 partial/unavailable이면 평가하지 않는다. 정답에 있는 unit이 색인 목록에서 없거나 해시가 달라도 실패한다. `sourceUnits`와 `limit`가 없는 이전 버전 진단은 다시 수집한다.

## 실제 실행 기록

2026-09-06에 원본 사본을 별도 임시 Git 저장소 `/private/tmp/knowledge-evaluation.eLR4PC`의 `main` 브랜치에 넣고 색인했다. commit은 `710fdb2f6b1a3214ca96fac6e14d11bce28c1270`이다. 재현할 때도 [repository](repository)를 별도 Git 저장소로 초기화해야 한다. 이 폴더를 web 저장소 안에서 바로 색인하면 web의 Git root를 사용하므로 의도한 scope가 아니다.

```sh
know doctor /private/tmp/knowledge-evaluation.eLR4PC \
  --model gemma4:latest --limit 10 \
  --cache-dir /private/tmp/knowledge-evaluation.eLR4PC-cache --json
```

[diagnostic.json](diagnostic.json)은 이 실제 실행 결과다. 모델 digest와 원문 인용·설명이 포함되어 있다. [report.json](report.json)은 그 결과에 대한 **잠정 평가**이며 승인된 golden 기준선이 아니다. 중복·충돌 정답 쌍은 2/2 선택됐고, 정답 초안 4쌍 중 3쌍이 모델 분류와 일치했다. `undefined-policy`는 초안의 uncertain과 달리 모델이 conflict로 분류했다. 평가 실행기는 이 차이를 보고할 뿐 프롬프트·정답·원본 상태·검색 순위를 바꾸지 않는다.

자료 구조와 계산 계약은 [평가 코드](../../src/evaluation/inspection.ts)에 있다.

## 승인된 기준선

[baseline.json](baseline.json)은 승인된 golden 정답으로 기존 진단을 다시 평가한 결과다. 모델을 재실행하거나 정답을 모델에 맞추지 않았다. `provisional: false`이며 중복·충돌 쌍 선택은 2/2, 분류 일치는 3/4다. 정책 R 사례의 오분류는 이후 개선을 측정할 대상으로 남겼다. 정답 승인은 모델 품질에 대한 승인이 아니다.

## 프롬프트 버전 2 검증

비교에 필요한 정의·조건이 없으면 uncertain으로 판단하고, 명시적으로 양립 불가능한 주장만 conflict로 분류하도록 [프롬프트](../../src/adapters/inspection.ts)를 보완했다. 특정 문서명이나 정책 R에 대한 예외 처리는 넣지 않았다. [버전](../../src/inspection/pairs.ts)을 2로 올려 이전 분류 캐시와 분리했다.

동일 gemma4 digest·원본·검사 예산으로 실행한 새 진단 (로컬 보관: `.local/evaluation/inspection/runs/prompt-2/diagnostic.json`)과 비교 결과 (로컬 보관: `.local/evaluation/inspection/runs/prompt-2/report.json`)를 보존했다. 처음에는 캐시 사용 없이 10쌍을 분류했고 재실행에서는 새 캐시 10개를 사용했다. 중복·충돌 정답 쌍 선택은 2/2를 유지하며, 분류 일치는 3/4에서 4/4로 개선되고 회귀는 없었다. 정책 R 사례는 conflict에서 uncertain으로 바뀌었다. 기존 golden·기준선은 덮어쓰지 않았다.

```sh
know eval-inspection packages/knowledge/evaluation/inspection/golden.json \
  --report packages/knowledge/evaluation/inspection/runs/prompt-2/diagnostic.json \
  --baseline packages/knowledge/evaluation/inspection/baseline.json
```

단위 테스트는 전송 프롬프트와 캐시 분리 계약을 검사하며 모델의 분류 품질을 증명하지 않는다. 위 품질 수치는 실제 모델 실행으로 확인한 승인 4쌍에만 해당한다. 더 넓은 자료와 반복 실행에 대한 일반화 검증은 별도다.

## 프롬프트 버전 3 회귀 검증

정의가 없는 참조와 독립적인 요구 사항을 구분하도록 프롬프트를 보완한 뒤, 같은 원본·모델 digest·검사 예산으로 실제 진단 (로컬 보관: `.local/evaluation/inspection/runs/prompt-3/diagnostic.json`)을 새로 실행했다. 캐시 경로는 `/private/tmp/knowledge-evaluation.eLR4PC-prompt-3`이며 재사용은 0건이다. 전체 10쌍을 분류했고 승인 정답 4쌍을 모두 맞혔다. 비교 결과 (로컬 보관: `.local/evaluation/inspection/runs/prompt-3/report.json`)는 버전 2 결과를 기준으로 하며 회귀가 없다. 원래 golden·기준선과 버전 2 결과는 보존했다.
