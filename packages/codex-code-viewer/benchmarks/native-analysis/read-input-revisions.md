# TS7 재조회 변경 확인 최적화

후속 [최초 조회 준비 겹치기](create-workspace-links.md)에서 재조회 변경 확인을 유지하고 최초 전체 완료를 줄였다. 아래는 이전 회차 기록이다.

2026-10-14. 기존 TS6 제품 경로와 TS7 검색·별칭·선언 연결 방식은 유지하고, TS7 실험의 파일 메타데이터 읽기만 변경했다. 최종 비교는 수정 전·후를 같은 esbuild/Node 24 ESM 번들 형태로 고정했다. 이전 회차와 수치를 섞지 않는다.

## 변경과 근거

변경 확인은 요청 시작 전과 결과 처리 후에 전체 입력 경로를 확인한다. 기존 [readPathRevisions](../../src/server/navigation-cache/read-path-revisions.ts)는 각 경로마다 Promise를 만들고, 없는 파일도 거부된 Promise와 오류 객체를 거쳤다. [프로파일](results/2026-10-14/revisions/profile.txt)에서는 23544개 경로 중 12366개가 없었다. 그 경로들은 모듈 해석에서 확인한 후보이며, 이후 생성될 수 있으므로 검사에서 제외하지 않는다.

[readInputRevisions](read-input-revisions.ts)은 statSync의 throwIfNoEntry:false로 없는 파일을 null로 유지한다. 256개마다 setImmediate로 이벤트 루프에 제어를 돌려준다. 모든 경로, dev/ino/size/mtimeNs/ctimeNs와 오류→null 계약, 묶음 사이 취소를 유지한다. 경로를 생략하거나 TTL로 변경 확인을 미루지 않는다. 기존 제품의 readPathRevisions는 수정하지 않았다.

작은 대조 실험 5회에서 동일 경로의 값 전체가 기존 방식과 일치했다. Promise 방식 중앙값 75.875ms→새 방식 37.857ms였다. 비교 assert 실행 시간은 측정에서 제외했다. [실험 결과](results/2026-10-14/revisions/probe.txt), [재현 입력·프로파일 코드](results/2026-10-14/revisions/profiling-inputs.tar.gz). 이 수치를 실제 네이티브 검색 전체 시간과 혼동하지 않는다.

## 실제 모노레포 비교

TS7 7.0.2, TS6 런타임 6.0.3, Node 24.15.0. 각 실행은 새 프로세스와 빈 CODEX_HOME을 사용하며 최초 완료 직후 같은 심볼을 재조회한다. fileRevision/getWindow는 각 5회, 다른 두 조회는 각 3회며 세 방식의 순서를 순환했다. 실제 4개 조회가 끝날 때까지 저장소 수정·포맷·테스트를 실행하지 않았다. OS 파일 캐시는 비우지 않았고 모듈 로딩·사전 번들 준비는 제외했다.

초기 비교는 수정 전 번들/수정 후 tsx 소스 실행이었다. 실행 형태가 달라지는 조건을 제거하기 위해 양쪽을 같은 옵션으로 번들한 뒤 전체 비교를 다시 수행했다. 아래는 다시 측정한 최종 510개 기록만 사용한다. 초기 비교는 diagnostic-unmatched 아카이브에 따로 보관했다.

단위 ms, 중앙값. 첫 결과는 비어 있지 않은 서버 배치 수신 시각이며 브라우저 paint가 아니다. 재첫/재완료는 같은 세션의 재조회다.

| 조회                       | 방식        |  첫 결과 | 전체 완료 |    재첫 |  재완료 |
| -------------------------- | ----------- | -------: | --------: | ------: | ------: |
| fileRevision 사용처 24개   | 기존 TS6    | 1196.649 |  7979.928 |  36.180 |  36.196 |
| fileRevision 사용처 24개   | 수정 전 TS7 |  347.089 |  3951.195 | 168.464 | 251.554 |
| fileRevision 사용처 24개   | 수정 후 TS7 |  329.915 |  3891.671 | 145.524 | 187.032 |
| getWindow 사용처 102개     | 기존 TS6    | 1290.506 |  8006.343 |  37.664 |  37.698 |
| getWindow 사용처 102개     | 수정 전 TS7 |  378.628 |  4526.706 | 157.150 | 362.074 |
| getWindow 사용처 102개     | 수정 후 TS7 |  325.045 |  5010.443 | 125.043 | 253.836 |
| 앱 getWindow 정의 1개      | 기존 TS6    |  603.558 |   637.476 |  23.405 |  23.416 |
| 앱 getWindow 정의 1개      | 수정 전 TS7 |  356.103 |   385.274 |  23.975 |  43.978 |
| 앱 getWindow 정의 1개      | 수정 후 TS7 |  349.038 |   370.174 |  23.078 |  40.750 |
| JS compareFiles 사용처 6개 | 기존 TS6    | 1047.798 |  7113.287 |  33.801 |  33.814 |
| JS compareFiles 사용처 6개 | 수정 전 TS7 | 1152.383 |  4124.941 | 178.221 | 257.478 |
| JS compareFiles 사용처 6개 | 수정 후 TS7 | 1135.327 |  4032.016 | 104.726 | 146.319 |

사용처 재완료는 fileRevision 약 26%, getWindow 약 30%, JS 약 43% 줄었다. 기존 TS6 완료 캐시의 약 34–38ms는 여전히 TS7보다 빠르다. TS7 실험에는 완료 결과 캐시를 추가하지 않았으며 네이티브 references 조회를 계속 수행한다.

최초 전체 완료는 fileRevision 약 60ms, JS 약 93ms 줄었고 getWindow는 약 484ms 늘었다. 최초 첫 배치까지의 검색 절차는 변경하지 않았다. 따라서 이번 변경으로 최초 전체나 최초 첫 결과가 일관되게 빨라졌다고 주장하지 않는다.

## 변경 확인 단계와 편차

재조회 시작 전 invalidated 마크와 종료 시 checkpoint−bindings 구간의 중앙값이다. 각 구간을 개별 집계했으므로 중앙값의 합이 전체 중앙값과 같지는 않다.

| 조회                       | 방식        | 시작 전 변경 확인 | 종료 후 변경 확인 |
| -------------------------- | ----------- | ----------------: | ----------------: |
| fileRevision 사용처 24개   | 수정 전 TS7 |            96.751 |            83.574 |
| fileRevision 사용처 24개   | 수정 후 TS7 |            76.030 |            41.334 |
| getWindow 사용처 102개     | 수정 전 TS7 |            90.958 |           111.104 |
| getWindow 사용처 102개     | 수정 후 TS7 |            54.576 |            51.373 |
| JS compareFiles 사용처 6개 | 수정 전 TS7 |           119.800 |            78.682 |
| JS compareFiles 사용처 6개 | 수정 후 TS7 |            43.918 |            41.778 |

getWindow 최초 완료 증가에는 변경 확인 이전 구간의 증가가 들어 있다. metadata 중앙값은 1388.320→1584.136ms, TS7 문서 열기·프로젝트 준비 장벽은 2181.084→2302.145ms였다. 새 읽기는 이 구간 이후의 checkpoint에서 처음 실행된다. 어떤 외부 조건이나 내부 준비 작업이 편차를 만들었는지는 확정하지 않는다. 최초 전체의 최솟값·최댓값도 함께 보관한다.

| 조회                       | 방식        | 최초 전체 범위 ms |
| -------------------------- | ----------- | ----------------: |
| fileRevision 사용처 24개   | 수정 전 TS7 | 3925.920–4971.824 |
| fileRevision 사용처 24개   | 수정 후 TS7 | 3820.008–9467.993 |
| getWindow 사용처 102개     | 수정 전 TS7 | 4189.859–4884.801 |
| getWindow 사용처 102개     | 수정 후 TS7 | 3995.552–7190.243 |
| 앱 getWindow 정의 1개      | 수정 전 TS7 |   370.938–395.983 |
| 앱 getWindow 정의 1개      | 수정 후 TS7 |   356.139–395.036 |
| JS compareFiles 사용처 6개 | 수정 전 TS7 | 3932.377–7322.927 |
| JS compareFiles 사용처 6개 | 수정 후 TS7 | 4008.333–4092.012 |

## 무효화와 결과 정확도

[입력 메타데이터 검사](verify-input-revisions.ts)는 변경 없는 재검사, 같은 크기·같은 mtime으로 되돌린 편집(ctime 변경), 원자적 파일 교체, 없던 파일 생성·삭제, 설정 변경, 심볼릭 링크 목적지 변경을 검증했다. 각 상태에서 기존 메타데이터 함수와 새 함수의 결과 전체도 비교했다. [7개 검사](results/2026-10-14/revisions/revision-invalidation.txt).

[설정 검사](verify-configuration.ts)는 없던 tsconfig 생성 시 별칭 소비자가 추가되고, paths를 다른 원본으로 바꾸거나 설정을 삭제하면 그 사용처가 제거되는지 확인했다. 실제 캐시 reset도 3회 발생했다. [4개 검사](results/2026-10-14/revisions/configuration-invalidation.txt). 기존 [연결 변경 8개](results/2026-10-14/revisions/linking-invalidation.txt)와 [프로젝트 포함 변경 6개](results/2026-10-14/revisions/preparation-invalidation.txt)도 통과했다. 닫힌 파일 편집·추가·삭제, compiler paths, .d.ts 선언 맵 원본과 정의 목적지 변경, include 제거·복원, 오래된 source 거부를 포함한다.

최종 510개 기록에서 실제 모노레포 4개 조회의 TS6/TS7 수정 전/후 위치가 같고, 독립 23개 사례에서 TS7 수정 전후 모두 기대 파일·행·열과 일치했다. 별칭·CommonJS·패키지 밖/포함 범위 밖 소비자·조건부 .mts/.cts·.d.ts map/source/types 연결·동명이인·가려짐·재할당 사례를 확인했다. [위치 검증](results/2026-10-14/revisions/validation.txt), [독립 기대값](results/2026-10-14/revisions/fixtures.json), [입력](results/2026-10-14/revisions/fixture-inputs.tar.gz).

fileRevision은 새 메타데이터 함수의 import와 호출 두 위치가 추가돼 현재 24개다. 이전 회차의 22개와 비교해 누락이 생긴 것이 아니며, 세 방식 모두 현재 24개 위치와 일치했다. 기존 TS6 독립 사례의 차이 3건(CommonJS 자기 정의 추가, 중첩 프로젝트 사용처 누락/다른 정의)은 그대로 검증 결과에 표시했다. 제품 유지 조건에 따라 이번 변경에서는 수정하지 않았다.

관련 단위 테스트 28개, 변경 파일 타입 검사·oxlint·루트 pnpm format을 통과했다. [Wallaby](results/2026-10-14/revisions/units.txt), [타입 검사](results/2026-10-14/revisions/types.txt), [린트](results/2026-10-14/revisions/lint.txt), [포맷](results/2026-10-14/revisions/format.txt).

검증은 로컬 파일시스템과 위 실제 4개 조회·독립 사례에 한정한다. 검색 도중 동시 편집, 편집 초안, LSP 요청 취소, 네트워크 파일시스템, 익명 default와 모든 외부 설정 조합은 이번에 검증하지 않았다. 취소 단위 테스트는 메타데이터 읽기의 AbortSignal 계약만 검증한다.

## 재현 자료

[원시 기록](results/2026-10-14/revisions/measured.jsonl), [요약](results/2026-10-14/revisions/summary.json), [환경·해시](results/2026-10-14/revisions/metadata.json), [고정한 두 클라이언트](results/2026-10-14/revisions/clients.tar.gz), [프로토콜 로그](results/2026-10-14/revisions/protocol-logs.tar.gz)를 보관했다. source-inputs에는 이번 실행 코드·검증·문서를 포함한다. 제품 번들 해시는 이전 측정과 같다.

이전 README의 기존 TS6 번들/manifest 준비를 새 출력 폴더에 수행한 다음 두 클라이언트를 풀고, 패키지 디렉터리에서 실행한다. 출력 폴더는 새로 만든다.

```sh
tar -xzf benchmarks/native-analysis/results/2026-10-14/revisions/clients.tar.gz -C /tmp/native-revisions
node --import tsx benchmarks/native-analysis/create-fixtures.ts > /tmp/native-revisions/fixtures.json
python3 benchmarks/native-analysis/run-revisions.py /tmp/native-revisions measured
python3 benchmarks/native-analysis/validate-revisions.py /tmp/native-revisions
node --import tsx benchmarks/native-analysis/verify-input-revisions.ts
node --import tsx benchmarks/native-analysis/verify-configuration.ts /absolute/path/to/tsc
node --import tsx benchmarks/native-analysis/verify-linking.ts /absolute/path/to/tsc
node --import tsx benchmarks/native-analysis/verify-preparation.ts /absolute/path/to/tsc
```
