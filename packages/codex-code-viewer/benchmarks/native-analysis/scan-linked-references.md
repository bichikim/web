# TS7 범위 확장 계측과 메타데이터 최적화

후속 [문서 열기·프로젝트 준비 최적화](read-project-documents.md)에서 중복 didOpen을 줄였다. 아래는 그 변경 이전 회차의 보존 기록이다.

2026-10-14. 기존 TS6 제품 경로를 유지하고 TS7 실험만 수정했다. 실제 모노레포 4개 조회와 독립 사례 21개에서 최적화 전·후 TS7의 정확한 위치 집합이 같았다. 총 474개 기록의 최초·재조회·반복 결과도 안정적이었다. [위치 검증](results/2026-10-14/expansion/validation.txt), [원시 기록](results/2026-10-14/expansion/measured.jsonl), [요약](results/2026-10-14/expansion/summary.json).

## 3.3초 구간의 실제 병목

이전 계측의 `client.prepare()`는 didOpen 알림의 송신 완료까지 기다렸다. 서버가 모든 문서를 처리한 시점은 아니어서, 뒤이은 원본 references 시간에 앞선 문서 열기 대기가 포함됐다. [세부 계측](scan-linked-references.ts)은 알림 송신 후 원본 definition 응답을 추가 경계로 사용해 이 대기를 분리한다. TS7 7.0.2에서 실행한 측정이며 다른 LSP 구현의 처리 순서를 일반화하지 않는다.

최적화 전 세분화 프로브에서는 문서 열기 처리 대기 약 3176ms, 원본 재조회 121ms, 선언 후보 연결 0.36ms, 선언 심볼 확인 5.14ms, 선언 사용처 조회 75.72ms였다. 이 프로브 1회의 시간은 최종 반복 성능 비교에 섞지 않았다. [프로브 기록](results/2026-10-14/expansion/detailed-before.jsonl), [프로토콜 로그](results/2026-10-14/expansion/detailed-before.log).

최적화 후 getWindow 5회 중앙값은 다음과 같다. 각 단계의 개별 중앙값이라 합이 전체 구간의 중앙값과 정확히 같지는 않다.

| 범위 확장 단계                                      |       ms |
| --------------------------------------------------- | -------: |
| didOpen 알림 송신                                   |   28.660 |
| 앞선 문서 열기·프로젝트 준비와 definition 응답 대기 | 3378.648 |
| 확장 후 원본 references 재조회                      |  175.608 |
| 원본·선언 후보 위치 연결                            |    0.461 |
| 선언의 원본 심볼 확인                               |    9.905 |
| 선언 references 조회                                |   97.129 |

서버 로그에서도 원본의 최초 references 응답부터 definition 장벽까지 **364개 didOpen**이 처리됐으며, 해당 처리 시간 합의 중앙값은 약 3384ms였다. [서버 로그 집계](results/2026-10-14/expansion/server-open.json). 이 구간의 주병목은 수백 개 문서의 열기·스냅샷·프로젝트 준비 처리였다. 선언 위치를 맞추는 작은 구문 연산이나 선언 references 자체에 3.3초가 걸렸던 것은 아니다. 이번 수정에서도 같은 문서 범위를 준비하므로 이 대기가 남는다.

## 줄인 작업

- [텍스트와 AST 캐시 분리](create-source-reader.ts): 모든 파일의 텍스트와 import를 계속 확인하되, AST는 별칭 후보와 실제 결과 위치를 확인할 때 파싱한다. [후보 판정](may-have-module-bindings.ts)은 주석, 동적 import, optional/generic require, Unicode 이스케이프를 보수적으로 유지한다. 이후 AST와 TS7 정의 검증은 그대로 수행한다.
- [import 해석 재사용](create-import-resolver.ts): 동일한 containing directory/specifier의 결과를 재사용한다. 같은 디렉터리에서는 가장 가까운 프로젝트 설정이 같고, import/require 두 resolution mode를 모두 계산해 보관한다. ESM과 CJS를 한 모드로 축소하지 않았다. 선언 재내보내기·JSDoc import·삼중 슬래시 참조 수집도 유지했다.
- [재조회 중복 작업 제거](scan-linked-references.ts): 준비한 세션에서는 문서 전체를 다시 열어 확인하거나 같은 원본 references를 두 번 요청하지 않는다. 최초 원본 조회와 필요한 선언·별칭 조회는 유지한다. 파일/설정 변경 시 준비 상태와 메타데이터·심볼 연결·native 세션을 함께 초기화한다.
- [세부 시간](create-timings.ts)은 process.hrtime.bigint로 수집하며 기존 누적 단계 외에 메타데이터, 송신, 처리 대기, 원본·선언·별칭 조회를 따로 기록한다. 이 계측 비용도 최적화 후 시간에 포함했다.

실제 getWindow에서 검색 범위 6573개, 열린 문서 463개, 별칭 후보 173개, 연결 선언 99개, 변경 검증 입력 23560개는 최적화 전·후 같았다. AST 캐시 대상은 6694→592개로 약 91% 줄었다. 메타데이터 준비 중앙값은 2797→1637ms, 약 41.5% 줄었다. fileRevision은 2986→1623ms, 약 45.6% 줄었다.

현재 입력의 디렉터리/specifier 중복 11724건을 재사용했다. 두 모드의 실제 resolver 호출은 25886회였다. 기존의 매 specifier마다 두 모드를 호출하는 규칙으로 같은 입력을 계산하면 49334회이므로 23448회, 약 47.5%의 호출을 피했다. 이 호출 수 비교는 현재 수집된 입력으로 계산한 값이다. TypeScript 내부 캐시를 이미 사용하던 경로여서 호출 수 감소율을 그대로 시간 감소율로 보지 않는다.

## 같은 조건에서 다시 비교한 속도

기존 TS6, 수정 전에 고정한 연결 보완 TS7, 최적화 TS7을 독립 프로세스·빈 CODEX_HOME에서 순서를 회전해 측정했다. 주요 TS 조회는 5회, 나머지 실제 조회와 fixture는 3회씩이다. TS7 최초 시간에는 시작·초기화·파일 발견·프로젝트 확장을 포함한다. Node CLI 자체 로딩과 사전 번들 준비는 제외했고 OS 파일 캐시는 비우지 않았다. 아래는 이번 회차의 값이며 이전 보고서의 절대 시간과 섞지 않았다.

단위 ms, 중앙값. 첫 결과는 비어 있지 않은 서버 배치 수신이며 브라우저 paint가 아니다. 재첫/재완료는 같은 세션에서 최초 완료 직후 같은 심볼을 다시 요청한 값이다.

| 조회                       | 방식          |  첫 결과 | 전체 완료 |    재첫 |  재완료 |
| -------------------------- | ------------- | -------: | --------: | ------: | ------: |
| fileRevision 사용처 22개   | 기존 TS6      | 1519.966 | 10007.445 |  44.208 |  44.224 |
| fileRevision 사용처 22개   | 최적화 전 TS7 |  404.163 |  7901.342 | 183.463 | 370.688 |
| fileRevision 사용처 22개   | 최적화 TS7    |  394.342 |  6301.025 | 197.460 | 290.416 |
| getWindow 사용처 102개     | 기존 TS6      | 1413.378 |  9656.654 |  46.762 |  46.797 |
| getWindow 사용처 102개     | 최적화 전 TS7 |  335.511 |  7553.653 | 173.844 | 431.120 |
| getWindow 사용처 102개     | 최적화 TS7    |  345.493 |  6454.746 | 181.068 | 357.356 |
| 앱 getWindow 정의 1개      | 기존 TS6      |  809.593 |   855.123 |  29.575 |  29.589 |
| 앱 getWindow 정의 1개      | 최적화 전 TS7 |  429.522 |   463.245 |  31.458 |  57.828 |
| 앱 getWindow 정의 1개      | 최적화 TS7    |  412.802 |   449.588 |  34.334 |  61.760 |
| JS compareFiles 사용처 6개 | 기존 TS6      | 1399.305 | 10059.486 |  39.565 |  39.578 |
| JS compareFiles 사용처 6개 | 최적화 전 TS7 | 1428.394 |  8597.395 | 183.297 | 356.413 |
| JS compareFiles 사용처 6개 | 최적화 TS7    | 1507.182 |  6838.809 | 190.358 | 293.188 |

TS7 최적화 전 대비 전체 완료는 fileRevision 약 20%, getWindow 약 15%, JS 약 20% 줄었다. 같은 조회의 재완료는 약 17–22% 줄었다. 첫 배치와 재조회 첫 배치에는 뚜렷한 개선이 없었고, JS 최초 첫 배치는 약 79ms 느렸다. 정의 단독 조회의 재완료도 약 4ms 늘었다. 개선은 주로 최초 첫 배치 이후의 준비와 전체 완료 비용을 줄인 결과다.

기존 TS6 완료 캐시의 재조회 약 40–47ms가 TS7 실험의 약 290–357ms보다 여전히 빠르다. TS7 실험에는 완료 결과 캐시를 추가하지 않았으며, 기존 제품 검색은 그대로 유지한다. [이전·현재 제품 번들 해시](results/2026-10-14/expansion/metadata.json)는 같다.

## 정확도와 변경 검증

21개 독립 사례의 최초·재조회·반복에서 TS7은 기대 파일/행/열과 모두 일치했다. 이전 연결 검증에 더해 같은 폴더의 .mts/.cts가 조건부 exports의 서로 다른 .d.mts/.d.cts와 원본을 선택하는 경우 4개를 추가했다. CommonJS 복합 사례에는 블록·줄 주석과 템플릿 뒤의 require도 추가했다. 별칭 재내보내기, 패키지 밖 소비자, 소비자별 paths, include 밖 파일, 선언 맵, project references, map 없는 source/types, 같은 이름의 다른 함수·메서드·가려진 매개변수·재할당 이후 호출을 확인했다. [기대값](results/2026-10-14/expansion/fixtures.json), [실제 입력](results/2026-10-14/expansion/fixture-inputs.tar.gz).

실제 모노레포 4개 조회도 기존 TS6와 정확히 일치했다. 기존 TS6가 CommonJS 복합 fixture에 자기 정의 1곳을 사용처로 추가하던 차이는 이번에도 그대로이며, 제품 유지 조건에 따라 수정하지 않았다. 따라서 모든 fixture의 TS6 원시 결과까지 완전히 같다고 주장하지 않는다. TS7 최적화 전·후에는 이 차이가 없고 21개 모두 일치한다.

[변경 검증](verify-linking.ts)은 compiler paths를 다른 모듈로 바꿨다가 되돌릴 때의 오탐·누락, 닫힌 파일 편집, 파일 추가·삭제, 선언 맵 원본 변경과 정의 목적지 변경, 오래된 source 거부를 실행했다. [8개 검사 결과](results/2026-10-14/expansion/invalidation-final.txt). 후보 판정·지연 파싱·기존 별칭/선언 소유자 판독의 단위 테스트 18개도 통과했다. [Wallaby](results/2026-10-14/expansion/units.txt).

검증은 실제 4개 심볼과 위 독립 사례에 한정한다. 편집 초안·취소·검색 중 파일 변경·익명 default·모든 외부 모듈 설정 조합은 이번에 검증하지 않았다. 네이티브 내부 partial 위치 progress는 이번에도 0회이며, 단계별 응답을 실험 연결이 합치는 방식이다.

## 재현 자료

[환경·해시](results/2026-10-14/expansion/metadata.json), [고정한 이전 TS7 클라이언트](results/2026-10-14/expansion/baseline-client.tar.gz), [프로토콜 로그](results/2026-10-14/expansion/protocol-logs.tar.gz)를 보존했다. 고정 번들에는 Node ESM에서 기존 TypeScript 라이브러리가 사용하는 `__filename`/`__dirname`을 제공했다. 최초 preflight의 번들 환경 오류를 수정한 뒤 최종 474개 측정을 실행했다.

이전 README의 번들/manifest 준비를 새 작업 폴더에 수행한 다음, 패키지 디렉터리에서 다음을 실행한다. 새 설치나 package.json 스크립트는 필요 없다.

```sh
tar -xzf benchmarks/native-analysis/results/2026-10-14/expansion/baseline-client.tar.gz -C /tmp/native-expansion
node --import tsx benchmarks/native-analysis/create-fixtures.ts > /tmp/native-expansion/fixtures.json
python3 benchmarks/native-analysis/run-expansion.py /tmp/native-expansion measured
python3 benchmarks/native-analysis/validate-expansion.py /tmp/native-expansion
node --import tsx benchmarks/native-analysis/verify-linking.ts /absolute/path/to/tsc
```

작업 폴더를 먼저 만들고 이전 번들/manifest 생성 명령의 출력 경로도 `/tmp/native-expansion`으로 맞춘다. source-inputs 아카이브와 타입 검사·oxlint·루트 pnpm format 결과는 같은 results 디렉터리에 있다.
