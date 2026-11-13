/** 루트 경로는 유지하고 경로 끝의 슬래시를 제거한다. */
export const removeTrailingSlashes = (pathname: string): string =>
  pathname.replace(/\/+$/u, '') || '/'
