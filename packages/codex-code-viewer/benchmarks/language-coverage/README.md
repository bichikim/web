# 지원 언어별 탐색 누락 검토

2026-10-14. 의미 기반 정의·사용처 탐색을 지원하는 TypeScript, JavaScript, Python, Rust, Ruby를 대상으로 동작, 구조·테스트 가능성, 명명·배치를 검토했다. 문법 강조·편집만 지원하는 형식은 의미 분석기 검토 대상이 아니다.

전체 위험도는 보통이다. 아래 재현된 P2 여섯 건을 수정했다. 해당 재현 사례에서 남은 실패는 없고, P0/P1은 발견하지 않았다. 모든 언어 문법과 실행 환경에서 누락이 없음을 증명한 검토는 아니다.

이후 실제 모노레포와 언어별 fixture에서 [누락 수정 전후 속도](performance.md)를 다시 측정했다. 첫 결과·전체 완료·재조회와 결과 위치 집합을 전후 번들로 비교한 156개 기록, 추가 확인 40개 기록을 보존했다.

추가로 [전체 완료 병목 최적화와 전후 172개 측정](completion.md)을 수행했다. 기존 누락 수정을 유지한 상태에서 비교했다.

이후 [TypeScript 분석·캐시 후속 비교](analysis.md)에서 최초 전체 분석의 개선 한계와 위치 차이 캐시 수정, 변경 무효화를 확인했다.

## 수정한 P2

1. **JavaScript 모듈 구조 분해 별칭의 호출 누락.** `const {greet: hello} = require(...)`와 `await import(...)`에서 원본 함수 조회가 `hello()`를 반환하지 않았다. TypeScript 컴파일러의 모듈 속성 심볼과 원본 심볼이 일치하는 불변 바인딩을 찾아, 해당 바인딩의 의미 참조를 병합한다. 이름이나 함수 시그니처의 유사성으로 연결하지 않는다. 다른 패키지의 동명 함수와 같은 이름의 매개변수는 제외하며 직접 조회와 스트리밍 결과 집합이 일치했다. [구현](../../src/server/collect-module-binding-references.ts), [실패 기록](results/2026-10-14/javascript-failures.txt).
2. **Python 대입 별칭 문법 누락.** 기존 한 줄 단순 대입 판독이 타입 주석, 연쇄 대입, 세미콜론, 괄호로 이어진 대입을 처리하지 않았다. 논리 문장과 대입 성분을 분리해 기존 의미 조회 결과에서 별칭을 확장한다. 위치별 tuple 대입도 확인했다. 한 줄 조건문의 세미콜론 뒤 문장 역시 같은 조건 본문에 남도록 수정했다. 함수 호출·연산식·문자열·주석·복합 대입 대상은 단순 이름 별칭으로 처리하지 않는다. [문장 판독](../../src/server/read-python-statements.ts), [별칭 판독](../../src/server/read-python-aliases.ts), [초기 실패](results/2026-10-14/initial-failures.txt), [한 줄 조건문 실패](results/2026-10-14/inline-suite-failure.txt).
3. **Python 별칭 재할당 후 오탐.** 별칭 바인딩의 모든 사용처를 확장해 다른 함수로 재할당한 뒤의 호출도 원본 함수 사용처에 포함됐다. 같은 스코프의 대입 순서와 조건 분기별 가능한 바인딩을 추적한다. 재할당 전 복사한 별칭은 유지한다. 이 필터를 최종 결과와 중간 스트리밍 결과에 동일하게 적용했다. 순차 재할당, tuple, 함수 내부, 조건 분기, 정적으로 거짓인 분기를 검증했다. [검증기](../../src/server/create-python-alias-validator.ts), [공통 수집](../../src/server/collect-aliased-references.ts), [초기 실패](results/2026-10-14/initial-failures.txt).
4. **Rust 개발 타깃·개발 의존성 사용처 누락.** 테스트·예제·벤치와 명시적 `[[test]]` 경로를 crate 그래프에 넣지 않아 개발 의존성의 별칭과 호출을 찾지 못했다. 자동·명시 타깃과 개발 의존성 연결을 추가했다. 개발 의존성을 일반 라이브러리·바이너리에 노출하지 않으며, 자동 탐색 해제와 edition 2015의 수동 타깃 기본 규칙도 보존한다. renamed path dependency, glob 재내보내기, raw 식별자 별칭과 독립 패키지 소비자를 검증했다. [타깃 판독](../../src/server/rust/read-package.ts), [의존성 연결](../../src/server/rust/create-project.ts), [실패 기록](results/2026-10-14/development-target-failures.txt). 규칙 근거는 [Cargo 타깃](https://doc.rust-lang.org/cargo/reference/cargo-targets.html)과 [개발 의존성](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html#development-dependencies) 문서다.
5. **Ruby 실행되지 않는 반복문 대입으로 인한 누락.** `while false` 또는 `until true`의 본문에서 별칭을 재할당하면 반복문 이후의 별칭 대상까지 바뀌었다. 반복 조건의 정적 참·거짓에 따라 가능한 상태를 합쳐, 실행되지 않는 본문이 이후 상태를 덮어쓰지 않게 했다. 기존 분기·동적 require·순차 재할당 및 기본/외부 Solargraph 검증도 전체 회귀에 포함했다. [상수 흐름](../../src/server/ruby/constant-flow.ts), [실패 기록](results/2026-10-14/development-target-failures.txt).
6. **설정 변경 직후 조회 취소.** 전체 회귀와 단독 실행에서 TypeScript 경로 매핑 변경 후 조회가 `AbortError`로 실패했다. 메타데이터 체크포인트에서 이미 알린 설정 변경을 비동기 인덱스 갱신이 다시 알려 새 워커 요청을 중단시켰다. 두 경로가 같은 설정 서명을 관찰하도록 합쳐 중복 초기화를 막았다. 인덱스 읽기를 검색 시작 전에 기다리게 만드는 방식은 적용하지 않았다. [인덱스](../../src/server/navigation-cache/create-navigation-index.ts), [실패 기록](results/2026-10-14/configuration-failure.txt), [후속 검증](results/2026-10-14/index.txt).

## 실행한 검증

- [언어별 새 통합 사례](../../src/server/__tests__/create-workspace.language-coverage.integration.ts) 27개. TypeScript/JavaScript의 8개 확장자, 패키지 밖 재내보내기·별칭, 동명 심볼·지역 스코프 구분, Python의 대입 형태·재할당·분기, Rust 개발 타깃·의존성 경계, Ruby 반복문을 확인했다.
- 기존 프로젝트별 TypeScript 별칭·선언 파일 연결, Python 원본/스텁·중첩 설정, Rust 독립 Cargo 프로젝트, Ruby 기본/외부 Solargraph·분기·동적 require 회귀를 포함해 **전체 통합 430/430 통과**. [실행 기록](results/2026-10-14/integration.txt).
- Python 별칭 검증기·판독기, 공통 별칭 수집, Rust 패키지·프로젝트 판독의 **Wallaby 단위 테스트 38/38 통과**. [실행 기록](results/2026-10-14/unit.txt).
- 인덱스 설정 관찰·관계 갱신을 분리한 뒤 **인덱스/복원/워커 통합 9/9 재검증**. [실행 기록](results/2026-10-14/index.txt).
- Ruby 반복문 이후 다른 상수의 오탐 배제 단언까지 추가한 최종 **언어별/인덱스/워커 통합 36/36 통과**. [실행 기록](results/2026-10-14/focused.txt).
- [타입 검사](results/2026-10-14/typecheck.txt), [oxlint](results/2026-10-14/lint.txt), [배포 빌드](results/2026-10-14/build.txt), [`pnpm format`](results/2026-10-14/format.txt) 통과. 빈 타입 검사·lint 로그는 종료 코드 0을 확인한 실행이다.

## 검증 공백

1. 실제 모든 사용자 저장소의 정의·사용처 정답 집합을 구축하지 않았다. 통과한 결과는 위 fixture와 기존 회귀 사례에서의 증거다.
2. Python 동적 import·`getattr`·복잡한 반복/예외/클로저 실행 순서, Rust procedural macro·생성 소스·전체 feature 조합과 `cfg(test)` 라이브러리 변형, Ruby 동적 상수·메타프로그래밍과 반복 횟수별 실행 경로는 전수 검증하지 않았다.
3. 추가 JavaScript 확장은 정적 문자열 모듈 호출의 불변 구조 분해 바인딩을 대상으로 했다. 가변 대입, 중첩 구조 분해, 계산한 모듈 경로와 간접 로더 전체의 완전성은 검증하지 않았다. TypeScript 일반 import·재내보내기·별칭은 기존 컴파일러 조회를 유지한다.
4. 누락 검토 당시에는 속도를 다시 측정하지 않았다. 후속 [성능 비교](performance.md)에서 서버 스트림 시간을 측정했으며 브라우저 첫 표시 시간은 측정하지 않았다.

## 구조·명명 검토

논리 문장 판독, 별칭 수명 검증, 컴파일러 모듈 바인딩 수집을 각각의 역할로 분리했다. Python 상태 변환은 소스 문자열 입력에서 계산하고, 파일·프로세스 조회는 기존 수집 경계에 유지했다. 설정 관찰은 인덱스의 두 입력 경로에서 공유한다. 변경 파일은 600줄 미만이며 의존성·패키지 스크립트·타이머·UI 상태 문구를 추가하지 않았다. 별도 P3/P4 제안은 남기지 않는다.

새 언어 분석기 추가, 외부 라이브러리 런타임 수정과 TypeScript 프로젝트 분할은 범위 밖이다.

[TypeScript 7 LSP 별도 비교](../native-analysis/README.md)에서는 기존 탐색을 유지한 채 330개 기록으로 성능과 별칭·패키지 밖·선언 연결 차이를 확인했다. 누락이 있는 조건은 동등한 검색의 속도 개선으로 계산하지 않았다.
