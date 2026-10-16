# TS7 원본·선언·CommonJS 연결 보완

후속 세부 계측과 메타데이터 최적화는 [범위 확장 계측](scan-linked-references.md)을 참고한다. 아래는 해당 최적화 전 기록이다.

2026-10-14. **실험 TS7에서 알려진 연결 누락을 보완했다. 실제 모노레포 4개 조회는 기존 TS6와 정확한 파일·행·열 집합이 같았다.** 기존 제품 탐색은 유지했으며 workspace/worker 번들 해시도 이전 실험과 같다. [환경·해시](results/2026-10-14/linking/metadata.json).

추가한 독립 검증 17개에서 보완 TS7은 누락·추가 없이 기대 위치와 일치했다. 다만 새 CommonJS 복합 사례에서는 기존 TS6가 자기 정의 위치 1곳을 사용처로 추가해, 그 사례의 두 엔진 원시 결과까지 완전히 같지는 않다. 기존 방식 유지 조건에 따라 제품은 수정하지 않았다. 따라서 모든 사례의 기존 결과와 완전히 일치했다고 주장하지 않는다.

## 구현

- [실험 연결](create-linked-experiment.ts): TS7 definition으로 심볼을 확인하고, 원본 프로젝트 사용처부터 전달한 다음 탐색 범위를 확장한다. 제품 엔진 선택이나 기본 검색 경로는 바꾸지 않았다.
- [연결 메타데이터](create-workspace-links.ts): 각 파일이 속한 프로젝트의 모듈 설정으로 import/require를 해석한다. 선언 맵 또는 package.json의 source/types가 확인한 원본·선언 파일 쌍을 수집하고, 선언 재내보내기를 따라 말단 선언도 연결한다. TS6는 구문 파싱과 모듈 설정 해석에만 사용한다. TS6 LanguageService, Program, getTypeChecker, findReferences 결과를 TS7에 섞지 않는다.
- [선언 위치](read-declaration-positions.ts)와 [심볼 검증](create-symbol-identities.ts): 확인된 파일 쌍 안에서 선언의 소유자 경로를 맞추고 TS7 definition으로 원본 심볼을 확인한 연결만 병합한다. 다른 클래스의 같은 이름 메서드는 합치지 않는다.
- [CommonJS 후보](read-module-bindings.ts): const 구조 분해 require/동적 import의 속성 정의를 TS7로 확인하고, 같은 원본을 가리키는 로컬 별칭의 references를 추가한다. 이름만 검색하지 않으며 매개변수로 가려진 변수, 다른 모듈, require 함수 가림, 재할당 후 별칭 호출을 제외한다. mutable 구조 분해의 최초 속성 읽기는 실제 사용처로 유지한다.
- [프로젝트 준비](read-project-documents.ts)와 [범위 필터](create-location-set.ts): 뷰어의 실제 readDirectory/fileFormat 목록을 사용한다. 프로젝트 대표 문서뿐 아니라 가장 가까운 tsconfig의 include 밖 문서도 준비한다. 반환 사용처는 이 목록으로 제한하여 dist/node_modules 등의 생성 위치를 제외한다. 정의 목적지는 사용처 목록과 같은 방식으로 잘라내지 않는다.
- [단계별 병합](scan-linked-references.ts): 원본 응답을 먼저 전달하고, 프로젝트 확장·선언·별칭 응답을 중복 없이 추가한다. 네이티브 내부 검색이 자체적으로 위치 progress를 보내는 구현은 아니다. 이번 402개 기록에서도 LSP 위치 partial progress는 0회다.

심볼 연결과 구문 메타데이터는 같은 세션에서 재사용한다. 파일·디렉터리·모듈 해석 입력의 메타데이터가 바뀌면 다음 조회 전에 연결과 TS7 세션을 초기화한다. 완료 결과 캐시는 이번 실험에 추가하지 않았다. [변경 검증](verify-linking.ts)은 닫힌 소비자 파일 편집, 새 파일, 파일 삭제, 선언 맵 원본 변경, 변경된 정의 목적지, 오래된 source 거부를 실제 LSP로 확인했다. [실행 결과](results/2026-10-14/linking/invalidation.txt).

## 측정 조건

설치된 TS7 7.0.2 macOS arm64, Node 24.15.0, 기존 TS6 6.0.3을 사용했다. [보완 전 실험](README.md)의 실행 클라이언트를 수정 전에 번들로 고정했고, 동일 입력에서 기존 TS6·고정한 TS7·보완 TS7의 실행 순서를 회전했다. 주요 TS 조회는 각각 5회, 나머지 실제 조회와 17개 fixture는 3회씩 독립 프로세스로 측정했다. 총 402개 최초/재조회 기록이며, OS 파일 캐시는 비우지 않았다.

`보완 전 TS7`은 기존 실험의 프로젝트 대표 문서 25개를 먼저 여는 조건이다. fixture에서는 해당 소스 문서들을 연다. `보완 TS7`은 뷰어 검색 목록 발견과 메타데이터 준비도 최초 시간에 포함한다. 실제 사용처 조회에서 검색 범위는 6,566개 코드 파일, 최종 열린 문서는 463개였다. 정의 단독 조회는 필요한 연결만 준비한다. 보완 전과 후의 준비 방식 차이까지 포함한 비용이며, 원본 연결만의 단독 비용을 분리한 ablation 실험은 아니다.

첫 결과는 비어 있지 않은 서버 배치를 수신한 시점이다. 전체 완료는 모든 연결 조회·병합·변경 검증용 체크포인트 완료까지 포함한다. 브라우저 paint나 Node CLI 자체 로딩 시간은 측정하지 않았다. 재조회는 같은 프로세스에서 최초 완료 직후 같은 심볼을 다시 조회한 값이다. TS6는 제품의 완료 캐시를 사용하고, TS7 두 조건은 references를 다시 요청한다. 보완 TS7에는 파일 변경 검증과 심볼 연결 캐시가 있다.

## 실제 모노레포 결과

단위 ms, 중앙값. `재첫`은 재조회 첫 배치, `재완료`는 재조회 전체 완료다. 누락/추가는 기존 위치 집합에 대한 차집합이며, 실제 저장소의 모든 심볼에 독립 정답을 만든 검증은 아니다. [원시 402개 기록](results/2026-10-14/linking/measured.jsonl), [중앙값·최소·최대·단계별 시간](results/2026-10-14/linking/summary.json), [위치 검증](results/2026-10-14/linking/validation.txt).

| 조회                   | 방식        | 결과 |  첫 결과 | 전체 완료 |    재첫 |  재완료 | 누락/추가 |
| ---------------------- | ----------- | ---: | -------: | --------: | ------: | ------: | --------: |
| fileRevision 사용처    | 기존 TS6    |   22 | 1275.213 |  8466.578 |  38.463 |  38.478 |       0/0 |
| fileRevision 사용처    | 보완 전 TS7 |   22 | 2503.324 |  2503.342 |  67.290 |  67.306 |       0/0 |
| fileRevision 사용처    | 보완 TS7    |   22 |  337.365 |  6544.882 | 161.291 | 318.767 |       0/0 |
| getWindow 사용처       | 기존 TS6    |  102 | 1240.047 |  8477.574 |  37.433 |  37.466 |       0/0 |
| getWindow 사용처       | 보완 전 TS7 |   22 | 2468.818 |  2468.838 |  66.174 |  66.188 |      80/0 |
| getWindow 사용처       | 보완 TS7    |  102 |  293.804 |  6666.716 | 159.650 | 384.730 |       0/0 |
| 앱 getWindow 정의      | 기존 TS6    |    1 |  698.397 |   736.914 |  25.364 |  25.375 |       0/0 |
| 앱 getWindow 정의      | 보완 전 TS7 |    1 | 2390.346 |  2390.360 |   0.348 |   0.352 |       1/1 |
| 앱 getWindow 정의      | 보완 TS7    |    1 |  394.732 |   424.594 |  28.709 |  49.588 |       0/0 |
| JS compareFiles 사용처 | 기존 TS6    |    6 | 1212.568 |  8530.709 |  36.734 |  36.748 |       0/0 |
| JS compareFiles 사용처 | 보완 전 TS7 |    6 | 2509.747 |  2509.768 |  68.835 |  68.847 |       0/0 |
| JS compareFiles 사용처 | 보완 TS7    |    6 | 1343.215 |  7102.379 | 194.247 | 364.622 |       0/0 |

기존 TS6 대비 보완 TS7은 fileRevision 첫 결과가 약 74%, 전체 완료가 약 23% 빨라졌다. getWindow 첫 결과는 약 76%, 전체 완료는 약 21% 빨라졌다. 정의 목적지도 dist의 .d.ts에서 원본 .ts로 일치했다. JS 첫 결과는 약 11% 느려졌지만 전체 완료는 약 17% 빨라졌다.

**보완 비용도 있다.** 보완 전 TS7보다 전체 완료는 fileRevision 약 4.04초, getWindow 약 4.20초, JS 약 4.59초 늘었다. 프로젝트들을 먼저 열지 않아 첫 결과는 빨라졌지만, 메타데이터·전체 프로젝트·선언·별칭 검증을 뒤에서 수행한다. getWindow 기준 메타데이터 수집은 첫 원본 응답 뒤 약 2.4초, 확장된 프로젝트의 원본/선언 조회는 약 3.3초, 별칭 검증은 약 0.5초를 차지했다. 단계 경계의 중앙값 차이로 설명한 값이며 단계별 CPU 프로파일은 아니다.

재조회 전체 완료는 보완 전 약 66–69ms에서 보완 후 약 319–385ms로 늘었다. 기존 TS6 완료 캐시 약 37–38ms보다도 느리다. getWindow 재조회에서는 첫 변경 검증 약 84ms, 원본 조회까지 약 160ms, 선언까지 약 306ms, 마지막 체크포인트까지 약 385ms였다. 제품 적용 시 기존 완료 캐시를 유지해야 하며, 이번 실험만으로 기본 엔진 교체를 권하지 않는다.

## 독립 검증과 범위 정정

보완 TS7의 17개 독립 사례는 3회 최초·재조회 모두 기대 위치와 일치했다. [기대 위치](results/2026-10-14/linking/fixtures.json), [실제 입력](results/2026-10-14/linking/fixture-inputs.tar.gz).

| 사용처 사례                                                  | 기대 | 기존 TS6 | 보완 전 TS7 | 보완 TS7 |
| ------------------------------------------------------------ | ---: | -------: | ----------: | -------: |
| 연쇄 재내보내기·namespace·동명 별칭                          |   14 |       14 |          14 |       14 |
| 소비자 프로젝트 paths                                        |   14 |       14 |          14 |       14 |
| 원본 include 밖 소비자                                       |   14 |       14 |          14 |       14 |
| 선언 맵, project references 없음                             |   17 |       17 |          17 |       17 |
| 선언 맵, project references 있음                             |   17 |       17 |          17 |       17 |
| map 없는 package source/types/subpath                        |    7 |        7 |           1 |        7 |
| CommonJS 별칭·매개변수 가림                                  |    3 |        3 |           0 |        3 |
| CommonJS 재내보내기·quoted/shorthand·동적 import·가림·재할당 |   17 |       18 |           3 |       17 |
| 서로 다른 클래스의 같은 메서드 이름                          |    1 |        1 |           0 |        1 |

8개 정의 사례도 보완 TS7의 정확한 원본 위치가 맞았다. 결과 수만 같은 .d.ts 목적지 차이는 성공으로 취급하지 않았다. 단위 테스트 7개는 별칭 후보 판독과 선언 소유자 구분을 검증했다. [Wallaby 실행 결과](results/2026-10-14/linking/units.txt).

이전 실험의 package-source 기대 8개 중 `packages/core/dist/index.d.ts` 재내보내기 1개는 [isBrowsablePath](../../src/server/is-browsable-path.ts)가 제외하는 경로였다. 이번에는 생성 시 같은 범위 계약을 적용해 기대값을 7개로 정정했다. 기존 구현을 고쳐 8개를 찾게 한 것이 아니며 이전 원시 자료는 변경하지 않았다.

새 복합 CommonJS 사례에서 기존 TS6의 추가 1개는 `packages/core/src/entry.ts:1:17`, 조회한 함수 자신의 정의다. 관련 없는 다른 함수·가려진 매개변수·재할당 후 별칭 호출은 두 엔진 모두 추가하지 않았다. 보완 TS7은 자기 정의를 제외해 독립 기대값 17개와 일치한다. 검색 범위 안의 typings/entry.d.ts를 통한 소비자도 별도 조회하여 선언 자체를 사용처에 넣지 않고 소비자 import·호출만 포함함을 확인했다. [추가 범위 조회](results/2026-10-14/linking/scope.txt).

검증은 위 사례와 실제 4개 심볼에 한정한다. 익명 default 선언, 임의의 잘못된 선언 맵, 모든 외부 패키지/모듈 설정 조합, 편집 초안, 취소, 검색 진행 중 파일 변경, 재시작 디스크 인덱스 통합은 이번 실험에서 검증하지 않았다. TS7 내부 응답의 분할 전송이나 제품 UI가 빨라졌다고 주장하지 않는다. 표준 references의 includeDeclaration 계약은 [공식 LSP 정의](https://github.com/microsoft/language-server-protocol/blob/gh-pages/_specifications/lsp/3.17/language/references.md)를 따랐다.

## 재현

패키지 디렉터리에서 이전 README의 번들·프로젝트 목록 준비를 수행한다. 비교용 고정 클라이언트는 측정 폴더에 복원한다. 새 의존성 설치나 package.json 스크립트는 필요 없다.

```sh
tar -xzf benchmarks/native-analysis/results/2026-10-14/linking/raw-client.tar.gz -C /tmp/native-linking
node --import tsx benchmarks/native-analysis/create-fixtures.ts > /tmp/native-linking/fixtures.json
python3 benchmarks/native-analysis/run-linked.py /tmp/native-linking measured
python3 benchmarks/native-analysis/validate-linked.py /tmp/native-linking
node --import tsx benchmarks/native-analysis/verify-linking.ts /absolute/path/to/tsc
```

이전 준비 예시의 출력 디렉터리는 모두 `/tmp/native-linking`으로 맞춘다. `native-linked` 단일 조회는 기존 measure.ts 인자 순서를 그대로 사용한다. [보완 전 고정 클라이언트](results/2026-10-14/linking/raw-client.tar.gz)와 [프로토콜 로그](results/2026-10-14/linking/protocol-logs.tar.gz)를 보존했다. 타입 검사·oxlint·루트 pnpm format 결과는 같은 results 디렉터리에 있다.
