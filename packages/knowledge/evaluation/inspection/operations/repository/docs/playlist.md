---
knowledge:
  id: operations/playlist
  type: rule
---

# 사용자 재생목록 저장 {#policy}

저장 키는 `pomo:focus-room-playlist:v1`을 사용한다. 웹에서는 `localStorage`, 앱인토스에서는
`Storage`를 사용한다. 재생목록은 현재 곡과 재생 위치를 저장하는 playback 상태와 분리한다.
