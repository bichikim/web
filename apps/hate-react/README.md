# hate-react

"I fucking hate React." — 공감하는 사람들의 솔직한 의견을 공유하는 Solid.js 웹앱.

공룡을 클릭하면 Buy Me a Coffee 후원자 메시지가 랜덤으로 표시됩니다.

[ifuckinghatejira.com](https://ifuckinghatejira.com/)에 영감을 받아 제작 중입니다.

> **개발 중** — AI를 활용한 개발 방법 개선 연구용 프로젝트입니다.

## Tech Stack

- [Solid.js](https://www.solidjs.com/) + [SolidStart](https://start.solidjs.com/)
- [Vinxi](https://vinxi.vercel.app/) (SSR)
- [UnoCSS](https://unocss.dev/)
- Node 22

## 시작하기

```bash
pnpm i
pnpm dev
```

## 환경 변수

`.env.example`을 참고해 `.env`를 생성하세요.

| 변수 | 설명 |
| ------ | ------ |
| `BUYMEACOFFEE_ACCESS_TOKEN` | Buy Me a Coffee API 토큰 (선택) |
| `BUYMEACOFFEE_USERNAME` | Buy Me a Coffee 사용자명 (선택) |
| `VITE_BMC_USERNAME` | Buy Me a Coffee 링크용 사용자명 (기본: `ifuckinghatereact`) |

토큰이 없으면 빈 메시지 목록이 반환됩니다.

## 스크립트

| 명령어 | 설명 |
| -------- | ------ |
| `pnpm dev` | 개발 서버 실행 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm lint` | ESLint 실행 |
| `pnpm type-check` | TypeScript 타입 검사 |
