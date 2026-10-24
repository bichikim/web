import {pretendardExtendedStyles} from './pretendard-extended'
import {pretendardKoreanStyles} from './pretendard-korean'
import {pretendardLatinStyles} from './pretendard-latin'
import {PRETENDARD_BASE_PATH} from './pretendard-base'

export {PRETENDARD_BASE_PATH} from './pretendard-base'

export const pretendardFontFaceStyles = [
  pretendardLatinStyles,
  pretendardKoreanStyles,
  pretendardExtendedStyles,
].join('\n\n')
