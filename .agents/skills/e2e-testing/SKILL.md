---
name: e2e-testing
description: Write, modify, or diagnose end-to-end tests and their fixtures using observable readiness and completion conditions. Use for browser E2E synchronization and test-server lifecycle; not unit tests.
---

# E2E 작성

- 시간 경과가 아니라 확실한 완료 이벤트 또는 그 이벤트가 반영된 관찰 가능한 상태를 기다린다. 시간 제한은 무한 대기를 막는 상한으로만 사용한다.
- 다음 단계가 요구하는 준비 조건을 먼저 정의하고, 러너의 자동 대기와 재시도 가능한 단언을 사용한다. 고정 지연, 전체 네트워크 유휴 상태, 제한 시간 증가로 준비 조건을 대신하지 않는다.
- 일회성 이벤트는 유발 동작 전에 구독한다. 이미 완료됐을 수 있는 작업은 지속되는 결과 상태를 확인한다. 로딩 표시의 부재만으로 성공을 판단하지 않는다.
- 응답 도착, 화면 반영, 영속 저장 완료를 구분하고 검증 대상에 맞는 완료 조건을 선택한다. 비동기 저장은 실제 저장 결과를 확인한 뒤 새로고침하거나 다른 소비자로 이동한다.
- 대기 조건은 실행 중인 작업과 대상 자원을 식별해야 한다. 테스트 서버는 해당 프로세스의 준비 완료를 확인하며, 포트 충돌이나 프로세스 실패를 다른 서버의 정상 응답으로 가리지 않는다.
- 대기와 하위 작업에 유한한 상한을 두고, 실패 시 마지막 상태와 원인을 남긴다. 성공·실패·취소 시 구독과 테스트 소유 자원을 정리한다.
- 동기화 변경은 의존 작업의 완료를 제어해 지연된 완료와 이미 완료된 경우를 검증한다. 실제 지연 시간을 늘려 회귀 조건을 만들지 않는다.
- 실제 앱 경로와 사용자에게 노출되는 의미 기반 선택자를 사용한다. 준비 상태를 만들기 위해 제품에 테스트 전용 분기나 후크를 추가하지 않는다.
- 환경·러너 실패와 제품 결함을 구분한다. 재실행 통과만으로 원인을 확정하거나 간헐적 실패를 해결했다고 보고하지 않는다.

Playwright를 사용할 때는 현재 공식 문서의 [자동 대기](https://playwright.dev/docs/actionability), [이벤트](https://playwright.dev/docs/events), [서버 준비 조건](https://playwright.dev/docs/test-webserver)을 확인한다.
