# @winter-love/sw 리팩터링 TODO

## 📊 분석 개요

**패키지 정보**

- 이름: `@winter-love/sw`
- 용도: SolidStart SSR 환경에서 작동하는 Service Worker 생성 및 관리
- 주요 기능: Vite 플러그인, CLI 도구, 캐싱 전략 제공

**파일 구조**

```
packages/sw/
├── src/
│   ├── index.ts              # Vite 플러그인 및 메인 API
│   ├── sw.ts                 # Service Worker 로직 (캐싱 전략)
│   ├── get-files-from-path.ts # 파일 검색 유틸리티
│   ├── get-install-files.ts   # 설치할 파일 리스트 생성
│   ├── cli.ts                # CLI 도구
│   └── __tests__/
│       └── get-files-from-path.spec.ts
├── dist/                     # 빌드 결과물
├── package.json
├── vite.config.mts
└── tsconfig.json
```

---

## 🎯 리팩터링 우선순위

### 🔴 높은 우선순위 (즉시 수정)

#### 1. 타입 안정성 개선

**파일**: `src/index.ts`

- [x] `any` 타입 제거 (Line 36, 49, 58)
  - 현재: `let _config: any | undefined`
  - 변경: `import type { ResolvedConfig } from 'vite'` 사용
  - 현재: `configResolved(config: any)`
  - 변경: `configResolved(config: ResolvedConfig)`
  - 추가: 타입 가드로 `router` 속성 안전하게 확인

**파일**: `src/sw.ts`

- [x] `RequestCache` 타입 불일치 수정 (Line 36-40)
  - 현재: `cache-control` 헤더에 `RequestCache` 타입 직접 사용
  - 문제: `RequestCache`는 `'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached'` 타입
  - 해결: 별도의 캐시 전략 타입 정의 또는 `RequestInit`의 `cache` 옵션 사용
  - 추가: `includes` 함수에 제네릭 타입 적용

#### 2. 사용되지 않는 의존성 제거

**파일**: `package.json`

- [x] 불필요한 의존성 제거
  - `solid-js`: ^1.9.3 (사용되지 않음)
  - `core-js`: ^3.42.0 (사용되지 않음)
  - `@winter-love/utils`: workspace:\* (사용되지 않음)

**검증 방법**:

```bash
# 각 의존성이 실제로 import되는지 grep으로 확인
grep -r "from 'solid-js'" src/
grep -r "from 'core-js'" src/
grep -r "from '@winter-love/utils'" src/
```

#### 3. 테스트 코드 수정

**파일**: `src/__tests__/get-files-from-path.spec.ts`

- [ ] 테스트 로직 순서 수정 (Line 22-34)
  - 현재: `getFilesFromPath()` 호출 → `mockImplementationOnce()` 설정 (순서 반대)
  - 변경: 모킹을 먼저 설정 → 함수 호출

#### 4. 에러 처리 추가

**파일**: `src/index.ts`

- [ ] `generateSW` 함수에 try-catch 추가 (Line 16-22)
  - 현재: 에러 처리 없음
  - 추가: 파일 읽기/쓰기 실패 시 명확한 에러 메시지

**파일**: `src/sw.ts`

- [ ] `createNetworkFirst` 함수 catch 블록 개선 (Line 49-56)
  - 현재: 에러 정보 없이 일반 에러 메시지 반환
  - 추가: 에러 로깅, 구체적인 에러 메시지

**파일**: `src/cli.ts`

- [ ] CLI action 함수 에러 처리 개선 (Line 8-12)
  - 현재: `await` 누락, 에러 처리 없음
  - 추가: `await` 추가, try-catch, 사용자 친화적 에러 메시지

#### 5. 주석 처리된 코드 정리

**파일**: `src/sw.ts`

- [ ] 주석 처리된 코드 제거 또는 활성화 (Line 60-78)
  - `updateCache` 함수 (사용되지 않음)
  - `createStaleWhileRevalidate` 함수 (사용되지 않음)
  - 결정 필요: 필요하면 구현, 아니면 삭제

---

### 🟡 중간 우선순위 (단기 개선)

#### 6. 네이티브 메서드 사용

**파일**: `src/sw.ts`

- [ ] `startsWith` 함수 제거 (Line 11-30)
  - 현재: String.prototype.startsWith()와 동일한 기능 수동 구현
  - 변경: 네이티브 `String.prototype.startsWith()` 사용
  - 검증: Service Worker 환경에서 지원 확인 (ES6+)

- [ ] `includes` 함수 제거 (Line 96-98)
  - 현재: Array.prototype.includes()와 동일한 기능 수동 구현
  - 변경: 네이티브 `Array.prototype.includes()` 사용

#### 7. 캐시 버전 관리 추가

**파일**: `src/sw.ts`

- [ ] 캐시 버전 시스템 구현
  - 현재: `const CACHE_NAME = 'coong-cache'` (버전 정보 없음)
  - 변경: `const CACHE_NAME = 'coong-cache-v1'` 형식
- [ ] `activate` 이벤트 핸들러 추가
  - 이전 버전 캐시 삭제 로직
  - 현재 버전 캐시만 유지

#### 8. 하드코딩된 값 설정 가능하게 변경

**파일**: `src/index.ts`

- [ ] 하드코딩된 경로 설정 가능하게 (Line 52-56)
  - 현재: `assets: '_build/assets/**/*'`
  - 변경: 옵션에서 설정 가능하게

**파일**: `src/sw.ts`

- [ ] CACHE_NAME 설정 가능하게
  - 현재: 'coong-cache' 하드코딩
  - 변경: 빌드 시 주입 가능하게

#### 9. CLI 에러 처리 개선

**파일**: `src/cli.ts`

- [ ] 완전한 에러 처리 구현
  - 모든 명령어에 try-catch 추가
  - 사용자 친화적 에러 메시지
  - 로깅 시스템 연동

---

### 🟢 낮은 우선순위 (장기 개선)

#### 10. 리소스 타입별 캐시 전략 분리

**파일**: `src/sw.ts`

- [ ] 세분화된 캐싱 전략 구현
  - 현재: style, script, worker, manifest, document → Network First
  - 나머지 → Cache First
  - 변경: 이미지, 폰트 등에 대한 최적화된 전략
- [ ] 전략 설정 옵션 제공

#### 11. 템플릿 엔진 도입

**파일**: `src/index.ts`

- [ ] 문자열 치환 방식 개선 (Line 21)
  - 현재: `swFile.replace(INJECT_TARGET, JSON.stringify(installFiles))`
  - 변경: 템플릿 엔진 또는 AST 변환 도입
  - 이유: 타입 안정성 향상, 런타임 에러 방지

#### 12. 파일 경로 처리 개선

**파일**: `src/index.ts`

- [ ] sw.mjs 파일 경로 설정 가능하게 (Line 18)
  - 현재: `path.join(libraryRoot, 'sw.mjs')` 하드코딩
  - 변경: 옵션에서 경로 설정 가능하게

#### 13. 문서화

- [ ] README.md 작성
  - 설치 방법
  - 사용법
  - 설정 옵션
  - 예제 코드
- [ ] API 문서 작성
  - JSDoc 주석 추가
  - TypeScript 타입 정의 개선

#### 14. 추가 테스트 작성

- [ ] `src/index.ts` 단위 테스트 추가
- [ ] `src/sw.ts` 통합 테스트 추가 (Service Worker 환경)
- [ ] `src/get-install-files.ts` 단위 테스트 추가
- [ ] E2E 테스트 추가

---

## 🚀 추가 제안 사항

### 15. 환경 변수 지원

**목적**: 개발/프로덕션 환경별 설정 분리

- [ ] `.env` 파일 지원
- [ ] 개발 모드에서 상세 로깅
- [ ] 프로덕션 모드에서 에러만 로깅
- [ ] 캐시 전략 환경별 설정

### 16. 로깅 시스템

**목적**: 디버깅 및 모니터링 용이성

- [ ] 로깅 레벨 설정 (debug, info, warn, error)
- [ ] Service Worker 내부에서 로그 전송 메커니즘
- [ ] 개발자 도구와 통합

### 17. 캐시 무효화 전략

**목적**: 버전 업데이트 시 원활한 전환

- [ ] 버전 기반 캐시 관리
- [ ] 자동 캐시 정리
- [ ] PWA 업데이트 알림

### 18. 성능 최적화

**목적**: 캐시 효율성 및 사용자 경험 개선

- [ ] 캐시 크기 제한
- [ ] LRU (Least Recently Used) 캐시 전략
- [ ] 캐시 우선순위 설정

### 19. 타입 정의 개선

**목적**: 개발자 경험 및 안정성 향상

- [ ] 더 엄격한 타입 체크
- [ ] JSDoc 주석 추가
- [ ] 예제 코드와 함께 타입 문서화

---

## 📝 작업 순서 추천

### Phase 1: 안정성 확보 (Week 1)

1. 타입 안정성 개선 (1.1, 1.2)
2. 사용되지 않는 의존성 제거 (2)
3. 에러 처리 추가 (4)

### Phase 2: 코드 품질 개선 (Week 2)

4. 테스트 코드 수정 (3)
5. 주석 처리된 코드 정리 (5)
6. 네이티브 메서드 사용 (6)

### Phase 3: 기능 강화 (Week 3-4)

7. 캐시 버전 관리 추가 (7)
8. 하드코딩된 값 설정 가능하게 (8)
9. CLI 에러 처리 개선 (9)

### Phase 4: 장기 개선 (Ongoing)

10. 리소스 타입별 캐시 전략 분리 (10)
11. 문서화 (13)
12. 추가 테스트 작성 (14)

---

## 🔧 리팩터링 시 주의사항

1. **하위 호환성 유지**: 기존 API 동작을 깨지 않도록 주의
2. **SolidStart 호환성**: SSR 환경에서의 Service Worker 동작 보장
3. **테스트 커버리지**: 리팩터링 전후 테스트 수행
4. **점진적 개선**: 한 번에 모든 변경을 시도하지 말고, 작은 단위로 진행
5. **커밋 메시지**: 각 변경을 명확한 커밋으로 분리

---

## 📚 참고 자료

- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Workbox](https://developer.chrome.com/docs/workbox/) - Google의 Service Worker 라이브러리
- [SolidStart 공식 문서](https://start.solidjs.com/)
- [Web.dev PWA 가이드](https://web.dev/progressive-web-apps/)

---

## ✅ 완료 기준

각 항목은 다음 조건을 만족해야 완료로 간주됩니다:

- [ ] 코드 변경 완료
- [ ] LSP 진단 통과 (`lsp_diagnostics`)
- [ ] 테스트 통과 (존재하는 경우)
- [ ] 관련 테스트 추가/수정 (필요한 경우)
- [ ] 문서 업데이트 (필요한 경우)
