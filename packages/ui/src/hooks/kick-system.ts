import {BackgroundColorProps, PaddingProps, TextColorProps} from 'styled-system'
import {watch, Ref, computed, toRefs, ToRefs} from 'vue'
import {PureObject} from '@innovirus/utils'

type Un<T extends Record<string, any>> = Record<keyof T, undefined>

const paddingProps: Un<PaddingProps> = {
  p: undefined,
  padding: undefined,
  paddingBottom: undefined,
  paddingLeft: undefined,
  paddingRight: undefined,
  paddingTop: undefined,
  paddingX: undefined,
  paddingY: undefined,
  pb: undefined,
  pl: undefined,
  pr: undefined,
  pt: undefined,
  px: undefined,
  py: undefined,
}

const backgroundColorProps: Un<BackgroundColorProps> = {
  backgroundColor: undefined,
  bg: undefined,
}

const textColorProps: Un<TextColorProps> = {
  color: undefined,
}

const createKick = (kickProps) => {
  const myKick = {...kickProps}
  return (props) => {
    return {
      ...props,
      ...myKick,
    }
  }
}

const kicks = {
  backgroundColor: createKick(backgroundColorProps),
  color: createKick(textColorProps),
  padding: createKick(paddingProps),
}

type Kicks = typeof kicks

export const kickSystem = (props: PureObject, kickSys: (keyof Kicks)[] = []) => {
  return computed(() => {
    let newProps = {...props}
    kickSys.forEach((kickName) => {
      newProps = kicks[kickName](newProps)
    })
    return newProps
  })
}
