# @winter-love/bonsai

Bonsai Image 4B 브라우저 WebGPU 추론 런타임을 제공하는 내부 워크스페이스 패키지입니다. 빌드 없이 ESM과 TypeScript 선언을 직접 제공합니다.

소비 앱의 dependencies에 `"@winter-love/bonsai": "workspace:*"`를 추가하고 `pnpm install`로 연결합니다.

```ts
const {Flux2KleinPipeline} = await import('@winter-love/bonsai')
```

모델 로딩·생성 API는 [타입 선언](./runtime.d.mts), 원본 리비전과 추출 내역은 [런타임 출처](./runtime.md)를 참조하세요. 모델 파일은 포함하지 않으며 로딩 시 다운로드합니다. GPU와 다운로드 작업은 로딩 API 호출 시 시작합니다. 호출자가 파이프라인의 `destroy()`를 호출해 자원을 해제해야 합니다. 로딩·생성 실패는 Promise rejection으로 전달됩니다. 브라우저의 WebGPU 지원이 필요하며 Pomo는 Worker에서 사용합니다.
