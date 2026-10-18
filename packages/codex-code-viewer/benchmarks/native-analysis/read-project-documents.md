# TS7 문서 열기와 프로젝트 준비 최적화

후속 [재조회 변경 확인 최적화](read-input-revisions.md)에서 파일 메타데이터 읽기를 개선하고 동일한 번들 실행 형태로 비교했다. 아래는 이전 회차 기록이다.

2026-10-14. TS7 실험의 중복 didOpen을 줄였다. 기존 TS6 제품 번들 해시는 이전 측정과 동일하다. 실제 모노레포 4개 조회는 세 방식의 파일·행·열 집합이 같았다. 독립 사례 23개에서 수정 전·후 TS7 모두 기대값과 일치했고, 최초·재조회·반복 결과도 같았다. [510개 위치 검증](results/2026-10-14/preparation/validation.txt), [원시 기록](results/2026-10-14/preparation/measured.jsonl), [환경·해시](results/2026-10-14/preparation/metadata.json).

## 변경

[문서 선택](read-project-documents.ts)은 각 tsconfig에서 실제 포함된 파일을 대표로 골라 프로젝트를 연다. 그 프로젝트들의 명시적 파일 목록에 이미 포함된 파일은 별도의 didOpen을 생략한다. 어느 열린 프로젝트에도 포함되지 않은 파일은 계속 개별로 연다. 대표 파일이 없는 설정은 포함 범위에 기여하지 않으므로, 그 설정의 파일 목록만 보고 소비자를 생략하지 않는다. 모듈 그래프나 이름 일치로 검색 범위를 추정하지 않는다.

기존 방식은 가장 가까운 tsconfig에서 제외된 파일을 모두 열었다. 실제 모노레포에서는 상위 프로젝트에 포함돼 이미 분석되는 파일도 다시 열렸다. TS7 LSP API나 서버 바이너리는 변경하지 않았고, 프로젝트별 별칭 설정을 합쳐 하나의 설정으로 바꾸지도 않았다. 원본·선언 연결과 CommonJS 별칭 검증은 그대로 수행한다.

getWindow 5회에서 검색 범위 6576파일, AST 593개, 별칭 후보 173개, 선언 연결 99개, 변경 확인 입력 23564개, 모듈 해석 호출 25892회와 재사용 11735회가 수정 전후 같았다. 세션의 최종 열린 문서는 463→126개다. [요약의 workspace 필드](results/2026-10-14/preparation/summary.json). 모노레포 4개 조회의 모든 반복에서 이 메타데이터 수치가 수정 전후 같은지도 검증했다.

## 준비 단계

이전 회차의 3378.648ms는 당시 값이다. 이번 회차의 수정 전도 더 빨랐으므로, 개선율은 같은 회차의 고정 클라이언트와 비교했다. getWindow 5회 중앙값이며 단위는 ms다.

| 단계                                                |  수정 전 |  수정 후 |
| --------------------------------------------------- | -------: | -------: |
| didOpen 송신                                        |   19.044 |    3.181 |
| 앞선 문서 처리·프로젝트 준비와 definition 응답 대기 | 2504.080 | 1905.931 |
| 범위 확장 후 원본 references                        |   97.434 |  110.429 |
| CommonJS 별칭 심볼 확인 전체                        |  441.468 |  197.502 |

준비 대기는 약 24% 줄었다. 서버 로그의 해당 구간에서도 didOpen은 매회 364→26개, handler 처리 시간 합의 중앙값은 2519.461→1908.448ms였다. [서버 로그 집계](results/2026-10-14/preparation/server-open.json). 남은 약 1.9초에는 필요한 프로젝트들의 최초 분석 비용이 들어 있다. 전체 파일의 텍스트/import 검사와 별칭·선언 검증은 생략하지 않았다.

## 실제 모노레포 성능

Node 24.15.0, TS7 7.0.2, TS6 런타임 6.0.3. 각 실행은 새 프로세스와 빈 CODEX_HOME을 사용한다. fileRevision/getWindow는 각각 5회, 나머지는 3회며 세 방식의 순서를 순환했다. Node 모듈 로딩과 사전 번들 준비는 제외하고 OS 파일 캐시는 비우지 않았다. 측정 중 실제 4개 조회가 끝날 때까지 저장소 파일 수정·포맷·테스트를 실행하지 않았다.

첫 결과는 비어 있지 않은 서버 배치를 받은 시각이며 브라우저 paint가 아니다. 재조회는 같은 세션에서 최초 완료 직후 같은 심볼을 요청한다. 단위 ms, 중앙값이다.

| 조회                       | 방식        |  첫 결과 | 전체 완료 |    재첫 |  재완료 |
| -------------------------- | ----------- | -------: | --------: | ------: | ------: |
| fileRevision 사용처 22개   | 기존 TS6    | 1149.160 |  7250.299 |  34.889 |  34.903 |
| fileRevision 사용처 22개   | 수정 전 TS7 |  300.251 |  4578.228 | 139.713 | 213.200 |
| fileRevision 사용처 22개   | 수정 후 TS7 |  302.437 |  3781.243 | 171.752 | 246.102 |
| getWindow 사용처 102개     | 기존 TS6    | 1106.707 |  6988.738 |  35.267 |  35.299 |
| getWindow 사용처 102개     | 수정 전 TS7 |  267.178 |  4690.650 | 139.284 | 273.849 |
| getWindow 사용처 102개     | 수정 후 TS7 |  261.772 |  3888.052 | 138.839 | 272.980 |
| 앱 getWindow 정의 1개      | 기존 TS6    |  606.374 |   642.618 |  22.664 |  22.674 |
| 앱 getWindow 정의 1개      | 수정 전 TS7 |  346.076 |   374.416 |  23.850 |  43.278 |
| 앱 getWindow 정의 1개      | 수정 후 TS7 |  351.954 |   385.410 |  29.117 |  50.952 |
| JS compareFiles 사용처 6개 | 기존 TS6    | 1079.843 |  7297.166 |  37.050 |  37.062 |
| JS compareFiles 사용처 6개 | 수정 전 TS7 | 1183.038 |  5001.070 | 139.047 | 213.896 |
| JS compareFiles 사용처 6개 | 수정 후 TS7 | 1162.566 |  4077.735 | 171.266 | 246.916 |

TS7 전체 완료는 fileRevision 17.4%, getWindow 17.1%, JS 18.5% 줄었다. 첫 결과는 거의 같으며, 정의 단독 조회는 약 11ms 느렸다. 이 변경은 첫 결과 이후의 준비 비용을 줄이는 변경이다.

재조회는 getWindow가 거의 같고, fileRevision과 JS는 약 33ms 느렸다. fileRevision의 첫 변경 확인 단계 중앙값은 77.170→113.820ms였고, 네이티브 references 응답 시간은 61.365→58.091ms였다. 로그가 증명하는 추가 대기는 변경 확인 단계이며, GC나 OS 스케줄링 중 어느 것이 원인인지는 이번 계측으로 확정하지 않는다. 기존 TS6 완료 캐시의 재조회는 약 35–37ms로 여전히 더 빠르다. TS7에 완료 결과 캐시는 추가하지 않았다.

## 정확도와 변경 검증

23개 독립 사례에는 별칭 재내보내기, 소비자별 paths, 패키지 밖·include 밖 소비자, .d.ts map/source/types 연결, project references, CommonJS 불변 별칭·동적 import·주석, 같은 이름의 다른 심볼·가려짐·재할당 이후 호출, 조건부 .mts/.cts 선언 연결이 들어 있다. 이번에는 상위 프로젝트에 포함되지만 하위 설정에서는 제외된 소비자와 두 프로젝트에서 서로 다른 @public을 해석하는 사례를 추가했다. [입력·독립 기대값](results/2026-10-14/preparation/fixtures.json), [실제 입력 보관](results/2026-10-14/preparation/fixture-inputs.tar.gz).

TS7 수정 전후 모두 위 기대값과 일치했다. 기존 TS6에는 차이가 남는다. 복합 CommonJS 사례에서 자기 정의 1곳이 사용처에 추가되고, 새 중첩 프로젝트 사례에서는 소비자 사용처 3곳이 빠지며 그 소비자의 정의는 다른 원본을 반환한다. 이 세 조회 차이는 검증 결과에 명시했고, 기존 방식 유지 조건에 따라 제품 코드는 변경하지 않았다. 따라서 모든 fixture의 TS6 결과까지 일치한다고 주장하지 않는다.

[프로젝트 포함 변경 검사](verify-preparation.ts)는 최초/재조회, 닫힌 포함 파일 편집·복원, 상위 include 제거·복원의 6개 검사를 통과했다. [결과](results/2026-10-14/preparation/coverage-invalidation.txt). 기존 compiler paths 변경, 닫힌 파일 편집, 파일 추가·삭제, 선언 맵 원본/정의 목적지 변경, 오래된 source 거부의 8개 검사도 통과했다. [결과](results/2026-10-14/preparation/invalidation.txt). 관련 단위 테스트 22개, 변경 파일 타입 검사·oxlint·루트 pnpm format을 통과했다. [Wallaby](results/2026-10-14/preparation/units.txt), [타입 검사](results/2026-10-14/preparation/types.txt), [oxlint](results/2026-10-14/preparation/lint.txt), [포맷](results/2026-10-14/preparation/format.txt).

검증 범위는 실제 4개 심볼과 위 사례다. 검색 중 변경·취소·편집 초안·익명 default·모든 외부 설정 조합은 검증하지 않았다. 네이티브 내부 partial 위치 배치는 0회이며 기존 실험의 단계별 합치기를 유지한다.

## 재현

[이전 실험 준비 절차](README.md)에 따라 별도 폴더에 기존 TS6 번들과 manifest를 만든다. 수정 전 TS7은 [고정 번들](results/2026-10-14/preparation/baseline-client.tar.gz)의 before/measure.mjs를 사용한다. 이전 expansion의 baseline은 더 오래된 클라이언트이므로 이번 기준으로 대신 사용하면 안 된다. 패키지 디렉터리에서 실행한다.

```sh
tar -xzf benchmarks/native-analysis/results/2026-10-14/preparation/baseline-client.tar.gz -C /tmp/native-preparation
node --import tsx benchmarks/native-analysis/create-fixtures.ts > /tmp/native-preparation/fixtures.json
python3 benchmarks/native-analysis/run-preparation.py /tmp/native-preparation measured
python3 benchmarks/native-analysis/validate-preparation.py /tmp/native-preparation
node --import tsx benchmarks/native-analysis/verify-preparation.ts /absolute/path/to/tsc
node --import tsx benchmarks/native-analysis/verify-linking.ts /absolute/path/to/tsc
```

측정 파일은 새 출력 폴더에서 생성한다. [프로토콜 로그](results/2026-10-14/preparation/protocol-logs.tar.gz)와 source-inputs 아카이브도 같은 results 폴더에 보관했다.
