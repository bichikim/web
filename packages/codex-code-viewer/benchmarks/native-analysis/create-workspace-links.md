# TS7 최초 조회의 프로젝트 준비와 메타데이터 확인 겹치기

2026-10-14. 재조회 변경 확인 최적화와 기존 TS6 제품 경로를 유지하고, TS7 최초 조회에서 직렬로 기다리던 두 준비 단계를 겹쳤다. 같은 회차의 getWindow 최초 전체 완료는 3881.930→3093.503ms로 약 20% 줄었다. 이전 회차의 5010ms와 이번 회차 값을 섞어 개선율을 계산하지 않는다.

## 병목과 변경

기존 순서는 최초 사용처 배치 → 전체 파일의 메타데이터/import/선언 연결 확인 → didOpen 전달 → TS7 프로젝트 준비 응답 대기였다. 로컬 Node 프로세스의 메타데이터 확인이 끝나야 별도 TS7 프로세스의 프로젝트 준비를 시작했다.

[문서 계획](create-workspace-links.ts)을 별도로 메모화해 메타데이터 전체 확인 전에 얻을 수 있도록 했다. [검색 순서](scan-linked-references.ts)는 최초 사용처를 전달한 뒤 문서를 먼저 열고, TS7 자식 프로세스가 준비하는 동안 Node에서 기존 메타데이터 검사를 수행한다. 이후 definition 응답으로 앞선 문서 준비가 끝났는지 확인하고 확장 사용처·선언·CommonJS 별칭을 검증한다. 첫 결과 전달과 최종 검증 조건을 유지하며 타이머로 준비 완료를 추측하지 않는다.

재조회는 이미 준비된 프로젝트를 재사용해 문서 계획·didOpen·추가 준비 장벽을 다시 실행하지 않는다. readInputRevisions는 이전 최적화와 파일 해시가 같다. 검사 경로를 생략하거나 완료 결과 캐시를 새로 추가하지 않았다.

## 준비 구간 확인

getWindow 5회 중앙값, 단위 ms다. 확장 준비 전체는 initialReferences→projectsReady이며 전후에 같은 경계를 쓴다. metadata는 수정 전에는 문서 계획을 포함하고 수정 후에는 이미 수행한 계획을 제외한다. openBarrier는 metadata 이후 남은 준비 대기이므로, 그 감소를 TS7 자체 계산량 감소로 해석하지 않는다.

| 방식        | 확장 준비 전체 | metadata 확인 | metadata 뒤 남은 준비 대기 |
| ----------- | -------------: | ------------: | -------------------------: |
| 수정 전 TS7 |       3152.949 |      1201.722 |                   1932.686 |
| 수정 후 TS7 |       2320.093 |      1502.192 |                    552.548 |

확장 준비의 경과 시간은 약 26% 줄었다. 모든 실제 사용처 조회의 기록에서 수정 전은 metadata→opened→projectsReady, 수정 후는 opened→metadata→projectsReady 순서임을 검증했다. 문서를 먼저 전달한 순서와 최종 준비 대기를 테스트로도 확인했다. [3개 순서·대기 테스트](results/2026-10-14/overlap/unit-after.txt), [수정 전 실패](results/2026-10-14/overlap/unit-before.txt).

getWindow의 범위 6581파일, AST 594개, 열린 문서 126개, 별칭 후보 173개, 선언 연결 99개, 변경 확인 입력 23571개, 모듈 해석 호출 25908회와 재사용 11749회가 전후 동일하다. 실제 4개 조회의 모든 반복에서도 메타데이터 수치를 비교했다. [요약](results/2026-10-14/overlap/summary.json), [위치·순서 검증](results/2026-10-14/overlap/validation.txt). 준비 구간의 didOpen 수는 전후 모두 매회 26개다. [서버 로그](results/2026-10-14/overlap/server-open.json).

## 실제 모노레포 성능

Node 24.15.0, TS7 7.0.2, TS6 런타임 6.0.3. 수정 전·후 모두 같은 esbuild/Node24 ESM 번들 형태로 고정했다. 실행마다 새 프로세스와 빈 CODEX_HOME을 사용하며 최초 완료 직후 같은 심볼을 재조회한다. fileRevision/getWindow 각 5회, 다른 두 조회 각 3회, 세 방식의 순서를 순환했다. 실제 4개 조회가 끝날 때까지 저장소 수정·포맷·테스트를 실행하지 않았다. OS 파일 캐시는 비우지 않았고 모듈 로딩·사전 번들 준비는 제외했다.

단위 ms, 중앙값. 첫 결과는 비어 있지 않은 서버 배치 수신이며 브라우저 paint가 아니다. 재첫/재완료는 같은 세션의 재조회다.

| 조회                       | 방식        |  첫 결과 | 전체 완료 |    재첫 |  재완료 |
| -------------------------- | ----------- | -------: | --------: | ------: | ------: |
| fileRevision 사용처 24개   | 기존 TS6    | 1139.671 |  7116.671 |  33.772 |  33.788 |
| fileRevision 사용처 24개   | 수정 전 TS7 |  305.658 |  3703.325 | 146.047 | 186.240 |
| fileRevision 사용처 24개   | 수정 후 TS7 |  300.461 |  2899.253 | 149.552 | 186.791 |
| getWindow 사용처 102개     | 기존 TS6    | 1091.876 |  6955.549 |  34.507 |  34.539 |
| getWindow 사용처 102개     | 수정 전 TS7 |  264.991 |  3881.930 | 105.429 | 203.779 |
| getWindow 사용처 102개     | 수정 후 TS7 |  268.998 |  3093.503 | 112.528 | 211.013 |
| 앱 getWindow 정의 1개      | 기존 TS6    |  599.238 |   633.095 |  23.697 |  23.708 |
| 앱 getWindow 정의 1개      | 수정 전 TS7 |  368.513 |   388.931 |  22.282 |  40.964 |
| 앱 getWindow 정의 1개      | 수정 후 TS7 |  347.741 |   367.443 |  22.009 |  39.828 |
| JS compareFiles 사용처 6개 | 기존 TS6    | 1047.541 |  7298.428 |  34.060 |  34.073 |
| JS compareFiles 사용처 6개 | 수정 전 TS7 | 1208.849 |  4074.398 | 103.833 | 153.659 |
| JS compareFiles 사용처 6개 | 수정 후 TS7 | 1197.354 |  3271.820 | 128.365 | 166.782 |

TS7 최초 전체 완료는 fileRevision 약 22%, getWindow 약 20%, JS 약 20% 줄었다. 최초 첫 결과는 거의 같았다. 재완료는 fileRevision 약 0.6ms, getWindow 약 7ms, JS 약 13ms 늘고 정의 조회는 약 1ms 줄었다. 기존 재조회 최적화 코드는 유지했지만 이번 모든 재조회가 더 빨라졌다고 주장하지 않는다. JS 재첫도 약 25ms 늘었다. 기존 TS6 완료 캐시의 약 34ms는 여전히 더 빠르다.

최초 전체의 최솟값·최댓값도 보관한다. 단일 프로브의 3871→3247ms는 최종 반복 중앙값에 섞지 않았다. [프로브](results/2026-10-14/overlap/probe.jsonl), [프로브 전](results/2026-10-14/overlap/probe-before.jsonl).

| 조회                       | 방식        | 최초 전체 범위 ms |
| -------------------------- | ----------- | ----------------: |
| fileRevision 사용처 24개   | 수정 전 TS7 | 3632.251–4828.193 |
| fileRevision 사용처 24개   | 수정 후 TS7 | 2879.524–4740.263 |
| getWindow 사용처 102개     | 수정 전 TS7 | 3845.063–3950.485 |
| getWindow 사용처 102개     | 수정 후 TS7 | 3008.221–3126.326 |
| 앱 getWindow 정의 1개      | 수정 전 TS7 |   367.758–390.658 |
| 앱 getWindow 정의 1개      | 수정 후 TS7 |   358.655–387.853 |
| JS compareFiles 사용처 6개 | 수정 전 TS7 | 3958.223–4538.403 |
| JS compareFiles 사용처 6개 | 수정 후 TS7 | 3220.065–3276.031 |

## 정확도와 무효화

최종 510개 기록에서 독립 23개 사례의 TS7 수정 전후가 기대 파일·행·열과 일치했고 최초·재조회·반복 결과가 안정적이었다. 별칭 재내보내기·소비자별 paths·패키지 밖/포함 범위 밖 소비자·CommonJS·.d.ts map/source/types·조건부 .mts/.cts·동명이인·가려짐·재할당 사례를 검증했다. 실제 4개 조회도 세 방식의 정확한 위치 집합이 같다. [기대값](results/2026-10-14/overlap/fixtures.json), [입력](results/2026-10-14/overlap/fixture-inputs.tar.gz), [검증](results/2026-10-14/overlap/validation.txt).

파일·설정 변경 관련 25개 검사도 통과했다. 같은 크기/mtime 편집의 ctime 감지, 파일 교체·생성·삭제·링크 목적지 변경, 없던 tsconfig 생성·paths 변경·설정 삭제, 닫힌 소비자 편집, .d.ts 선언 맵 원본/정의 목적지 변경, 프로젝트 include 제거·복원, 오래된 source 거부를 포함한다. [메타데이터 7개](results/2026-10-14/overlap/revision-invalidation.txt), [설정 4개](results/2026-10-14/overlap/configuration-invalidation.txt), [연결 8개](results/2026-10-14/overlap/linking-invalidation.txt), [프로젝트 6개](results/2026-10-14/overlap/preparation-invalidation.txt).

기존 TS6 독립 사례의 차이 3건(CommonJS 자기 정의 추가, 중첩 프로젝트 소비자 누락/다른 정의)은 유지돼 검증 출력에 구분했다. 따라서 모든 fixture에서 TS6까지 독립 기대값과 일치한다고 주장하지 않는다. 제품 번들 해시는 이전과 동일하다.

관련 단위 테스트 31개, 변경 파일 타입 검사·oxlint·루트 pnpm format을 통과했다. [Wallaby](results/2026-10-14/overlap/units.txt), [타입 검사](results/2026-10-14/overlap/types.txt), [린트](results/2026-10-14/overlap/lint.txt), [포맷](results/2026-10-14/overlap/format.txt).

검증 범위는 위 실제 4개 심볼과 독립 사례다. 검색 도중 동시 편집·편집 초안·LSP 요청 취소·네트워크 파일시스템·익명 default와 모든 외부 설정 조합은 이번에 검증하지 않았다.

## 재현 자료

[원시 기록](results/2026-10-14/overlap/measured.jsonl), [환경·해시](results/2026-10-14/overlap/metadata.json), [고정 클라이언트](results/2026-10-14/overlap/clients.tar.gz), [프로토콜 로그](results/2026-10-14/overlap/protocol-logs.tar.gz), source-inputs 아카이브를 보관했다. 이전 README의 기존 TS6 번들/manifest 준비를 새 출력 폴더에 수행하고 두 클라이언트를 푼 다음 패키지 디렉터리에서 실행한다.

```sh
tar -xzf benchmarks/native-analysis/results/2026-10-14/overlap/clients.tar.gz -C /tmp/native-overlap
node --import tsx benchmarks/native-analysis/create-fixtures.ts > /tmp/native-overlap/fixtures.json
python3 benchmarks/native-analysis/run-overlap.py /tmp/native-overlap measured
python3 benchmarks/native-analysis/validate-overlap.py /tmp/native-overlap
node --import tsx benchmarks/native-analysis/verify-input-revisions.ts
node --import tsx benchmarks/native-analysis/verify-configuration.ts /absolute/path/to/tsc
node --import tsx benchmarks/native-analysis/verify-linking.ts /absolute/path/to/tsc
node --import tsx benchmarks/native-analysis/verify-preparation.ts /absolute/path/to/tsc
```
