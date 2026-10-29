# Poffo Wallpaper 웹사이트

데스크톱 앱의 배경화면·캐릭터 위젯을 체험하는 SolidStart 정적 사이트다.
스크롤로 기능 소개를 전환하며, 음악과 미리 생성한 소개 음성을 재생한다.

저장소 루트에서 `pnpm --filter @apps/wallpaper-web dev`로 실행한다.
빌드·미리보기·타입 검사 명령은 [package.json](./package.json)에 있다.
빌드는 `/`를 프리렌더링해 `.output/public`을 생성한다.

## 캐릭터 파일

`public/models/white-cat/model.poffo`에는 애시 캐릭터와 텍스처 2장이 함께 들어 있다.
로딩용 스냅샷인 `poster.webp`도 Git에 포함하며, 빌드 시 두 파일을 함께 복사한다.
배포 전에 캐릭터 파일을 별도로 복원하거나 외부 텍스처를 준비할 필요가 없다.

모델을 교체할 때는 [표정 목록](./src/data/character-expressions.json)과
[시선 기준](./src/data/character-look.json)도 해당 모델에 맞춘다.
다른 공개 배경 모델은 `public/models/`의 `.poffo` 파일로 포함한다.

`design/`의 제작 원본·중간 결과·로컬 검토 자료는 커밋에서 제외하고 로컬에 보존한다.
음악과 음성 에셋의 구성은 [음악 데이터 설명](./src/features/music-player/README.md),
[음성 프리셋](./src/data/speech-presets.json), `public/licenses/`를 참고한다.
