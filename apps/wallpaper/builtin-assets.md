# 기본 제공 에셋

[builtin-assets.json](./builtin-assets.json)이 데스크톱 앱의 기본 목록과 빌드 복사 경로를 정의한다.
원본은 `wallpaper-web/public/`에서 공유하며, Vite가 `dist/builtin/`에 복사한다.
설정·배경 창·위젯은 같은 내장 에셋 로더를 사용한다.
가져온 파일과 저장된 선택은 유지하며, 내장 파일을 IndexedDB에 복제하지 않는다.

## 가로형 배경화면

음악 커버 열 장을 각각 참조해 내장 `imagegen` 도구로 가로형 배경화면을 생성했다.
원본 커버는 `wallpaper-web/public/music/ash-afternoon/`에 유지하고,
결과는 [wallpapers/ash-afternoon](../wallpaper-web/public/wallpapers/ash-afternoon/)에 WebP로 저장한다.
파일명은 각 원본 커버의 ID를 따른다. 너비는 1672픽셀이고 높이는 940–941픽셀이다.

모든 이미지에 다음 프롬프트를 사용했고, 각 호출에는 해당 커버 한 장만 편집 대상으로 전달했다.

> Use case: identity-preserve. Asset type: built-in desktop wallpaper, landscape 16:9, 2560x1440. Edit the supplied square music cover into a polished wide wallpaper by expanding the environment horizontally. Preserve this exact white/lilac-haired cat-eared character, face, blue eyes, blue bows, outfit, pose, original scene and lighting, intricate pastel anime illustration style. Keep the complete existing character without distorting or stretching it; maintain the recognizable scene from the reference. Extend the street/interior and atmosphere naturally to a cinematic landscape composition with breathing room suitable for desktop icons. Match the original perspective and fine rendering. Output one seamless wide 16:9 image only. No panels, no borders, no text, no watermarks, no added people.

요청한 크기와 별개로 도구가 반환한 실제 해상도를 그대로 유지하고, WebP 품질 92로 인코딩했다.

## 앨범 목록 관리

기본 앨범은 사진 열두 장으로 구성하며, 캐릭터 영상은 포함하지 않는다.
기본 사진을 숨기면 별도 IndexedDB에 숨김 상태를 기록하고, `기본 배경 복원`으로 다시 표시한다.
가져온 사진·동영상은 확인 후 앱에 저장된 사본을 삭제하며 원본 파일은 유지한다.
숨김·삭제 시 모든 모니터의 앨범 선택에서 해당 ID를 제거한다. 복원은 기본 사진의 표시만 되돌린다.
