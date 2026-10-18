# TypeScript 7 LSP 비교 실험

후속 보완 실험은 [원본·선언·CommonJS 연결 결과](create-linked-experiment.md)를 참고한다. 아래는 보완 전 기록이다. 후속 검증에서 `dist`가 뷰어 검색 범위 밖임을 확인했으므로, 아래 package-source 기대값 8 중 생성 선언 재내보내기 1곳은 누락 판정에서 제외해야 한다. 원시 기록은 그대로 보존했다.

2026-10-14. **네이티브 LSP의 속도 잠재력은 확인했지만, 현재 실험 연결만으로 기존 탐색을 교체할 수는 없다.** fileRevision 22개와 JavaScript compareFiles 6개는 기존과 정확한 위치 집합이 같았다. getWindow는 102개 중 22개만 반환했고, declaration map 없는 package source 연결과 CommonJS 구조 분해 별칭에서도 누락이 있었다. 기존 제품 탐색은 변경하지 않았다.

## 실험 구성

설치되어 있던 TypeScript 7.0.2 macOS arm64 바이너리를 `--lsp --stdio`로 실행했다. 새 의존성이나 package.json 스크립트는 추가하지 않았다. 기존은 TypeScript 6.0.3을 포함한 현재 createWorkspace 번들이다. [환경·바이너리·번들·실험 클라이언트 해시](results/2026-10-14/metadata.json). 측정 전후 다시 생성한 기존 workspace/worker 번들 해시가 같아 제품 경로가 유지됐음을 확인했다.

- `existing`: 기존 뷰어의 정의 우선 판정, 스트리밍, 별칭·선언 연결, 전체 완료 검증과 결과 캐시를 사용한다.
- `native`: 대상 문서를 열고 표준 LSP definition → references를 요청한다. 독립 정의 조회는 definition만 요청한다.
- `native-opened`: 같은 요청 전, 실제 저장소에서는 가장 가까운 tsconfig 기준 25개 프로젝트의 대표 문서를 연다. fixture에서는 해당 fixture의 소스 문서를 모두 연다. 실제 저장소 전체 6,545개 문서를 모두 여는 조건은 아니다. [대표 문서 목록](results/2026-10-14/project-inventory.json).

기본 `includeDeclaration: false`는 별칭 선언도 제외하여 기존 뷰어보다 적은 위치를 반환했다. 최종 실험은 `true`로 요청하고 최초 definition이 가리킨 원본 선언 위치를 제외한다. 이 변환으로 다른 import 별칭의 선언은 유지한다. 이름으로 결과를 추정하거나 TS6 결과를 TS7 결과에 섞지 않는다. [LSP 연결](create-lsp-experiment.ts#L44), [계측](measure.ts#L1).

## 측정 조건

첫 결과는 비어 있지 않은 서버 결과를 받은 시점이며 브라우저 paint가 아니다. 완료는 요청 결과의 수신·변환이 끝난 시점이다. TS6는 스트림 종료까지 포함한다. Native는 프로세스 시작·initialize·문서 열기를 최초 시간에 포함한다. 초깃값 source/manifest 읽기와 Node CLI 자체 시작은 제외했다. manifest를 준비하는 사전 파일 목록 검색은 native 시간에 포함하지 않았으며, 이 환경에서는 약 0.22초였다. Native 25개 대표 문서의 열기·분석은 측정에 포함했다.

각 표본은 독립 프로세스·빈 CODEX_HOME에서 시작하고 완료 직후 같은 분석기로 재조회한다. 별도 warmup은 호출하지 않았다. OS 파일 캐시를 지우거나 호스트를 독점하지 않았다. 두 주요 TypeScript 조회는 5회씩, 나머지는 3회씩 실행하고 엔진 순서를 회전했다. 최종 **330개 기록**이 모두 정상 종료했고, 각 조건에서 최초·재조회·반복의 위치 집합이 같았다. [원시 기록](results/2026-10-14/measurement.jsonl), [중앙값·최소·최대·정확한 차집합](results/2026-10-14/summary.json), [위치 검증](results/2026-10-14/validation.txt).

TS6 재조회에는 기존 완료 캐시와 변경 검증이 있다. Native 재조회에는 뷰어의 완료 캐시가 없고 LSP 요청을 다시 수행한다. 따라서 native 수치를 그대로 배포된 뷰어의 예상 응답 시간으로 해석하지 않는다. 두 엔진의 프로젝트 선택과 원본 연결 규칙도 다르며, 결과가 누락된 조회의 짧은 완료 시간을 동등한 검색의 성능 개선으로 계산하지 않는다.

## 실제 모노레포

ms 중앙값이다. 사용처의 누락·추가는 기존 결과에 대한 위치 차집합이며, 실제 저장소 모든 심볼의 독립 정답을 구축한 검증은 아니다.

| 조회                           | 방식              | 결과 수 |  첫 결과 | 전체 완료 | 재조회 완료 | 기존 대비 누락 / 추가 |
| ------------------------------ | ----------------- | ------: | -------: | --------: | ----------: | --------------------: |
| fileRevision 사용처            | 기존 TS6 뷰어     |      22 | 1272.134 |  8743.930 |      37.452 |                 0 / 0 |
| fileRevision 사용처            | TS7 대상 파일     |      22 |  122.032 |   122.055 |       7.034 |                 0 / 0 |
| fileRevision 사용처            | TS7 프로젝트 열기 |      22 | 2407.343 |  2407.360 |      67.651 |                 0 / 0 |
| getWindow 사용처               | 기존 TS6 뷰어     |     102 | 1237.827 |  8215.831 |      37.138 |                 0 / 0 |
| getWindow 사용처               | TS7 대상 파일     |      22 |   85.184 |    85.200 |       3.315 |                80 / 0 |
| getWindow 사용처               | TS7 프로젝트 열기 |      22 | 2616.484 |  2616.505 |      67.618 |                80 / 0 |
| 앱 getWindow 정의              | 기존 TS6 뷰어     |       1 |  691.547 |   730.994 |      23.047 |                 0 / 0 |
| 앱 getWindow 정의              | TS7 대상 파일     |       1 |  178.339 |   178.370 |       0.465 |                 1 / 1 |
| 앱 getWindow 정의              | TS7 프로젝트 열기 |       1 | 2339.901 |  2339.914 |       0.345 |                 1 / 1 |
| JavaScript compareFiles 사용처 | 기존 TS6 뷰어     |       6 | 1257.080 |  8590.618 |      36.136 |                 0 / 0 |
| JavaScript compareFiles 사용처 | TS7 대상 파일     |       6 | 1246.084 |  1246.095 |      68.578 |                 0 / 0 |
| JavaScript compareFiles 사용처 | TS7 프로젝트 열기 |       6 | 2442.195 |  2442.207 |      69.150 |                 0 / 0 |

fileRevision의 native 대상 파일 조회는 이번 표본에서 동일한 22개 위치를 약 122ms에 반환했다. 그러나 getWindow의 85ms 응답은 80개가 빠진 결과다. 프로젝트를 모두 열어도 22개에서 늘지 않았다. 앱의 getWindow 정의는 결과 수가 1개로 같아도 원본 TypeScript 대신 빌드된 선언 파일을 반환해 목적지가 달랐다. JavaScript 일반 함수의 위치 집합은 일치했지만 아래 CommonJS 별칭은 별도로 실패했다.

프로젝트를 여는 조건의 재조회는 fileRevision/getWindow에서 약 68ms로 기존 완료 캐시 약 37ms보다 느렸다. Native 엔진을 연결해도 기존 완료 캐시와 변경 검증을 유지할 이유가 있다. 첫·완료 차이가 작은 것은 결과 스트리밍을 잘게 분리한 효과가 아니다. partialResultToken을 보냈지만 최종 표본 전체에서 위치를 전달한 partial progress는 0회였고, native 검색 결과는 응답 배열 한 번으로 도착했다. 프로젝트 로딩 progress는 위치 배치로 세지 않았다.

## 별칭·패키지 밖·선언 연결

7개 사용처 사례와 6개 정의 사례에 독립 기대 위치를 만들었다. 서로 다른 프로젝트의 동명 별칭, 무관한 동명 함수, 매개변수로 가린 이름은 기대 결과에서 제외했다. .d.ts.map은 실제 TS6 컴파일러로 생성했으며, source 프로젝트의 outDir/rootDir 설정도 실제 생성 위치와 일치시켰다. 프로젝트 references 유무를 각각 검증했다. [기대 위치](results/2026-10-14/fixtures.json), [실제 fixture 입력](results/2026-10-14/fixture-inputs.tar.gz), [생성기](create-fixtures.ts#L1).

| 사용처 사례                              | 기대 | 기존 | TS7 대상 파일 | TS7 문서 열기 |
| ---------------------------------------- | ---: | ---: | ------------: | ------------: |
| 연쇄 재내보내기·namespace·별칭           |   14 |   14 |            14 |            14 |
| 소비자 프로젝트에만 있는 paths 별칭      |   14 |   14 |            11 |            14 |
| 원본 프로젝트 include 밖 소비자          |   14 |   14 |             3 |            14 |
| declaration map, project references 없음 |   17 |   17 |            14 |            17 |
| declaration map, project references 있음 |   17 |   17 |            14 |            17 |
| map 없는 package source·types·subpath    |    8 |    7 |             1 |             1 |
| 불변 CommonJS 구조 분해·지역 이름 가림   |    3 |    3 |             0 |             0 |

일반 별칭은 일치했다. 프로젝트를 열면 소비자 paths, include 밖 소비자, 유효한 declaration map의 사용처는 모두 기대 위치와 일치했고 오탐은 없었다. 대상 문서만 연 조건에서 이 위치들이 빠진 것은 프로젝트 준비 범위를 구분해야 한다는 증거다.

map 없는 package source 사례는 native 양쪽 모두 source 쪽 재내보내기 1곳만 반환하여, 소비자의 import·별칭·호출 6곳과 선언 쪽 재내보내기 1곳이 빠졌다. 같은 사례의 정의도 원본 대신 .d.ts를 반환했다. CommonJS 구조 분해는 기대 3곳을 모두 놓쳤다. 이 fixture의 매개변수로 가린 hello는 어느 결과에도 포함되지 않았다.

**기존 방식에도 추가 검증 공백을 발견했다.** package source 사례의 소비 코드 6곳과 source 재내보내기는 찾았지만, 생성된 `packages/core/dist/index.d.ts` 재내보내기 1곳이 누락됐다. 독립 기대값 8을 결과 7에 맞춰 줄이지 않았다. 현재 실험은 기존 경로 유지가 조건이므로 이 문제를 제품에서 수정하지 않았으며, 나머지 fixture 사용처·정의의 기존 결과는 모두 기대 집합과 일치했다.

6개 정의 사례 중 native는 package source를 제외한 5개에서 원본 목적지가 맞았다. package source의 .d.ts 목적지는 원본 연결 계약과의 불일치이며, 그 선언 자체가 무관한 동명 심볼이었다는 의미는 아니다.

## getWindow 원본·선언 분리 진단

별도의 LSP 프로세스에서 빌드된 `packages/utils/dist/browser/dom/get-window/index.d.ts`를 조회하자 98개가 나왔다. source 조회 22개와 합치면 120개이며 기존 102개를 모두 포함한다. 나머지 18개는 solid-use/solid-components 등의 생성된 dist 코드 위치다. [선언 조회 원문](results/2026-10-14/declaration-probe.jsonl), [합집합과 범위 밖 위치](results/2026-10-14/declaration-union.json).

이는 원본과 선언 심볼을 함께 조회하고 뷰어의 파일 범위를 적용하는 방향의 근거다. **두 독립 프로세스의 결과 집합을 사후 비교한 진단**이며, 자동 원본-선언 연결 구현이나 한 세션의 병합 속도 측정은 아니다. 이름이 같은 .d.ts를 무조건 합치는 구현은 하지 않았다. 표준 definition/references만 실험했으며 TypeScript의 custom source-definition 요청이나 VS 전용 references 응답은 비교하지 않았다.

## 검증 범위와 결론

- Native 7.0.2의 실제 LSP 응답·진행 알림, 330개 위치 집합, 7개 fixture 사용처·6개 정의 사례를 실행했다. 정확성이 실패한 결과도 그대로 보존했다. [프로토콜 로그](results/2026-10-14/protocol-logs.tar.gz).
- 실험 클라이언트·fixture·계측 코드의 [타입 검사](results/2026-10-14/typecheck-verified.txt)와 [oxlint](results/2026-10-14/lint-verified.txt), 루트 [pnpm format](results/2026-10-14/format-verified.txt)을 통과했다. 최종 생성기로 다시 만든 두 declaration fixture도 양쪽 엔진 최초·재조회 8개 기록에서 기대 17곳과 정확히 일치했다. [재생성 검증](results/2026-10-14/fixture-verification.json). 제품 UI나 기존 검색 구현은 변경하지 않아 전체 제품 회귀 또는 브라우저 검증을 이 실험의 근거로 내세우지 않는다.
- 초기 --stdio 옵션 누락과 종료 처리 경합은 실험 연결 문제였다. 최종 330개 측정은 해당 문제를 고친 클라이언트로 실행했다. 초기 preflight의 declaration fixture 출력 설정도 최종 측정 전에 실제 출력과 일치시켰다. 초기 수치를 최종 비교에 사용하지 않았다.
- 서버 첫 결과 측정이며 UI paint, 취소, 편집 초안, 검색 도중 파일 변경, 재시작 후 디스크 인덱스 복원과 native 결과 캐시 통합은 검증하지 않았다.
- 채택 전 필요한 일은 기존 원본-선언 연결·모듈 바인딩 보완과 파일 범위·완료 캐시를 LSP 경계에 옮기고 같은 기대 위치로 다시 검증하는 것이다. 이번 결과만으로 기본 엔진을 교체하지 않는다.

TypeScript 7의 네이티브 LSP와 기존 API 차이는 [공식 출시 설명](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)을 참고했다. 공식 빌드 속도 배수를 이 탐색의 개선 배수로 사용하지 않았다.

## 재현

패키지 디렉터리에서 실행한다. 설치된 macOS arm64 TypeScript 7.0.2를 사용하며 새 설치를 수행하지 않는다. `create-fixtures.ts`가 생성한 JSON을 작업 폴더의 fixtures.json으로 보존하고, results의 프로젝트 문서 목록 또는 새로 준비한 목록을 projects.json으로 둔다. target-only.json은 빈 배열이다. 기존 workspace/worker 번들과 TS6 lib 파일을 작업 폴더의 existing 디렉터리에 준비한다. [번들 생성 원문](results/2026-10-14/bundle.mjs.txt), [프로젝트 목록 생성 원문](results/2026-10-14/manifest.mjs.txt).

```sh
mkdir -p /tmp/native-analysis
cp benchmarks/native-analysis/results/2026-10-14/bundle.mjs.txt /tmp/native-analysis/bundle.mjs
cp benchmarks/native-analysis/results/2026-10-14/manifest.mjs.txt /tmp/native-analysis/manifest.mjs
node /tmp/native-analysis/bundle.mjs /tmp/native-analysis
node /tmp/native-analysis/manifest.mjs /tmp/native-analysis
node --import tsx benchmarks/native-analysis/create-fixtures.ts > /tmp/native-analysis/fixtures.json
python3 benchmarks/native-analysis/run.py /tmp/native-analysis measurement
python3 benchmarks/native-analysis/validate.py /tmp/native-analysis
```

단일 조회는 `measure.ts <existing|native|native-inclusive> <기존 번들 또는 native 바이너리> <root> <target> <needle> <definition|references> <문서 목록 JSON>`으로 실행한다. 최종 실험의 native 두 조건은 native-inclusive이며, 기본 false 요청은 초기 차이 확인용이다. 측정 자료의 fixtures.json 루트는 이번 실행의 임시 경로다. fixture를 다시 생성하면 새 루트를 사용해야 한다.
