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

## GitHub Actions 배포

| 흐름    | 실행 방법                                                                                                      |
| ------- | -------------------------------------------------------------------------------------------------------------- |
| PR 검증 | 관련 파일을 바꾸면 타입·린트·단위 테스트·정적 빌드·Chromium 검사를 실행한다. 배포 자격 증명은 사용하지 않는다. |
| Preview | `dev` 반영 후 **Verify and deploy Wallpaper Dev**를 `dev` 브랜치로 수동 실행한다.                              |
| 운영    | `main`에 코드와 워크플로를 반영한 후 **Release Wallpaper Production**을 `main` 브랜치로 수동 실행한다.         |

검증한 `.output/public`을 Vercel Build Output API v3의 정적 에셋으로 포장해 배포한다.
운영 배포는 도메인을 연결하지 않은 후보를 먼저 생성하며, 페이지와 모델 경로 확인이
통과하면 `promote`한다. [Vercel Git 자동 배포](./vercel.json)는 끄고 Actions로 실행한다.

최초 연결 시 다음 설정이 필요하다.

- Wallpaper 전용 Vercel 프로젝트를 만들고 `wallpaper.poffo.io`를 연결한다.
- 저장소 Actions 변수 `WALLPAPER_VERCEL_PROJECT_ID`에 해당 프로젝트 ID를 설정한다.
- Actions secret `VERCEL_TOKEN`에 해당 팀의 배포 토큰을 설정한다. 기존 토큰이 그 팀에
  접근할 수 있으면 재사용한다.
- 팀은 워크플로의 `VERCEL_ORG_ID`를 사용한다. 다른 팀을 선택하면 두 워크플로도 함께 수정한다.

로컬에서는 빌드 후 다음 명령으로 브라우저 검사를 실행할 수 있다.

```sh
pnpm exec playwright test --config apps/wallpaper-web/playwright.config.ts
```

정적 배포 포장기는 `node apps/wallpaper-web/scripts/prepare-deployment.mjs`로 실행한다.
기본 출력은 저장소 루트의 `.vercel/output`이다. 기존 배포 결과를 섞지 않도록 출력 경로가
이미 있으면 실패한다. 별도 경로에서 검사하려면 소스와 출력 디렉터리를 순서대로 전달한다.
캐릭터 모델이나 필수 에셋이 빠진 경우에도 배포 포장 전에 실패한다.
