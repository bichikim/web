# Coong App

## Scripts

- **Setup**
  - **`pnpm prepare`**: 설치/준비 단계에서 Supabase 타입 생성 실행
  - **`pnpm supabase:gen-types`**: Supabase 타입 생성
  - **`pnpm type-check`**: TypeScript 타입 체크만 수행
- **Dev**
  - **`pnpm dev`**: 개발 서버 실행
- **Build**
  - **`pnpm build`**: 프로덕션 빌드 생성
  - **`pnpm build:spa`**: SPA 모드로 빌드
- **Preview**
  - **`pnpm preview`**: 빌드 결과를 로컬에서 미리보기로 실행
  - **`pnpm preview:spa`**: 빌드 결과를 로컬에서 SPA 모드 미리보기로 실행 (서버 프록시 포함)
- **Lint**
  - **`pnpm lint`**: `src`를 ESLint로 검사
  - **`pnpm lint:fix`**: `src`를 ESLint로 검사 및 수정
- **DB (Drizzle)**:
  - **`pnpm db:check`**: Drizzle 설정/스키마 상태 점검
  - **`pnpm db:generate`**: Drizzle 마이그레이션/스키마 아티팩트 생성
  - **`pnpm db:migrate`**: 마이그레이션 적용
  - **`pnpm db:studio`**: Drizzle Studio 실행
  - **`pnpm db:up`**: Drizzle `up` 실행 (프로젝트 설정에 따른 DB 준비/적용)
- **Test**:
  - **`pnpm dev:e2e`**: E2E 실행 전 준비 스크립트 실행

## Technologies under review

https://www.triplit.dev/
