import {StandardLonghandProperties, StandardShorthandProperties} from 'csstype'

export type BaseStyleValue = string | number

export interface StyleProperties extends
  StandardLonghandProperties<BaseStyleValue>,
  StandardShorthandProperties<BaseStyleValue>
{
  // empty
}

export interface ShortHeadProperties {
  bg?: string
  m?: string | number
  mb?: string | number
  ml?: string | number
  mr?: string | number
  mt?: string | number
  mx?: string | number
  my?: string | number

  p?: string | number
  pb?: string | number
  pl?: string | number
  pr?: string | number
  pt?: string | number
  px?: string | number
  py?: string | number
}
