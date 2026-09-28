# 웹 단건 앨범 구매

[유료 음악과 앨범 관리](./paid-albums.md)의 웹 결제 1차 실행 계획이다.

작성일: 2026-09-16. 2026-09-23 갱신. 웹 결제 코드의 활성 제공자는 Paddle이고 앱인토스 IAP 계약은 유지한다. 서버 transaction 생성·조회, Checkout 페이지, 웹훅 서명·중복 처리, 완료·환불 반영과 구매 UI가 연결되었다.
검증 상태: Paddle 모의 응답을 사용한 결제 테스트와 타입 검사는 통과했다. Paddle Sandbox 계정에서 카드 결제·웹훅·환불, 실제 DB 동시성, 구매 완료부터 재생까지의 브라우저 E2E는 아직 수행하지 않았다. 아래 과거 Stripe DB 검증 기록은 현행 Paddle 경로의 증거가 아니다.

2026-09-23 현재 작업 트리 검증: Paddle 결제·관리 API 경로 21개 파일의 90개 테스트, 영향 받은 구매 UI·재생·계정 경로 101개 파일의 731개 테스트, Pomo 타입 검사, oxlint, 웹 빌드와 앱인토스 SSG 빌드가 통과했다. 실제 Paddle Sandbox/DB 결제 흐름 검증은 이 결과에 포함되지 않는다.

최신 `origin/dev` 복구본에서는 기존 0020~0022 마이그레이션을 유지하고 결제 스키마 차이를 `0023_shocking_the_professor.sql`로 다시 생성했다. 결제·관리 API 90개, UI·재생·계정·환경설정 841개, 스키마·cron 등 23개 테스트와 타입 검사·oxlint·두 빌드가 통과했다. 신규 0023 SQL은 expand-only 검사에 통과한다. 전체 migration 검사 명령은 상위 브랜치의 기존 `0022_organic_darwin.sql`에 있는 `DROP CONSTRAINT` 때문에 실패하며, 이 결과를 신규 0023의 실패로 해석하지 않는다.

## 목표와 범위

해외 구매자가 일반 웹에서 로그인하고 앨범 하나를 단건 결제한 뒤, 해당 계정으로 앨범 전체를
재생할 수 있게 한다. 먼저 결제부터 권한 지급까지 한 흐름을 완성한다.

- 1차 포함: 앨범별 단건 구매, 해외 발급 카드 결제, 구매 상태, 구매 내역, 재로그인 후 권한 복원,
  결제 실패 복구, 전액 환불 반영.
- 상품 초안: 선택한 앨범에 기간 제한 없는 Pomo 내 재생 이용권을 지급한다. 음원 파일 다운로드나
  저작권 양도는 포함하지 않는다. 서비스 종료·콘텐츠 제공 조건은 판매 안내에서 별도로 확정한다.
- 제외: 월·연 구독, 빌링키, 자동 갱신, 장바구니, 선물, 쿠폰, 묶음 판매, 다중 통화, 셀프 부분 환불.
- 대상: 일반 웹. 앱인토스 결제 구현과 외부 결제 유도는 이번 범위에 포함하지 않는다.
- 가격은 미정이다. 구현용 테스트 가격과 실제 판매 가격을 분리한다.

## 해외 결제 방향

웹 결제 제공자는 **Paddle Checkout**으로 결정한다. Paddle은 Merchant of Record로 결제·세금·
부정 결제·글로벌 규정 준수를 처리하며, 앱인토스는 기존 앱인토스 결제를 사용한다. 일반 웹의
결제 제공자는 `paddle`로 구분한다.

로그인한 Pomo 사용자의 내부 주문에 연결된 Paddle one-time transaction/Checkout을 생성하고,
앨범 하나의 기간 제한 없는 재생 이용권을 판매한다. 공유 결제 링크 대신 주문별 transaction을
사용해 로그인한 사용자와 구매 권한을 서버에서 연결한다. 판매 통화·가격은 아직 미정이며,
Paddle의 지원 통화와 사업자 계정 설정을 확인한 뒤 확정한다.

- [Paddle 디지털 상품 판매](https://www.paddle.com/solutions/sell-digital-products)
- [Paddle one-time 디지털 상품](https://developer.paddle.com/get-started/how-paddle-works/digital-products/)
- [Paddle 판매 가능 국가](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle)

### 출시 전 확인

- Paddle 사업자 계정 심사·한국 사업자 정산 가능 여부·정산 계좌를 확인한다.
- 앨범별 Paddle Product·단건 Price, 판매 통화·가격·세금 분류와 결제창 언어를 확정한다.
- 수수료·정산·세금 처리·환불 및 분쟁 처리 조건을 실제 계정 기준으로 확인한다.
- 음원별 해외 유료 스트리밍 판매 권리와 한국어·영어 상품 설명 및 환불 정책을 확인한다.
- 음원 스트리밍 이용권 모델이 Paddle 심사에서 허용되는지와 필요한 권리 증빙을 확인한다.

계정 조건이 아직 확인되지 않아도 결제 제공자는 Paddle 기준으로 유지한다. Paddle의 운영 계정
사용이 불가능한 것으로 확인되면 구체적인 제약을 보고하고 방향을 다시 결정하며, 다른 결제사로
임의 변경하지 않는다.

### 결제 제공자 결정

- [x] 웹 단건 앨범 결제 제공자로 Paddle을 채택한다.
- [ ] Paddle에 한국 사업자의 계정 개설·정산 가능 여부와 음원 스트리밍 이용권 모델의 허용 여부를 확인한다.
- [ ] Paddle의 실제 계정에서 수수료·환불·분쟁·웹훅·정산 조건을 확인한다.
- [x] 웹의 활성 결제 경로를 Paddle로 교체하고 앱인토스 IAP 경로를 유지한다.

PayPal 후보 문의 계획은 Paddle 채택으로 보류한다. Paddle의 계정 심사 결과가 달라질 때만
다시 검토한다.

### Paddle 연결 설정

서버에는 `PADDLE_API_KEY`, `PADDLE_ENVIRONMENT`(`sandbox`/`live`),
`PADDLE_WEBHOOK_SECRET`을 설정한다. 웹 빌드에는 공개 토큰
`VITE_PADDLE_CLIENT_TOKEN`과 `VITE_PADDLE_ENVIRONMENT`(`sandbox`/`production`)를
같은 환경으로 설정한다. 예시는 [환경 파일](../../../.env.example)에 있다.
Paddle의 승인된 Checkout 도메인과 기본 payment link가
`/payments/checkout` 페이지를 가리키게 하고, 알림 대상은
`/api/payments/paddle/webhook`으로 등록한다. 구독 이벤트는 이번 단계에 포함하지 않는다.
Paddle가 거래를 만들 때 반환하는 `checkout.url`의 `_ptxn`으로 해당 페이지에서
준비된 transaction을 연다. [기본 payment link](https://developer.paddle.com/build/transactions/default-payment-link/),
[transaction 생성](https://developer.paddle.com/api-reference/transactions/create-transaction/),
[Paddle.js](https://developer.paddle.com/paddle-js/about/include-paddlejs/)를 따른다.

## 기존 코드와 연결 지점

아래는 현재 소스에서 확인한 연결 지점이며 실제 배포 상태나 결제 성공 증거는 아니다.

- [상거래 스키마](../../../src/server/database/schema/commerce.ts): 기존 상품·오퍼·주문·주문 항목·권한·이벤트 모델을 활용한다.
- [사용자 식별](../../../src/server/auth/resolve-user-request.ts): 인증된 내부 Pomo 사용자 ID에 주문을 귀속한다.
- [앨범 조회와 권한 조회](../../../src/server/repositories/music-catalog/index.ts): 앱인토스 단건 오퍼 조회에 일반 웹 판매 경로를 추가하고 기존 권한 조회를 재사용한다.
- [재생 접근 API](../../../src/routes/api/music/tracks/[trackId]/access.ts): 구매 후 전체 재생과 미구매 미리듣기 전환을 검증한다.

계정 이메일이 같다는 이유만으로 다른 계정의 주문을 합치지 않는다. 웹과 토스의 권한 공유는
기존 계정 연결로 동일한 내부 사용자 ID가 된 경우에만 적용한다.

## 구현 단계

### 1. 판매 상품과 주문 계약

- [ ] 운영/테스트 데이터 미완료: 테스트 앨범 하나와 `provider: paddle`인 웹 단건 오퍼를 구성하고 Paddle Price ID를 연결한다.
- [x] 구현됨: 서버가 관리하는 가격·통화의 기준을 정하고 주문에 결제 당시 값을 보존한다.
- [x] 구현됨: 클라이언트는 내부 `productId`와 빌드 대상의 `provider`를 요청하고, 서버가 해당 상품·제공자의 활성 단건 오퍼를 선택해 판매 가능 여부·가격·기존 보유 권한을 확인한다.
- [x] Paddle 경로 구현: 내부 주문을 먼저 만들고 DB에서 거래 생성을 한 번만 점유한 뒤 Paddle transaction ID를 연결한다. 생성 응답이 불확실할 때는 같은 주문으로 다시 생성하지 않는다. 저장된 거래 ID가 있으면 재조회한다.
- [ ] Paddle 생성 응답과 저장이 모두 유실된 주문의 자동 조회·복구 경로를 마련한다. 현재는 중복 결제 방지를 위해 재생성을 보류한다.
- [x] 구현됨: 동시 탭과 여러 서버 인스턴스의 동일 구매 시도를 DB 제약·트랜잭션으로 조정한다.

완료 조건: 가격 변조와 타인 주문 접근이 거부되고, 같은 구매 시도가 중복 결제로 이어지지 않는다.
검증 상태: [x] 비운영 개발 DB에서 8개 동시 prepare가 주문 1건·활성 예약 1건으로 수렴하는 것을 확인했다. [ ] 실제 Paddle 중복 청구 실험은 아직 실행하지 않았다.

### 2. 결제창과 승인

- [x] 로그인 → 앨범·가격·통화 확인 → Paddle transaction Checkout 페이지 → 결과 화면의 코드 경로를 연결한다.
- [x] 서버가 Paddle Price API와 transaction을 조회해 내부 주문 참조·Price·수량·기준 금액·통화·완료 상태를 검증한다. 세금·환전이 포함된 실제 청구 총액은 Paddle transaction의 별도 값이다.
- [x] 구현됨: 성공 리다이렉트나 브라우저의 성공 값만으로 권한을 지급하지 않는다.
- [x] 구현됨: 승인 후 주문·주문 항목·기간 제한 없는 권한을 DB 트랜잭션으로 반영한다.
- [x] 구현됨: transaction ID가 저장된 주문은 Paddle 조회로 상태를 다시 확인한다. 생성 응답과 ID 저장이 모두 불확실한 주문은 재생성을 보류한다.
- [x] 구현됨: 비밀키는 서버에서만 사용하고 카드 정보는 Pomo가 수집·저장하지 않는다.

완료 조건: 테스트 결제 한 건으로 해당 사용자에게 해당 앨범 권한이 정확히 한 번 지급된다.
검증 상태: [ ] Paddle 테스트 환경에서의 실제 결제·웹훅 순서 실험은 아직 실행하지 않았다.

### 3. 재전송·장애·환불 복구

- [x] 원본 요청 본문과 Paddle webhook 서명을 검증하고 Paddle 이벤트 ID로 중복을 제거한다. 완료 이벤트 뒤 transaction을 재조회해 권한을 지급한다. ([webhook route](../../../src/routes/api/payments/paddle/webhook.ts), [completion](../../../src/server/payment/paddle-completion.ts))
- [x] 구현됨: 이벤트 중복과 순서 역전을 처리한다. 늦은 성공 이벤트가 환불 상태를 되돌리지 못하게 한다.
- [x] 구현됨: 승인 성공 후 DB 실패, 브라우저 종료, 웹훅 누락을 지속 저장된 주문으로 복구한다. ([order status route](../../../src/routes/api/payments/orders/[orderId].ts))
- [x] 구현됨: 복구 작업은 다중 인스턴스에서 동작하도록 DB 기반 작업 점유와 재시도 기록을 둔다. ([provider event inbox](../../../src/server/payment/provider-events.ts))
- [x] 구현됨: 전액 환불이 확인되면 그 주문에서 지급한 권한만 회수한다. 다른 구매 권한은 유지한다. ([completion repository](../../../src/server/payment/completion-repository.ts))
- [ ] Paddle 승인 부분 환불은 주문의 기준 가격에 비례해 기록한다. 최소 단위 1인 상품의 부분 환불과 분쟁은 현재 자동 반영되지 않으므로 운영 처리 경로가 필요하다.
- [ ] 권한 회수 후 이미 발급한 재생 URL의 잔여 유효 시간과 재생 중 동작을 확인하고 운영 정책에 반영한다.

완료 조건: 중복 이벤트와 승인 직후 장애 실험에서도 중복 권한이 없고, 결제된 주문은 복구된다.
검증 상태: [x] 비운영 개발 DB에서 중복 inbox 수신, retry, 만료 lease 재점유, 승인·환불 race를 확인했다. provider 증거는 생성 fixture였고 실제 Paddle 이벤트 순서는 아직 실행하지 않았다.

### 4. 구매와 재생 화면

- [x] 구현됨: 앨범에 가격·통화·구매 버튼 또는 구매 완료 상태를 표시한다.
- [x] 구현됨: 결제 상태를 처리 중·완료·취소·실패로 구분하고 확인 중에는 중복 구매를 유도하지 않는다.
- [x] 구현됨: 구매 완료 후 기존 재생 권한을 다시 조회해 전체 재생으로 연결한다.
- [x] 구현됨: 구매 내역에 앨범·금액·통화·결제 시각·상태와 제공 가능한 영수증을 표시한다.
- [ ] 한국어·영어로 상품 범위, 결제 상태, 환불 문의 경로를 제공한다. 결제 상태와 상품 범위는 반영했지만, 웹 결제 전용 환불 문의 경로는 운영 정책 확정 후 연결한다.
- [x] 구현됨: 세션 만료 시 로그인 후 기존 주문 확인으로 복귀한다.

완료 조건: 새로고침·재로그인 후에도 구매 앨범이 복원되고 미구매 계정에는 권한이 생기지 않는다. 서버 owned catalog는 현재 유효한 권한과 게시·보관 앨범의 활성 트랙만 반환하고, 저장된 트랙 ID는 재생 시 전체 접근을 다시 요청한다. 구매 앨범을 기본 재생목록에 자동 추가하지 않는다.
검증 상태: [ ] 구매 후 새로고침·재로그인·재생목록 복원 E2E는 아직 실행하지 않았다.

### 5. 검증과 출시

- [x] 실행 완료: 실제 코드 경로의 로컬 단위 테스트로 금액 검증, 소유권, 중복 승인, 이벤트 역전, 환불 경로와 owned catalog·재생목록 복원을 확인했다.
- [x] DB 통합 테스트: a28b의 비운영 개발 DB에서 생성 fixture만 사용해 실제 트랜잭션을 실행하고 cleanup까지 확인했다. 현재 migration history가 worktree와 달라 누락 컬럼 하나를 테스트 중 임시 추가·제거했다.
- [x] 두 서버 작업자의 동시 요청으로 중복 주문 처리와 복구 작업 점유를 검증했다. 8-way 주문 준비는 1개 주문으로 수렴했고, provider event inbox는 6-way 수신 중 1개만 신규가 되었다.
- [ ] Paddle 테스트 환경에서 카드·지원 결제수단 각각의 성공·거절·인증 취소·타임아웃·결제 후 창 닫기와 웹훅 재전송을 확인한다.
- [x] 실행 완료: 기존 무료 재생, 미리듣기, 유료 권한 조회, 비공개 owned catalog와 저장 재생목록 복원을 포함한 Pomo 단위 회귀 테스트를 실행했다.
- [x] 실행 완료: Playwright web 및 Apps-in-Toss 홈 hydration 스모크를 각각 통과했다. Vite 포트 폴링 대신 `VITE.*ready` stdout 신호를 기다리도록 `playwright.config.ts`와 settings config를 조정해 Nitro SSR 준비 경쟁을 제거했다.
- [x] 실행 완료: settings E2E 10건을 실행했다. Apps-in-Toss 5건은 통과했고, web 5건은 더미 DB URL로 인한 날씨 SSR 500 때문에 실패했다. 이 실행에서는 `Vite environment "ssr" is unavailable`가 재현되지 않았다.
- [x] 실행 완료: oxlint 오류를 확인하고 `pnpm format`을 실행했다. 기존 `MemoryAssist.tsx`의 무관한 warning 하나는 남아 있다.
- [ ] 외부 확인 항목을 완료한 뒤 해외 발급 카드의 실제 승인·권한 지급·전액 환불을 별도 검증한다.
- [ ] 결제만 완료되고 권한이 없는 주문, 복구 실패, 웹훅 처리 실패를 관측한다.
- [ ] 문제 발생 시 신규 결제 진입만 중단하고 기존 구매 권한과 주문 복구는 유지할 수 있게 한다.

현재 로컬 실행 기록 (2026-09-20):

- [x] `pnpm exec vitest run --project unit` (승인된 실행 환경): 1,714개 파일·9,707개 테스트가 통과했다. 제한된 샌드박스 실행에서는 `polyfills.spec.ts`의 1개 포트 바인딩 케이스만 `EPERM`이었다.
- [x] `pnpm --filter @apps/pomo typecheck` 통과.
- [x] `pnpm --filter @apps/pomo lint` 통과. 기존 `src/components/desktop-dialog/MemoryAssist.tsx`의 무관한 warning 하나가 남아 있다.
- [x] `pnpm format` 완료.
- [x] `git diff --check` 통과.
- [x] `pnpm --filter @apps/pomo db:check-production-migrations` 통과.

현재 실제 개발 환경 실행 기록 (2026-09-21):

- [x] `/Users/bichi/.codex/worktrees/a28b/web/apps/pomo/.env.local`을 사용했다. 값은 출력하지 않았고, `VERCEL_ENV=development`로 실행했다. 연결 후 결제 관련 `commerce_orders`, `commerce_order_reservations`, `commerce_entitlement_grants`, `commerce_provider_events`의 초기 행 수가 모두 0임을 확인했다.
- [x] 생성한 사용자 3명·게시 앨범·트랙·active asset·상품·현재 Stripe one-time fixture를 대상으로 실제 DB에서 8-way 예약 동시성, 동일 Checkout Session response-loss 재시도, 충돌 Session 거부, 만료 예약 재사용, fulfillment 중복, 결제 후 close, 전액 환불·재생 asset 회수, 승인/환불 race, event 중복 수신·retry·stale lease 재점유를 실행했다. 결과는 모두 기대 상태였고 생성 행은 cleanup 후 제거됐다. Paddle 전환 후 같은 검증을 다시 실행한다.
- [x] 환불 전 `listOwnedAlbums`/`findEntitledTrackPlaybackAsset`가 권한을 반환하고, 전액 환불 후 owned catalog 및 playback asset이 반환되지 않는 것을 실제 DB에서 확인했다.
- [ ] DB migration history는 현재 worktree와 일치하지 않는다. 기존 `db:migrate`는 이미 존재하는 예약 테이블과 충돌해 적용되지 않았고, 검증에서는 실제 코드 경로 실행에 필요한 nullable 컬럼 하나만 임시 추가한 뒤 제거했다. 이 환경을 정식 배포 migration 검증 결과로 간주하지 않는다.
- [x] Playwright 실행: web 및 Apps-in-Toss `e2e/shared/home.spec.ts`가 각각 1건 통과했다. 기존 Nitro 오류는 Playwright가 포트가 열린 직후 요청하던 준비 경쟁으로 확인했고, Vite ready stdout 대기로 설정을 수정한 뒤 두 런타임에서 재현되지 않았다.
- [x] settings E2E: `playwright.settings.config.ts`의 10건 중 Apps-in-Toss 5건은 통과했다. web 5건은 더미 `DATABASE_URL`이 `https://api.0.0.1/sql`로 해석되어 날씨 조회가 500이 된 뒤 설정 버튼/초기 UI를 찾지 못해 실패했다. 이는 결제 구현의 실패 증거로 사용하지 않는다.
- [ ] Paddle 실제 테스트: Paddle Sandbox 계정·API 키·webhook secret 설정이 없어 카드·실제 webhook·실제 전액 환불은 실행하지 않았다. 계속 시 필요한 설정 이름만 별도로 확인해야 하며 비밀값을 채팅에 붙여넣지 않는다.
- [ ] 구매 후 새로고침·재로그인·저장 재생목록 복원, 15분 playback token 만료·장시간 재생 refresh, 환불 후 기존 URL 회수는 아직 실행하지 않았다. Paddle 테스트 설정이 없어 현재 브라우저에서 실행할 수 없다.

출시 완료 조건은 **해외 구매자의 실제 단건 결제 → 권한 지급 → 전체 재생 → 환불 반영** 증거다.
테스트 환경 성공과 운영 성공은 따로 기록한다.

## 후속 단계

1차 완료 후 구독 혜택·가격·갱신 정책을 확정하고 구독 계약 및 회차별 결제를 추가한다.
지금은 기존 기간형 권한과 결제 제공자 분리만 유지한다. 이미 있는 모델을 활용하는 작은 비용으로
후속 구독이 단건 구매 권한을 덮어쓰지 않도록 대비하며, 구독 테이블·스케줄러는 미리 만들지 않는다.

## 구체적인 코드 구현 계획

아래 경로의 Paddle 웹 결제와 구매 화면·구매 내역은 로컬 코드로 구현되었다.
앱인토스 어댑터의 웹 공통 계약 연결은 후속 단계로 남겨 둔다.
앱인토스 어댑터는 같은 계약의 후속 구현으로 정의하며, 구현 전에는 명시적인 미지원 결과를 반환한다.
공통 API를 만들었다는 이유로 앱인토스 결제까지 동작한다고 표시하지 않는다.

### 호출 계약

```ts
// 서버가 금액·상품·제공자와 구매 시도를 확정한다.
const payment = await preparePayment({
  productId: album.productId,
  provider: 'paddle',
})

// 서버 응답을 그대로 전달하면 해당 결제 흐름을 실행한다.
await pay(payment)
```

`productId`는 내부 판매 상품 ID다. 앨범 ID, Paddle Price ID, 앱인토스 SKU와 혼용하지 않는다.
`provider`는 결제 제공자이고 카드·현지 결제수단 같은 결제수단을 뜻하는 `method`와 구분한다.
일반 구매 버튼은 빌드 대상에서 제공자를 주입받아 `preparePayment({productId})` 후 `pay(payment)`를 호출한다.
자동 선택은 일반 웹 → Paddle, 앱인토스 빌드 → 앱인토스이며 브라우저 UA로 추측하지 않는다.
명시적 provider가 현재 빌드와 맞지 않으면 거부하고 다른 제공자로 자동 전환하지 않는다.

```ts
type PaymentProvider = 'paddle' | 'apps-in-toss'

interface PreparePaymentRequest {
  readonly productId: string
  readonly provider?: PaymentProvider
}

interface PaymentDetails {
  readonly amountMinor: string
  readonly currency: string
  readonly expiresAt: string
  readonly orderId: string
  readonly productId: string
}

interface PaddlePayment extends PaymentDetails {
  readonly provider: 'paddle'
  readonly checkoutUrl: string
  readonly transactionId: string
}

interface AppsInTossPayment extends PaymentDetails {
  readonly provider: 'apps-in-toss'
  readonly sku: string
}

type PreparedPayment = PaddlePayment | AppsInTossPayment

interface PaymentStarted {
  readonly status: 'started'
  readonly orderId: string
}

interface PaymentCanceled {
  readonly status: 'canceled'
}

interface PaymentRejected {
  readonly status: 'rejected'
  readonly code:
    | 'login_required'
    | 'already_owned'
    | 'unavailable'
    | 'provider_unavailable'
    | 'price_changed'
}

interface PaymentPending {
  readonly status: 'pending'
  readonly orderId: string
}

interface PaymentFailed {
  readonly status: 'failed'
  readonly code: 'network_error' | 'provider_error'
}

type PayResult = PaymentStarted | PaymentCanceled | PaymentRejected | PaymentPending | PaymentFailed

interface PaymentClient {
  readonly pay: (payment: PreparedPayment) => Promise<PayResult>
  readonly dispose: () => void
}
```

`started`는 구매 완료가 아니다. Paddle Checkout 이동으로 문서가 종료되면 Promise의 후속 실행 자체가
보장되지 않으므로 호출자의 `await` 뒤에서 권한을 지급하거나 완료 화면을 만드는 계약을 두지 않는다.
`pending`은 주문이 있고 결제 여부를 아직 확정하지 못한 상태다. 새 결제를 시작하지 않고 해당
주문을 조회한다. 외부 SDK 예외는 어댑터에서 이 결과로 정규화하고 프로그래밍 결함은 예외로 남긴다.

금액은 서버가 확정해서 내려주는 값이다. 따라서 `pay`가 금액을 받는 구조로 설계한다.
예를 들어 서버 응답의 공통 필드가 `{amountMinor: '1000', currency: 'KRW', orderId, productId, provider}`이면
`pay(payment)`에 그대로 전달한다. 단위가 모호한 위치 인자보다 이름 있는 객체 인자를 사용한다.
`amountMinor`는 통화의 최소 단위이며 기존 bigint 금액을 JSON으로 손실 없이 전달하기 위해 문자열을
쓴다. 표시할 때 통화의 소수 자릿수를 적용한다.

`preparePayment`가 서버에서 가격·오퍼를 검증하고 구매 시도를 저장한다. `pay`는 그 결과로 결제창을
실행한다. 서버 응답이라도 브라우저를 거쳐 돌아온 객체 자체를 결제 증거로 사용하지 않고,
`orderId`로 저장된 금액·상품·제공자를 확인한다. 이는 금액 인자를 없애는 설계가 아니라 서버가
확정한 결제 요청의 일관성을 유지하는 설계다. 준비된 요청이 만료되거나 가격 재확인이 필요하면
새 요청을 준비하고 사용자에게 다시 확인받는다.

Paddle 실행 정보는 준비 단계에서 만든 transaction/Checkout에 연결하고, 앱인토스 실행 정보는 확정한 SKU에
연결한다. `PaymentDetails`는 공통 필드이고 `PreparedPayment`는 제공자별 필수 실행 정보를 포함한다.
`pay`는 `provider`로 분기한 뒤 Paddle 어댑터에는 `PaddlePayment`, 앱인토스 어댑터에는
`AppsInTossPayment`를 전달한다. optional 실행 필드나 타입 단언으로 분기하지 않는다.
앱인토스는 서버가 임의 금액을 SDK에 청구하는 방식이 아니라 공식 SKU 가격에 따라 결제한다.

### 클라이언트 파일과 책임

아래는 현재 `apps/pomo/src/`에서 확인한 구현 경로와 Paddle 전환 대상 경로를 함께 기록한다.

| 파일                                            | 책임                                                       |
| ----------------------------------------------- | ---------------------------------------------------------- |
| `features/payment/types.ts`                     | 요청·결과·제공자·공통 어댑터 계약                          |
| `features/payment/create-payment-client.ts`     | 기본 제공자 주입, pay 조합, 중복 실행 억제, 정리 함수 소유 |
| `features/payment/prepare-payment.ts`           | 상품·제공자별 서버 준비 요청과 응답 검증                   |
| `features/payment/pay.ts`                       | 서버가 준비한 결제 요청으로 해당 어댑터 실행               |
| `features/payment/orders.ts`                    | 인증된 사용자 주문 상태·구매 내역 조회                     |
| `features/payment/providers/paddle.ts`          | Paddle Checkout 페이지로 이동                              |
| `features/payment/return-status.ts`             | 결제 복귀 URL 상태 분류                                    |
| `features/payment/use-payment-flow.ts`          | 구매 흐름 상태와 중복 실행 제어                            |
| `features/payment/use-payment-order-status.ts`  | 주문 완료 상태 조회와 제한된 재시도                        |
| `components/album-library/PurchaseAction.tsx`   | 가격·구매·결제 상태 UI                                     |
| `components/album-library/PurchaseHistory.tsx`  | provider 중립 구매 내역 UI                                 |
| `components/album-library/use-album-library.ts` | 공개 카탈로그·구매 상태 결합                               |
| `features/user-auth/return-path.ts`             | 로그인 후 안전한 결제 복귀 경로                            |
| `features/payment/index.ts`                     | 기능의 공개 진입점                                         |

어댑터는 실행 계획을 받아 실행하는 최소 계약을 갖는다. Paddle 실행 계획은 `checkoutUrl`과
Paddle transaction 참조를, 앱인토스 실행 계획은 `sku`를 담는 판별 유니언으로 정의한다. 외부 SDK 타입은 공개 API에 노출하지
않는다. 각 빌드는 자기 어댑터만 주입하여 일반 웹 번들에서 네이티브 SDK를 초기화하지 않는다.
`dispose()`는 SDK 리스너와 로컬 상태 관찰을 정리하며 이미 승인된 결제를 취소한다는 의미가 아니다.

UI는 구매 버튼에서 preparePayment 후 pay를 호출하고 기대 가능한 거부·취소를 표시한다. 구매 완료 화면과 앱인토스
콜백 이후에는 공통 주문 조회로 권한 지급 상태를 확인한다. 타이머 기반 조회가 필요하면 상한 있는
재시도와 정리를 사용하고 `setInterval`을 추가하지 않는다.

### 서버 파일과 API

| 경로/전환 대상                            | 책임                                               |
| ----------------------------------------- | -------------------------------------------------- |
| `routes/api/payments/start.ts`            | POST: 인증·입력 검증 후 구매 시작                  |
| `routes/api/payments/orders/[orderId].ts` | GET: 소유자에게만 주문·권한 지급 상태 반환         |
| `routes/api/payments/orders.ts`           | GET: 인증 사용자 구매 내역 반환                    |
| `routes/api/payments/paddle/webhook.ts`   | POST: Paddle 원문 서명 검증 후 이벤트 처리         |
| `routes/api/cron/payments.ts`             | 주기적 미완료 결제 제공자 이벤트 재처리            |
| `server/payment/start-payment.ts`         | 상품·오퍼·사용자 검증, 주문 예약, 제공자 시작 호출 |
| `server/payment/prepare-payment.ts`       | 로그인·제공자별 구매 준비 결과 생성                |
| `server/payment/completion-repository.ts` | 검증된 결제의 주문·항목·권한·환불 상태 반영        |
| `server/payment/paddle-completion.ts`     | Paddle 완료·복구·환불 재처리 흐름                  |
| `server/payment/provider-events.ts`       | 제공자 이벤트 inbox·점유·재시도 기록               |
| `server/payment/history-repository.ts`    | provider 중립 구매 내역 조회                       |
| `server/payment/repository.ts`            | DB 조회·트랜잭션·점유·유일성 처리                  |
| `server/payment/transaction-claim.ts`     | Paddle transaction 생성 전 DB 점유·ID 저장         |
| `server/payment/providers/paddle.ts`      | Paddle Price·transaction 생성·조회                 |
| `routes/payments/checkout.tsx`            | Paddle.js로 준비된 transaction의 Checkout 열기     |
| `routes/payments/return.tsx`              | Paddle Checkout 복귀 후 내부 주문 확인 화면        |

사용자 호출 API(start, 주문 조회)는 세션·주문 소유권·요청 스키마를 검증한다. 현재 웹 start 경로는
`apps-in-toss` provider를 명시적으로 미지원 결과로 반환하며, 앱인토스 confirm/adapter 파일은 아직
구현하지 않았다.
이 중 상태 변경 요청에 CSRF/Origin 방어와 요청 제한을 적용한다.
Paddle webhook은 사용자 세션·쿠키·브라우저 Origin을 요구하지 않는다. 원본 요청 본문과
Paddle webhook 서명을 엔드포인트 시크릿으로 검증한 뒤 이벤트 스키마와 Paddle API에서 재조회한
transaction의 주문·사용자·가격 매핑을 확인한다. 운영/테스트 환경은 각각의 API 키와 웹훅 시크릿 설정으로
분리한다. 서명 확인 전에 본문을 변형하지 않는다. 웹훅은 사용자 API의 인증 미들웨어와
CSRF 검사에서 명시적으로 분리하되 서명 검증을 생략하지 않는다. 서버가 provider별 신원 조건도 확인하며 클라이언트가
전달한 provider는 권한 증거로 사용하지 않는다. 성공·취소 URL은 서버에서 생성하고 요청자가
임의의 외부 반환 URL을 지정하지 못하게 한다.

서버 어댑터까지 억지로 동일한 `charge(amount)`로 만들지 않는다. Paddle은 서버 transaction/Checkout 생성,
앱인토스는 클라이언트 SDK 주문 생성이므로 생성 절차를 분리하고, 검증 후 얻는 내부 결제 사실과
`completion-repository.ts`의 공통 상태 반영부터 공유한다. 이 로직은 공개 API가 아니며 브라우저의
성공 주장으로 호출할 수 없도록 서버 어댑터의 검증 결과만 받는다.

### DB 변경

이하 DB 표는 2026-09-16 초기 설계안이며 현행 스키마를 설명하지 않는다. 실제 저장 계약은
[commerce.ts](../../../src/server/database/schema/commerce.ts),
[repository.ts](../../../src/server/payment/repository.ts)를 기준으로 확인한다.
특히 Paddle에는 임의 거래 생성 요청의 Stripe식 멱등 키가 없어, 현재 코드는 DB 점유 후
불확실한 생성 요청을 재전송하지 않는다.

1. 웹 오퍼에 검증된 Paddle Price를 매핑하고 카탈로그 응답에 내부 productId와 표시 가격을 제공한다.
2. 외부 주문 생성 전 내부 주문을 저장할 수 있도록 현재 필수인 `providerOrderId`를 nullable로
   변경한다. 결제 반영 시 외부 ID 존재를 검증하고 제공자+외부 ID 유일성을 유지한다.
3. 구매 시도 키를 저장한다. 서버가 사용자+상품의 활성 시도를 DB에서 조정하고 같은 시도는 Paddle의
   공식 멱등 처리 또는 transaction 재조회 전략으로 중복 생성을 막는다. 만료·취소·환불 후 재구매에는
   새 키를 발급한다.
4. 네트워크 요청 중 DB 트랜잭션을 잡지 않는다. 짧은 예약 트랜잭션 → 외부 API → 연결 결과 저장으로
   나누고 중간 장애는 같은 시도 키로 복구한다.
5. Paddle transaction과 결제·환불 참조의 관계를 저장하여 환불 이벤트도 내부 주문을 찾을 수 있게 한다.
6. 테스트·운영 데이터의 DB/키/웹훅을 분리하고 Paddle 이벤트의 환경 불일치를 거부한다.
7. 기존 이벤트 테이블에 필요한 점유·재시도 시각을 추가하고, 주문 항목별 권한 유일성 제약을 활용한다.

#### 구매 시도와 외부 ID의 저장 계약

아래는 추가할 스키마의 명세다. 실제 마이그레이션은 구현 단계에서 기존 행과 호환되게 작성한다.
구매 시도 한 건은 내부 주문 한 건에 대응하고, 재시도는 같은 행을 사용한다.

| 저장 위치                   | 필드와 제약                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| `commerce_payment_attempts` | `orderId` UUID 기본키이자 주문 FK, `userId`·`productId` UUID 필수 FK                                   |
| 같은 테이블                 | `state`: `preparing`, `ready`, `reconciling`, `succeeded`, `closed` 중 하나                            |
| 같은 테이블                 | `idempotencyKey` 문자열 NOT NULL UNIQUE; 서버가 구매 시도 생성 시 한 번 발급                           |
| 같은 테이블                 | `expiresAt` timestamptz NOT NULL; 준비된 요청의 사용 기한이며 청구 실패 판정 시각은 아님               |
| 같은 테이블                 | `leaseToken` UUID와 `leaseUntil` timestamptz는 함께 NULL이거나 함께 존재; 작업 점유 식별자와 만료 시각 |
| 같은 테이블                 | `retryCount` 정수 NOT NULL 기본 0, `nextRetryAt` timestamptz nullable, `lastErrorCode` 문자열 nullable |
| 같은 테이블                 | `closedReason`은 `closed`일 때 필수; `canceled`, `expired`, `failed` 중 외부 상태로 확인한 원인        |
| 같은 테이블                 | `(userId, productId)` 부분 UNIQUE, 조건은 state가 `preparing`, `ready`, `reconciling` 중 하나          |
| `commerce_orders`           | `providerOrderId` nullable 유지 제안; Paddle transaction ID, 앱인토스 공식 주문 ID를 저장              |
| 같은 테이블                 | `providerPaymentId` nullable 추가; Paddle 결제 참조를 저장하고 `(provider, providerPaymentId)` UNIQUE  |

`providerOrderId`의 기존 `(provider, providerOrderId)` UNIQUE도 유지한다. 비어 있는 외부 ID는
빈 문자열이 아니라 NULL로 저장한다. 후속 외부 ID 연결은 기존 값이 NULL 또는 같은 값일 때만 허용한다.
외부 이벤트가 가리킨 Session/PaymentIntent의 상점·환경·주문 참조를 확인한 후 연결하며 다른 주문의
외부 ID를 덮어쓰지 않는다. 구매 시도의 사용자·상품은 주문 및 주문 항목과 같은 트랜잭션에서 기록하고
일치 여부를 검사한다. 1차는 한 주문에 한 상품이므로 이 관계를 고정한다.

예약은 상품 행 잠금과 보유 권한 조회, 활성 시도 조회/삽입을 짧은 트랜잭션에서 수행한다.
지급 처리도 동일 상품 잠금 순서를 사용한다. 이로써 기존 시도 종료와 권한 지급 사이에 새 구매가
끼어드는 것을 방지한다. 상품 단위 잠금의 경합은 실제 동시성 테스트에서 확인한다.

- `preparing` → `ready`: 외부 Session 또는 실행 정보를 저장한 뒤 전이한다.
- 결과를 알 수 없으면 `reconciling`으로 전이하고 활성 시도 유일성을 유지한다.
- 결제와 권한 지급을 확정하면 같은 DB 트랜잭션에서 `succeeded`로 전이한다.
- 외부 결제의 취소·만료·실패를 확인한 경우에만 `closed`로 전이한다. 결제창을 닫거나 로컬 기한이
  지났다는 이유만으로 새 구매 시도를 허용하지 않는다. 이미 지급한 주문의 환불은 주문·권한에
  기록하고 성공한 시도의 이력은 보존한다.
- `closed` 또는 환불 후 재구매는 새 주문·새 멱등 키를 사용한다. 기존 키를 재활용하지 않는다.

작업 점유는 DB 시각 기준으로 비어 있거나 만료된 lease를 조건부 UPDATE하고 새 `leaseToken`을
발급한다. 결과 기록은 현재 토큰과 만료 조건이 일치할 때만 허용해 이전 작업자가 새 작업의 결과를
덮어쓰지 못하게 한다. lease 만료는 결제 취소가 아니다. 외부 호출은 동일 시도의 키와 저장된
불변 요청 인자를 재사용한다. 결제사의 멱등 키 보존 기간을 넘긴 불명 상태는 새 transaction/Checkout 생성으로
재시도하지 않고 조회·수동 대사 대상으로 남긴다. 보존 기간 수치는 구현 시 공식 문서로 확인한다.

검증에서는 두 DB 연결의 동시 예약, lease 만료 후 늦은 작업자 응답, 외부 ID 충돌, 결제 결과
불명 상태의 재구매 차단, 확인된 종료 후 새 키 발급, 환불 후 재구매를 각각 검사한다.

제공자 간 동시 결제로 별개의 실제 승인이 이미 발생했다면 내부 멱등성만으로 청구를 없앨 수 없다.
중복 구매 사건으로 기록하고 정해진 환불 절차로 처리한다. '중복 권한 없음'과 '외부 중복 청구 없음'을
별도 검증 항목으로 둔다.

### 실제 실행 흐름

Paddle:

```text
preparePayment({productId})
→ POST /api/payments/start
→ 사용자/상품 검증 → 내부 주문 예약
→ Paddle one-time transaction/Checkout(Price, 내부 주문 참조) 생성
→ 준비된 결제 요청 반환 → pay(payment)
→ Paddle Checkout 이동 → 카드 또는 지원 결제수단 결제
→ Paddle webhook / 복귀 화면의 서버 조회 / 복구 작업
→ transaction 결제 상태 검증 → `completion-repository.ts`의 멱등 지급
→ 주문 조회에서 권한 지급 완료 확인 → 전체 재생
```

앱인토스 후속:

```text
preparePayment({productId})
→ 내부 구매 시도와 SKU 확인 → 준비된 결제 요청 반환
→ pay(payment)
→ IAP.createOneTimePurchaseOrder
→ processProductGrant(orderId)
→ 서버에 주문 검증·권한 지급 요청
→ 서버 저장 완료가 확인된 경우에만 지급 성공 반환
→ 공통 주문 상태 조회 → 전체 재생
```

앱인토스 SDK의 콜백·정리 계약은 공식 문서를 기준으로 구현한다. 미지급 주문 복구도 포함하며
단순 SDK 성공 이벤트를 공통 `paid`로 치환하지 않는다.

- [앱인토스 IAP 계약](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/인앱%20결제/IAP.html)
- [Paddle 디지털 상품·권한 지급](https://developer.paddle.com/get-started/how-paddle-works/digital-products/)

### 구현 묶음과 완료 기준

1. **공통 계약·DB·카탈로그:** 타입과 마이그레이션, productId/가격 응답, 다중 인스턴스 예약 테스트.
2. **Paddle 시작:** start API와 Checkout, 중복 클릭·생성 응답 유실 복구 테스트.
3. **서버 완료:** Paddle 서명 검증·transaction 조회·멱등 지급·환불·재처리, webhook과 복귀 조회의 동시 실행 테스트.
4. **UI 연결:** pay 공개 진입점을 사용하는 구매 버튼, 결과 화면, 구매 내역과 전체 재생 전환.
5. **출시 검증:** Paddle 지원 결제수단 테스트 및 운영 검증을 기존 체크리스트대로 수행.
6. **앱인토스 후속:** 같은 API의 어댑터 구현과 dev 시뮬레이션 검증. Paddle 1차 출시 조건과 분리.

공통 API 테스트는 어댑터 선택·미지원 조합·취소·진행 중 결과를 검증한다. 가격 조작·소유권·중복
지급 검증은 서버의 실제 코드와 DB 경로에서 수행한다. UI 모의 성공만으로 결제 완료를 판정하지 않는다.
