# Create serial task queue

작업을 제출한 순서대로 하나씩 실행하고, 실패 후에도 다음 작업을 진행합니다. `settle()`은 호출 시점까지 제출된 작업의 완료를 기다립니다. 구현은 [create-serial-task-queue.ts](./create-serial-task-queue.ts)를 참고합니다.

## 검토 상태

- [x] 사용자 검토 완료 (2026-10-22)
