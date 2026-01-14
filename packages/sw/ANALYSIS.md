# @winter-love/sw 패키지 분석 및 리팩터링 제안

## 📋 개요
Service Worker 생성 및 관리 패키지로, Vite 플러그인과 CLI를 제공합니다.

## 🔍 발견된 문제점 및 개선 사항

### 1. **타입 안정성 문제**

#### 1.1 `sw.ts` - 타입 불일치
```typescript
// Line 36: cache 파라미터 타입이 잘못됨
const createNetworkFirst = async (event: FetchEvent, cache: RequestCache = 'default') => {
  // RequestCache는 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached'
  // 하지만 Headers에 'cache-control'로 설정하는 것은 잘못된 사용법
  headers.append('cache-control', cache) // ❌ 타입 불일치
  headers.append('pragma', cache) // ❌ 타입 불일치
}
```

**문제점:**
- `RequestCache` 타입을 문자열로 Headers에 직접 사용
- `cache-control` 헤더는 다른 형식이어야 함

**해결 방안:**
- `RequestCache` 대신 별도의 캐시 전략 타입 정의
- 또는 `RequestInit`의 `cache` 옵션을 직접 사용

#### 1.2 `index.ts` - any 타입 사용
```typescript
// Line 36, 49, 58: any 타입 사용
let _config: any | undefined
configResolved(config: any) {
  // ...
}
```

**문제점:**
- 타입 안정성 저하
- Vite Config 타입을 명시적으로 정의해야 함

**해결 방안:**
- `import type { ResolvedConfig } from 'vite'` 사용
- 또는 적절한 타입 정의

### 2. **사용되지 않는 의존성**

#### 2.1 `package.json` - 불필요한 의존성
```json
{
  "dependencies": {
    "solid-js": "^1.9.3",  // ❌ 사용되지 않음
    "core-js": "^3.42.0",  // ❌ 사용되지 않음
    "@winter-love/utils": "workspace:*"  // ❌ 사용되지 않음
  }
}
```

**문제점:**
- 패키지 크기 증가
- 불필요한 번들링

**해결 방안:**
- 사용되지 않는 의존성 제거

### 3. **코드 품질 문제**

#### 3.1 `sw.ts` - 주석 처리된 코드
```typescript
// Line 60-78: 주석 처리된 코드
// const updateCache = async (event: FetchEvent) => {
//   ...
// }
// const createStaleWhileRevalidate = async (event: FetchEvent) => {
//   ...
// }
```

**문제점:**
- 불필요한 코드 유지
- 혼란 야기

**해결 방안:**
- 사용하지 않으면 삭제
- 필요하면 주석으로 설명 추가

#### 3.2 `sw.ts` - 중복된 함수 구현
```typescript
// Line 11-30: startsWith 함수 - String.prototype.startsWith()와 동일
const startsWith = (target: string, search: string) => {
  // 수동 구현
}

// Line 96-98: includes 함수 - Array.prototype.includes()와 동일
const includes = (array: any[], value: any) => {
  return array.indexOf(value) !== -1
}
```

**문제점:**
- 네이티브 메서드 재구현
- Service Worker 환경에서도 `startsWith`, `includes` 사용 가능

**해결 방안:**
- 네이티브 메서드 사용
- 또는 폴리필이 필요한 경우 명확한 주석 추가

#### 3.3 `sw.ts` - 변수명 일관성 부족
```typescript
const CACHE_NAME = 'coong-cache'  // 하드코딩된 앱 이름
```

**문제점:**
- 재사용성 저하
- 다른 앱에서 사용 시 문제

**해결 방안:**
- 설정 가능하도록 변경
- 또는 패키지 이름 기반으로 변경

### 4. **에러 처리 개선**

#### 4.1 `sw.ts` - 에러 처리 부족
```typescript
// Line 49-56: catch 블록에서 에러 정보 손실
catch {
  // 에러 로깅 없음
  return new Response('Network error', {status: 500})
}
```

**문제점:**
- 디버깅 어려움
- 에러 정보 손실

**해결 방안:**
- 에러 로깅 추가
- 더 구체적인 에러 메시지

#### 4.2 `index.ts` - 에러 처리 부족
```typescript
// Line 16-22: generateSW 함수에 에러 처리 없음
export const generateSW = async (distribution: string, options: GenerateSWOptions) => {
  // try-catch 없음
}
```

**문제점:**
- 파일 읽기/쓰기 실패 시 처리 없음

**해결 방안:**
- try-catch 추가
- 명확한 에러 메시지

### 5. **테스트 코드 문제**

#### 5.1 `get-files-from-path.spec.ts` - 테스트 로직 오류
```typescript
// Line 22-34: 테스트 순서 문제
it('should return an empty array when the path has no files', async () => {
  const result = await getFilesFromPath(emptyPath)  // ❌ 먼저 호출
  
  vi.mocked(glob).mockImplementationOnce(() => Promise.resolve(mockFiles))  // ❌ 나중에 모킹
})
```

**문제점:**
- 모킹이 실제 호출 이후에 설정됨
- 테스트가 제대로 작동하지 않음

**해결 방안:**
- 모킹을 함수 호출 전에 설정
- 테스트 로직 수정

### 6. **파일 경로 처리 문제**

#### 6.1 `index.ts` - 하드코딩된 경로
```typescript
// Line 18: sw.mjs 파일 경로 하드코딩
const swFile = await fs.promises.readFile(path.join(libraryRoot, 'sw.mjs'), 'utf8')
```

**문제점:**
- 빌드 후 파일 위치에 의존
- 유연성 부족

**해결 방안:**
- 경로를 설정 가능하게 변경
- 또는 소스 파일에서 직접 읽기

#### 6.2 `index.ts` - 문자열 치환 방식
```typescript
// Line 21: 문자열 치환으로 코드 주입
swFile.replace(INJECT_TARGET, JSON.stringify(installFiles))
```

**문제점:**
- 타입 안정성 부족
- 런타임 에러 가능성

**해결 방안:**
- 템플릿 엔진 사용
- 또는 AST 변환

### 7. **CLI 개선 사항**

#### 7.1 `cli.ts` - 에러 처리 부족
```typescript
// Line 8-12: action 함수에 에러 처리 없음
const action = async (arg: string, options: GenerateSWOptions) => {
  const {generateSW} = await import('./index')
  generateSW(arg, options)  // await 없음, 에러 처리 없음
}
```

**문제점:**
- 비동기 에러 처리 없음
- await 누락

**해결 방안:**
- await 추가
- try-catch로 에러 처리
- 사용자 친화적인 에러 메시지

### 8. **설정 및 옵션 개선**

#### 8.1 `index.ts` - 하드코딩된 값들
```typescript
// Line 52-56: 하드코딩된 경로 및 패턴
await generateSW(swOutPath, {
  assets: '_build/assets/**/*',  // ❌ 하드코딩
  assetsRoot: outDir,
  cwd: '',
})
```

**문제점:**
- 유연성 부족
- 다른 빌드 구조 지원 어려움

**해결 방안:**
- 옵션으로 설정 가능하게 변경

### 9. **Service Worker 로직 개선**

#### 9.1 `sw.ts` - 캐시 전략 개선 필요
```typescript
// Line 130-139: destination 기반 분기
const destination: RequestDestination[] = ['style', 'script', 'worker', 'manifest', 'document']

if (includes(destination, event.request.destination)) {
  event.respondWith(createNetworkFirst(event))
} else {
  event.respondWith(createCacheFirst(event))
}
```

**문제점:**
- 모든 리소스에 동일한 전략 적용
- 이미지, 폰트 등에 대한 최적화 부족

**해결 방안:**
- 리소스 타입별 캐시 전략 분리
- 설정 가능한 전략 제공

#### 9.2 `sw.ts` - 캐시 버전 관리 부족
```typescript
const CACHE_NAME = 'coong-cache'  // 버전 정보 없음
```

**문제점:**
- 캐시 무효화 어려움
- 업데이트 시 이전 캐시 정리 안 됨

**해결 방안:**
- 캐시 버전 추가
- activate 이벤트에서 이전 캐시 삭제

### 10. **문서화 부족**

#### 10.1 README 없음
- 패키지 사용법 문서화 필요
- API 문서 필요

## 🎯 우선순위별 리팩터링 계획

### 높은 우선순위 (즉시 수정)
1. ✅ 타입 안정성 개선 (`any` 제거, 적절한 타입 정의)
2. ✅ 사용되지 않는 의존성 제거
3. ✅ 테스트 코드 수정
4. ✅ 에러 처리 추가
5. ✅ 주석 처리된 코드 정리

### 중간 우선순위 (단기 개선)
6. ✅ 네이티브 메서드 사용 (`startsWith`, `includes`)
7. ✅ 캐시 버전 관리 추가
8. ✅ CLI 에러 처리 개선
9. ✅ 하드코딩된 값들을 설정 가능하게 변경

### 낮은 우선순위 (장기 개선)
10. ✅ 리소스 타입별 캐시 전략 분리
11. ✅ 템플릿 엔진 도입
12. ✅ README 및 API 문서 작성
13. ✅ 더 많은 테스트 추가

## 📝 추가 제안 사항

### 1. **환경 변수 지원**
- 개발/프로덕션 환경별 설정 분리
- 캐시 전략 설정 가능

### 2. **로깅 시스템**
- 개발 모드에서 상세 로깅
- 프로덕션 모드에서 에러만 로깅

### 3. **캐시 무효화 전략**
- 버전 기반 캐시 관리
- 자동 캐시 정리

### 4. **성능 최적화**
- 캐시 크기 제한
- LRU 캐시 전략

### 5. **타입 정의 개선**
- 더 엄격한 타입 체크
- JSDoc 주석 추가
