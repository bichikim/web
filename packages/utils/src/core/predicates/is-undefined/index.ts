/**
 * @deprecated 이 유틸은 삭제 예정입니다. `es-toolkit/predicate`의 `isUndefined`를 사용하세요.
 *
 * import {isUndefined} from 'es-toolkit/predicate'
 */
export const isUndefined = (value: any): value is undefined => value === undefined
