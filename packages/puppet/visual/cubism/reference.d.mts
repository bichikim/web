import type {Reference, ReferenceOptions} from './types'
/** 공식 SDK로 Hiyori를 읽는다. Core와 Framework는 개발용 서버에서만 불러온다. */
export declare const createReference: (options: ReferenceOptions) => Promise<Reference>
