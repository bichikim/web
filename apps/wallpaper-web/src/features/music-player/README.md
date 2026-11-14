# 음악 등록

음원은 `public/music/` 안에 두고, 목록은 [library.json](../../../public/music/library.json)에 등록한다. `src`는 `/music/`으로 시작하는 공개 경로다.

```json
{
  "version": 1,
  "albums": [
    {
      "id": "ash-afternoon",
      "title": "오후의 거리",
      "artist": "ASH",
      "tracks": [
        {
          "id": "window",
          "title": "창문",
          "artwork": "/music/ash/window/cover.webp",
          "src": "/music/ash/window.mp3"
        }
      ]
    }
  ]
}
```

앨범 ID는 목록 안에서, 곡 ID는 앨범 안에서 중복되지 않아야 한다. 모든 앨범의 곡을 한 번씩 섞어 재생하고, 마지막 곡이 끝나면 다시 섞어 이어간다. 곡이 둘 이상이면 반복 경계에서 같은 곡이 연달아 나오지 않는다.

곡의 `artwork`와 `artist`는 선택 정보다. 생략하면 앨범의 커버와 아티스트를 사용한다.

플레이어는 재생·일시 정지·다음 곡만 제공한다. 음량은 100%로 고정하며 실제 청취 음량은 시스템에서 조절한다.

음원 등록 전에는 `tracks`를 빈 배열로 유지한다. 실제 파일이 없는 곡을 미리 등록하지 않는다. 페이지 접근 시 목록만 읽고, 오디오는 사용자가 재생할 때 요청한다.
