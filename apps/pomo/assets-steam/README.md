# Steam 제품 자산

이 폴더는 Steam 데스크톱 빌드에만 포함할 모델과 오디오를 저장한다. 일반 웹 빌드에는 포함하지 않는다.

```text
assets-steam/
├─ models/text-generation/{model}/{revision}/
├─ audio/tracks/{track-id}.mp3
└─ runtime/onnxruntime-web/{version}/
```

텍스트 모델의 디렉터리와 파일명은 R2의 `models/text-generation/...` 경로를 유지한다.
음악 파일은 R2의 `tracks/...` 경로에 대응해 `audio/tracks/...`에 둔다.
Hugging Face에서 직접 받는 모델은 이 Steam 번들 대상이 아니다.

`manifest.json`에는 `assets-steam` 안에서 배포할 모든 파일을 디렉터리 기준 상대 경로로
기록한다. 매니페스트 파일 자체는 목록에서 제외한다. 현재 LLM·MP3·런타임 파일은 아직
추가하지 않으므로 목록에는 README만 있다.

Steam 빌드는 다음처럼 배포 프로필을 지정한다.

```sh
POMO_DISTRIBUTION_TARGET=steam pnpm run build:desktop
```

릴리스 후보에서는 자산 검증을 켠다. 이 검증은 매니페스트에 없는 파일, 존재하지 않는
파일과 텍스트 모델·MP3·ONNX Runtime 구성요소의 누락을 실패시킨다.

```sh
POMO_DISTRIBUTION_TARGET=steam POMO_VALIDATE_STEAM_ASSETS=true pnpm run build:desktop
```
