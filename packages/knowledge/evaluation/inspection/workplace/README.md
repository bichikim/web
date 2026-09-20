# 업무 문서 검증

사용자 승인에 따라 기본 동작은 버전 3으로 복원했다. 후보 6의 구현·평가 기록은 보존하고, 분류·근거 분리 후보 7 (로컬 보관: `.local/evaluation/inspection/runs/prompt-7/README.md`)을 별도 평가한다. 아래 후보 3·4·5·6 기록은 과거 실행 이력이며 채택 상태는 이 문단과 후보 7 기록을 기준으로 본다.

연속 인용 지침을 추가한 후보 버전 5 (로컬 보관: `.local/evaluation/inspection/workplace/runs/prompt-5/README.md`)도 업무 문서 3회에서 같은 오류가 발생했고 합성 자료가 회귀해 채택하지 않았다. 당시 실행 프롬프트를 버전 3으로 복원했으며 정상 기준선은 없었다.

후속 원시 응답 재현 (로컬 보관: `.local/evaluation/inspection/workplace/investigation/README.md`)에서 태그 비교 인용에 원문에 없는 `...`가 삽입되는 문제를 확인했다. 원래 평가 결과는 여전히 partial이며, 정상 기준선을 새로 만들지 않았다.

현재 저장소의 실제 문서 3개에서 8개 문단·목록 항목을 발췌한 [정답 8쌍](golden.json)을 사용자가 2026-09-06에 승인했다. 승인 전 [초안](draft.json)은 보존한다. 프롬프트는 버전 3을 유지한다. 기존 합성 16쌍의 문장을 변형하거나 분류 결과에 맞춰 원문을 만들지 않았다.

## 출처와 범위

- [패키지 릴리스 계획](../../../../../docs/package-release.md): 40, 72, 73행
- [릴리스 설명서](../../../../../RELEASE.md): 130, 168, 178행
- [Pomo 원격 함수 계획](../../../../../apps/pomo/docs/plan/development/remote-functions.md): 33, 34행

[provenance.json](provenance.json)에 발췌 당시 커밋, 파일 경로·행 번호, 전체 파일과 발췌문의 SHA-256, 원문을 보존했다. 본문은 해당 행을 그대로 사용하고, 문맥을 나타내는 제목과 색인용 메타데이터만 추가했다. 출처 문서는 변경하지 않았다. 이 평가는 문서에 명시된 요구의 관계를 비교하며, 계획이 실제 배포 환경에 구현됐음을 검증하는 작업은 아니다.

독립적인 요구 사항도 같은 업무 주제 안에서 함께 지킬 수 있으면 unrelated로 제안했다. 중복은 부연 설명의 양이 아니라 핵심 요구가 같은지를 기준으로 제안했고, 사용자가 이 기준과 각 쌍을 승인했다.

## 승인된 8쌍

| 번호 | 원문 발췌 비교                                                                                                       | 제안 정답 | 검토 근거                                                                                               |
| ---- | -------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| 1    | [계획의 patch](repository/docs/patch-plan.md) ↔ [설명서의 patch](repository/docs/patch-guide.md)                     | duplicate | 소스 변경 없이도 더 높은 patch를 배포한다는 핵심 규칙이 같다. 설명서에는 metadata 변경의 예가 추가된다. |
| 2    | [계획의 버전 미변경](repository/docs/unchanged-plan.md) ↔ [설명서의 버전 미변경](repository/docs/unchanged-guide.md) | duplicate | 버전을 올리지 않으면 소스·dependency 변경만으로 배포하지 않는다. 설명서는 빌드 설정·README도 열거한다.  |
| 3    | [계획의 태그](repository/docs/tags-plan.md) ↔ [설명서의 태그](repository/docs/tags-guide.md)                         | duplicate | 태그는 배포 트리거가 아닌 소스 기록이며 이동·덮어쓰지 않는다는 핵심 규칙이 같다.                        |
| 4    | [patch 배포](repository/docs/patch-guide.md) ↔ [태그 기록](repository/docs/tags-guide.md)                            | unrelated | 배포 자격과 배포 기록의 관리 규칙은 독립적이며 함께 지킬 수 있다.                                       |
| 5    | [버전 미변경](repository/docs/unchanged-guide.md) ↔ [태그 기록](repository/docs/tags-guide.md)                       | unrelated | 미배포 조건과 태그 관리 의무는 같은 릴리스 업무의 별도 요구다.                                          |
| 6    | [일반 웹 Origin](repository/docs/web-origin.md) ↔ [토스 Origin](repository/docs/toss-origin.md)                      | unrelated | 같은 서버 함수 주소라도 적용 클라이언트가 명시적으로 다르다.                                            |
| 7    | [patch 배포](repository/docs/patch-guide.md) ↔ [일반 웹 Origin](repository/docs/web-origin.md)                       | unrelated | 패키지 릴리스와 서버 함수 호출 주소는 별도 대상이다.                                                    |
| 8    | [태그 기록](repository/docs/tags-guide.md) ↔ [토스 Origin](repository/docs/toss-origin.md)                           | unrelated | 배포 기록과 클라이언트 호출 주소는 별도 대상이다.                                                       |

duplicate 3쌍, unrelated 5쌍이다. 이 묶음에는 conflict·uncertain 사례와 한영 비교가 없으므로 네 분류 전체나 일반적인 업무 문서 정확도를 대표하지 않는다. 기존 프롬프트 조정에 사용하지 않은 자료지만 작성자가 선정한 작은 검증 초안이며, 독립적인 대규모 평가로 간주하지 않는다. 문서 발췌를 비교하므로 문서 전체를 읽었을 때의 판단과 다를 수 있다.

## 자료 검증과 실행 환경

실제 [색인 준비 경로](../../../src/indexing/prepare.ts)로 발췌 8개를 파싱하고 정답의 docId·unitId·contentHash를 생성했다. 평가 실행기의 정답 검증 단계도 통과했다. 이는 원본 연결·구조 검증이며 모델 품질 검증이 아니다.

승인 기록은 golden에 저장했다. [repository](repository) 사본을 `/private/tmp/knowledge-workplace.GHDWKr`의 별도 Git 저장소 main 브랜치로 준비했다. commit은 `cbc9d995710de945bd82393081326d867a780ae1`이다. Docker가 중지돼 최초 색인이 연결 오류로 실패했으나 Docker Desktop과 기존 `knowledge-local-qdrant-1`을 시작한 뒤 문서 8개·point 8개를 오류 없이 색인했다. web 저장소 안의 이 폴더를 그대로 색인하지 않는다. 임시 저장소는 없어질 수 있으므로 이 발췌 사본과 출처 기록을 재현의 기준으로 삼는다.

버전 3과 모델 digest를 고정하고 `--limit 100`으로 실행했다. 회차별 새 캐시로 3회 실행하고 실패한 쌍을 같은 캐시에서 각각 한 번 재시도했다. 모든 실행이 partial이므로 이번에는 정확도와 기준선을 생성하지 않았다. 정상 완료 이후에도 정확도 분모는 승인된 8쌍이며 정답 없는 20쌍은 제외한다. 기존 합성 자료와 scope·정답이 다르므로 직접 기준선 비교하지 않는다. 모델 출력에 맞춰 정답을 바꾸지 않는다.

## 실행 결과: 응답 검증 실패

[실행 요약](summary.json)에 세 회차와 재시도 결과를 모았다. 모델은 `gemma4:latest`, digest는 `c6eb396dbd5992bbe3f5cdb947e8bbc0ee413d7c17e2beaae69f5d569cf982eb`이다. 모든 실행에서 모델·원본 목록·내용 해시가 일치했고 검색 오류 없이 28쌍을 선택했다. 그중 27쌍의 응답을 수락하고 1쌍을 거부했다. 이는 정답률 27/28이라는 뜻이 아니다.

| 회차 | 최초 실행                                                                          | 최초 캐시 사용 | 재시도                                                                                   | 재시도 캐시 사용 | 결과         |
| ---- | ---------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------- | ---------------- | ------------ |
| 1    | 진단 (로컬 보관: `.local/evaluation/inspection/workplace/runs/01/diagnostic.json`) | 0              | 진단 (로컬 보관: `.local/evaluation/inspection/workplace/runs/01/retry/diagnostic.json`) | 27               | 모두 partial |
| 2    | 진단 (로컬 보관: `.local/evaluation/inspection/workplace/runs/02/diagnostic.json`) | 0              | 진단 (로컬 보관: `.local/evaluation/inspection/workplace/runs/02/retry/diagnostic.json`) | 27               | 모두 partial |
| 3    | 진단 (로컬 보관: `.local/evaluation/inspection/workplace/runs/03/diagnostic.json`) | 0              | 진단 (로컬 보관: `.local/evaluation/inspection/workplace/runs/03/retry/diagnostic.json`) | 27               | 모두 partial |

캐시는 `/private/tmp/knowledge-workplace.GHDWKr-cache-01`, `-02`, `-03`이다. 각 진단 옆의 `execution.json`에 시작·종료 시각, 종료 코드와 캐시 경로를 기록했다.

여섯 실행 모두 `tag-equivalence`(릴리스 설명서와 계획의 태그 규칙)에서 `invalid-inspection-response`가 발생했다. 실제 색인 준비 경로의 point와 모델·프롬프트 버전으로 캐시 키를 재계산해 실패 쌍을 식별했다. 원시 모델 응답은 이 진단에 없으므로 어떤 응답 필드나 인용이 거부됐는지는 이 기록만으로 확정할 수 없다.

평가 실행기가 여섯 진단 모두 `invalid-inspection-diagnostic`으로 거부함을 확인했다. 실패 쌍을 누락하거나 검증을 완화해 정상 보고서를 만들지 않았으며, golden은 승인된 초안의 8쌍과 일치한다. 다음 작업은 해당 쌍의 실제 모델 응답과 검증 거부 원인을 재현해 확인하는 것이다. 프롬프트·검증 코드·정답은 이번 단계에서 변경하지 않았다.
