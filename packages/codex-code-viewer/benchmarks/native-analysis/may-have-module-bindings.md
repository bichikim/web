# TS7 별칭 후보 파싱 줄이기와 프로젝트 준비 프로파일

2026-10-14. 기존 프로젝트 준비 겹치기와 재조회 변경 확인을 유지하고, 전체 구문 트리를 만들기 전의 후보 판별을 보완했다. **파싱 작업량은 줄었지만 실제 전체 완료의 일관된 시간 단축은 확인하지 못했다.** 기존 TS6 제품 번들을 다시 생성해 전후 해시가 같음을 확인했다.

## 변경과 검증

[후보 판별](may-have-module-bindings.ts)은 기존 module call/이스케이프 조건에 더해, 객체 바인딩의 닫는 중괄호 뒤에 대입·타입 표기·주석 등이 가능한지 확인한다. 주석·문자열 안의 비슷한 내용은 후보로 남을 수 있다. 이 단계의 후보를 검색 결과로 내보내지 않으며, 기존 AST 바인딩 추출과 LSP 심볼 동일성 검증을 그대로 거친다.

전체 코드 범위 6,581개에서 기존 후보 445개를 독립 파싱해 비교했다. 최종 후보는 259개로 약 42% 줄었고, 기존 별칭 173개의 누락은 없었다. 실제 getWindow 조회에서 구문 트리 캐시 항목도 594→409개로 줄었다. 두 방식의 열린 문서 126개, 별칭 173개, 선언 연결 99개, 변경 확인 입력 23,578개, 모듈 해석 호출 25,910회는 같았다. [후보 검사](results/2026-10-14/syntax-candidates/binding-coverage.json), [최종 검증](results/2026-10-14/syntax-candidates/validation.txt).

독립 사례 23개와 실제 조회 4개의 최초·재조회·반복 위치 집합을 비교한 최종 340개 기록에서 누락·추가 위치는 0개였다. 독립 사례는 연쇄 별칭·소비자별 paths·패키지 밖/포함 범위 밖 소비자·CommonJS·동적 import·.d.ts map/source/types·조건부 .mts/.cts·동명 심볼·가려짐·재할당·겹치는 프로젝트를 포함한다. 실제 조회는 이번 회차에 실행한 기존 TS6 결과를 위치 비교 기준으로 사용했다. TS6의 알려진 fixture 차이는 기존 보고서대로 남겨 두며 전체 언어·모든 문법의 정확성을 주장하지 않는다. [기대값](results/2026-10-14/syntax-candidates/fixtures.json), [원시 기록](results/2026-10-14/syntax-candidates/measured.jsonl).

파일·설정 변경 검사 25개와 Wallaby 테스트 47개, 변경 파일 타입 검사·oxlint·루트 pnpm format을 통과했다. 같은 크기/mtime 편집, 원자적 교체, 생성·삭제, symlink, paths/tsconfig, 닫힌 소비자, 선언 맵 목적지, include 변경을 확인했다. [검사 원문](results/2026-10-14/syntax-candidates/revision-invalidation.txt), [설정](results/2026-10-14/syntax-candidates/configuration-invalidation.txt), [연결](results/2026-10-14/syntax-candidates/linking-invalidation.txt), [프로젝트](results/2026-10-14/syntax-candidates/preparation-invalidation.txt), [단위 테스트](results/2026-10-14/syntax-candidates/units.txt).

## 실제 모노레포 속도

단위 ms, 수정 전→후 중앙값이다. 주요 두 조회는 각 5회, 나머지는 각 3회 실행했다. 매번 새 프로세스·빈 CODEX_HOME으로 시작하고 같은 세션에서 재조회했다. 전후 순서를 번갈아 실행했으며 실제 4개 조회가 끝날 때까지 저장소 수정·포맷·테스트를 수행하지 않았다. 모듈 로딩은 제외했고 OS 파일 캐시는 비우지 않았다. 첫 결과는 비어 있지 않은 서버 배치 수신이며 브라우저 paint가 아니다.

| 조회                       |           첫 결과 |         전체 완료 |  재조회 첫 결과 |     재조회 완료 |
| -------------------------- | ----------------: | ----------------: | --------------: | --------------: |
| fileRevision 사용처 24개   |   363.816→358.023 | 3769.374→3904.351 | 155.366→152.281 | 217.696→219.537 |
| getWindow 사용처 102개     |   314.882→332.521 | 4075.858→4038.285 | 145.029→162.344 | 289.129→312.278 |
| 앱 getWindow 정의 1개      |   430.899→434.912 |   464.737→472.370 |   38.278→37.886 |   70.283→71.373 |
| JS compareFiles 사용처 6개 | 1408.653→1493.103 | 4471.437→4772.561 | 167.640→160.633 | 239.818→233.400 |

getWindow 전체 완료의 약 38ms 감소만으로 개선을 주장하지 않는다. fileRevision·JavaScript 전체 완료와 getWindow 재조회는 늘었다. 초기 응답·재조회 실행 순서는 변경하지 않았고 호스트 부하도 변했다. 이전 회차의 3,093.503ms와 이번 회차를 섞어 회귀율이나 개선율을 계산하지 않는다. 이번 전후 비교도 작은 차이의 인과관계를 확정하지 못한다. [중앙값·범위·세부 구간](results/2026-10-14/syntax-candidates/summary.json), [환경·해시](results/2026-10-14/syntax-candidates/metadata.json).

getWindow의 별칭 후보 파싱 구간은 352.489→268.728ms로 줄었지만, 메타데이터 전체는 1997.848→2005.367ms였다. TS7을 실행하지 않은 별도의 Node 준비 비교 3회 중앙값도 1873.106→1801.367ms로 약 72ms 감소에 그쳤다. 준비 작업이 이미 겹치므로 이 감소가 전체 완료에 그대로 더해지지 않는다. [Node 구간 원문·고정 클라이언트](results/2026-10-14/syntax-candidates/node-stages.tar.gz).

## TS7 내부 준비 프로파일

설치된 TS7 7.0.2의 `--lsp --stdio --pprofDir`로 CPU·메모리 프로파일을 3회 수집했다. initialize·최초 definition/references·대표 문서 26개 열기·준비 완료 definition 응답까지 실행하고 종료했다. 확장 source/.d.ts 사용처와 별칭 조회, 재조회는 이 프로파일에 포함하지 않았다. 기존 클라이언트는 바꾸지 않고 임시 실행 래퍼로 옵션을 전달했다. [프로파일과 프로토콜](results/2026-10-14/syntax-candidates/preparation-profiles.tar.gz), [집계](results/2026-10-14/syntax-candidates/profile-summary.json).

| 함수/경로                                    | CPU 샘플 비율, 3회 범위 | 해석                                                  |
| -------------------------------------------- | ----------------------: | ----------------------------------------------------- |
| syscall.rawsyscalln, 자기 시간               |              31.1~34.2% | 상위 스택에서 파일 열기·읽기·stat·realpath 확인       |
| runtime.madvise, 자기 시간                   |              21.7~25.1% | runtime.sysUsedOS→allocSpan 경로의 메모리 페이지 확보 |
| compiler.parseTask.load, 하위 포함           |              36.2~42.5% | 파일 로딩·파싱·import 해석 작업을 함께 포함           |
| module.Resolver.ResolveModuleName, 하위 포함 |              15.9~20.1% | 모듈 경로 해석과 파일 존재 확인을 함께 포함           |

자기 시간과 하위 포함 비율은 더하지 않는다. 프로파일 경과는 3.21~3.44초, 여러 실행 스레드의 CPU 시간 합은 14.59~15.45초였다. 이 수치를 검색 지연이나 마지막 준비 대기 시간으로 읽지 않는다. 수집 자체의 오버헤드도 있어 위 속도 표에는 프로파일 실행을 섞지 않았다. 전체 준비 구간의 샘플이므로 마지막 openBarrier만의 비율이라고 주장하지 않는다.

주요 남은 비용은 TS7의 파일 접근·모듈 해석·메모리 할당/GC 쪽이다. 프로파일만으로 동일 파일을 중복 처리하는 횟수나 캐시 적중률까지 확정할 수는 없다. 다음 실험은 파일 프로브와 프로젝트 간 읽기/파싱 공유를 계측하는 것이 적절하다. 확인 없이 프로젝트 범위를 줄이거나 Go 메모리 설정을 바꾸지는 않았다.

## 제외한 구현과 재현

이미 만든 AST에서 import를 다시 읽는 시도는 작은 비교에서 기존 전처리보다 비쌌다. 전체 토큰 스캔으로 후보를 판별한 시도도 실제 getWindow 전체 완료가 4850.626→5544.895ms로 늘어 제외했다. 그 회차의 510개 결과와 고정 클라이언트는 [별도 아카이브](results/2026-10-14/syntax-candidates/rejected-token-scan.tar.gz)에 보존했다. 최종 숫자와 섞지 않는다. 최종 구현에는 AST import 수집이나 전체 토큰 스캐너가 없다.

최종 [클라이언트](results/2026-10-14/syntax-candidates/clients.tar.gz)는 전후 모두 같은 esbuild/Node24 ESM 번들이다. 새 fixture 루트를 생성해 fixtures.json을 준비하고 [측정 드라이버](results/2026-10-14/syntax-candidates/run.py)의 package/binary 경로를 환경에 맞춘 뒤 실행한다. 검증 드라이버의 기존 TS6 위치 기준 경로도 새 기준 기록으로 맞춰야 한다. [프로토콜 로그](results/2026-10-14/syntax-candidates/protocol-logs.tar.gz), [fixture 입력](results/2026-10-14/syntax-candidates/fixture-inputs.tar.gz), [프로파일 드라이버](results/2026-10-14/syntax-candidates/preparation-drivers.tar.gz), [디코더](results/2026-10-14/syntax-candidates/read-profile.py)를 보존했다. 디코더는 [pprof 공식 스키마](https://github.com/google/pprof/blob/main/proto/profile.proto)를 따른다. LSP pprof 지원은 [공식 구현](https://github.com/microsoft/typescript-go/blob/main/cmd/tsgo/lsp.go)과 설치된 바이너리의 실제 출력으로 확인했다.

취소·검색 도중 동시 편집·편집 초안·네트워크 파일 시스템·모든 TS 설정 조합·브라우저 표시 지연은 이번 검증 범위에 포함하지 않았다.
