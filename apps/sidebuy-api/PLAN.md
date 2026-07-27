# SideBuy API 구성 계획

## 1. 역할

`apps/sidebuy-api`는 사용자가 직접 실행하거나 원하는 클라우드에 배포하는 SideBuy 호환 API 서버다.

- `apps/sidebuy`에는 API 주소 연결과 화면 표시만 둔다.
- AI 실행, 구매 세션, 상품 조사, 추천, 가격 탐색과 데이터 저장은 이 서버가 담당한다.
- 현재는 단일 사용자 서버만 구현한다.
- 향후 관리형 서버를 별도 운영할 수 있도록 인증, 저장소와 사용량 측정의 경계만 유지한다.

## 2. 기술 선택

| 영역         | 선택                                | 이유                                                                        |
| ------------ | ----------------------------------- | --------------------------------------------------------------------------- |
| 런타임       | Node.js 22 이상                     | 저장소 기준과 일치하며 Docker와 일반 서버 배포가 쉽다.                      |
| HTTP         | Hono + `@hono/node-server`          | Web Standards 기반 API와 Node.js 배포를 함께 지원한다.                      |
| 입력 검증    | Zod + Hono validator                | 요청과 AI 출력의 JSON 스키마를 같은 타입 체계에서 검증한다.                 |
| API 규격     | Hono RPC                            | 서버의 라우트 타입을 SideBuy 클라이언트에 직접 공유한다.                    |
| ORM          | Drizzle ORM + Drizzle Kit           | 스키마, 쿼리와 마이그레이션을 TypeScript에서 관리한다.                      |
| 데이터베이스 | PostgreSQL + postgres.js            | 로컬과 클라우드에서 동일한 데이터베이스 기능과 Drizzle 드라이버를 사용한다. |
| AI 실행      | pi의 통합 모델 계층과 에이전트 코어 | 공급자 호출과 필요한 도구 실행 반복을 직접 구현하는 범위를 줄인다.          |

데이터베이스는 PostgreSQL로 단일화한다. Drizzle은 `postgres.js` 드라이버를 사용하고 로컬 개발, 개인 클라우드와 향후 관리형 배포가 같은 스키마와 마이그레이션을 공유한다.

로컬 개발에서는 Docker Compose로 PostgreSQL을 실행한다.

```env
DATABASE_URL=postgresql://sidebuy:sidebuy@localhost:5432/sidebuy
```

`compose.yaml`의 PostgreSQL 서비스는 다음 기준을 따른다.

- PostgreSQL 18 Alpine 이미지를 메이저 버전으로 고정
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`를 로컬 환경 파일에서 주입
- 데이터는 이름이 있는 Docker 볼륨에 영속화
- `pg_isready` 상태 검사를 통과한 뒤 API와 마이그레이션 실행
- 호스트 포트는 기본 `5432`이며 환경 변수로 변경 가능
- 예제 비밀번호는 로컬 개발에만 사용하고 배포 환경에서 재사용하지 않음

```sh
docker compose up -d postgres
pnpm db:migrate
docker compose down
```

배포 환경에서는 공급자가 발급한 PostgreSQL 연결 주소만 교체한다.

```env
DATABASE_URL=postgresql://user:password@database.example.com:5432/sidebuy
```

## 3. 배포 형태

### 현재 구현

- 개인 컴퓨터에서 실행
- Docker 또는 일반 Node.js 서버로 개인 클라우드에 배포
- 인증 없음 또는 하나의 고정 Bearer 토큰
- AI 공급자 자격 증명은 환경 변수나 서버 내부 보안 저장소에서 관리
- 하나의 PostgreSQL 데이터베이스 사용
- 로컬 PostgreSQL은 Docker Compose로 실행

### 향후 고려만 하는 항목

- SideBuy 관리형 API
- 다중 사용자 및 워크스페이스
- 로그인, 결제, 요금제와 사용량 제한
- 사용자별 AI 자격 증명
- 데이터베이스 또는 행 단위 테넌트 분리

현재 코드에 관리형 배포 분기를 미리 추가하지 않는다. 대신 요청 주체, 자격 증명 저장소와 사용량 기록을 교체할 수 있도록 핵심 로직에서 분리한다.

## 4. 서버 연결 흐름

1. 사용자가 SideBuy 클라이언트에 API 기본 주소를 입력한다.
2. 클라이언트가 `GET /v1/capabilities`를 호출한다.
3. 서버가 프로토콜 버전, 인증 방식과 지원 기능을 반환한다.
4. 인증이 필요하면 클라이언트가 Bearer 토큰을 함께 전송한다.
5. 확인이 끝나면 클라이언트가 주소와 연결 정보를 기기에 저장한다.
6. 이후 모든 구매 요청은 해당 API 서버로 직접 전송한다.

```json
{
  "protocol": "sidebuy",
  "version": "1",
  "authentication": {
    "type": "bearer",
    "required": false
  },
  "features": ["condition-interview", "product-research", "recommendation", "price-search"]
}
```

브라우저에서 직접 연결할 수 있도록 허용 출처를 설정한다. 기본 허용 대상은 `https://sidebuy.io`이며 로컬 개발 주소는 환경 변수로 추가한다.

## 5. API 경계

### 서버 상태

- `GET /v1/health`: 프로세스와 데이터베이스 연결 상태
- `GET /v1/capabilities`: 호환 버전, 인증 방식과 지원 기능

### 구매 세션

- `POST /v1/purchase-sessions`: 자연어 구매 요청으로 세션 생성
- `GET /v1/purchase-sessions/:id`: 현재 단계와 결과 조회
- `POST /v1/purchase-sessions/:id/answers`: 조건 답변 저장
- `POST /v1/purchase-sessions/:id/recommendations`: 추천 작업 시작
- `POST /v1/purchase-sessions/:id/price-searches`: 선택 제품의 가격 탐색 시작
- `POST /v1/purchase-sessions/:id/decisions`: 제품·구매처 결정 기록

### 비동기 작업

- `GET /v1/jobs/:id`: 작업 상태와 오류 조회
- `GET /v1/jobs/:id/events`: Server-Sent Events로 진행 상황 전달
- `POST /v1/jobs/:id/cancel`: 취소 가능한 작업 중단

모든 요청과 응답은 버전이 있는 Zod 스키마로 검증한다. 시간이 오래 걸리는 상품 조사와 가격 탐색은 HTTP 요청 안에서 끝내지 않고 작업으로 실행한다.

## 6. TypeScript API 공유

`apps/sidebuy-api`는 Hono 라우트에서 추론한 `SidebuyApiType`과 브라우저에서 사용할 클라이언트 팩터리를 제공한다.

```text
apps/sidebuy-api/src/app.ts
  └─ Hono app 및 SidebuyApiType 내보내기

apps/sidebuy-api/src/client.ts
  └─ createSidebuyApiClient(baseUrl) 내보내기

apps/sidebuy
  └─ @apps/sidebuy-api/client 사용
```

- `app.ts`는 모든 공개 라우트를 체인으로 등록하고 `typeof app`을 내보낸다.
- `client.ts`는 `hono/client`의 `hc`에 `SidebuyApiType`을 적용한다.
- `client.ts`는 `app.ts`를 타입으로만 참조해 Node.js 서버 코드가 브라우저 번들에 포함되지 않게 한다.
- `apps/sidebuy`는 저장된 API 주소를 `createSidebuyApiClient`에 전달한다.
- 요청 본문, 경로 매개변수, 상태 코드와 응답 본문은 Hono RPC 타입으로 추론한다.
- API 앱은 `./client`를 별도 package export로 제공하고 선언 파일을 먼저 빌드한다.
- 두 앱은 같은 Hono 버전과 TypeScript strict 설정을 사용한다.

OpenAPI 생성과 별도 SDK 배포는 현재 범위에 포함하지 않는다. 다른 언어의 호환 서버가 필요해질 때 Hono 라우트와 Zod 스키마에서 OpenAPI를 추가한다.

## 7. 내부 구조

```text
apps/sidebuy-api/
├─ src/
│  ├─ index.ts
│  ├─ app.ts
│  ├─ client.ts
│  ├─ config/
│  ├─ http/
│  │  ├─ middleware/
│  │  ├─ routes/
│  │  └─ schemas/
│  ├─ modules/
│  │  ├─ purchase-session/
│  │  ├─ category-skill/
│  │  ├─ catalog/
│  │  ├─ recommendation/
│  │  ├─ review/
│  │  ├─ pricing/
│  │  └─ decision/
│  ├─ ai/
│  │  ├─ providers/
│  │  ├─ runtime/
│  │  └─ tools/
│  ├─ jobs/
│  ├─ db/
│  │  ├─ client.ts
│  │  ├─ schema/
│  │  └─ repositories/
│  └─ observability/
├─ drizzle/
├─ drizzle.config.ts
├─ compose.yaml
└─ .env.example
```

HTTP 처리, AI 실행, 규칙 기반 추천과 데이터 접근을 분리한다. Hono 핸들러에서 Drizzle 쿼리나 모델 호출을 직접 수행하지 않는다.

## 8. 데이터 모델

첫 구현에 필요한 테이블은 다음과 같다.

- `purchase_sessions`: 원래 요청, 단계, 판단 전략과 스키마 버전
- `condition_questions`: 생성된 질문과 선택지
- `condition_answers`: 사용자 답변과 자동 선택 출처
- `category_skills`: 카테고리별 질문, 안전 규칙과 점수 기준
- `products`: 브랜드와 모델로 식별하는 논리적 제품
- `product_variants`: 용량, 색상, 크기와 구성
- `offers`: 판매처별 가격, 배송, 재고와 수집 시점
- `review_insights`: 리뷰 위험, 빈도, 최근성과 신뢰도
- `recommendations`: 후보 점수, 제외 이유와 설명
- `price_searches`: 가격 탐색 상태와 비교 결과
- `purchase_decisions`: 제품·구매처 선택과 구매 상태
- `jobs`: 비동기 작업 상태, 재시도 횟수와 오류
- `ai_runs`: 공급자, 모델, 프롬프트·스킬 버전과 토큰 사용량

향후 관리형 서비스 확장을 위해 핵심 레코드에는 소유 범위를 추가할 수 있게 저장소 인터페이스를 설계한다. 단일 사용자 단계에서 가상의 사용자나 불필요한 로그인 테이블은 만들지 않는다.

## 9. AI 실행 원칙

- 공급자 호출은 공통 `AiProvider` 경계 뒤에 둔다.
- pi의 코딩 에이전트 전체가 아니라 통합 모델 계층과 에이전트 코어만 사용한다.
- 질문 생성, 리뷰 분류와 추천 설명은 구조화된 출력으로 받는다.
- 상품 제외와 추천 점수 계산은 결정론적 규칙 엔진이 수행한다.
- 외부 검색과 판매처 조회는 명시적으로 등록한 도구만 허용한다.
- 각 실행에 모델, 입력 스키마, 스킬 버전과 사용량을 기록한다.
- 자격 증명, 원문 프롬프트의 민감 정보와 전체 모델 응답을 기본 로그에 남기지 않는다.

## 10. 보안과 운영

- 외부 배포에서는 HTTPS와 Bearer 토큰을 기본으로 한다.
- CORS는 설정된 출처만 허용하고 와일드카드와 자격 증명을 함께 사용하지 않는다.
- 요청 본문 크기, 모델 실행 시간과 외부 요청 시간을 제한한다.
- 판매처 커넥터의 대상 호스트를 제한해 SSRF를 방지한다.
- API 토큰과 AI 자격 증명은 로그와 오류 응답에서 제거한다.
- 데이터베이스 마이그레이션은 서버 시작과 분리하고 배포 단계에서 실행한다.
- 종료 신호를 받으면 새 작업을 막고 진행 중인 요청과 데이터베이스 연결을 정리한다.
- 구조화된 로그에 요청 ID, 구매 세션 ID와 작업 ID를 포함한다.

## 11. 구현 순서

1. Node.js용 Hono 앱과 설정 검증 구성
2. `SidebuyApiType`과 브라우저용 typed client export 구성
3. `/v1/health`, `/v1/capabilities`, CORS와 선택적 Bearer 인증 구현
4. Docker Compose 기반 로컬 PostgreSQL과 Drizzle 마이그레이션 구성
5. 구매 세션과 조건 질문·답변 API 구현
6. AI 공급자 경계와 pi 런타임 연결
7. 한 카테고리의 상품 조사와 규칙 기반 추천 구현
8. 작업 상태 및 SSE 진행 상황 구현
9. 제품 옵션 확정과 가격 탐색 구현
10. 감사 로그, 사용량 기록과 Docker 배포 구성
11. SideBuy 클라이언트와 Hono RPC 타입 및 런타임 연결 검증

## 12. 첫 단계 완료 조건

- Docker Compose로 로컬 PostgreSQL을 실행할 수 있다.
- 로컬과 외부 PostgreSQL이 같은 `DATABASE_URL` 계약을 사용한다.
- SideBuy 클라이언트가 주소를 입력하고 호환성을 확인할 수 있다.
- 인증 없음과 고정 Bearer 토큰 구성을 모두 지원한다.
- 구매 세션 생성부터 조건 답변 저장까지 동작한다.
- SideBuy 클라이언트에서 요청과 응답 타입이 자동 추론된다.
- 브라우저 번들에 Node.js 서버 코드가 포함되지 않는다.
- 마이그레이션, 테스트, 포맷과 린트가 CI에서 재현된다.
- 같은 서버 이미지를 개인 클라우드에 배포할 수 있다.

## 참고 문서

- [Hono Node.js](https://hono.dev/docs/getting-started/nodejs)
- [Hono RPC](https://hono.dev/docs/guides/rpc)
- [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [PostgreSQL Docker Official Image](https://hub.docker.com/_/postgres)
