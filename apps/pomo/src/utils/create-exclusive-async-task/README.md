# Create exclusive async task

비동기 작업을 한 번에 하나씩 실행합니다. 실행 중 들어온 요청은 호출하지 않고 busy 사유의 skipped 결과를 반환합니다. 구현은 [index.ts](./index.ts)를 참고합니다.

## 검토 상태

- [x] 사용자 검토 완료 (2026-10-22)
