# 실사용 문서 정답 검토

사용자 의견을 [검토 결과](reviewed.json)에 반영했다. **1·2번만 승인된 정답으로 채점한다.** 14개를 모두 검토할 필요는 없다. 기존 [정답 초안](draft.json)과 [제안 근거](review.json), golden·기준선은 이력으로 보존했다.

| 번호 | 검토 상태 | 반영 내용                                                                       | 채점 |
| ---- | --------- | ------------------------------------------------------------------------------- | ---- |
| 1    | 승인      | `conflict`와 `uncertain` 모두 정답. 보는 시각과 추가 정보에 따라 달라질 수 있음 | 포함 |
| 2    | 승인      | `uncertain`이 맞음                                                              | 포함 |
| 3    | 잠정 동의 | “3번도 음 맞을 듯”                                                              | 제외 |
| 4    | 의견 기록 | 충돌로 보일 수 있지만 추가 정보가 있으면 같은 이야기일 수 있음                  | 제외 |
| 5~14 | 미검토    | 개별 정답 승인 없음                                                             | 제외 |

1번은 판단을 미룬 것이 아니라 **복수 정답으로 검토를 마친 항목**이다. 4번의 의견을 임의로 `duplicate` 승인으로 바꾸지 않았다. `reviewedAt`은 이번 대화의 승인 내용을 파일에 기록한 시각이다.

[재채점 결과](reviewed-report.json)는 **승인된 2쌍 중 0쌍 정답**이다. 기존 모델 응답이 두 항목 모두 `unrelated`였기 때문이다. 나머지 12쌍은 오답이 아니라 채점 제외다. 모델을 다시 실행하거나 프롬프트를 바꾸지는 않았다. 표본 2쌍의 결과를 전체 품질로 일반화할 수 없다.

```sh
know eval-inspection packages/knowledge/evaluation/inspection/operations/reviewed.json \
  --report packages/knowledge/evaluation/inspection/operations/diagnostic.json
```

## 범위와 해석

현재 web 저장소의 Pomo 아키텍처·재생목록·피드·원격 함수·배포 계획과 RELEASE.md, 총 6개 실제 문서에서 11개 연속 구간을 발췌했다. [출처 기록](provenance.json)에 원본 경로·행·커밋·파일 해시·발췌문 해시와 본문을 보존했다. 본문은 바꾸지 않고 제목과 색인용 메타데이터만 추가했다. 원본 문서와 기존 평가 자료는 수정하지 않았다.

이 검토는 **문서 사이에 명시된 요구의 관계**를 판단한다. 문서 내용이 현재 코드·배포 환경에서 실행되는지 확인한 것은 아니다. 계획의 적용 계층·대상·예외가 불분명하면 uncertain으로 제안했다. 충돌 제안도 구현 버그나 어느 문서를 고쳐야 한다는 결론은 아니다.

전체 문맥은 [아키텍처](../../../../../apps/pomo/docs/plan/development/architecture.md), [음악 라이브러리](../../../../../apps/pomo/docs/plan/development/audio-library.md), [구독 피드](../../../../../apps/pomo/docs/plan/development/feed-dialogues.md), [원격 함수](../../../../../apps/pomo/docs/plan/development/remote-functions.md), [릴리스 설명서](../../../../../RELEASE.md), [빌드·플랫폼·검증](../../../../../apps/pomo/docs/plan/development/delivery-testing.md)에서 확인한다.

이전에 승인한 8쌍과 다른 발췌 묶음이다. 기존 자료와 주제가 일부 겹치며 작성자가 선정한 작은 표본이다. 전체 저장소를 색인하거나 모든 문서를 점검한 결과가 아니며 일반적인 품질을 대표하지 않는다.

## 최초 제안 14쌍 — 이력

아래 링크에서 양쪽 원문 발췌를 읽고 제안에 동의하는지 확인한다. 분류는 duplicate=핵심 요구가 같음, conflict=같은 적용 범위에서 양립할 수 없음, unrelated=독립적이거나 적용 대상이 다름, uncertain=필요한 정의·조건이 부족함이다.

| 번호 | 비교 원문                                                                                                              | 제안 정답 | 판단 근거                                                                                                                                          |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | [영속 저장 호환 계층](repository/docs/storage.md) ↔ [사용자 재생목록 저장](repository/docs/playlist.md)                | conflict  | 공통 표는 웹 구조화 데이터에 Dexie·IndexedDB를 지정하지만 사용자 재생목록은 localStorage를 지정한다. 재생목록이 공통 계약의 예외라는 설명은 없다.  |
| 2    | [영속 저장 정책](repository/docs/policy.md) ↔ [피드 대화 만료와 정리](repository/docs/expiry.md)                       | uncertain | 저장소의 자동 정리 금지와 피드 기능의 만료 정리는 적용 계층이 다를 수 있다. 저장소 정책이 기능별 삭제까지 금지하는지 두 발췌에는 정의돼 있지 않다. |
| 3    | [영속 저장 정책](repository/docs/policy.md) ↔ [피드 연결 설정](repository/docs/connections.md)                         | uncertain | 한쪽은 navigator.storage.persist를 금지하고 다른 쪽은 영속 저장 요청을 요구한다. 후자가 같은 API를 뜻하는지 명시돼 있지 않다.                      |
| 4    | [원격 함수 상태와 계약](repository/docs/remote.md) ↔ [원격 함수 공유 함수별 완료 조건](repository/docs/clients.md)     | conflict  | 상태 문단은 앱인토스와 데스크톱 모두 POMO_PUBLIC_ORIGIN을 사용한다고 하지만 완료 조건은 토스 번들의 서버 함수만 사용한다고 제한한다.               |
| 5    | [영속 저장의 의미](repository/docs/persistence.md) ↔ [음악 라이브러리 지속 저장의 의미](repository/docs/lifecycle.md)  | duplicate | 앱 재실행 후 유지하지만 사용자의 앱·사이트 데이터 삭제 뒤까지 보장하지 않는다는 핵심 의미가 같다. 음악 문서는 기기 간 동기화 미제공도 부연한다.    |
| 6    | [Pomo 배포 실패 복구](repository/docs/rollback.md) ↔ [Pomo 운영 배포와 복구](repository/docs/deployment.md)            | duplicate | Pomo 배포 실패 시 운영 도메인을 이전 상태로 유지·복구하고 먼저 배포한 Gateway도 기록된 이전 버전으로 되돌리는 핵심 복구 요구가 같다.               |
| 7    | [영속 저장 호환 계층](repository/docs/storage.md) ↔ [피드 연결 설정](repository/docs/connections.md)                   | unrelated | 플랫폼별 저장 수단과 피드 연결의 주소 검증·유지 요구는 별도 요구이며 함께 지킬 수 있다. 연결 문단은 웹 설정의 구체적인 저장 API를 지정하지 않는다. |
| 8    | [피드 연결 설정](repository/docs/connections.md) ↔ [피드 대화 만료와 정리](repository/docs/expiry.md)                  | unrelated | 연결 설정과 생성된 피드 음성은 다른 데이터다. 음성의 48시간 만료가 연결 설정을 삭제하지 않는다고 명시돼 있다.                                      |
| 9    | [영속 저장의 의미](repository/docs/persistence.md) ↔ [영속 저장 정책](repository/docs/policy.md)                       | unrelated | 재시작 후 유지·사용자 삭제 허용이라는 정의와 자동 정리 금지는 함께 지킬 수 있는 별도 규칙이다.                                                     |
| 10   | [사용자 재생목록 저장](repository/docs/playlist.md) ↔ [음악 라이브러리 지속 저장의 의미](repository/docs/lifecycle.md) | unrelated | 재생목록의 저장 수단·playback 상태 분리와 재실행·사용자 삭제 후 수명은 별도의 요구다.                                                              |
| 11   | [원격 함수 상태와 계약](repository/docs/remote.md) ↔ [Pomo 배포 실패 복구](repository/docs/rollback.md)                | unrelated | 클라이언트별 서버 호출 주소와 운영 배포 실패 복구는 별개 대상이다.                                                                                 |
| 12   | [영속 저장 호환 계층](repository/docs/storage.md) ↔ [영속 저장의 의미](repository/docs/persistence.md)                 | unrelated | 플랫폼별 저장소 선택과 영속성의 정의는 함께 지킬 수 있다. 같은 저장 주제라는 이유만으로 중복은 아니다.                                             |
| 13   | [음악 라이브러리 지속 저장의 의미](repository/docs/lifecycle.md) ↔ [피드 대화 만료와 정리](repository/docs/expiry.md)  | unrelated | 음악 라이브러리의 지속 저장과 생성된 피드 음성의 만료는 적용 대상이 다르다.                                                                        |
| 14   | [음악 라이브러리 지속 저장의 의미](repository/docs/lifecycle.md) ↔ [영속 저장 정책](repository/docs/policy.md)         | unrelated | 앱 삭제·사이트 데이터 삭제 뒤 미보존은 사용자 삭제에 관한 설명이다. 자동 정리 금지와 양립할 수 있다.                                               |

초안 분포는 duplicate 2쌍, conflict 2쌍, uncertain 2쌍, unrelated 8쌍이다. 분포를 맞추려고 원문을 만들거나 문장을 바꾸지 않았다.

## 먼저 확인할 해석

1. 재생목록을 공통 구조화 데이터 저장 규칙의 예외로 보아야 하나요?
2. 자동 정리 금지는 저장소 계층에만 적용되나요, 피드 기능에도 적용되나요?
3. 영속 저장 요청은 navigator.storage.persist 호출을 뜻하나요?
4. 완료 조건의 “만”은 데스크톱도 배제하는 표현인가요, 웹과 토스 비교에만 한정한 표현인가요?
5. 추가 동기화 설명이 있어도 핵심 지속 저장 정의가 같다고 볼까요?
6. 더 긴 배포 절차를 포함해도 동일 복구 규칙으로 볼까요?

1~4번은 문서 작성 의도에 따라 정답이 달라질 수 있는 검토 지점이다. 발췌에 없는 예외·계층 구분·API 매핑을 모델이나 작성자가 임의로 채우지 않는다. 의도된 예외가 있다면 그 근거와 함께 제안 정답을 수정한다.

특히 4번의 “서버 함수만”은 클라이언트 종류가 아니라 JS·CSS·이미지 같은 자산과 서버 함수의 구분을 뜻할 수도 있다. 뒤 항목이 자산의 내부 경로 유지를 언급하므로 이 해석도 확인해야 한다. 이 경우 데스크톱 포함과 충돌하지 않을 수 있다. 초안의 conflict 제안을 확정된 충돌로 읽지 않는다.

## 실행과 모델 비교

별도 임시 Git 저장소와 `demo/inspection-operations` 범위를 사용한다. [실행 조건](execution.json)과 [색인 결과](index.json)에 경로·새 캐시·모델 실행 전 초안 해시를 남겼다. 원본 저장소의 .knowledge.yml을 만들거나 기존 Qdrant 범위를 교체하지 않았다.

v7 separated와 limit=100으로 [실제 doctor](diagnostic.json)를 실행했다. 전체 55쌍을 새 캐시로 처리했으며 기본 진단 healthy, semantic complete, 검색·응답 오류 0건이었다. [잠정 평가](report.json)는 초안 14쌍 중 10쌍과 일치했다. 승인 전 일치율이며 모델의 정확도로 확정하지 않는다. 정답 없는 41쌍은 이 수치에서 제외한다. 실행은 1회이며 [완료 기록](completion.json)에 종료 코드와 지표를 남겼다.

| 번호 | 초안      | v7 결과   | 비교      |
| ---- | --------- | --------- | --------- |
| 1    | conflict  | unrelated | 검토 필요 |
| 2    | uncertain | unrelated | 검토 필요 |
| 3    | uncertain | unrelated | 검토 필요 |
| 4    | conflict  | conflict  | 일치      |
| 5    | duplicate | uncertain | 검토 필요 |
| 6    | duplicate | duplicate | 일치      |
| 7    | unrelated | unrelated | 일치      |
| 8    | unrelated | unrelated | 일치      |
| 9    | unrelated | unrelated | 일치      |
| 10   | unrelated | unrelated | 일치      |
| 11   | unrelated | unrelated | 일치      |
| 12   | unrelated | unrelated | 일치      |
| 13   | unrelated | unrelated | 일치      |
| 14   | unrelated | unrelated | 일치      |

### 초안과 다른 모델 설명

아래는 원시 응답의 한국어 요약이다. 원문 설명·원문 인용과 실제 좌우 순서는 [진단 JSON](diagnostic.json)에 보존했다.

**1번 — storage-backend**

모델 설명 요약: 플랫폼별 저장소 호환 계층과 재생목록의 저장 키·수단은 서로 다른 요구라고 판단했다.

초안 근거: 공통 표는 웹 구조화 데이터에 Dexie·IndexedDB를 지정하지만 사용자 재생목록은 localStorage를 지정한다. 재생목록이 공통 계약의 예외라는 설명은 없다.

**2번 — cleanup-scope**

모델 설명 요약: 피드 대화의 48시간 만료와 저장소의 자동 만료·정리 금지를 서로 다른 정책으로 판단했다.

초안 근거: 저장소의 자동 정리 금지와 피드 기능의 만료 정리는 적용 계층이 다를 수 있다. 저장소 정책이 기능별 삭제까지 금지하는지 두 발췌에는 정의돼 있지 않다.

**3번 — persist-request**

모델 설명 요약: 영속 저장 설정과 피드 연결 설정은 서로 다른 주제라고 판단했다.

초안 근거: 한쪽은 navigator.storage.persist를 금지하고 다른 쪽은 영속 저장 요청을 요구한다. 후자가 같은 API를 뜻하는지 명시돼 있지 않다.

**5번 — persistence-definition**

모델 설명 요약: 두 문서가 영속성을 설명하지만 재실행·정상 업데이트 조건과 “지속 저장”·“영속 저장”의 적용 범위를 더 확인해야 한다고 판단했다.

초안 근거: 앱 재실행 후 유지하지만 사용자의 앱·사이트 데이터 삭제 뒤까지 보장하지 않는다는 핵심 의미가 같다. 음악 문서는 기기 간 동기화 미제공도 부연한다.

## 추가 의견을 남기려면

추가 검토는 선택 사항이다. 채팅에 “3번 승인: uncertain” 또는 “4번 복수 정답: conflict, uncertain — 이유”처럼 번호와 허용할 정답을 알려주면 된다. 의견만 남길 때는 정답 승인과 구분해서 기록한다. 이번 수정은 평가 방식과 검토 기록에 한정하며 기본 분류 모드는 바꾸지 않는다.

[최초 자료 검증](validation.json)은 초안 작성 당시의 원본 파일·연속 발췌 해시, 모델 실행 이후 초안 불변, 발췌의 파싱 결과와 진단 sourceUnits의 일치를 기록한 이력이다.
