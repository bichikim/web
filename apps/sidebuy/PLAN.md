# SideBuy 클라이언트 계획

## 1. 역할

SideBuy는 사용자가 지정한 SideBuy 호환 API 서버에 연결하여 구매 결정을 돕는 클라이언트다.

- `sidebuy.io`에는 SSG로 생성한 정적 파일만 배포한다.
- SideBuy 계정, 중앙 API, 데이터베이스와 동기화 기능을 두지 않는다.
- AI 실행, 구매 세션, 상품 조사, 추천, 가격 탐색과 데이터 저장은 연결된 API 서버가 담당한다.
- 공식 API 서버를 당장 운영하지 않으며 사용자가 자신의 서버 주소를 입력한다.
- 서버 구현과 배포 계획은 [`../sidebuy-api/PLAN.md`](../sidebuy-api/PLAN.md)에서 관리한다.

## 2. 기술 및 배포

| 영역           | 선택                                             |
| -------------- | ------------------------------------------------ |
| UI             | SolidJS + SolidStart                             |
| 빌드           | SSG                                              |
| 스타일         | UnoCSS                                           |
| API 클라이언트 | `@apps/sidebuy-api/client` Hono RPC 클라이언트   |
| 상태           | SolidJS 반응형 상태                              |
| 영구 설정      | 브라우저 로컬 저장소, 설치형 앱은 앱 설정 저장소 |
| 배포           | 정적 호스팅과 CDN                                |

빌드 결과에는 HTML, JavaScript, CSS와 정적 자산만 포함한다. SSR, 서버 함수와 SideBuy 전용 API 경로는 만들지 않는다. API 주소는 빌드 환경 변수가 아니라 실행 중 사용자가 설정한다.

동적 세션 ID를 정적 호스팅에서 안전하게 처리하기 위해 초기에는 `/session?id=...`처럼 미리 생성할 수 있는 경로와 쿼리 문자열을 사용한다. 경로 매개변수를 도입하면 정적 호스팅에 SPA fallback 규칙을 함께 설정한다.

## 3. 서버 연결

첫 실행 화면은 로그인이 아니라 서버 연결 화면이다.

1. 사용자가 API 기본 주소를 입력한다.
2. 클라이언트가 주소 형식과 보안 조건을 검사한다.
3. `GET /v1/capabilities`로 SideBuy 프로토콜과 버전을 확인한다.
4. 서버가 인증을 요구하면 서버가 선언한 인증 화면을 표시한다.
5. 연결이 성공하면 API 주소와 연결 설정을 기기에 저장한다.
6. 이후 모든 구매 요청을 해당 서버로 직접 보낸다.

원격 주소는 HTTPS만 허용하고 로컬 개발과 개인 컴퓨터 연결에 한해 `localhost`의 HTTP를 허용한다.

클라이언트는 다음 상태를 명확히 구분한다.

- 서버 미설정
- 연결 확인 중
- 인증 필요
- 연결됨
- 호환되지 않는 서버 또는 프로토콜 버전
- 네트워크 연결 실패

설정 화면에서 주소를 변경하거나 연결 정보를 삭제할 수 있다. 서버를 바꾸면 이전 서버의 세션이 새 서버에 존재한다고 가정하지 않는다.

## 4. 인증과 로컬 저장

SideBuy 자체 로그인은 없다. 인증이 필요하면 연결된 API 서버가 담당한다.

웹 클라이언트에 저장하는 정보:

- API 기본 주소
- 확인한 프로토콜 버전과 기능
- 선택한 연결 방식
- 사용자가 저장을 선택한 연결 토큰

API 주소와 기능 정보는 로컬 저장소에 저장한다. 연결 토큰은 기본적으로 현재 세션에서만 유지하고, 사용자가 자동 연결을 선택한 경우에만 브라우저 저장소에 보관한다. 설치형 앱에서는 운영체제 보안 저장소를 사용한다.

구매 세션과 추천 결과는 API 서버가 원본이다. 클라이언트 캐시는 화면 복원과 성능 개선에만 사용하며 동기화 저장소로 취급하지 않는다.

## 5. 구매 흐름

### 5.1 구매 조건 결정

사용자가 “젖병을 사고 싶다”처럼 입력하면 API 서버가 카테고리별 추가 질문을 구조화된 JSON으로 반환한다.

- 필수 조건: 맞지 않으면 후보에서 제외
- 선호 조건: 추천 순위에 반영
- 도움말: 어려운 용어와 선택지의 차이 설명
- 추가 요청: 자연어 제약과 선호 입력
- 판단 전략: 감당할 수 없는 리뷰 문제와 최소 신뢰 기준

클라이언트는 질문, 자동 선택의 출처와 사용자의 변경 내용을 표시하고 답변을 API 서버에 저장한다.

### 5.2 구매 제품 결정

조건과 리뷰를 바탕으로 상위 1~3개 후보를 우선 표시한다.

각 상품 카드에는 다음을 표시한다.

- 추천 순위와 한 줄 결론
- 조건에 맞는 이유
- 충족하지 못한 조건과 단점
- 핵심 사양과 리뷰 위험
- 리뷰 신뢰도와 예상 가격대
- 대표 판매 페이지
- 가격 탐색 시작

대표 판매 페이지는 새 창으로 열고 클라이언트 상태를 유지한다. 이 동작만으로 가격 탐색을 시작하지 않는다.

### 5.3 최적 구매처 결정

사용자가 제품과 정확한 옵션을 선택한 뒤 API 서버에 가격 탐색을 요청한다. 클라이언트는 비동기 작업 상태를 표시하고 다음 결과를 구분한다.

- AI 최종 추천 구매처
- 배송비 포함 최저가
- 멤버십 반영 최저가
- 가장 빠른 배송

가격과 재고에는 수집 시점과 결제 단계에서 달라질 수 있다는 안내를 표시한다.

## 6. 클라이언트 구조

```text
apps/sidebuy/
├─ public/
├─ src/
│  ├─ app.tsx
│  ├─ routes/
│  │  ├─ index.tsx
│  │  ├─ connect.tsx
│  │  ├─ purchase.tsx
│  │  ├─ session.tsx
│  │  └─ settings.tsx
│  ├─ features/
│  │  ├─ server-connection/
│  │  ├─ condition-interview/
│  │  ├─ recommendation/
│  │  └─ price-search/
│  └─ shared/
│     ├─ api/
│     ├─ storage/
│     └─ ui/
├─ app.config.ts
└─ package.json
```

- API 기본 주소는 하나의 연결 저장소에서 관리한다.
- 저장된 API 주소로 `createSidebuyApiClient`를 생성한다.
- 모든 네트워크 요청은 Hono RPC typed client를 통과한다.
- 기능별 UI는 Hono나 PostgreSQL 같은 서버 구현 세부 사항을 알지 않는다.
- API 오류를 연결 오류, 인증 오류, 검증 오류와 작업 오류로 구분한다.
- 긴 작업은 Server-Sent Events를 우선 사용하고 재연결 시 작업 조회 API로 복구한다.

## 7. 주요 API 의존성

- `GET /v1/health`
- `GET /v1/capabilities`
- `POST /v1/purchase-sessions`
- `GET /v1/purchase-sessions/:id`
- `POST /v1/purchase-sessions/:id/answers`
- `POST /v1/purchase-sessions/:id/recommendations`
- `POST /v1/purchase-sessions/:id/price-searches`
- `POST /v1/purchase-sessions/:id/decisions`
- `GET /v1/jobs/:id`
- `GET /v1/jobs/:id/events`
- `POST /v1/jobs/:id/cancel`

`apps/sidebuy-api`가 내보내는 `SidebuyApiType`과 `createSidebuyApiClient`를 사용한다. API 기본 주소는 사용자가 실행 중 입력하므로 SSG 빌드에 고정하지 않는다.

```text
apps/sidebuy-api/src/app.ts
          │ SidebuyApiType
          ▼
apps/sidebuy-api/src/client.ts
          │ createSidebuyApiClient(baseUrl)
          ▼
apps/sidebuy
```

클라이언트 진입점은 서버 앱을 타입으로만 참조해야 한다. Node.js 서버, 데이터베이스와 AI 모듈이 브라우저 번들에 포함되지 않는지 빌드 결과로 검증한다.

## 8. 보안과 복구

- 원격 API에는 HTTPS를 요구한다.
- 연결 토큰과 API 응답의 민감 정보를 로그에 남기지 않는다.
- 사용자에게 저장 토큰 삭제와 서버 연결 초기화 기능을 제공한다.
- HTML로 전달된 모델 출력을 직접 렌더링하지 않는다.
- 모든 API 응답을 런타임 스키마로 검증한다.
- API 서버는 `https://sidebuy.io`와 허용된 개발 출처에 CORS를 설정해야 한다.
- 새로고침 후 API 서버에서 구매 세션과 작업 상태를 다시 조회한다.

## 9. MVP 범위

### 포함

- SolidStart SSG 빌드
- API 주소 입력, 호환성 확인과 변경
- 인증 없음과 Bearer 토큰 연결
- 자연어 구매 요청과 조건 질문
- 상위 상품 추천과 리뷰 위험 표시
- 대표 판매 페이지 열기
- 가격 탐색 진행 상태와 결과
- 연결 및 API 오류 복구

### 제외

- SideBuy 계정과 중앙 로그인
- 클라이언트용 중앙 데이터베이스
- 기기 간 동기화
- SideBuy 관리형 API
- 결제와 요금제
- 여러 API 서버의 세션 통합

## 10. 구현 순서

1. SolidStart SSG와 정적 호스팅 출력 구성
2. `@apps/sidebuy-api/client` workspace 의존성과 Hono RPC 클라이언트 연결
3. 서버 연결 저장소와 `/v1/capabilities` 확인 구현
4. 인증 없음과 Bearer 토큰 연결 구현
5. 공통 API 오류 모델 구현
6. 구매 세션 생성과 조건 질문·답변 구현
7. 추천 후보와 대표 판매 페이지 흐름 구현
8. 가격 탐색과 SSE 작업 상태 구현
9. 새로고침·연결 실패·서버 변경 복구 구현
10. 접근성, 반응형 화면과 설치형 앱 저장소 경계 정리

## 11. 완료 조건

- 정적 파일만으로 `sidebuy.io`를 배포할 수 있다.
- 빌드 후에도 사용자가 API 주소를 자유롭게 변경할 수 있다.
- SideBuy 계정이나 중앙 서버 없이 전체 구매 흐름을 수행할 수 있다.
- API 요청과 응답 타입이 `apps/sidebuy-api`에서 자동으로 전달된다.
- 브라우저 빌드에 SideBuy API 서버 코드가 포함되지 않는다.
- 페이지를 새로고침해도 연결 설정을 복구한다.
- API 서버의 인증 요구와 기능 차이를 `capabilities`에 따라 처리한다.
- 지원하지 않는 서버와 네트워크 오류를 사용자가 이해할 수 있게 안내한다.
