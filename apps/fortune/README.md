# Fortune

사주·타로 풀이를 캐릭터가 읽어주는 독립 웹 앱이다. 운영 주소는
[fortune.pomofi.io](https://fortune.pomofi.io)로 정했다.

SolidStart 2, Solid.js, UnoCSS를 사용한다. 첫 화면에서 점술가 모델을 재생하며, 서비스 소개, 404 페이지와
독립 실행·빌드 구성을 갖춘 상태다. 사주·타로 해석, 캐릭터 낭독, 계정, 결제, 무료 횟수 차감,
광고 보상은 아직 연결하지 않았다. 도메인은 메타데이터에 설정했으며 실제 배포와 DNS 연결은 별도다.

## 로컬 실행

저장소 루트에서 실행한다. 기본 주소는 `http://127.0.0.1:3410`이다.

```sh
pnpm --filter @apps/fortune exec vite
```

## 검증과 빌드

```sh
pnpm --filter @winter-love/puppet exec vite build --mode player
pnpm --filter @winter-love/puppet exec tsc -p tsconfig.build.json
pnpm --filter @apps/fortune exec tsc --noEmit
pnpm exec oxlint apps/fortune
pnpm format
pnpm --filter @apps/fortune exec vite build
```

일반 빌드 후에는 `node apps/fortune/.output/server/index.mjs`로 서버를 실행한다.
`package.json` 스크립트는 저장소의 사전 승인 규칙에 따라 추가하지 않았다.

## 배포

Vercel 프로젝트의 Root Directory를 `apps/fortune`으로 지정한다.
[vercel.json](./vercel.json)의 빌드 명령과 Nitro의 Vercel 프리셋을 사용한다.
로컬에서 배포 산출물을 확인하려면 다음 명령을 실행한다.

```sh
NITRO_PRESET=vercel pnpm --filter @apps/fortune exec vite build
```

실제 배포 후 Vercel 프로젝트에 `fortune.pomofi.io`를 추가하고, 안내된 DNS 레코드를 연결한다.

## 제품 범위

- 첫 버전: 정보 입력 또는 카드 선택 → 풀이 생성 → 캐릭터 음성 낭독.
- 이후 확장: 풀이를 바탕으로 한 대화와 이전 고민 기억.
- 요금·무료 횟수·광고 보상 기준은 [서비스 설정](./src/config/service.ts)을 따른다.
- 기존 Pomo에서 기능을 옮길 때 앱 사이의 `src` 직접 참조는 만들지 않는다.
  두 앱이 함께 유지할 기능은 공통 패키지로 분리하고, Fortune만 소유할 기능은 이 앱으로 이동한다.
- 무료 횟수·결제·광고 보상의 최종 판정은 공유 영속 저장소에서 처리한다.
  브라우저 저장소나 프로세스 메모리를 이용권의 권한 근거로 사용하지 않는다.
