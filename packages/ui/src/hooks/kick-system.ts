import {PureObject, cleanObject} from '@innovirus/utils'
import {BackgroundColorProps, PaddingProps, TextColorProps} from 'styled-system'
import {computed} from 'vue'

type Un<T extends Record<string, any>> = Record<keyof T, undefined>

type KickFunc = (props: PureObject) => Record<string, any>

const createFilter = (pickFunc) => {
  return (isGet: boolean = false, clean: boolean = false) => (props) => {
    const [recode, rest] = pickFunc(props)
    if (isGet) {
      if (clean) {
        return cleanObject(recode)
      }
      return recode
    }
    return rest
  }
}

const padding = createFilter((props) => {
  const {
    p, padding, paddingBottom, paddingLeft, paddingRight, paddingTop, paddingX,
    paddingY, pb, pl, pr, pt, px, py, ...rest
  } = props
  return [{
    p,
    padding,
    paddingBottom,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingX,
    paddingY,
    pb,
    pl,
    pr,
    pt,
    px,
    py,
  }, rest]
})

const backgroundColor = createFilter((props) => {
  const {bg, backgroundColor, ...rest} = props
  return [{bg, backgroundColor}, rest]
})

const color = createFilter((props) => {
  const {color, ...rest} = props
  return [{color}, rest]
})

export const kicks = {
  backgroundColor,
  color,
  padding,
}

export const kickSystem = (props: PureObject, kickSys: (KickFunc | keyof typeof kicks)[] = []) => {
  return computed(() => {
    let newProps = {...props}
    kickSys.forEach((kick) => {
      if (typeof kick === 'function') {
        newProps = kick(newProps)
        return
      }
      const kickFunc = kicks[kick]

      if (kickFunc) {
        newProps = kickFunc()(newProps)
      }
    })
    return newProps
  })
}
