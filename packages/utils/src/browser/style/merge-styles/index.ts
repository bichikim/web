import {toStyleString} from 'src/formatting/css/to-style-string'

/**
 * 스타일을 string objects 관계 없이 합칩니다
 * @param target
 * @param source
 */
export const mergeStyles = (
  target: string | null | undefined | Record<string, string | number>,
  source: string | null | undefined | Record<string, string | number>,
): string => {
  const _target = typeof target === 'string' ? target : toStyleString(target)
  const _source = typeof source === 'string' ? source : toStyleString(source)

  if (_target.length === 0 || _source.length === 0 || _target.trimEnd().endsWith(';')) {
    return `${_target}${_source}`
  }

  return `${_target};${_source}`
}

/** @deprecated Use `mergeStyles` instead. */
export const setStyle = mergeStyles

/** @deprecated Use `mergeStyles` instead. */
export const assignStyle = mergeStyles
