# 후보 7 CLI·doctor 통합 검증

기본값 combined(v3)을 유지하고 `--inspection-mode separated`를 지정한 경우에만 후보 7을 사용한다. 모델 없는 모드 지정, 알 수 없는 모드, 다른 명령에 모드를 지정한 입력은 거부한다. CLI에서 선택한 모드를 검사 실행기에 전달하며 보고서와 캐시 키 모두 같은 버전을 사용한다. 같은 디렉터리에서 v3과 v7의 캐시를 함께 사용해도 서로의 결과를 재사용하지 않는다. 후보 실패 시 기본 분류기로 전환하지 않는다.

[실행 코드](run.mjs)는 실제 CLI 프로세스에서 doctor → 같은 명령의 캐시 재사용 → eval-inspection을 순서대로 실행한다. 각 자료마다 새 캐시 디렉터리를 만들며 원본·정답·기존 기준선·색인은 변경하지 않는다. 이전 어댑터 단독 평가와 달리 저장소 파싱, Qdrant 상태·이웃 검색, 모델, 캐시, CLI 종료 코드와 오프라인 평가 경로를 포함한다.

## 실제 결과

| 자료 | 새 캐시 실행                                     | 캐시 재실행                        | 정답 평가                                        |
| ---- | ------------------------------------------------ | ---------------------------------- | ------------------------------------------------ |
| 합성 | [55쌍 완료](expanded/diagnostic.json), cached=0  | [55쌍 재사용](expanded/warm.json)  | [15/16, v3 대비 회귀 없음](expanded/report.json) |
| 기본 | [10쌍 완료](original/diagnostic.json), cached=0  | [10쌍 재사용](original/warm.json)  | [4/4, v3 대비 회귀 없음](original/report.json)   |
| 업무 | [28쌍 완료](workplace/diagnostic.json), cached=0 | [28쌍 재사용](workplace/warm.json) | [7/8, v6 대비 회귀 없음](workplace/report.json)  |

세 자료 모두 기본 doctor가 healthy이고 semantic은 complete였다. 검색·분류 오류는 없었으며 각 doctor·캐시 재실행·eval-inspection의 종료 코드는 0이었다. 각 디렉터리의 execution.json에 실제 인자·캐시 경로·시간을 남겼다. [교차 검증](verification.json)에서 같은 모델 digest·분리 어댑터 구현을 확인했고, 전체 93쌍의 분류가 이전 어댑터 단독 평가와 같았다.

합성 `complementary-audit`와 업무 `platform-origins`는 여전히 conflict로 틀렸다. 정답과 기존 기준선은 변경하지 않았다. 업무 자료에는 conflict·uncertain 정답이 없으므로 이 결과를 전체 업무 문서의 분류 정확도로 일반화하지 않는다.

모델 옵션 없는 [기본 doctor](base.json)도 healthy·exit 0이었고 semantic 필드가 없었다. 기본 자료의 최초 실행은 limit=100으로 실행해 limit=10 기준선과 비교가 거부됐다. [거부 기록](rejected-limit-100/README.md)을 보존하고, 평가 코드가 기준선의 limit을 읽도록 수정한 뒤 새 캐시로 다시 실행했다. 평가기 조건은 완화하지 않았다.

## 사용과 채택 상태

색인한 저장소에서 다음 명령으로 후보를 선택할 수 있다.

```sh
know doctor /path/to/repository --model gemma4:latest --inspection-mode separated --limit 10 --json
```

옵션을 생략하거나 combined를 지정하면 v3이다. v7을 기본값으로 승격하지 않았다. 후보를 사용할 수 있는 상태와 모든 정답을 맞히는 상태를 구분한다.

Wallaby 전체 335건과 패키지 타입·lint 검사를 통과했고 `pnpm format`을 적용했다. 옵션 파싱·전달, 모드별 캐시 분리·재사용, 잘못된 모드의 조기 거부, 후보 실패 시 캐시 미저장·기본 분류기로 미전환을 검사했다. 전역 `know --help`에서도 새 옵션을 확인했다.
