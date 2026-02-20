# No types case

모노레포의 각 패키지 루트의 ./src 또는  프로젝트 루트에 global.d.ts 를 만들거나 수정하여 아래과 같이 먼저 시도

## vite/client 전역 타임이 필요한 경우

```ts
/// <reference types="vite/client" />
```

## shaka-player 가 type export 를 안하도록 만들어 수정이 필요한경우

```ts
// 전역 shaka namespace 로드 shaka 는 namespace 로 타임 정의가 되어있다
/// <reference types="shaka-player" />

// type export 를 shaka-player 모듈이 한 것 처럼 정의
declare module 'shaka-player' {
  export default shaka
}

```
