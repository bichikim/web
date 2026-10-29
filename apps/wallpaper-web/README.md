# Poffo Wallpaper 웹사이트

데스크톱 앱의 배경화면·캐릭터 위젯을 체험하는 SolidStart 정적 사이트다.
스크롤로 기능 소개를 전환하며, 음악과 미리 생성한 소개 음성을 재생한다.

저장소 루트에서 `pnpm --filter @apps/wallpaper-web dev`로 실행한다.
빌드·미리보기·타입 검사 명령은 [package.json](./package.json)에 있다.
빌드는 `/`를 프리렌더링해 `.output/public`을 생성한다.

## 별도로 준비하는 캐릭터 파일

`public/models/white-cat/`은 기존 Git 제외 설정을 유지한다. 다음 파일은
저장소에 포함하지 않으므로 로컬 실행 및 배포 전에 별도로 공급해야 한다.

- `model.poffo`: 현재 애시 캐릭터의 네이티브 Poffo 모델
- `poster.webp`: 같은 모델의 로딩용 스냅샷
- `atlas-0.webp`, `atlas-1.webp`: 모델 내부의 텍스처 경로가 참조하는 이미지

이 파일들이 없으면 캐릭터 로딩이 실패한다. 모델은
[표정 목록](./src/data/character-expressions.json)과
[시선 기준](./src/data/character-look.json)에 맞는 모델이어야 한다.
공개 배경 모델은 `public/models/`의 `.poffo` 파일로 포함한다.

`design/`의 제작 원본·중간 결과·로컬 검토 자료는 커밋에서 제외하고 로컬에 보존한다.
음악과 음성 에셋의 구성은 [음악 데이터 설명](./src/features/music-player/README.md),
[음성 프리셋](./src/data/speech-presets.json), `public/licenses/`를 참고한다.
