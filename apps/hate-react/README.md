# hate-react

"I fucking hate React." — A Solid.js web app for sharing honest opinions from people who relate.

Click on the dinosaur to see random supporter messages from Buy Me a Coffee.

Inspired by [ifuckinghatejira.com](https://ifuckinghatejira.com/).

> **Work in progress** — A research project for improving development methods using AI.

## Tech Stack

- [Solid.js](https://www.solidjs.com/) + [SolidStart](https://start.solidjs.com/)
- [Vinxi](https://vinxi.vercel.app/) (SSR)
- [UnoCSS](https://unocss.dev/)
- Node 22

## Getting Started

```bash
pnpm i
pnpm dev
```

## Environment Variables

Create a `.env` file based on `.env.example`.

| Variable | Description |
| -------- | ----------- |
| `BUYMEACOFFEE_ACCESS_TOKEN` | Buy Me a Coffee API token (optional) |
| `BUYMEACOFFEE_USERNAME` | Buy Me a Coffee username (optional) |
| `VITE_BMC_USERNAME` | Buy Me a Coffee link username (default: `ifuckinghatereact`) |

Returns an empty message list if no token is provided.

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | TypeScript type check |
