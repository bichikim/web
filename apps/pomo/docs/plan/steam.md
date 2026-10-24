# Pomofi Steam 출시 계획

## 1. 결정 사항

- 제품명은 `Pomofi`로 통일한다.
- Steam용 제품은 `Pomofi: Steam Edition`으로 등록한다.
- Windows 10·11 64-bit를 첫 출시 플랫폼으로 삼는다.
- 현재 Pomo 버전은 `0.1.0`으로 통일한다.
- Steamworks 앱 유형은 `Game`으로 등록한다. `Software`가 아니라 캐릭터 기반 싱글플레이 경험으로 포지셔닝한다.
- 목표 등급은 `전체이용가`로 설정한다. 최종 등급은 출시 빌드의 콘텐츠 설문과 국내 등급 절차 결과에 따른다.
- `청소년이용불가` 등급을 전제로 하지 않는다. AI 사용 여부가 아니라 실제 배포 콘텐츠와 생성 방식으로 등급을 판단한다.
- Windows 설치 파일과 서명·배포 구성을 추가한다.
- Steam 상점 그래픽 자산 제작은 후속 작업으로 미룬다.
- 첫 버전은 오프라인 핵심 기능을 우선하고, 서버 기능은 출시를 막지 않도록 분리한다.

현재 데스크톱 셸과 창 모드는 [데스크톱 앱 계획](./development/desktop.md)에서 관리한다.
버전 기준 파일은 [Pomo package.json](../../package.json),
[Tauri 설정](../../src-tauri/tauri.conf.json), [Rust 패키지 설정](../../src-tauri/Cargo.toml)이다.

## 2. 제품 정의

Pomofi는 사용자의 책상 옆에서 장면, 음악과 타이머로 집중을 돕는 데스크톱 동반 앱이다.
Steam에서는 일반 생산성 도구보다 **집중을 함께하는 캐릭터 기반 싱글플레이 경험**으로 설명한다.

핵심 문장:

> Pomo와 함께 25분을 시작하고, 오늘의 작은 집중을 남긴다.

핵심 사용 흐름은 다음과 같다.

```text
앱 실행
  ↓
활동과 장면 선택
  ↓
집중 시간과 음악 설정
  ↓
Pomo와 집중
  ↓
휴식 또는 다음 세션
```

## 3. Steam MVP 범위

### 출시 포함

- Pomo 3D 캐릭터와 책상 장면
- 글쓰기·코딩·독서 활동
- 집중·휴식 타이머
- 시작·일시정지·재개·종료
- 미니 위젯, 트레이 메뉴와 전역 단축키
- 라이선스를 확인한 음악 3곡 이상
- 음량 조절과 음소거
- 설정과 세션 기록의 로컬 저장
- 인터넷이 끊겨도 사용할 수 있는 타이머·장면·음악
- 한국어·영어 UI
- 저사양 설정과 `prefers-reduced-motion` 대응

### 출시 제외

- 로그인과 기기 간 동기화
- 날씨·캘린더·온라인 피드
- 실시간 AI 대화
- 서버에 의존하는 음성 생성
- 멀티플레이 집중방
- 여러 캐릭터와 의상 시스템
- 모바일 빌드
- Windows에서 검증되지 않은 인터랙티브 바탕화면 모드

Steam Cloud와 도전 과제는 오프라인 MVP가 안정화된 뒤 별도 릴리스로 추가한다. 로컬 저장
계약은 [아키텍처 계획](./development/architecture.md)을 따르고, 정적 클라이언트의 외부 서버
호출은 [원격 함수 계획](./development/remote-functions.md)과 분리해 관리한다.

## 4. 플랫폼과 빌드

### 4.1 Windows 우선

현재 Tauri 셸은 macOS를 먼저 검증한 구조이므로 Steam 첫 출시 전에 Windows 어댑터와 실제
Windows 검증을 추가한다.

- Windows 설치 파일과 업데이트 경로를 구성한다.
- Windows 아이콘과 설치 파일 서명을 추가한다.
- 100%, 125%, 150% DPI에서 창과 텍스트를 확인한다.
- 일반 창과 미니 위젯을 우선 지원한다.
- 절전·복귀, 다중 모니터, 최소 창 크기와 트레이 복귀를 검증한다.
- macOS 빌드는 현재 지원 범위를 유지하되 Windows 출시의 차단 조건으로 삼지 않는다.

Steam용 빌드는 기존 UI를 복사하지 않고 `desktop` 런타임을 공유하는 배포 프로필로 구성한다.
핵심 기능에는 `POMO_PUBLIC_ORIGIN`과 외부 API가 없어도 동작하도록 기능 경계를 둔다.

### 4.2 버전 관리

현재 출시 버전은 `0.1.0`이다. 다음 릴리스부터 아래 세 위치를 같은 버전으로 변경하고,
Cargo lock의 `pomofi-desktop` 항목을 확인한다.

1. `apps/pomo/package.json`
2. `apps/pomo/src-tauri/tauri.conf.json`
3. `apps/pomo/src-tauri/Cargo.toml`

Steam 빌드와 상점 페이지의 버전·변경 내용이 일치하는지 릴리스 후보에서 확인한다.

### 4.3 Steam 기능 도입 순서

1. SteamPipe depot 업로드와 테스트 브랜치
2. Steam Playtest
3. 필요 시 Steam Auto-Cloud
4. 필요 시 집중 세션 도전 과제

Steamworks 기능은 제품의 핵심 타이머를 대체하지 않는다. Steam 연동이 실패해도 타이머와
로컬 저장은 계속 동작해야 한다.

### 4.4 Steam 제품 자산 패키징

- Steam 전용 모델·MP3·ONNX Runtime 파일은 [`assets-steam`](../../assets-steam/)에 둔다.
- Steam 빌드에서만 `assets-steam`을 `.output/public/assets-steam`으로 포함한다. 일반 웹 빌드에는 대형 자산을 포함하지 않는다.
- `POMO_RUNTIME_TARGET=desktop`은 유지하고, `POMO_DISTRIBUTION_TARGET=steam`으로 배포 프로필을 선택한다.
- [`product-assets`](../../src/features/product-assets/index.ts)의 공용 해석기는 제품 자산의 R2 주소를 Steam 번들 주소로 바꾼다. Steam이 아닌 환경에서는 기존 R2 주소를 유지한다.
- Steam API 통신은 원격으로 유지하고, 자산 누락 시 R2로 조용히 폴백하지 않는다.
- Hugging Face 모델은 현재 Steam 제품 자산 패키징 대상에서 제외하고, 해당 모델을 선택하면 기존 Hugging Face 원격 경로를 유지한다.
- [`assets-steam/manifest.json`](../../assets-steam/manifest.json)은 번들 파일의 기준 목록이다. 릴리스 검증은 목록에 없는 파일과 존재하지 않는 파일을 모두 실패시킨다.

Steam 패키징은 다음 명령으로 배포 프로필을 지정한다.

```sh
POMO_DISTRIBUTION_TARGET=steam pnpm run build:desktop
```

LLM·MP3·ONNX Runtime 자산을 추가한 뒤 릴리스 후보에서는 다음 검증을 함께 실행한다.

```sh
POMO_DISTRIBUTION_TARGET=steam POMO_VALIDATE_STEAM_ASSETS=true pnpm run build:desktop
```

현재 자산은 후속 작업으로 미뤄 두었으므로 이 엄격한 명령은 의도적으로 실패한다. 자산과
매니페스트를 채운 뒤에만 통과해야 한다.

## 5. 가격과 사업 목표

### 가격

한국 가격은 우선 `₩1,100`을 검토한다. Steam은 최소 기본 가격을 지역별 환산 기준으로
검토하고, KRW는 원 단위로 입력하므로 실제 가격 입력 단계에서 Steamworks 대시보드의 최소
가격을 다시 확인한다. `₩1,000`이 허용되지 않으면 `₩2,200`을 대안으로 사용한다.

`₩1,100`을 정가로 선택하면 출시 할인은 적용하지 않는다. 할인 운영이 필요할 때만 더 높은
정가를 별도로 검토한다. Steam의 최신 기준은 [가격 정책 문서](https://partner.steamgames.com/doc/store/pricing?l=koreana)와
[지원 통화 문서](https://partner.steamgames.com/doc/store/pricing/currencies?l=koreana)에서 확인한다.

### 목표

단순 판매량보다 실제 집중 사용을 기준으로 판단한다.

| 기간         | 목표                                            |
| ------------ | ----------------------------------------------- |
| 출시 후 30일 | 첫 세션 시작 사용자와 리뷰 20건 확보            |
| 출시 후 90일 | 3,000장 판매 또는 유의미한 재방문 데이터 확보   |
| 1년          | 10,000장 판매 또는 다음 유료 콘텐츠의 근거 확보 |

단순 매출 기준으로 `₩1,100 × 1,000장 = ₩110만`, `₩1,100 × 3,000장 = ₩330만`이다.
환불·세금·Steam 정산 전 수치이므로 손익 예상에는 별도 정산 자료를 사용한다.

### 초기 현금 예산

개발자 인건비를 제외하고 초기 현금 지출은 200만 원 이내로 제한한다.

- Steam Direct 비용: 제품당 USD 100
- Windows 테스트와 배포 환경
- 음악·음성·모델 라이선스
- 상점 자산과 트레일러 제작
- 예비비

Steam Direct 비용과 출시 전 대기 조건은 [Steam Direct 공식 안내](https://partner.steamgames.com/steamdirect)를
따른다.

## 6. 출시 일정

Steam Direct 결제일을 0일로 잡고, 현실적인 출시 기간은 8주로 계획한다.

| 시기    | 결과                                                    |
| ------- | ------------------------------------------------------- |
| 0주차   | Steamworks 가입, 세금·은행 정보 등록, Direct 비용 결제  |
| 1~2주차 | Steam 오프라인 범위 확정, Windows 빌드와 설치 실행 확인 |
| 3주차   | 로컬 저장·오디오·절전 복귀·업데이트 동작 구현 및 검증   |
| 4주차   | Steam Playtest 빌드 업로드, 상점 문구와 자산 제작 착수  |
| 5~6주차 | 20~50명 테스트, Windows 버그 수정, 빌드 검토 제출       |
| 7주차   | 상점 페이지 검토, 최종 릴리스 후보와 설치 파일 확인     |
| 8주차   | Coming Soon 공개 기간과 Direct 대기 조건 확인 후 출시   |

첫 제품은 Direct 비용 결제 후 30일 대기와 공개된 Coming Soon 페이지 2주가 필요하므로,
두 조건을 개발·검증 기간과 겹쳐 진행한다. 상점 페이지와 빌드 검토 일정에는 최소 1주
이상의 여유를 둔다. 자세한 절차는 [Steam 출시 절차](https://partner.steamgames.com/doc/store/releasing)를
따른다.

## 7. 상점 페이지와 자산

자산 제작은 현재 작업에서 제외하지만, Steam 공개 전에는 다음 작업을 완료해야 한다.

- 실제 앱 경험을 보여주는 30초 내외 트레일러
- Pomo 장면·타이머·미니 위젯을 보여주는 실제 스크린샷
- 헤더·메인·스몰·세로 캡슐과 라이브러리 자산
- 한국어·영어 상점 설명
- 게임 실행 화면과 상점 설명의 기능 일치 확인

Steam 캡슐에는 기본적으로 제품명 외 홍보 문구를 넣지 않는다. 규격과 문구 제한은
[상점 그래픽 자산 문서](https://partner.steamgames.com/doc/store/assets)와
[그래픽 자산 규칙](https://partner.steamgames.com/doc/store/assets/rules)을 따른다.

## 8. 권리·개인정보·AI 콘텐츠

### 8.1 등급과 AI 출시 정책

- Steam 앱 유형과 이용등급은 별개다. `Game`으로 등록해도 등급은 실제 콘텐츠에 따라 별도로 결정된다.
- 전체이용가 목표를 위해 AI 대화와 효과음은 집중·일상·환경 표현 범위로 제한하고, 성인 콘텐츠 생성은 허용하지 않는다.
- Steam MVP에는 성인 성적 콘텐츠와 실시간 자유 생성 AI 대화를 포함하지 않는다.
- 출시 빌드에 포함되어 사용자가 소비하는 AI 생성 아트·음향·대사·코드 등은 사전 생성 AI로 공개하고, 실행 중 생성되는 기능을 나중에 추가할 경우 실시간 생성 AI와 통제 장치를 별도로 공개한다.
- 국내 등급은 AI라는 이유만으로 `19세`가 되지 않는다. 선정성·폭력성·사행성 등 실제 표현을 기준으로 콘텐츠 설문과 필요한 국내 등급 절차를 진행한다.

Steam의 앱 유형은 [Applications 문서](https://partner.steamgames.com/doc/store/application)에서, AI 공개와 콘텐츠 검토는
[콘텐츠 설문 조사](https://partner.steamgames.com/doc/gettingstarted/contentsurvey?language=koreana)에서 확인한다.
국내 등급 구분과 기준은 [게임물관리위원회 등급분류규정](https://www.law.go.kr/LSW/schlPubRulInfoP.do?chrClsCd=&schlPubRulSeq=2200000127949)을
기준으로 출시 버전에 맞춰 확인한다.

- 배포하는 3D 모델, 음악, 음성, 폰트와 외부 코드의 상업적 이용 조건을 확인한다.
- 라이선스 목록과 고지 화면은 [licenses.json](../../public/licenses.json)과
  `/third-party-notices`를 기준으로 갱신한다.
- Steam 빌드에 서버 비밀 값과 관리자 기능을 포함하지 않는다.
- 로그인 없이 핵심 기능을 사용할 수 있게 하고, 분석 기능은 수집 범위와 동의를 검토한다.
- 개발 중 사용한 AI 아트·음향·코드와 실행 중 생성되는 AI 콘텐츠는 Steam 콘텐츠 설문에
  정확히 공개한다.

AI 콘텐츠 설문 기준은 [Steam 콘텐츠 설문 조사](https://partner.steamgames.com/doc/gettingstarted/contentsurvey?language=koreana)를
따른다.

## 9. 출시 완료 조건

- 새 Windows 환경에서 Steam을 통해 설치하고 실행할 수 있다.
- 인터넷이 끊긴 상태에서도 핵심 집중 세션을 시작하고 끝낼 수 있다.
- 앱 최소화·절전·복귀 후 타이머 시간이 어긋나지 않는다.
- 음악이 중복 재생되지 않고 음소거·볼륨 설정이 유지된다.
- 앱 업데이트 후 사용자 설정이 유지된다.
- 창 크기, DPI, 다중 모니터와 트레이 복귀가 동작한다.
- 상점 페이지에 기재한 모든 핵심 기능이 빌드에 포함되어 있다.
- 라이선스 고지, 개인정보 처리방침과 AI 콘텐츠 설문을 완료했다.
- Steam 상점 페이지와 빌드 검토를 통과했다.

## 10. 다음 작업 순서

1. `0.1.0` 버전으로 Windows Tauri 패키징을 구성한다.
2. Steam용 오프라인 기능 경계를 코드와 테스트로 고정한다.
3. Steam Direct 계정과 제품을 등록한다.
4. Playtest용 Windows 빌드를 만든다.
5. 상점 자산 제작을 시작하고 Coming Soon 페이지를 공개한다.
