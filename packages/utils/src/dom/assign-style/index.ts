import {toStyleString} from 'src/dom/to-style-string'

/**
 * 스타일을 string objects 관계 없이 합칩니다
 * @param target
 * @param source
 */
export const assignStyle = (
  target: string | null | undefined | Record<string, string | number>,
  source: string | null | undefined | Record<string, string | number>,
): string => {
  const _target = typeof target === 'string' ? target : toStyleString(target)
  const _source = typeof source === 'string' ? source : toStyleString(source)

  return `${_target}${_source}`
}
