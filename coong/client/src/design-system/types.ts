import {StandardLonghandProperties, StandardShorthandProperties} from 'csstype'

export type BaseStyleValue = string | number

export interface StyleProperties extends 
  StandardLonghandProperties<BaseStyleValue>,
  StandardShorthandProperties<BaseStyleValue>
{
  // empty
}
