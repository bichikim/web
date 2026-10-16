# TS7 기본 심볼 탐색

2026-10-15. TypeScript·JavaScript 심볼 탐색의 제품 엔진을 TS7으로 전환했다. 제품 워커가 이 디렉터리의 엔진을 소유한다. `benchmarks/native-analysis`의 이전 진입점은 비교 도구의 호환 이름이며 이 제품 구현을 호출한다. Python·Rust·Ruby 분석기는 기존 경로를 유지한다.

## 요청과 준비

진행 중인 동일 별칭 확인을 합치고, 준비가 끝난 프로젝트에서 확인한 원본 정의를 같은 메타데이터 세대 안에서 재사용한다. 별칭 확인은 최대 2개씩 처리한다. 준비 전 결과와 준비 후 결과를 섞어 재사용하지 않는다. 64개 CommonJS 소비자 사례에서 정의 확인 RPC는 128→65회로 줄었고, 기대한 193개 위치를 최초·재조회 모두 유지했다. 직렬화한 캐시만으로 65회, 동시 처리 2개일 때도 65회였으므로 요청 감소와 병렬화 효과를 구분해야 한다. 단일 순차 실행의 602→121ms를 반복 측정으로 입증한 성능 향상률로 해석하지 않는다. [요청 수 원자료](../../../benchmarks/native-analysis/results/2026-10-15/native-default/dedupe.json).

1·2·4개 동시 처리의 별도 소규모 실험에서 전체 완료 중앙값은 5,005·4,588·5,058ms였다. 변동 범위가 겹치는 3회 실험이므로 2개가 모든 작업공간에서 최적이라는 결론은 내리지 않았다. 현재는 중복을 줄이면서 요청 수를 제한하는 기본값으로 2개를 사용한다. [동시 처리 원자료](../../../benchmarks/native-analysis/results/2026-10-15/native-default/concurrency-trial.jsonl).

작업공간 진입 시 TS/JS 파일을 발견하면 프로젝트 준비를 시작한다. 이미 전경 검색이 진행 중이면 새 준비 작업을 시작하지 않는다. 준비가 아직 전역 프로젝트를 열기 전이라면 클릭한 심볼의 첫 원본 검색을 우선한다. 이미 시작한 TS7 내부 작업을 선점하는 기능은 아니다. 원본 검색 결과를 전달한 뒤 선언·별칭 연결을 확인해 추가한다. TS7 자체가 한 프로젝트의 결과 전체를 한 응답으로 주는 경우도 있어, 내부 결과가 항상 파일별로 스트리밍되지는 않는다.

편집 버퍼는 LSP 오버레이와 연결 메타데이터가 같은 내용을 사용한다. 버퍼 집합이나 파일·설정 입력이 바뀌면 연결 캐시를 무효화한다. 검색 취소 후 정리가 다음 검색의 세션을 끊지 않도록 전경 검색의 생명주기는 직렬화하고, 한 검색 안의 별칭 RPC만 제한적으로 병렬 처리한다. 취소 가능한 준비 대기는 실제로 기다리는 시점에 만든다. 작업공간 종료 시 워커가 소유한 네이티브 프로세스도 종료한다.

제품 회귀 검사에서 추가로 발견한 `module.exports = {greet}` 및 이름을 바꾼 export 속성은 값의 정의를 TS7로 다시 확인해 연결한다. 일반 객체의 같은 이름이나 다른 모듈은 이름만으로 병합하지 않는다. TS6는 구문·모듈 경로 판독과 조기 배치의 한 파일 내 import 심볼 확인에 사용하며, 전체 프로젝트의 TS/JS 심볼 검색은 TS7으로 처리한다.

## 정확도와 실행 검증

- 독립 기대 위치 27개 사례 × 최초·재조회 2회 = 54회에서 누락·추가 위치 0개. 프로젝트별 alias, 제외 파일, 패키지 소스, 선언 맵, 프로젝트 참조, CommonJS 별칭, import/require 조건, 겹치는 프로젝트, BOM·UTF-16 및 두 export 형태를 포함한다. [위치 비교](../../../benchmarks/native-analysis/results/2026-10-15/native-default/fixture-results.jsonl), [사례 목록](../../../benchmarks/native-analysis/results/2026-10-15/native-default/fixtures.json).
- 실제 모노레포 4개 조회 × 4개 경로 × 3회 × 최초·재조회 = 96회에서 위치 집합이 모두 일치했다. 각각 fileRevision 24개, getWindow 102개, 앱 정의 이동 1개, JavaScript compareFiles 6개다. [비교 검증](../../../benchmarks/native-analysis/results/2026-10-15/native-default/validation.txt).
- 최종 작업공간·정의·사용처·워커·배포 통합 검사 171개 통과. TS/JS/Python/Rust/Ruby의 별칭·패키지 밖 호출, 취소 후 재조회, 1만 파일의 2만 위치 검사도 포함한다. 단위 검사 79개 통과. [통합 검사](../../../benchmarks/native-analysis/results/2026-10-15/native-default/integration.txt), [단위 검사](../../../benchmarks/native-analysis/results/2026-10-15/native-default/units.txt).
- 파일·설정 무효화 25개 확인: 같은 크기와 복원한 mtime, atomic replacement, 생성·삭제, symlink 대상 변경, compiler paths와 declaration map 대상 변경, 닫힌 소비자 파일 수정 및 준비 범위 변경. [파일](../../../benchmarks/native-analysis/results/2026-10-15/native-default/input-revisions.txt), [설정](../../../benchmarks/native-analysis/results/2026-10-15/native-default/configuration.txt), [연결](../../../benchmarks/native-analysis/results/2026-10-15/native-default/linking.txt), [준비](../../../benchmarks/native-analysis/results/2026-10-15/native-default/preparation.txt).
- 실제 모노레포에서 준비 전후 같은 PID를 재사용하며 getWindow 102개를 유지했다. 별도 제품 API 조회가 번들 TS7을 실행했고, 작업공간 종료 뒤 소유 PID가 남지 않았음을 확인했다. [재사용](../../../benchmarks/native-analysis/results/2026-10-15/native-default/ready-check.json), [종료](../../../benchmarks/native-analysis/results/2026-10-15/native-default/lifecycle.json).

위 검증은 명시한 사례와 환경에 대한 결과다. 동적 런타임 코드 등 모든 프로그램의 사용처가 빠짐없다는 증명은 아니다.

## 실제 모노레포 시간

단위 ms, 각 3회 중앙값. 첫 결과는 **서버의 첫 비어 있지 않은 위치 배치**이며 브라우저 그리기 시간은 측정하지 않았다. 재조회는 같은 프로세스·같은 심볼의 두 번째 조회다. `준비 후`는 작업공간 진입 준비 완료 뒤 처음 클릭한 경우이며, 준비 시간은 클릭 대기에 포함하지 않고 따로 표시한다.

기존 제품은 TS6 기반의 제품 워커·스트리밍·캐시 경로다. 이전 TS7 실험은 엔진을 직접 호출해 제품 워커·미리보기·탐색 인덱스 경계를 거치지 않는 비교 경로다. 두 기준을 같은 경로로 취급하지 않는다.

| 조회         | 경로               | 첫 결과 | 전체 완료 | 재조회 완료 | 사전 준비 |
| ------------ | ------------------ | ------: | --------: | ----------: | --------: |
| fileRevision | 기존 제품          |   1,474 |     8,944 |          37 |         0 |
| fileRevision | 이전 TS7 직접 실험 |     329 |     4,170 |         170 |         0 |
| fileRevision | TS7 제품 즉시 클릭 |     940 |     6,430 |          80 |         0 |
| fileRevision | TS7 제품 준비 후   |     624 |       838 |          81 |     8,312 |
| getWindow    | 기존 제품          |   1,079 |     6,861 |          34 |         0 |
| getWindow    | 이전 TS7 직접 실험 |     272 |     3,620 |         208 |         0 |
| getWindow    | TS7 제품 즉시 클릭 |     813 |     5,403 |          70 |         0 |
| getWindow    | TS7 제품 준비 후   |     477 |       717 |          69 |     6,867 |
| definition   | 기존 제품          |     601 |       626 |          23 |         0 |
| definition   | 이전 TS7 직접 실험 |     346 |       363 |          38 |         0 |
| definition   | TS7 제품 즉시 클릭 |     852 |       906 |          46 |         0 |
| definition   | TS7 제품 준비 후   |     332 |       405 |          65 |     6,859 |
| javascript   | 기존 제품          |   1,026 |     6,850 |          34 |         0 |
| javascript   | 이전 TS7 직접 실험 |   1,674 |     4,148 |         144 |         0 |
| javascript   | TS7 제품 즉시 클릭 |   2,231 |     5,686 |          72 |         0 |
| javascript   | TS7 제품 준비 후   |     473 |       653 |          68 |     6,824 |

준비 후 사용처 전체 조회는 653~838ms였다. 준비 자체는 중앙값 6.82~8.31초가 필요하므로 계산 비용을 없앤 개선으로 해석하면 안 된다. 즉시 클릭에서는 TypeScript 사용처 전체 완료가 기존 제품보다 줄었지만, JavaScript 첫 결과는 1,026→2,231ms, 작은 정의 이동 전체는 626→906ms로 느려졌다. 재조회도 기존 제품 23~37ms보다 TS7 제품 46~81ms로 느렸다. 이전 TS7 직접 실험과 비교하면 제품의 최초 전체 완료가 느린 항목이 남는다. 이 회귀를 숨기지 않고 원자료를 보존했다.

공유 호스트에서 수행했으며 OS 캐시는 비우지 않았다. fileRevision 기존 제품 전체 완료 범위는 7,260~10,841ms로 변동이 컸다. 각 샘플의 호스트 부하, 모든 범위와 준비 시간을 [원자료](../../../benchmarks/native-analysis/results/2026-10-15/native-default/measured.jsonl)와 [요약](../../../benchmarks/native-analysis/results/2026-10-15/native-default/summary.json)에 기록했다. 측정 중 다른 프로젝트 빌드·검사는 실행하지 않았고, 측정한 서버 TypeScript 파일의 동일성을 마지막에도 확인했다. [환경](../../../benchmarks/native-analysis/results/2026-10-15/native-default/metadata.json), [해시](../../../benchmarks/native-analysis/results/2026-10-15/native-default/source-hashes.json), [동일성 검사](../../../benchmarks/native-analysis/results/2026-10-15/native-default/source-validation.txt).

## 배포와 재현

공식 npm 배포의 고정된 7.0.2 아카이브를 SHA-512로 확인하고, macOS·Windows·Linux arm64/x64의 실행 파일·SDK·라이선스·NOTICE를 포함한다. 설치된 원본 실행 파일을 변경하지 않는다. 실제 실행 검증 환경은 macOS arm64, Mac17,9, 메모리 48GiB, Node 26.4.0이다. 나머지 플랫폼은 묶음 포함 여부만 검증했다. npm dry-run에는 실행 파일 6개와 기본 SDK 6개가 포함되며 다운로드용 tgz는 포함되지 않는다. 압축 패키지는 약 68.7MB다. [배포 목록](../../../benchmarks/native-analysis/results/2026-10-15/native-default/package-files.json), [빌드](../../../benchmarks/native-analysis/results/2026-10-15/native-default/build.txt).

[클라이언트·드라이버](../../../benchmarks/native-analysis/results/2026-10-15/native-default/clients-and-drivers.tar.gz), [fixture 입력](../../../benchmarks/native-analysis/results/2026-10-15/native-default/fixture-inputs.tar.gz), [프로세스·LSP 진단 로그](../../../benchmarks/native-analysis/results/2026-10-15/native-default/protocol-logs.tar.gz)를 보존했다. 코드 형태의 측정 기록은 소스 검색 범위를 바꾸지 않도록 압축 파일 안에 넣었다. 드라이버의 root·package·binary·임시 작업 디렉터리를 재현 환경에 맞추고, 공식 TS7·SDK 및 TS6 SDK를 각 번들 옆에 놓는다. 독립 fixture는 보존된 생성기로 다시 만들거나 fixture 목록의 root를 복원 위치에 맞춘 뒤 실행한다. 실제 모노레포 측정은 동일 소스·의존성 상태에서 `run.py`의 네 경로를 모두 실행한다. 이전 제품과 이전 실험의 번들도 함께 보존해 제품 구현을 나중에 수정해도 기준 번들을 대체하지 않는다.

최종 패키지 lint, TypeScript 검사, root `pnpm format` 및 빌드가 통과했다. [lint](../../../benchmarks/native-analysis/results/2026-10-15/native-default/lint.txt), [타입](../../../benchmarks/native-analysis/results/2026-10-15/native-default/types.txt), [형식](../../../benchmarks/native-analysis/results/2026-10-15/native-default/format.txt).

## 조회 지연 개선

기본 전환 뒤 느려진 제품 경로를 수정했다. 위 표는 기본 전환 당시 기록이고, 이 절은 같은 TS7 제품의 이번 수정 전후 비교다.

부모 체크포인트가 확인한 전체 파일·디렉터리 목록을 워커에 전달해 재탐색을 없앴다. 준비와 다음 조회가 공유하는 체크포인트는 실제 메타데이터 검사를 통과할 때만 재사용한다. TS7은 전체 범위를 검색하므로 사용하지 않는 TS6 후보 그래프 생성·복원은 이 경로에서 실행하지 않는다. 대신 TS7이 읽은 해석 입력을 부모의 소스·설정 체크포인트와 합쳐, 중복 경로를 한 번만 확인한다. 겹치는 경로는 검색 전의 부모 체크포인트를 유지해 검색 중 변경을 새 기준으로 덮어쓰지 않는다.

클릭을 받은 뒤 워커와 TS7 연결 초기화는 파일 목록 확인과 겹친다. 전역 프로젝트를 여는 작업은 여전히 첫 원본 검색에 우선권을 양보한다. 초기화 실패는 이후 실제 조회가 진단하고, 종료한 세션은 초기화로 다시 만들지 않는다. 종료 요청을 보낸 워커가 정리를 마칠 때까지 부모 프로세스가 종료를 기다리도록 했다. 실제 프로세스 생성 성공 이벤트 뒤에만 초기 JSON-RPC 요청을 써서, 실행 실패 뒤 남던 쓰기 오류도 제거했다.

중복 제거 단계의 계측에서 작은 정의 조회는 부모·워커의 디렉터리 순회 2회에서 부모 1회로 줄었다. 재조회 입력 검사는 부모·워커 2회에서 합친 목록 1회로 줄었다. 워커의 목록 구성은 디렉터리 I/O 없이 전달받은 목록으로 처리한다. JavaScript 전체 완료 때도 기존 후보 인덱스용 추가 순회가 없어졌다. 이 계측 시간은 다른 검증과 겹쳤으므로 속도 향상률의 근거로 사용하지 않고 호출 경로·횟수의 근거로 사용했다.

단위 ms. JavaScript 즉시 클릭은 수정 전후 7회, 나머지는 각각 3회의 중앙값이다. 첫 결과는 서버의 첫 위치 배치이며, 브라우저 그리기 시간은 측정하지 않았다. 준비는 클릭 전에 완료하고 시간을 별도로 기록했다.

| 조회         | 조건      | 첫 결과 전→후 | 전체 완료 전→후 | 재조회 완료 전→후 | 사전 준비 전→후 |
| ------------ | --------- | ------------: | --------------: | ----------------: | --------------: |
| fileRevision | 즉시 클릭 |       957→756 |     6,158→4,173 |             83→49 |             0→0 |
| fileRevision | 준비 후   |       507→258 |         719→466 |             78→46 |     7,739→4,169 |
| getWindow    | 즉시 클릭 |       905→716 |     5,652→4,166 |             77→50 |             0→0 |
| getWindow    | 준비 후   |       519→251 |         801→529 |             80→46 |     7,827→4,589 |
| definition   | 즉시 클릭 |       880→432 |         930→477 |             53→19 |             0→0 |
| definition   | 준비 후   |        343→98 |         418→198 |             68→40 |     7,754→3,766 |
| javascript   | 즉시 클릭 |   2,330→2,319 |     5,906→5,112 |             71→46 |             0→0 |
| javascript   | 준비 후   |       457→214 |         629→385 |             65→39 |     6,612→3,719 |

**JavaScript 즉시 클릭의 첫 결과 2,330→2,319ms는 사실상 같으며 개선을 확인하지 못했다.** 준비 후 첫 결과 457→214ms, 전체 완료 5,906→5,112ms와 재조회 71→46ms는 줄었다. 남은 준비 전 첫 결과 병목은 TS7의 첫 정의 요청 응답 구간이다. 프로젝트 준비와 의미 분석을 이 구간 안에서 더 세분화해 줄이는 작업이 남았다. 첫 결과 차이가 작은 항목을 전체 완료 개선으로 대신 완료 처리하지 않는다.

현재 소스의 fileRevision 위치는 22개이며, 이전 표의 24개와 다른 이유는 메타데이터 판독 구현을 공통 모듈로 옮기며 실제 사용처가 바뀌었기 때문이다. 이번 비교는 두 엔진 번들이 **같은 현재 소스**를 읽었으며, fileRevision 22개·getWindow 102개·정의 이동 1개·JavaScript 6개의 위치 집합이 112회 모두 일치했다. 별칭·패키지 밖 사용처·선언 연결의 독립 사례 27개는 API와 실제 뷰어 스트림에서 각각 최초·재조회하여 108회 누락·추가 위치 0개였다. 파일·설정·해석 입력 변경 검사 25개도 통과했다.

단위 검사 105개가 통과했다. 확장 통합 검사 188개 중 186개는 전체 실행에서 통과했다. 나머지 두 검사는 TS6 내부 프로그램 구조를 확인하던 부분을 실제 위치·그룹 재사용 계약으로 바꿨고, 해당 파일의 9개 검사가 모두 통과했다. 배포 실행 검사 2개, lint·타입 검사·형식 검사·빌드도 통과했다. 검증은 기록한 사례와 macOS arm64 환경에 한정한다.

[최종 원자료](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/measured.jsonl), [요약·변동 범위](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/summary.json), [위치 일치](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/validation.txt), [독립 사례 결과](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/fixture-results.jsonl), [전체 통합 실행](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/regression.txt), [캐시 재검증](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/cache-final.txt), [단위 검사](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/units-final.txt), [배포 실행](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/distribution.txt)을 보존했다. 메타데이터는 감시 이벤트만 믿지 않고 실제 파일 상태를 검사한다. [체크포인트 변경 검증](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/revisions.txt), [설정 변경](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/configuration.txt), [연결 변경](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/linking.txt), [준비 범위 변경](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/preparation.txt).

[환경](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/metadata.json), [측정 소스 해시](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/source-hashes.json), [수정 전후 번들·드라이버](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/clients-and-drivers.tar.gz), [fixture 입력](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/fixture-inputs.tar.gz), [진단 로그](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/process-logs.tar.gz)를 보존했다. 드라이버의 임시 경로와 root를 재현 환경에 맞추고 공식 TS7·TS6 SDK를 번들 옆에 놓은 다음 `run.py`와 `extra-javascript.py`를 순서대로 실행한다. 최종 기동 개선 전의 중간 측정은 [별도 압축 기록](../../../benchmarks/native-analysis/results/2026-10-15/query-latency/intermediate-measurements.tar.gz)에 구분했다. 호스트는 공유 환경이고 OS 캐시는 비우지 않았다. 각 샘플에 호스트 부하를 기록했으며 측정 중 다른 프로젝트 빌드·검사를 실행하지 않았다.

## 최초 정의 요청 중 사용처 표시

첫 정의 응답을 기다리는 동안, 선택한 선언과 직접 연결된 import 위치부터 전송한다. [직접 연결 판독](./read-direct-references.ts)은 중복 이름이 없는 `export const` 함수 선언에서 상대 경로의 named import만 처리한다. 별칭 import는 원래 이름 위치를 보내며, 호출 위치·패키지 조건부 해석·CommonJS·선언 연결은 TS7이 계속 검증한다. 구문 오류, 선언 파일, 다른 모듈, 두 해석 모드의 불일치, 따옴표 import 이름, jsconfig가 있는 경로는 이 초기 경로에서 제외한다. 이는 초기 표시 조건이며 최종 검색 범위를 줄이지 않는다.

[초기 배치와 첫 정의 요청](./query-native-symbol.ts)은 함께 진행한다. [뷰어 연결](../resolve-navigation.ts)은 선택한 선언 자체의 사용처를 첫 정의 요청 도중에도 받을 수 있다. 가까운 파일 최대 256개를 초기 후보로 읽고 같은 입력의 결과를 메타데이터 세대 안에서 재사용한다. TS7 전체 프로젝트·별칭·선언 검색은 이후 그대로 수행하며 스트림이 중복 위치를 제거하고 파일별 개수를 누적한다. TS7 기본 엔진, 공식 실행 파일, 편집·취소·실제 입력 변경 검사는 유지한다. TS와 JS의 최종 검색 순서를 나누는 변경은 아니다.

### TS7 내부 구간

공식 7.0.2 실행 파일의 로그와 CPU 프로파일을 수집했다. 제품과 같은 didOpen → definition 순서로 JavaScript 파일을 처음 조회한 3회 기록이다. [공식 didOpen 처리](https://github.com/microsoft/typescript-go/blob/2bd066d87f5bafd315be9f40889d0a60b9e58e0b/internal/project/session.go#L271-L293)에서 프로젝트 스냅샷을 만들고, 이후 definition 핸들러에서 체커 준비·의미 분석과 응답을 처리한다. 아래 구간은 서버 로그의 실제 시간이며, CPU 누적 시간을 벽시계 시간처럼 더하지 않았다.

단위 ms. 초기화, 부모 파일 목록 검사, 워커 기동은 이 표에 포함하지 않았다.

| 샘플 | 프로젝트 스냅샷 준비 | 그중 Program 생성 | 이후 의미 분석·정의 응답 | didOpen 전송부터 첫 정의 응답 |
| ---- | -------------------: | ----------------: | -----------------------: | ----------------------------: |
| 1    |                1,715 |             1,384 |                      971 |                         2,688 |
| 2    |                1,230 |             1,057 |                      802 |                         2,033 |
| 3    |                1,501 |             1,297 |                    1,308 |                         2,810 |

첫 정의 요청이 루트 tsconfig의 약 1만 9천 파일을 준비했다. 파일 판독·파싱 외에도 CPU 프로파일에 할당·GC 비용이 나타났다. GOGC·병렬도 변경의 단발 비교에서는 일관된 이득을 확인하지 못해 제품에 적용하지 않았다. 이번 개선은 이 전체 준비를 생략하는 대신 준비 중에 확정된 import 사용처를 표시한다. 모든 심볼이 1초 미만에 표시된다는 보장은 아니다. [원본 프로파일·로그](../../../benchmarks/native-analysis/results/2026-10-15/first-results/native-profiles.tar.gz), [구간 집계](../../../benchmarks/native-analysis/results/2026-10-15/first-results/profile-summary.json).

### 실제 모노레포 비교

위 조회 지연 개선을 포함한 직전 TS7 제품 번들과 이번 번들을 같은 현재 소스·의존성에서 교대로 실행했다. JavaScript는 전후 각각 7회, 나머지는 각각 3회 측정한 중앙값이다. 최초 조회는 새 제품 워크스페이스·워커·TS7 프로세스에서 바로 실행했고, 재조회는 같은 세션에서 완료한 검색을 반복했다. 첫 결과는 **첫 비어 있지 않은 서버 위치 배치**이며 브라우저 그리기 시간이 아니다. 호스트는 공유 환경이며 OS 캐시는 비우지 않았다. 각 샘플의 부하는 원자료에 기록했다.

단위 ms.

| 조회                    | 최초 첫 결과 전→후 | 최초 전체 완료 전→후 | 재조회 첫 결과 전→후 | 재조회 전체 완료 전→후 |
| ----------------------- | -----------------: | -------------------: | -------------------: | ---------------------: |
| JavaScript compareFiles |          4,664→525 |          8,769→6,956 |                59→61 |                  59→62 |
| TypeScript fileRevision |          1,260→491 |          6,170→5,644 |                75→73 |                  75→73 |
| TypeScript getWindow    |          1,146→467 |          6,209→6,373 |                79→82 |                  79→82 |
| 작은 정의 이동          |            849→690 |              931→767 |                32→33 |                  32→33 |

JavaScript 첫 결과는 7회 모두 **349~602ms**였다. 수정 전은 2,953~5,484ms였으며, 이전 절의 과거 2,319ms와 이번 재측정 조건을 섞어 향상률을 계산하지 않았다. 전체 완료 범위는 전 6,153~9,630ms, 후 6,156~12,920ms로 겹쳤다. getWindow 전체 완료도 6,209→6,373ms였으므로 이 변경을 TS7 전체 분석량 감소로 해석하지 않는다. 재조회 시간 범위도 겹쳤으며 추가 개선을 주장하지 않는다. [64개 기록](../../../benchmarks/native-analysis/results/2026-10-15/first-results/measured.jsonl), [중앙값·범위](../../../benchmarks/native-analysis/results/2026-10-15/first-results/summary.json).

### 정확성과 제품 확인

동일 모노레포에서 fileRevision 22개·getWindow 102개·정의 이동 1개·JavaScript 6개의 위치 집합이 수정 전후·최초·재조회 64회 모두 일치했다. 별칭·패키지 밖 사용처·선언 연결의 독립 사례 27개를 API와 뷰어 스트림에서 각각 최초·재조회한 108회도 누락·추가 위치가 없었다. TS·JS 독립 프로세스 검사에서는 첫 native definition 이전에 전송한 위치가 정확한 import 위치인지, 동명이인·그림자 변수를 제외하고 최종 위치와 재조회가 일치하는지 확인했다. 파일·설정·선언 연결·준비 범위 변경 검사 25개도 통과했다.

Wallaby 단위 검사 17개가 통과했다. 확장 통합 검사 190개 중 188개는 전체 실행에서 통과했다. 처음부터 완성된 파일별 개수를 기대하던 두 검사는 초기 import 배치와 최종 누적 개수를 각각 검증하도록 바꿨고, 해당 4개 통합 검사가 모두 통과했다. 1만 파일의 최종 2만 위치와 파일별 개수도 유지했다. 배포 실행 2개, lint·타입 검사·root 형식 검사·빌드가 통과했다. [단위 검사](../../../benchmarks/native-analysis/results/2026-10-15/first-results/units.txt), [확장 통합 검사](../../../benchmarks/native-analysis/results/2026-10-15/first-results/regression.txt), [부분 배치·완료 검증](../../../benchmarks/native-analysis/results/2026-10-15/first-results/stream-regression.txt), [독립 사례](../../../benchmarks/native-analysis/results/2026-10-15/first-results/fixture-results.jsonl).

실제 미리보기에서 compareFiles 사용처 6개와 파일 그룹이 표시되는 것을 확인했다. 파일을 연 후 사전 준비를 허용한 조건에서 클릭 뒤 615ms의 접근성 관찰에 사용처 목록이 있었다. 이는 최초 프로세스의 브라우저 paint 측정이 아니다. [UI 관찰 조건](../../../benchmarks/native-analysis/results/2026-10-15/first-results/ui-observation.json), [화면](../../../benchmarks/native-analysis/results/2026-10-15/first-results/preview.png).

[환경·실행 파일 해시](../../../benchmarks/native-analysis/results/2026-10-15/first-results/metadata.json), [측정 소스 해시](../../../benchmarks/native-analysis/results/2026-10-15/first-results/source-hashes.json), [소스 동일성](../../../benchmarks/native-analysis/results/2026-10-15/first-results/source-validation.txt), [고정 번들·측정 드라이버](../../../benchmarks/native-analysis/results/2026-10-15/first-results/clients-and-drivers.tar.gz), [fixture 입력](../../../benchmarks/native-analysis/results/2026-10-15/first-results/fixture-inputs.tar.gz)을 보존했다. 재현 시 드라이버의 임시 경로와 저장소 경로를 맞추고, 각 번들 옆에 공식 TS7 바이너리·SDK 및 TS6 SDK를 놓은 뒤 `run.py`와 `extra-javascript.py`를 실행한다. 프로파일 드라이버는 별도로 실행해 성능 수집과 겹치지 않게 한다.

## 전체 완료 병목 재검증 — 2026-10-15

첫 import 결과를 앞서 전송하는 동작은 유지했다. 뷰어가 유일한 `export const` 화살표 함수의 선언을 선택한 경우, 사용처 요청 전에 별도의 정의 요청을 하지 않는다. TS7 사용처 처리 내부의 정의·원본 확인은 그대로 실행한다. 이 경로는 지원을 표시한 작업공간에서만 사용하며, 함수 표현식·별칭 초기화·중복 이름·파싱 오류·호출 위치·선언 파일은 기존 경로로 처리한다. 편집 내용도 판정에 반영하고 취소 신호를 전달한다. [탐색 분기](../resolve-navigation.ts), [공유 선언 판독](../read-exported-function.ts).

모듈 구문이 없는 파일은 TS6 전처리도 생략한다. import·from·require·define, 삼중 슬래시 참조와 이스케이프가 있으면 기존 스캐너를 사용한다. 실제 모노레포 6,628개 코드 파일에서 전후 해석 결과 배열이 모두 같았고, 전처리 호출은 6,628→6,171회로 줄었다. 이 검사는 전후 순서가 고정되어 있으므로 검사 자체의 실행 시간 차이를 제품 향상률로 사용하지 않는다. [전 파일 결과 비교](../../../benchmarks/native-analysis/results/2026-10-15/completion/metadata-equivalence.json).

### 실제 모노레포 비교

수정 전의 첫 결과 개선 번들과 이번 번들을 동일한 현재 소스에서 교차 실행했다. getWindow는 각 7회, JavaScript compareFiles는 각 3회이며, 각 실행 직후 재조회도 측정했다. 수집 중 자체 빌드·테스트·소스 변경을 하지 않았다. 프로세스마다 별도 CODEX_HOME을 사용하고 OS 캐시는 비우지 않았다. 아래는 ms 중앙값이다. 첫 결과는 서버의 첫 비어 있지 않은 위치 배치이며 브라우저 paint 시간이 아니다.

| 조회                    | 최초 첫 결과 전→후 | 최초 전체 완료 전→후 | 재조회 첫 결과 전→후 | 재조회 전체 완료 전→후 |
| ----------------------- | -----------------: | -------------------: | -------------------: | ---------------------: |
| TypeScript getWindow    |            322→291 |          4,299→4,376 |                48→45 |                  48→45 |
| JavaScript compareFiles |            295→288 |          4,762→5,229 |                45→44 |                  45→44 |

getWindow의 수정 후 첫 결과는 287~349ms, 전체 완료는 3,878~4,539ms였다. 전후 같은 순번끼리 비교하면 전체 완료가 7쌍 중 6쌍에서 줄고 차이의 중앙값은 223ms였지만, 전체 완료 중앙값 자체는 개선되지 않았다. JavaScript 완료 시간도 4,628~6,262ms로 변동했다. **첫 결과의 1초 미만 유지는 확인했으나, 전체 완료 시간 개선을 달성했다고 판단하지 않는다.** 이전 절의 다른 부하 조건에서 얻은 6.37초와 이번 값을 직접 비교하지 않는다. [40개 기록](../../../benchmarks/native-analysis/results/2026-10-15/completion/measured.jsonl), [중앙값·범위](../../../benchmarks/native-analysis/results/2026-10-15/completion/summary.json), [쌍별 차이](../../../benchmarks/native-analysis/results/2026-10-15/completion/paired.json).

별도 프로파일에서는 뷰어의 native 조회가 정의·사용처 두 번에서 사용처 한 번으로 줄었고, 중간 입력 체크포인트도 없어졌다. 사용처 처리 내부 정의 확인은 남아 있다. 최종 경로의 한 프로파일에서는 메타데이터 3,001ms, 프로젝트 준비 확인 721ms, 확장 사용처 932ms가 관찰됐다. 메타데이터 중 파일 읽기 1,013ms, 구문 분석 319ms, 전처리 456ms, 모듈 해석 935ms가 포함된다. 프로파일 실행은 최종 속도 수집과 별개이며 다른 검사와 겹쳤으므로, 이 단계 시간들을 수정 전후 향상률로 사용하지 않는다. 전체 메타데이터·프로젝트 준비 비용은 남은 개선 대상이다. [수정 전 프로파일](../../../benchmarks/native-analysis/results/2026-10-15/completion/profile-details.log), [수정 후 프로파일](../../../benchmarks/native-analysis/results/2026-10-15/completion/profile-routing.log).

비동기 메타데이터 준비, Go CPU 병렬도 제한, 준비 확인 RPC 생략, 제한된 병렬 파일 읽기도 비교했다. 완료 시간의 이득이 재현되지 않아 제품 경로에서 모두 제외했다. [비교 기록과 후보 소스](../../../benchmarks/native-analysis/results/2026-10-15/completion/rejected).

### 정확성·변경 검증·제품 화면

getWindow 102개와 JavaScript 6개의 위치 집합은 전후·최초·재조회 40회 모두 같았다. 별칭·패키지 경계·CommonJS·선언 연결 등 독립 사례 27개를 API와 뷰어 스트림에서 최초·재조회한 108회도 기대 위치와 정확히 일치했다. 스트림은 초기 배치와 최종 배치의 합집합을 검사했으므로 잘못 전송한 초기 위치도 검출한다. 이 결과를 검증하지 않은 모든 동적 구문까지 누락이 없다는 보장으로 확장하지 않는다. [독립 사례 결과](../../../benchmarks/native-analysis/results/2026-10-15/completion/fixture-results.jsonl).

Wallaby 단위 109개, 언어별 작업공간·native·worker·캐시 통합 회귀 199개, 배포 실행 2개가 통과했다. 파일 내용·동일 크기/mtime·교체·생성·삭제·설정·별칭 경로·선언 맵·준비 범위 변경 25개 항목도 통과했다. 타입·oxlint·root 포맷·제품 빌드를 완료했다. 채택하지 않은 병렬 읽기를 되돌린 뒤 소스 577개의 해시가 최종 측정 시점과 같음을 확인했다. [통합 회귀](../../../benchmarks/native-analysis/results/2026-10-15/completion/routing-regression.txt), [단위 검사](../../../benchmarks/native-analysis/results/2026-10-15/completion/routing-all-units.txt), [소스 동일성](../../../benchmarks/native-analysis/results/2026-10-15/completion/source-validation.json).

최신 제품 빌드의 실제 미리보기에서 getWindow 파일을 열고, 검색 중 import 위치 2개가 먼저 표시된 뒤 사용처 102개로 완료되는 것을 확인했다. 이 관찰은 브라우저 paint 시간을 계측한 값은 아니다. [화면](../../../benchmarks/native-analysis/results/2026-10-15/completion/preview.png), [관찰 조건](../../../benchmarks/native-analysis/results/2026-10-15/completion/ui-observation.json).

[환경·공식 바이너리 해시](../../../benchmarks/native-analysis/results/2026-10-15/completion/metadata.json), [측정 소스 해시](../../../benchmarks/native-analysis/results/2026-10-15/completion/source-hashes.json), [고정 번들·소스·드라이버](../../../benchmarks/native-analysis/results/2026-10-15/completion/clients-and-drivers.tar.gz), [fixture 입력](../../../benchmarks/native-analysis/results/2026-10-15/completion/fixture-inputs.tar.gz)을 보존했다. 재현하려면 드라이버의 저장소·임시 경로를 맞추고 각 번들 옆에 같은 공식 TS7 바이너리·SDK 및 TS6 SDK를 둔 뒤 run과 extra 드라이버를 실행한다.

## 초기 결과 전송 완료와 웜업 중 조회 — 2026-10-15

native 결과의 소비 완료를 다음 분석 단계에 연결했다. 기존에는 스트림 수신기가 반환한 Promise를 기다리지 않아, 이미 찾은 결과의 전송이 끝나기 전에 동기 메타데이터 작업을 시작할 수 있었다. 이제 초기 위치와 부분 결과의 소비를 기다리고, 소비 오류와 취소도 조회에 전달한다. 고정된 `setImmediate` 양보는 제거했다. 여기서 소비 완료는 서버 스트림 경계의 신호이며 브라우저 paint 완료 신호는 아니다. [전송 경계](./create-result-delivery.ts#L5), [native 연결](./create-native-client.ts#L186), [위치 전송](./create-location-set.ts#L31).

검색 도중 웜업이 끝나는 경우에는 확장된 프로젝트를 한 번 더 검색한다. 기존 경로는 초기 검색 이후 웜업에 합류해도 전역 사용처 검색을 생략했고, 별도 프로젝트와 닫힌 폴더의 별칭 사용처 6개가 빠지는 사례를 실제 TS7에서 재현했다. 수정 후 6개 모두 찾았으며 추가 위치도 없었다. 검색 시작 전에 준비가 끝난 경우의 재사용은 유지한다. [준비 상태 판정](./scan-linked-references.ts#L68), [수정 전 누락](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/overlap-before.json), [수정 후](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/overlap-serial.json).

### 실제 모노레포 비교

직전 제품 번들과 최종 번들을 동일한 현재 모노레포에서 번갈아 실행했다. getWindow·JavaScript 각각 최초 7쌍과 재조회, 총 56개 기록이다. JavaScript는 완료 시간이 크게 변동해 최초 3쌍에서 7쌍으로 늘렸으며 느린 기록도 전부 포함했다. 자체 빌드·테스트·프로파일·소스 변경과 성능 수집을 겹치지 않았다. 프로세스별 CODEX_HOME을 분리했고 OS 캐시는 비우지 않았다. 아래는 서버 스트림 수신 기준 ms 중앙값이다.

| 조회                    | 최초 첫 결과 전→후 | 최초 전체 완료 전→후 | 재조회 첫 결과 전→후 | 재조회 전체 완료 전→후 |
| ----------------------- | -----------------: | -------------------: | -------------------: | ---------------------: |
| TypeScript getWindow    |            330→311 |          4,654→4,143 |                52→51 |                  52→51 |
| JavaScript compareFiles |            337→315 |          5,263→5,493 |                50→53 |                  50→53 |

getWindow의 초기 22개 결과 전달은 **698→378ms**, JavaScript의 6개 결과 전달은 **2,493→2,078ms**로 앞당겨졌다. 수정 후 첫 결과는 getWindow 297~417ms, JavaScript 304~650ms로 14회 모두 1초 미만이었다. getWindow의 한 실제 실행에서는 약 300ms에 2개, 372ms에 22개, 4,251ms에 102개가 전송됐다. 모든 기간에 결과가 계속 생기는 것은 아니며, 메타데이터 확장과 TS7 준비 중 새 결과가 없는 구간은 남는다. [배치 도착 시간](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/measured.jsonl), [초기 누적 결과](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/progress-summary.json).

getWindow 완료 중앙값은 줄었다. JavaScript 완료 범위는 전 4,780~11,247ms, 후 4,928~11,740ms로 변동이 컸고 중앙값은 늘었으므로 완료 시간 개선을 주장하지 않는다. 재조회 범위도 겹쳤다. [중앙값·범위](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/summary.json).

전역 사용처와 선언·별칭 검증을 동시에 수행하는 후보도 40개 기록으로 비교했으나 전체 완료가 느려져 제외했다. 무거운 검색은 기존 순서를 유지한다. 별도 최종 프로파일에서는 메타데이터 1,957ms, native 준비 확인 485ms, 확장 사용처 662ms가 관찰됐다. 이 단일 프로파일을 과거의 다른 부하 조건과 비교해 단계별 개선율로 해석하지 않는다. 전체 메타데이터·프로젝트 준비 작업량을 줄였다는 근거는 없으며, 이번 변경의 주된 효과는 확보한 결과의 전송을 앞당긴 것이다. [제외한 동시 처리](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/rejected), [최종 프로파일](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/serial-profile.log).

### 정확성 및 제품 검증

실제 모노레포의 getWindow 102개와 JavaScript 6개 위치 집합이 전후·최초·재조회 56회 모두 같았다. 별칭·패키지 밖 사용처·CommonJS·선언 연결 등 독립 사례 27개를 API와 뷰어 스트림에서 최초·재조회한 108회도 누락·추가 위치가 없었다. 스트림은 모든 초기 배치의 합집합까지 검사했다. 파일·설정·선언 맵·준비 범위 변경 25개 검증도 통과했다. [독립 사례 결과](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/fixture-results.jsonl).

최종 Wallaby 단위 119개, 실제 프로세스 통합 회귀 200개, 배포 실행 2개가 통과했다. 소비 완료 대기·소비 오류·부분 결과와 비어 있는 최종 응답·취소·웜업 합류를 검증했다. 중간 전체 실행에서는 기존 Rust 초안 사례가 한 번 실패했으나 단독 6개와 최종 전체 200개 재실행에서는 통과했다. Rust 구현은 변경하지 않았고 그 일회성 실패 원인은 확정하지 않았다. 타입·oxlint·root 포맷·빌드가 통과했다. [단위 검사](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/units-serial.txt), [최종 통합 회귀](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/regression-serial.txt), [초기 회귀 기록](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/regression.txt), [소스 동일성](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/source-validation.json).

최종 미리보기에서는 실제 파일을 연 뒤 첫 클릭의 약 0.8초 접근성 관찰에 사용처 102개가 검색 중 표시됐고 이후 완료됐다. 이 화면은 파일 진입 후 웜업이 진행될 수 있는 조건이며 콜드 실행의 paint 계측값으로 사용하지 않는다. [화면](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/preview.png), [관찰 조건](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/ui-observation.json).

[환경·바이너리 해시](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/metadata.json), [측정 소스 해시](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/source-hashes.json), [고정 번들·소스·드라이버](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/clients-and-drivers.tar.gz), [fixture 입력](../../../benchmarks/native-analysis/results/2026-10-15/progressive-delivery/fixture-inputs.tar.gz)을 보존했다. 재현 시 드라이버의 저장소·임시 경로를 맞추고 각 번들 옆에 같은 공식 TS7 바이너리·SDK를 둔다. TS6 표준 선언 파일은 번들 아카이브에 포함했다.

## JavaScript 완료 지연 검토 — 2026-10-15

전체 문서를 연 다음 보내던 준비 확인용 definition 요청을 제거했다. 뒤따르는 전체 범위 references 응답을 준비 확인으로 함께 사용하고, 그 응답 이후에 선언·별칭 연결을 검증한다. 초기 사용처 소비 완료 대기, 웜업 도중 확장된 범위의 재검색, 전체 문서 범위는 유지한다. 프로젝트 문서 계획은 같은 디렉터리의 설정 경로를 한 번만 찾는다. [검색 순서](./scan-linked-references.ts#L61), [설정 경로 재사용](./read-project-documents.ts#L11).

직전 최종 제품과 이 두 변경만 남긴 제품을 동일한 실제 모노레포에서 각각 7쌍 비교했다. 최초·같은 세션의 즉시 재조회 총 56개 기록이며 전후 순서를 번갈아 실행했다. 자체 테스트·빌드·프로파일·소스 변경을 수집과 겹치지 않았고 프로세스마다 CODEX_HOME을 분리했다. OS 캐시는 비우지 않았다. 아래는 서버 스트림 수신 기준 ms 중앙값으로 브라우저 paint 계측은 아니다.

| 조회                    | 최초 첫 결과 전→후 |        중간 결과 전→후 | 최초 전체 완료 전→후 | 재조회 첫 결과 전→후 | 재조회 완료 전→후 |
| ----------------------- | -----------------: | ---------------------: | -------------------: | -------------------: | ----------------: |
| TypeScript getWindow    |            528→530 |    611→622 (누적 22개) |          6,183→5,789 |                75→58 |             75→58 |
| JavaScript compareFiles |            349→349 | 2,321→2,295 (누적 6개) |          5,402→5,353 |                52→52 |             52→52 |

JavaScript 완료 중앙값 차이는 약 **49ms·0.9%**여서 큰 개선이라고 보지 않는다. 완료 범위는 전 5,332~7,861ms, 후 5,142~6,059ms였다. TypeScript 완료 중앙값은 줄었지만 후 범위가 4,467~11,652ms로 느린 실행도 남았다. 수정 후 첫 결과는 TypeScript 365~559ms, JavaScript 336~356ms로 14회 모두 1초 미만이었다. 초기 결과 전송을 바꾸지 않은 경로에서 관측된 작은 중앙값 차이를 구현상 가속으로 해석하지 않는다. [전체 기록](../../../benchmarks/native-analysis/results/2026-10-15/javascript-completion/measured.jsonl), [중앙값·범위](../../../benchmarks/native-analysis/results/2026-10-15/javascript-completion/summary.json), [중간 결과](../../../benchmarks/native-analysis/results/2026-10-15/javascript-completion/progress-summary.json).

별도 최종 프로파일에서는 메타데이터 1,354ms, TS7 준비를 포함한 확장 사용처 응답 1,081ms가 남았다. 수정 전 같은 순서의 프로파일은 메타데이터 1,401ms, 준비 확인 1,018ms와 확장 사용처 70ms였다. 준비 확인 요청을 없애도 실제 프로젝트 준비가 없어지는 것은 아니다. 메타데이터 검사 파일 6,630개, 모듈 해석 13,028회, 별칭 확인 173회는 전후 같았다. 이 단일 프로파일의 작은 차이는 개선율 근거로 쓰지 않는다. [최종 프로파일](../../../benchmarks/native-analysis/results/2026-10-15/javascript-completion/paired-after.log), [수정 전](../../../benchmarks/native-analysis/results/2026-10-15/javascript-completion/paired-before.log).

초기 TS7 검색과 메타데이터를 겹치는 후보도 검토했다. JavaScript만 짧은 시간 단위로 처리한 최종 후보는 7쌍에서 중간 결과가 **2,376→3,000ms**, 전체 완료가 **5,903→6,944ms**로 악화되어 제외했다. 3쌍의 예비 비교에서 좋아 보였던 결과를 최종 개선으로 채택하지 않았다. 모든 언어에 겹치기를 적용한 후보도 TypeScript 중간 결과를 늦춰 제외했다. 자체 선언의 native 정의 요청을 생략하는 후보도 JavaScript 이득을 입증하지 못해 제외했다. 이 후보들의 코드가 최종 제품에 남아 있지 않음을 579개 소스 해시로 확인했다. [제외 후보 기록·소스](../../../benchmarks/native-analysis/results/2026-10-15/javascript-completion/rejected), [최종 소스 동일성](../../../benchmarks/native-analysis/results/2026-10-15/javascript-completion/restored-validation.json).

실제 모노레포의 getWindow 102개와 JavaScript 6개 위치 집합이 56회 모두 일치했다. 독립 사례 27개를 API와 뷰어 스트림에서 최초·재조회한 108회에 누락·추가 위치가 없었다. 모든 초기 배치의 합집합도 검사했다. 프로젝트별 별칭·패키지 밖 소비자·CommonJS·조건부 exports·선언 map/source 연결을 포함하며, 파일·설정·선언 연결·준비 범위 변경 25개도 통과했다. [독립 기대 위치 검증](../../../benchmarks/native-analysis/results/2026-10-15/javascript-completion/fixture-results.jsonl), [변경 무효화](../../../benchmarks/native-analysis/results/2026-10-15/javascript-completion/linking.txt).

최종 소스에서 Wallaby 단위 120개, 실제 프로세스 통합 회귀 200개, 배포 실행 2개가 통과했고 타입·oxlint·root 포맷·빌드가 통과했다. 초기 겹치기 후보에서 통과한 201개 통합 검사는 제외 후보의 증거로 따로 보관했다. 최종 소스는 앞서 전체 검증과 성능 측정에 사용한 579개 파일과 바이트 단위로 같으며, 복원 이후 단위·빌드·배포 실행을 다시 확인했다. [단위](../../../benchmarks/native-analysis/results/2026-10-15/javascript-completion/restored-units.txt), [통합 회귀](../../../benchmarks/native-analysis/results/2026-10-15/javascript-completion/regression.txt), [배포 실행](../../../benchmarks/native-analysis/results/2026-10-15/javascript-completion/restored-distribution.txt).

[환경·공식 바이너리 해시](../../../benchmarks/native-analysis/results/2026-10-15/javascript-completion/metadata.json), [고정 번들·소스·드라이버](../../../benchmarks/native-analysis/results/2026-10-15/javascript-completion/clients-and-drivers.tar.gz), [fixture 입력](../../../benchmarks/native-analysis/results/2026-10-15/javascript-completion/fixture-inputs.tar.gz)을 보관했다. 재현할 때 드라이버의 임시 경로를 맞추고 번들 옆에 같은 공식 TS7 바이너리와 런타임을 연결한다. fixture의 절대 심볼릭 링크도 복원 위치에 맞춘다. JavaScript 전체 완료를 크게 줄이는 목표는 아직 남아 있다.

## 메타데이터·TS7 준비 세부 프로파일 — 2026-10-15

1.35초와 1.08초는 고정된 비용이 아니다. 후자는 Node 메타데이터가 끝난 뒤 남은 TS7 응답 대기이며, native 프로젝트 준비는 앞선 문서 열기부터 병렬로 진행된다. Node inspector와 TS7의 `custom/startCPUProfile`·`custom/stopCPUProfile`을 별도로 사용했다. 공식 클라이언트도 같은 [프로파일 인터페이스](https://github.com/microsoft/typescript-go/blob/main/_extension/src/client.ts#L490)를 사용하며 설치된 바이너리에서 실제 응답과 pprof 파일 생성을 확인했다. 프로파일 실행은 최종 속도 수집과 분리했다.

### Node 메타데이터

같은 현재 모노레포에서 기존 구현과 최종 구현을 계측한 한 쌍이다. 시간에는 파일 접근 변동과 프로파일 오버헤드가 있으므로 단일 단계의 시간 차이 전체를 변경 효과로 해석하지 않는다.

| 작업                | 수정 전 ms | 수정 후 ms |         작업 수 전→후 |
| ------------------- | ---------: | ---------: | --------------------: |
| 전체 메타데이터     |      1,234 |      1,057 | 코드 파일 6,630→6,630 |
| 모듈 해석           |        456 |        390 |         13,028→13,028 |
| import 전처리       |        245 |        239 |           6,205→6,205 |
| 소스 텍스트 확인    |        187 |        145 |           6,630→6,630 |
| 별칭 후보 문법 파싱 |        194 |        149 |           **264→155** |
| 별칭 후보 필터      |       20.4 |       20.1 |           6,630→6,630 |

확실한 작업량 감소는 불필요한 별칭 후보 파싱 **109개·41.3%**다. 실제 구조 분해 모듈 별칭 후보는 전후 **173개**이며 저장된 AST 수는 380→272였다. const 또는 쉼표 뒤의 구조 분해 시작과 모듈 호출 초기화 가능성을 확인한다. 타입·이스케이프·복잡한 주석이 모호하면 기존 파서로 넘긴다. import·선언 연결 메타데이터는 모든 파일에서 계속 확인한다. [필터](./may-have-module-bindings.ts#L26), [단위 검증](./__tests__/may-have-module-bindings.spec.ts), [전체 코드 범위·문법 조합 감사](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/filter-audit.json).

감사에서는 기존 파싱 후보 264개 모두를 실제 AST로 확인했고 제외된 109개에 모듈 별칭 후보가 없었다. 주석·타입·다중 선언·await·괄호·이스케이프 문법 조합 360개와 큰 불완전 주석 입력도 확인했다. 이 검사는 현재 코드 범위와 생성한 문법 조합의 증거이며 모든 가능한 잘못된 문법까지 증명하는 것은 아니다.

검증 도중 첫 후보 필터의 주석 정규식에서 선언 파일 하나가 353ms를 소비하는 문제가 발견됐다. 주석 전체를 먼저 캡처한 뒤 다음 연산자를 확인하도록 수정해, 같은 입력의 검사 비용이 약 0.86ms가 됐다. 주석 내부의 `:`·`=`를 연산자로 읽는 동작과 되돌아가기를 차단했다. 이는 기존 제품의 353ms를 제거했다는 뜻이 아니라 새 최적화 후보에 생긴 비용을 제품 반영 전에 제거한 것이다. [입력별 후보 비용](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/filter-timing-before.json), [수정 후](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/filter-timing-final.json).

하위 파일 접근 계측에서는 수정 전 실제 readFile 6,967회·213ms, fileExists 13,316회·71ms, directoryExists 5,211회·24ms, 경로 정규화 15,870회·26ms, 선언 원본 확인 528회·13ms, 프로젝트 설정 조회 13,026회·17ms였다. 이 하위 시간은 상위 모듈 해석·텍스트 확인 시간에 포함되므로 합산하지 않는다. [Node 상세 로그와 CPU 원본](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/profile-before).

### TS7 준비·확장 조회

문서 계획은 설정 프로젝트 **25개**, 설정에서 덮지 않는 파일 **1개**였고 선택 문서를 포함해 native에 열린 문서는 **27개**였다. 여기에 보이는 코드 6,630개의 실제 사용처 범위를 유지했다. 전송 시간은 약 5ms로 주요 병목이 아니었다.

Node 메타데이터와 동시에 진행하는 준비를 포함해 pprof를 수집했다. 수정 전 표본은 벽시계 2.68초 동안 누적 CPU 6.77초였다. Go의 여러 스레드에서 수집한 CPU 합계이므로 응답 시간과 같지 않다.

| native CPU 항목                        | 누적 CPU ms |
| -------------------------------------- | ----------: |
| 모듈 해석 `Resolver.ResolveModuleName` |       2,140 |
| 파일 검사 `os.Stat`                    |       1,720 |
| GC background mark                     |    약 1,260 |
| 메모리 페이지 처리 `runtime.madvise`   |       1,040 |

파일 검사는 모듈 해석에 포함되는 등 호출 스택이 겹치므로 이 항목들도 합산하지 않는다. 순수 checker 계산보다 파일 확인·모듈 해석과 GC·메모리 처리가 주요 표본이었다. 클라이언트에서 문서를 덜 열어 이 비용을 줄이면 프로젝트 밖·선언 소비자가 빠질 수 있어 범위를 축소하지 않았다. [native CPU 해석 결과](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/profile-before/go-summary.json), [pprof 원본](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/profile-before/go).

Node가 빨리 끝난 뒤의 native 잔여 응답 대기는 906→966ms였다. 열린 문서 시점부터 확장 사용처 응답까지의 구간은 약 2,211→2,076ms였다. 잔여 대기가 늘었다고 native 전체 준비가 같은 만큼 느려졌다고 해석하지 않는다. 동시에 이 한 표본으로 native 내부 준비가 개선됐다고 주장하지도 않는다. 공식 TS7 바이너리와 프로젝트 범위는 그대로다. [전후 상세 로그](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/profile-after/measure.log).

의존성 전처리 캐시 후보는 제외했다. 선언 99개는 이미 읽었던 파일이 아니라 초기 코드 목록 밖에서 새로 확인한 파일이어서 실제 전처리 재사용이 없었다. GOGC=200도 예비 비교와 프로파일만 수행했고 기본값은 바꾸지 않았다. [Go 공식 문서](https://go.dev/doc/gc-guide)에 설명된 CPU·메모리 교환을 수반하며, 이번 자료에서는 목표 준비 구간의 일관된 감소가 입증되지 않았다. [제외 후보 기록](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/rejected).

### 실제 모노레포 속도와 정확성

각 조회를 수정 전후 7쌍씩 번갈아 실행하고 최초·즉시 재조회까지 총 56개 기록을 수집했다. 프로세스마다 CODEX_HOME을 분리하고 OS 캐시는 비우지 않았다. 자체 테스트·빌드·프로파일·소스 변경과 수집을 겹치지 않았다. 아래는 **서버 스트림 수신 기준 ms 중앙값**이며 브라우저 paint 계측은 아니다.

| 조회                    | 최초 첫 결과 전→후 |        중간 결과 전→후 | 최초 전체 완료 전→후 | 재조회 첫 결과 전→후 | 재조회 완료 전→후 |
| ----------------------- | -----------------: | ---------------------: | -------------------: | -------------------: | ----------------: |
| TypeScript getWindow    |            285→279 |    351→347 (누적 22개) |          3,714→3,891 |                44→47 |             44→47 |
| JavaScript compareFiles |            299→309 | 2,410→2,318 (누적 6개) |          5,203→4,990 |                49→47 |             49→47 |

JavaScript 완료 중앙값은 약 4.1% 줄었지만, TypeScript 완료 중앙값은 약 4.8% 늘었다. 완료 시간 범위는 TypeScript 전 3,590~7,165ms·후 3,594~4,870ms, JavaScript 전 4,600~9,174ms·후 4,756~16,373ms였다. 후 JavaScript 한 실행은 중간 결과까지도 10,057ms가 걸렸다. 느린 표본을 제외하지 않았고 큰 완료 개선이나 모든 실행의 중간 지연 보장을 주장하지 않는다. 수정 후 첫 결과는 TypeScript 272~319ms, JavaScript 295~513ms로 14회 모두 1초 미만이었다. 첫·중간 결과 처리 코드는 유지했고 중앙값도 비슷했지만 개별 실행의 큰 편차는 남았다. [전체 기록](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/measured.jsonl), [중앙값·범위](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/summary.json), [중간 결과](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/progress-summary.json).

getWindow 102개와 JavaScript 6개 위치 집합은 전후·최초·재조회 56회 모두 일치했다. 별칭·프로젝트별 paths·패키지 밖 사용처·CommonJS·조건부 exports·.d.ts 원본 및 map 연결 등 독립 27사례를 API와 뷰어 스트림에서 최초·재조회한 108회에도 누락·추가 위치가 없었다. 초기 배치 전체의 합집합도 검사했다. 파일·설정·선언 연결·준비 범위 변경 25개도 통과했다. [독립 기대 위치 검증](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/fixture-results.jsonl).

최종 단위 131개, 전체 통합 200개, 배포 실행 2개와 타입·oxlint·root 포맷·빌드가 통과했다. 중간 전체 실행에서는 기존 Rust helper.rs 초안 초기화 사례가 한 번 실패했다. 원인은 확정하지 못했으며 같은 소스의 해당 6개와 전체 200개를 다른 검증 작업 없이 재실행한 결과는 통과했다. Rust 구현은 변경하지 않았고 해당 실패를 수정했다고 주장하지 않는다. [최초 전체 기록](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/regression-shipping.txt), [개별 재확인](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/navigation-retry.txt), [최종 전체 회귀](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/regression-shipping-retry.txt).

변경한 소스는 필터와 해당 단위 테스트 두 파일뿐이다. 기존 첫 결과 전송·웜업 합류·캐시·누락 수정 소스는 유지했으며, 측정 전후 579개 소스 해시가 같음을 확인했다. [소스 검증](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/source-validation.json), [환경·공식 바이너리 해시](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/metadata.json), [고정 번들·소스·드라이버](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/clients-and-drivers.tar.gz), [fixture 입력](../../../benchmarks/native-analysis/results/2026-10-15/metadata-breakdown/fixture-inputs.tar.gz)을 보관했다. 재현 시 드라이버의 임시 경로와 fixture 절대 심볼릭 링크를 맞추고, 각 번들 옆에 동일한 공식 TS7 바이너리·런타임을 연결한다.

## JavaScript 중간 결과 지연 분리 — 2026-10-16

직전 제품의 10.057초 중간 배치·16.373초 완료 표본에는 단계별 프로파일이 없어, 그 실행의 OS 대기나 GC 원인을 소급 확정할 수 없다. 이번에는 같은 제품을 새 프로세스에서 8회 실행하며 초기 LSP 요청과 단계별 시간, CPU·RSS를 기록했다. 느린 실행의 초기 definition 요청은 4,366ms였고 다른 실행은 1,745~3,173ms였다. 그 뒤 최초 references 요청은 62~117ms였다. 가장 느린 표본은 첫 배치 1,587ms, 중간 배치 6,079ms, 완료 9,646ms였다. 초기 import 이후의 사용처가 TS7 프로젝트 준비를 포함하는 definition 응답을 기다리는 구간을 확인했다. [단계·프로세스 기록](../../../benchmarks/native-analysis/results/2026-10-16/javascript-tail/diagnostic-traces.tar.gz).

초기 두 요청만 수집한 별도 TS7 CPU 프로파일은 벽시계 2,240ms, 여러 스레드의 누적 CPU 11,530ms였다. 파일 파서 작업의 누적 CPU 5,340ms, `syscall.rawsyscalln`의 직접 CPU 3,900ms, Darwin 메모리 재사용 호출 `runtime.madvise`의 직접 CPU 2,940ms, GC 백그라운드 마킹의 누적 CPU 1,500ms가 기록됐다. 상위·하위 프레임과 병렬 스레드의 수치는 겹치므로 더해서 벽시계 지연으로 해석하지 않는다. 이 프로파일은 전체 완료 구간을 측정한 앞선 프로파일과 수집 범위가 다르다.

TS7 RSS 관측치는 약 3.5~5GB였다. 같은 시점 호스트는 물리 메모리 48GiB, 스왑 사용 약 40GiB였지만 이 사실만으로 지연 원인을 스왑이라고 단정하지 않는다. 설정 제한 비교는 제품에 반영하지 않았다. GOMEMLIMIT=2GiB는 완료 14.49~17.60초로 악화됐고, GOMAXPROCS=4는 6.00~7.81초, 2는 9.24~9.38초로 해당 비교의 기본값보다 느렸다. GOGC=50도 일관된 이득이 없었다. GOMEMLIMIT는 RSS 상한이 아닌 소프트 제한이며, 작은 제한은 GC 부담을 키울 수 있다. [Go 공식 GC 안내](https://go.dev/doc/gc-guide). 기본 제품의 관련 환경 설정은 변경하지 않았다.

### 적용

첫 import 배치 소비가 끝나면 [직접 import에 연결된 파일 내부 사용처](./read-import-references.ts#L4)를 추가 전송한다. TS6의 **한 파일짜리 심볼 검사**로 import 별칭과 동일한 로컬 심볼만 선택한다. 외부 파일·표준 라이브러리는 이 검사에서 읽지 않는다. 가려진 매개변수·블록 변수·다른 객체의 속성명은 제외하고, 클로저·객체 축약값·computed key·typeof·로컬 export는 심볼 기준으로 확인한다. 중복 선언은 TS7 분석에 맡긴다.

[전송 순서](./query-native-symbol.ts#L31)는 첫 import 배치 → 확인된 로컬 사용처 배치 → 기존 TS7 전체 검색이다. 초기 배치를 다시 전송하지 않고, 소비 완료와 취소 확인을 유지한다. 기존 256개 초기 후보 한도는 조기 결과에만 적용한다. TS7 기본 엔진·공식 바이너리·전체 프로젝트 범위·별칭·패키지 밖 사용처·CommonJS·원본/선언 연결 검증은 유지한다. 이 변경은 TS7 전체 프로젝트 준비 작업을 줄인 변경이 아니며, 완료 시간의 급등을 모두 없앴다는 보장은 없다.

### 실제 모노레포 비교

직전 제품과 수정 제품의 고정 번들을 같은 6,631개 코드 파일에서 교대로 각 7회 실행했다. 매 실행은 새 워크스페이스·워커·TS7 및 CODEX_HOME으로 시작하고 바로 재조회했다. OS 캐시는 비우지 않았다. 자체 테스트·빌드·프로파일은 시간 측정과 겹치지 않았고, 모든 표본을 포함했다. 첫·중간 결과는 브라우저 그리기 시간이 아닌 **서버 스트림 배치 수신 시간**이다. 중간 결과는 같은 누적 위치 수에 도달한 시점이며 JavaScript 6개, getWindow 22개다. 재조회는 전체 완료 시간이다.

단위 ms, 중앙값.

| 조회                    | 첫 결과 전→후 | 중간 결과 전→후 | 전체 완료 전→후 | 재조회 전→후 |
| ----------------------- | ------------: | --------------: | --------------: | -----------: |
| JavaScript compareFiles |       345→356 |       2,451→407 |     5,719→5,236 |        49→51 |
| TypeScript getWindow    |       341→340 |         420→417 |     4,344→4,287 |        50→51 |

수정 후 JavaScript 첫 결과는 334~382ms, 중간 결과는 378~426ms, 완료는 5,072~5,834ms였다. 수정 전 완료는 5,105~6,515ms였다. getWindow 수정 후 첫 결과는 313~372ms, 완료는 3,995~4,513ms였다. 수정 후 최초 14회 모두 첫 배치는 1초 미만이었다. 이번 비교에서는 10초·16초 지연이 재현되지 않았으므로 급등 제거를 입증했다고 주장하지 않는다. 중간 결과의 TS7 준비 의존성은 제거했지만 전체 완료의 작은 차이는 호스트·GC 편차를 포함한다. [전체 표본](../../../benchmarks/native-analysis/results/2026-10-16/javascript-tail/measured.jsonl), [범위·중앙값](../../../benchmarks/native-analysis/results/2026-10-16/javascript-tail/summary.json), [자원 기록](../../../benchmarks/native-analysis/results/2026-10-16/javascript-tail/resources.jsonl).

### 검증

getWindow 102개·JavaScript 6개 위치 집합이 전후·최초·재조회 56회 모두 일치했다. 기존 27개 독립 사례와 JS/TS/TSX의 가려짐·객체 축약값·클로저·로컬 export 사례 3개를 API와 뷰어 스트림에서 최초·재조회한 **120회에서 누락·추가 위치가 없었다**. 완료 결과뿐 아니라 조기 배치의 합집합도 비교했다. [기대 위치 대조](../../../benchmarks/native-analysis/results/2026-10-16/javascript-tail/fixture-results.jsonl).

파일·설정·선언 맵·범위 변경 기존 25개 검사와, 이번 조기 결과 경로의 닫힌 파일 수정·새 패키지 밖 파일·파일 삭제·선택한 소스 변경 등 API/뷰어 12개 검사가 통과했다. [조기 결과 무효화](../../../benchmarks/native-analysis/results/2026-10-16/javascript-tail/early-invalidations.json). 단위 138개, Python/Rust/Ruby와 기존 검색·캐시 경계를 포함한 전체 통합 200개, 배포 2개, 타입·oxlint·root 포맷·빌드도 통과했다. 첫 배치 소비 전 로컬 확장을 시작하지 않는 동작, 첫 배치에서 취소할 때 확장을 멈추는 동작을 단위 검사하고, 실제 TS7 정의 응답 전에 가려진 이름을 제외한 조기 호출이 전달되는 동작을 통합 검사했다. [실행 기록](../../../benchmarks/native-analysis/results/2026-10-16/javascript-tail/verification-logs.tar.gz).

측정 중 소스 해시가 동일했고 공식 TS7 7.0.2 바이너리 해시도 유지됐다. 코드 형태의 재현 자료는 검색 범위를 바꾸지 않도록 압축했다. 재현하려면 드라이버의 저장소·임시 경로를 맞추고 번들 옆에 같은 공식 TS7·Python 런타임을 연결한다. fixture manifest의 절대 경로와 심볼릭 링크를 복원한 뒤 API/뷰어 대조를 실행한다. [환경·범위](../../../benchmarks/native-analysis/results/2026-10-16/javascript-tail/metadata.json), [고정 번들·소스·드라이버](../../../benchmarks/native-analysis/results/2026-10-16/javascript-tail/clients-and-drivers.tar.gz), [fixture 입력](../../../benchmarks/native-analysis/results/2026-10-16/javascript-tail/fixture-inputs.tar.gz).

## TS7 프로젝트 일괄 준비 — 2026-10-16

### 병목과 적용

기존 경로는 저장된 프로젝트 대표 파일도 각각 `didOpen`으로 등록했다. 공식 7.0.2의 [문서 열기 처리](https://github.com/microsoft/typescript-go/blob/2bd066d87f5bafd315be9f40889d0a60b9e58e0b/internal/project/session.go#L271)는 각 등록에서 스냅샷을 갱신한다. JavaScript 조회에서 27개 편집 문서를 열며 발생하는 파싱·메모리 처리 비용을 확인했다.

[일괄 준비](./create-native-preparation.ts#L16)는 같은 LSP 프로세스에 `custom/initializeAPISession`으로 연결하고, 기존 대표 파일·범위 밖 파일 목록을 **한 번의 `updateSnapshot({openFiles})`**으로 준비한다. 공식 [API 구현](https://github.com/microsoft/typescript-go/blob/2bd066d87f5bafd315be9f40889d0a60b9e58e0b/internal/api/session.go#L781)과 설치된 SDK 7.0.2의 `openFiles` 계약을 확인했고 실행 파일에서도 검증했다. 파일마다 포함되는 상위 설정을 찾는 동작과 프로젝트 참조 유지가 제공된다. 준비 응답의 임시 스냅샷 핸들은 해제하고 API 연결의 파일·프로젝트 참조는 세션 수명 동안 유지한다. 별도 분석 엔진이나 새 패키지는 추가하지 않았다.

[문서 동기화](./create-native-client.ts#L67)는 수정 중인 파일과 이미 열었던 문서의 내용을 먼저 반영한다. 저장된 나머지 파일만 일괄 준비한다. API가 없거나 실패하면 이전에 API로 유지하던 파일까지 문서 방식으로 복원한다. API 연결·스냅샷 대기 취소와 세션 종료를 처리하며, 첫 import·파일 내부 사용처 배치 이후에 준비를 시작하는 기존 순서는 유지한다. 공식 바이너리와 Go 메모리·병렬 설정은 그대로다.

저장 파일을 단순히 닫힌 상태로 조회하는 후보도 비교했으나, 프로젝트별 `paths` 사용처 3곳이 빠져 제외했다. 속도 개선을 위해 프로젝트 범위를 줄인 후보를 제품에 포함하지 않았다. [실험과 실패 대조 기록](../../../benchmarks/native-analysis/results/2026-10-16/batch-preparation/profiles-and-pilots.tar.gz).

### 준비 구간 프로파일

초기 references 이후부터 선언 연결까지 별도로 수집했다. 프로파일 수집·중지와 프로젝트 범위 조회는 아래 최종 속도 측정에 포함하지 않았다. 같은 LSP 세션을 별도 API로 읽어 확인한 **26개 프로젝트의 설정·루트 파일 목록이 전후 모두 일치**했다. 설정된 프로젝트 25개와 inferred 프로젝트 1개이며, 프로젝트 간 중복을 포함한 루트 파일 목록 합계는 16,765개다. [범위 대조](../../../benchmarks/native-analysis/results/2026-10-16/batch-preparation/profile-scope.json).

| 별도 프로파일 항목         |      전 |      후 |
| -------------------------- | ------: | ------: |
| 준비 구간 벽시계           | 3,052ms | 2,018ms |
| TS7 누적 CPU               | 6,620ms | 2,270ms |
| 파일 파서 작업 누적 CPU    | 2,590ms | 1,070ms |
| `runtime.madvise` 직접 CPU | 1,940ms |   760ms |
| JavaScript 편집 문서 수    |      27 |       1 |

여러 스레드의 CPU와 상하위 프레임은 겹치므로 더해서 벽시계 시간으로 해석하지 않는다. 별도 3쌍 예비 측정에서 TS7 RSS 관측 최댓값의 중앙값은 약 4.62GB→4.10GB였다. 250ms 간격 표본이므로 실제 피크나 상한을 뜻하지 않는다. 파싱·메모리 재사용 비용이 줄었고, 프로젝트 범위는 유지됐다. [원본 프로파일·예비 측정](../../../benchmarks/native-analysis/results/2026-10-16/batch-preparation/profiles-and-pilots.tar.gz).

### 실제 모노레포 비교

직전 제품의 첫·중간 결과 개선을 포함한 고정 번들과 수정 번들을 **6,633개 코드 파일**에서 조회별 10쌍씩 교대로 실행했다. 최초·즉시 재조회까지 총 80개 기록이다. 매 프로세스는 새 워크스페이스·워커·TS7 및 CODEX_HOME으로 시작했고 OS 캐시는 비우지 않았다. 다른 자체 테스트·빌드·프로파일·소스 변경과 수집을 겹치지 않았다. 모든 표본을 포함했다. 두 번들에 같은 소량의 단계·resourceUsage 기록을 삽입했고 CPU 프로파일은 수집하지 않았다.

단위 ms, 중앙값. 첫·중간 결과는 **서버 스트림 배치 수신**이며 브라우저 그리기 시간이 아니다. 중간 결과는 JavaScript 누적 6개, getWindow 누적 22개 도달 시점이다. 재조회는 전체 완료다.

| 조회                    | 첫 결과 전→후 | 중간 결과 전→후 | 전체 완료 전→후 | 재조회 전→후 |
| ----------------------- | ------------: | --------------: | --------------: | -----------: |
| JavaScript compareFiles |       304→313 |         348→356 |     5,326→4,055 |        47→48 |
| TypeScript getWindow    |       286→287 |         354→353 |     3,771→3,718 |        47→46 |

JavaScript 완료 중앙값은 약 24% 줄었다. 수정 전 완료 범위는 4,993~9,878ms, 후는 3,858~4,511ms였다. getWindow 완료는 3,649~4,443ms→3,640~4,071ms로 중앙값 차이가 작았다. 수정 후 JavaScript 첫 결과는 288~339ms, 중간 결과는 324~388ms였다. getWindow는 첫 결과 279~437ms, 중간 결과 345~579ms였다. 수정 후 최초 20회 모두 첫·중간 배치가 1초 미만이었다. [전체 표본](../../../benchmarks/native-analysis/results/2026-10-16/batch-preparation/measured.jsonl), [집계](../../../benchmarks/native-analysis/results/2026-10-16/batch-preparation/summary.json).

전송 대기와 준비 완료의 의미가 달라져 `openTransport`만 비교하면 안 된다. JavaScript는 문서 준비와 후속 source 조회의 각 중앙값이 4+1,172ms→408+63ms였다. 메타데이터 처리 중앙값은 1,235→950ms였다. getWindow는 준비 3→1,237ms, 메타데이터 1,350→885ms, 후속 source 조회 1,482→693ms였다. 각 항목 중앙값의 합은 전체 중앙값과 같지 않으며, 메타데이터의 실제 처리 범위·별칭 검증은 유지했다. 수정 후 모든 최초 표본에서 일괄 준비 1회·파일 26개·fallback=false를 기록했다. [단계 기록](../../../benchmarks/native-analysis/results/2026-10-16/batch-preparation/stages.json).

### 급등 표본

이번 수정 전 JavaScript run 3에서 **9,878ms**가 재현됐다. 해당 Native query 시작 후 초기 definition 응답은 1,650ms, 초기 references 완료는 1,714ms였다. 이후 메타데이터 처리에 2,851ms, 후속 TS7 source 응답 대기에 4,346ms가 걸렸다. 이 표본에서는 최초 정의보다 문서 확장 이후의 분석이 지연의 큰 부분이었다. 기존 27개 문서 등록과 모든 결과 위치·별칭 후보 수는 다른 표본과 같았다. [원본 단계 로그](../../../benchmarks/native-analysis/results/2026-10-16/batch-preparation/milestone-logs.tar.gz).

해당 프로세스 실행 동안 시스템 전체 `Compressions` 카운터는 2,325,431, `Decompressions`는 2,161,490 증가했다. 인접한 수정 후 run 3에서는 각각 0과 25,337이었다. 검색 프로세스 트리의 CPU 시간도 약 28.71초로, 수정 전 중앙값 22.30초보다 컸다. 수정 후 중앙값은 17.80초였다. **메모리 압축·해제가 급증한 시점과 검색 지연이 겹친 것**은 확인했지만, 시스템 전체 카운터이므로 이를 모두 TS7에 귀속하거나 OS 내부 인과관계를 단정하지 않는다. 단순한 디스크 스왑 가설과도 구분한다. [시스템·프로세스 트리 자원 기록](../../../benchmarks/native-analysis/results/2026-10-16/batch-preparation/resources.jsonl).

중복 스냅샷 준비의 파싱·메모리 처리 부담은 줄였다. 이번 수정 후 최대는 4.51초였으나, 원본 16.373초 실행에는 단계 기록이 없고 이번 비교에서도 16초가 재현되지 않았다. **원본 16초의 정확한 원인 확정이나 모든 환경에서 급등이 사라졌다는 보장은 남은 검증 사항**이다.

### 정확성과 변경 무효화

전후·최초·재조회 80회에서 getWindow 102개·JavaScript 6개 위치가 모두 같았다. 별칭·프로젝트별 paths·패키지 밖 사용처·CommonJS·조건부 exports·원본/선언 및 map 연결·UTF 인코딩 등 30개 독립 사례를 API와 뷰어 스트림에서 최초·재조회한 **120회에 누락·추가 위치가 없었다**. 조기 배치의 합집합도 비교했다. [독립 기대 위치 검증](../../../benchmarks/native-analysis/results/2026-10-16/batch-preparation/fixture-results.jsonl).

기존 파일·설정·선언 맵·범위 변경 25개와, 조기 결과의 닫힌 파일 수정·새 파일·삭제·소스 변경 등 API/뷰어 12개 검사가 통과했다. 실제 일괄 준비 1회·편집 문서 1개를 확인하고, 중첩 프로젝트 별칭을 core→other로 바꿨을 때 이전 사용처가 사라지고 새 정의에 연결되는 통합 검사를 추가했다. 이전 API 연결 실패 시 앞서 준비한 프로젝트도 복원하는 동작, 소스 동기화·취소·연결 및 핸들 정리도 단위 검사했다.

단위 152개, 기존 전체 통합 200개와 새 통합 사례 1개, 배포 실행 2개, 타입·oxlint·root 포맷·빌드가 통과했다. 기존 전체 200개 실행 후 새 사례를 포함한 네이티브 10개와 배포 2개를 실행했다. Python/Rust/Ruby의 기존 회귀도 전체 실행에 포함됐다. [검증 실행 기록](../../../benchmarks/native-analysis/results/2026-10-16/batch-preparation/verification-logs.tar.gz), [조기 결과 무효화](../../../benchmarks/native-analysis/results/2026-10-16/batch-preparation/early-invalidations.json).

측정 전후·최종 확인에서 582개 소스 해시가 같았다. 직전 제품 대비 초기 배치·로컬 심볼·메타데이터·선언/별칭 연결 로직은 유지했다. 새 준비 모듈·단위 테스트와 클라이언트 준비·수명 관리 및 관련 회귀만 변경했다. 코드 형태의 자료는 검색 범위를 바꾸지 않도록 압축했다. [환경·공식 바이너리 해시](../../../benchmarks/native-analysis/results/2026-10-16/batch-preparation/metadata.json), [소스 검증](../../../benchmarks/native-analysis/results/2026-10-16/batch-preparation/source-validation.json), [고정 번들·소스·드라이버](../../../benchmarks/native-analysis/results/2026-10-16/batch-preparation/clients-and-drivers.tar.gz), [fixture 입력](../../../benchmarks/native-analysis/results/2026-10-16/batch-preparation/fixture-inputs.tar.gz)을 보관했다. 재현 시 저장소·임시 경로와 fixture 절대 경로를 맞추고 번들 옆에 같은 공식 실행 파일·SDK를 연결한다. `instrument.py`와 `run.py`로 단계 기록을 포함한 교차 측정을 실행할 수 있다.

## 프로젝트 준비와 메타데이터 병렬 처리 — 2026-10-16

### 변경과 전송 경계

직전 일괄 준비는 API 스냅샷 응답 뒤에 메타데이터를 확장했다. 이번에는 첫 import·로컬 사용처 배치를 보낸 뒤, [API 요청의 실제 소켓 전송 완료](./create-native-preparation.ts#L41)를 신호로 [메타데이터 확장](./scan-linked-references.ts#L61)을 시작한다. 서버 준비와 로컬 변환을 겹치며, 확장된 원본·선언·별칭 조회는 두 작업이 끝난 뒤 시작한다. 타이머나 전송 시간을 추측한 지연은 쓰지 않는다.

요청별 전송 신호를 따로 관리해 준비 요청이 겹쳐도 섞이지 않는다. API가 실패하면 이전처럼 전체 프로젝트의 문서 등록을 복구하고, 그 등록의 송신 완료 뒤 진행한다. 초안 동기화·취소 신호 전달을 유지하며, 메타데이터 오류가 나면 진행 중인 준비를 정리한 뒤 오류를 전달한다. 배치 준비·TS7 기본 엔진·첫/중간 스트리밍·별칭 검증·검색 범위와 변경 무효화는 유지했다.

### 전후 속도

6,633개 실제 코드 파일에서 직전 제품과 수정 버전을 조회별 10쌍씩 교대로 실행했다. 최초·즉시 재조회까지 총 80회이며 새 워크스페이스·워커·TS7·CODEX_HOME을 사용했다. OS 캐시는 비우지 않았다. 두 번들에 같은 단계/resourceUsage 기록만 넣고, 자체 테스트·빌드·포맷·CPU 프로파일과 최종 수집은 겹치지 않았다. 다른 작업은 중단하지 않았으며 시스템 부하는 변동했다. 느린 최종 표본도 모두 포함했다.

단위 ms, 중앙값. 첫·중간 시간은 서버 스트림 배치 수신이며 브라우저 그리기 시간이 아니다. 중간 결과의 같은 비교 기준은 getWindow 누적 22개, JavaScript 누적 6개다.

| 조회                    | 첫 결과 전→후 | 중간 결과 전→후 | 전체 완료 전→후 | 재조회 완료 전→후 |
| ----------------------- | ------------: | --------------: | --------------: | ----------------: |
| getWindow               |       485→531 |         576→617 |     5,608→4,611 |             76→67 |
| JavaScript compareFiles |       427→415 |         481→467 |     4,837→4,560 |             63→71 |

getWindow 전체 완료 중앙값은 17.8%, JavaScript는 5.7% 감소했다. 전후 쌍별로 getWindow 10/10, JavaScript 8/10에서 전체 완료가 줄었다. 첫 결과의 쌍별 차이 중앙값은 각각 +2.85ms, -6.21ms다. getWindow 첫·중간 중앙값의 46/40ms 증가와 JavaScript 재조회 8ms 증가도 표에 그대로 남겼다. 첫/중간 구현은 바꾸지 않았지만 모든 환경에서 정확히 같은 시간이라고 단정하지 않는다. 수정 후 20개 최초 조회 모두 첫·중간 배치가 1초 이내였다. 최대는 getWindow 첫 823ms·중간 925ms, JavaScript 첫 520ms·중간 615ms다.

전체 완료 범위는 getWindow 4.76–7.74초→3.75–5.94초, JavaScript 4.09–5.44초→3.83–6.64초다. JavaScript 상위 지연은 개선됐다고 볼 수 없다. 이번 시스템 부하에서 직전 제품도 예전의 4.06초보다 느려졌으므로, 예전 기록과 이번 수정 후 절대 시간을 직접 비교하지 않는다. [원본 80회](../../../benchmarks/native-analysis/results/2026-10-16/preparation-overlap/measured.jsonl), [요약](../../../benchmarks/native-analysis/results/2026-10-16/preparation-overlap/summary.json), [단계](../../../benchmarks/native-analysis/results/2026-10-16/preparation-overlap/stages.json).

초기 references 이후 프로젝트 대표 계산·준비·메타데이터까지의 합쳐진 구간 중앙값은 getWindow 3,451→2,389ms, JavaScript 2,005→1,726ms였다. 메타데이터 자체는 동시 처리 부하로 getWindow 1,402→1,852ms, JavaScript 1,174→1,298ms로 늘었다. getWindow의 다음 확장 references는 982→1,162ms였다. 새 `projectPreparation` 계측에는 대표 파일 계산과 응답 처리 전 메타데이터 시간이 겹쳐 들어가므로 순수 TS7 CPU 시간으로 해석하지 않는다. 이번 이득은 TS7 작업량 축소가 아니라 두 작업의 대기 구간을 겹친 결과다.

### 남은 지연과 급등 조사

별도 전체 네이티브 조회 CPU 프로파일에서 TS7 누적 CPU는 16.14→16.03초로 거의 같았다. 여러 스레드의 CPU 합계이며 벽시계가 아니다. 직접 `runtime.madvise` CPU 3.60→3.84초와 GC 객체 스캔·메모리 초기화가 상위에 남았다. 프로파일 전체 벽시계도 5.39→5.48초여서, 이 한 쌍만으로 개선을 주장하지 않고 위 80회와 분리했다. 원본 파일 처리·메모리 회수와 동시 처리 경합이 다음 조사 대상이다. 프로파일에 없는 함수의 비용을 0으로 취급하지 않는다.

최종 JavaScript의 느린 수정 후 표본 6.64초는 초기 definition 3.11초(수정 후 중앙값 1.95초), 메타데이터 2.12초(중앙값 1.30초)가 함께 늘었다. 해당 프로세스 트리 CPU는 약 20.61초였고, 시스템 압축 카운터가 355,627회 늘었다. 시스템 전체 카운터이므로 모든 활동을 TS7에 귀속하거나 인과관계를 확정하지 않는다. [자원 원본](../../../benchmarks/native-analysis/results/2026-10-16/preparation-overlap/resources.jsonl), [자원 요약](../../../benchmarks/native-analysis/results/2026-10-16/preparation-overlap/resource-summary.json).

최종 비교와 별개의 예비 실행은 포맷·단위 검사·소스 수정과 겹쳤고 시스템 부하도 높았다. 이때 직전 제품 JavaScript 15.44초, 수정 후보 30.98초·79.21초가 관찰됐다. 79.21초 실행 동안 시스템 압축/해제 카운터는 각각 약 1,483만/784만 증가했다. 해당 실행에는 단계·네이티브 CPU 프로파일이 없고 소스 해시 검증도 실패해 최종 전후 비교로 사용할 수 없다. 불리한 자료도 보관하며, 새 변경이 부하 환경의 급등을 해결했다고 주장하지 않는다. 원본 16.373초의 정확한 원인 귀속과 급등 제거는 여전히 확인되지 않았다. [전체 프로파일 및 예비 자료](../../../benchmarks/native-analysis/results/2026-10-16/preparation-overlap/profiles-and-pilot.tar.gz).

### 정확성과 실행 검증

80회에서 getWindow 102개·JavaScript 6개 위치가 전후·최초·재조회 모두 일치했다. 별칭·프로젝트별 paths·패키지 밖 사용처·CommonJS·조건부 exports·원본/선언 및 map 연결·UTF 인코딩 등 30개 독립 사례를 API/뷰어에서 최초·재조회한 120회에 누락·추가 위치가 없었다. 조기 배치 합집합까지 비교했다. 동일 LSP 세션을 API로 읽은 26개 프로젝트의 설정과 루트 파일 목록도 전후 일치했다. [기대 위치 검증](../../../benchmarks/native-analysis/results/2026-10-16/preparation-overlap/fixture-results.jsonl), [프로젝트 범위](../../../benchmarks/native-analysis/results/2026-10-16/preparation-overlap/profile-scope.json).

파일·설정·선언 map·범위 변경 25개와 조기 결과 변경 무효화 12개 검사가 통과했다. 단위 157개와 배포 서버 2개가 통과했다. 전체 통합 201개 중 200개가 첫 실행에서 통과했고, 실패한 Rust 초안 복원 1건은 해당 파일 단독 재실행의 6개 검사에서 통과했다. 이 변경에서 Rust 코드나 단언은 수정하지 않았다. 타입·oxlint·root 포맷·빌드와 diff 검사를 실행했다. 빌드의 샌드박스 쓰기 실패는 승인된 실행 환경에서 복구·재실행했다. [실행 기록](../../../benchmarks/native-analysis/results/2026-10-16/preparation-overlap/verification-logs.tar.gz).

수집 전후 582개 소스 해시가 같았다. 직전 제품 대비 8개 파일만 변경했고 나머지 574개 소스는 동일하다. 첫/중간 결과의 직접 탐색·단일 파일 심볼·메타데이터·선언/별칭 검증 알고리즘은 그대로다. 최종 소스로 다시 묶은 번들과 측정 번들의 차이는 준비 인자 객체의 `paths`/`options` 두 속성 순서뿐임을 대조했다. 두 값은 단순 지역 값이며 이름으로 구조 분해해 읽는다. 공식 TS7 바이너리 해시도 유지됐다. [소스 검증](../../../benchmarks/native-analysis/results/2026-10-16/preparation-overlap/source-validation.json), [번들 대조](../../../benchmarks/native-analysis/results/2026-10-16/preparation-overlap/bundle-validation.json), [환경](../../../benchmarks/native-analysis/results/2026-10-16/preparation-overlap/metadata.json), [고정 번들·소스·드라이버](../../../benchmarks/native-analysis/results/2026-10-16/preparation-overlap/clients-and-drivers.tar.gz), [fixture 입력](../../../benchmarks/native-analysis/results/2026-10-16/preparation-overlap/fixture-inputs.tar.gz)을 보관했다. 재현 시 저장소·임시 경로와 fixture 절대 경로를 맞추고 번들 옆에 같은 실행 파일·SDK를 연결한다.
