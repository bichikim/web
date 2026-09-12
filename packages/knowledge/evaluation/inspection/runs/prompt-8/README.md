# 보조 문맥 재판정 검증

2026-09-07, 로컬 `gemma4:latest`(digest `c6eb396dbd5992bbe3f5cdb947e8bbc0ee413d7c17e2beaae69f5d569cf982eb`)로 실행했다. 기본 combined v3과 separated v7은 변경하지 않았다.

## 실제 문서 두 사례 — 어댑터 실험

[승인 자료](../../operations/reviewed.json)의 1·2번을 사용했다. 두 발췌와 정답은 그대로 두고, [기존 출처 기록](../../operations/provenance.json)의 원본 파일을 읽어 SHA-256이 같은지 확인한 뒤 실제 파서로 문단을 분해했다. 이 실험에서만 원본 문단을 각 발췌의 문서 ID에 연결해 보조 문맥으로 전달했다. Qdrant에 새 원본을 색인하거나 CLI가 원본 경로를 자동 발견한 결과가 아니다. 초기·최종 입력 및 결과는 사례별 디렉터리에 보존했다.

| 사례             | 발췌만 본 초기 판정 | 보조 문맥을 읽은 모델 제안 | 최종 결과 | 미해결 조건 |
| ---------------- | ------------------- | -------------------------- | --------- | ----------- |
| 1 저장 수단      | unrelated           | unrelated                  | uncertain | 3개         |
| 2 자동 정리 범위 | unrelated           | conflict                   | uncertain | 3개         |

각 사례에서 보조 unit 6개를 읽었으나 적용 범위·정의·예외가 해결되지 않았다. 따라서 미해결 조건이 있으면 uncertain으로 처리하는 규칙을 적용했다. 최종 두 결과는 승인한 정답에 모두 포함된다. **표본 2개이며 문맥 추가로 모델의 이해가 개선됐다는 증거는 아니다.** 단정적인 모델 제안과 미해결 조건이 함께 나왔을 때 불확실성을 유지하는 동작을 확인했다.

- 1번: [고정 입력](storage-backend/input.json), [최종 결과](storage-backend/result.json).
- 2번: [고정 입력](cleanup-scope/input.json), [최종 결과](cleanup-scope/result.json).
- 초기 구현의 거부 결과는 각 `rejected.json`에 보존했다. [1번 원시 요청·응답](storage-backend/trace.json)에서 모델이 미해결 질문을 남기면서 unrelated를 반환한 것을 확인했다. 이를 회귀 테스트로 추가하고 모델 제안은 `review.proposed`, 정책을 적용한 최종 결과는 `assessment`로 구분했다. 인용과 출처 검증은 유지한다.

## 실제 CLI와 캐시

기존 11개 발췌 저장소에서 `know doctor --inspection-mode contextual --model gemma4:latest --limit 1 --json`을 새 캐시로 실행한 뒤 동일 명령을 다시 실행했다. [첫 실행](cli/cold.json)·[재실행](cli/warm.json) 모두 exit 0, 기본 healthy, semantic complete, 오류 0이며 cached는 0 → 1이었다. 실제 인자와 진단 JSON을 함께 저장했다.

선택된 쌍은 lifecycle ↔ persistence였다. 이 저장소는 발췌를 독립 문서로 저장했고 연결 관계가 없어 보조 문맥 0개였다. 그 경우 미해결 질문을 유지하고 uncertain을 반환했다. 위의 원본 문맥 실험과 다른 검증이며 정확도 평가로 해석하지 않는다. 실제 사용 시 주변·연결 문서까지 색인해야 한다.

## 자동 검증

Wallaby 패키지 전체 364개 테스트가 통과했다. 문맥 수집의 repo/workspace·상태 격리, 직접 관계, 길이 제한, 원문 인용, 미해결 조건, 모델 변경, 출처 변경에 따른 캐시 무효화와 기존 모드 호환성을 검사했다. 타입 검사·oxlint·포맷도 통과했다. 인용 내용이 판단을 논리적으로 뒷받침하는지까지 자동 검증하는 것은 아니다.
