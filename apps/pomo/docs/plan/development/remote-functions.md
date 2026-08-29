# 앱인토스 원격 함수

[개발 기술 계획으로 돌아가기](../development.md)

## 상태와 목표

이 계획은 추후 작업이다. 완료 전까지 앱인토스에서 서버를 호출하는 기능은 `/api/*` HTTP API를
사용한다.

목표는 앱인토스 정적 클라이언트가 `POMO_PUBLIC_ORIGIN`의 SolidStart 서버 함수를 호출하고, 일반
웹은 현재 페이지의 self Origin을 계속 사용하게 하는 것이다. 원격 함수 주소는 문자열을 이어 붙이지
않고 `new URL('/_server', POMO_PUBLIC_ORIGIN)`으로 만든다.

## 구현 계획

1. 구현 시점의 SolidStart 공식 문서와 설치 버전에서 원격 함수 전용 Origin 설정을 다시 확인한다.
2. 공식 설정이 있으면 우선 사용한다. 없으면 토스 클라이언트 빌드에서만 `/_server` 기준 주소를
   바꾸는 격리된 호환 계층을 둔다.
3. 서버 함수는 `src/server/functions`, 공유 Query·Action 래퍼는 `src/features`에 둔다.
4. Vite의 전역 `base`는 JS, CSS, Worker와 이미지 주소에도 영향을 주므로 원격 함수 주소 변경에
   사용하지 않는다.
5. 호환 계층은 지원하는 `@solidjs/start` 버전과 변환 대상을 검사하고, 예상과 다르면 빌드를
   실패시킨다.
6. 서버의 CORS 적용 경로에 정확한 `/_server`를 추가한다. 기존 허용 Origin 목록과 동적 Vercel
   Origin 정책은 그대로 공유한다.
7. preflight 요청에는 `X-Server-Id`, `X-Server-Instance`, `X-Start-Type`, `X-Single-Flight`를
   허용한다. 응답에서는 `X-Start-Type`, `X-Error`, `X-Revalidate`, `X-Single-Flight`, `Location`을
   브라우저에 노출한다.
8. CORS를 인증으로 취급하지 않는다. 사용자 데이터에 접근하는 함수는 명시적인 인증·인가를
   적용하고, 교차 Origin 쿠키에 의존하려면 별도의 보안 결정을 거친다.
9. 웹 서버를 먼저 배포한 뒤 같은 서버 함수 계약을 사용하는 앱인토스 빌드를 배포한다. 서버와
   클라이언트의 호환 가능한 리비전을 함께 관리한다.

## 검증과 완료 조건

- 일반 웹의 서버 함수가 기존 self Origin `/_server`를 사용한다.
- 토스 클라이언트 번들의 서버 함수만 `POMO_PUBLIC_ORIGIN/_server`를 사용한다.
- 토스 번들의 JS, CSS, Worker, 이미지 주소는 패키지 내부 경로를 유지한다.
- 허용된 앱인토스 Origin의 `OPTIONS /_server`와 실제 호출이 성공하고, 허용되지 않은 Origin은
  CORS 권한을 받지 못한다.
- 직렬화된 성공 응답, 오류, redirect, revalidation과 인증 실패를 통합 테스트한다.
- 앱인토스 운영·QR 테스트 WebView에서 실제 서버 함수를 호출한다.
- SolidStart 버전 변경 시 호환 계층 검증이 실패하거나 재검증을 요구한다.

위 조건을 모두 통과하기 전에는 앱인토스와 공유되는 기능을 SolidStart 서버 함수로 전환하지 않는다.
