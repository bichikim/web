# SideBuy

SideBuy는 사용자가 지정한 SideBuy 호환 API 서버에 연결하여 필요한 조건, 구매할 제품과 최적 구매처를 차례로 결정하도록 돕는 정적 클라이언트다.

- 공식 도메인: <https://sidebuy.io>
- 빌드 방식: SolidStart SSG
- 서버 구현 계획: [`../sidebuy-api/PLAN.md`](../sidebuy-api/PLAN.md)
- 클라이언트 상세 계획: [`PLAN.md`](./PLAN.md)

## 실행 구조

`sidebuy.io`에는 HTML, JavaScript, CSS와 정적 자산만 배포한다. SideBuy 자체 로그인, 중앙 API와 데이터베이스는 두지 않는다.

사용자는 최초 실행 시 자신이 운영하거나 선택한 SideBuy API 주소를 입력한다. AI 실행, 구매 세션, 상품 조사, 추천, 가격 탐색과 데이터 저장은 해당 API 서버가 담당한다.

```text
SideBuy 정적 클라이언트
          │
          │ 사용자가 설정한 API 주소
          ▼
SideBuy 호환 API 서버
```

## 핵심 원칙

- 클라이언트는 API 주소 연결과 구매 화면에 집중한다.
- 인증이 필요하면 연결된 API 서버가 담당한다.
- 구매 데이터의 원본은 API 서버에 둔다.
- API 주소는 빌드 이후에도 기기에서 변경할 수 있다.
- 공식 관리형 API는 현재 범위에 포함하지 않는다.
