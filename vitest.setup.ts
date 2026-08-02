/**
 * Vitest setupFiles 엔트리.
 * 각 테스트 파일 실행 전에 한 번 로드되며, jest-dom matcher 확장과
 * Solid Testing Library DOM cleanup을 전역으로 적용한다.
 */
import '@testing-library/jest-dom/vitest'
import {cleanup} from '@solidjs/testing-library'
import {afterEach} from 'vitest'

// render()로 남은 컴포넌트·DOM이 다음 테스트로 새지 않게 한다.
afterEach(() => {
  cleanup()
})
