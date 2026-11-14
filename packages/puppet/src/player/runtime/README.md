# Runtime 구성

이 디렉터리는 하나의 Player 안에서 수치 상태, 명령 구성, 프레임 평가를 나눈다.
상위 [`create-player-runtime.ts`](../create-player-runtime.ts)가 같은 상태 인스턴스를
연결하며, renderer·오디오 출력·콜백의 수명은 계속 상위 runtime이 소유한다.

[`RuntimeState`](types.ts)는 해당 runtime과 명령 어댑터가 공유하는 가변 상태다.
Poffo의 공유 문서·undo/redo 소유권을 대신하지 않는다.
[`createRuntimeState`](create-runtime-state.ts)의 체크포인트는 수치 상태만 복원한다.
문서 선택, 종료 여부, Worker 계산 위임, 자원 수명은 복원하지 않으며 상위 runtime이
복원 후 ticker를 갱신한다. 상태 저장소 자체에는 renderer나 오디오 출력이 필요하지 않다.

명령 검증·수치 평가의 순서와 체크포인트 형식은 분리 전 계약을 유지한다.
Player 명령의 조립은 [`create-runtime-player.ts`](create-runtime-player.ts),
프레임의 효과·물리·포즈 평가는 [`create-runtime-frame.ts`](create-runtime-frame.ts)에 둔다.
