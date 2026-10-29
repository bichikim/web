# Blob 바이트 읽기

Pomo와 wallpaper가 같은 Blob/FileReader 구현을 사용합니다. 기존 Pomo entrypoint와 개별 함수·타입 subpath는 유지하고, 이미 의존하는 `@winter-love/wallpaper/media/*`의 공개 API를 직접 재노출합니다.

- `Blob.arrayBuffer()`가 있으면 사용하고 반환값·오류를 그대로 전달합니다.
- 지원하지 않으면 새 FileReader로 읽습니다. `readFileAsArrayBuffer`에는 호출자가 소유한 유휴 리더를 직접 전달할 수 있습니다.
- 기본 오류와 원래 `reader.error`를 유지하며, 사용자 메시지가 있으면 원래 오류를 `cause`로 보존합니다.
- 읽기 완료·오류·중단·동기 예외 후 이 작업의 리스너만 제거합니다. 호출자의 리더와 리스너는 유지합니다.

오류 메시지의 선택은 소비자가 담당합니다. 구현과 타입의 기준은 내부 media 모듈이며 새 의존성이나 호출 래퍼를 추가하지 않습니다.
