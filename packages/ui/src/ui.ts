import {styled, createTheme, createStyled, createEmotion} from '@innovirus/emotion'

export {styled, createEmotion, createStyled, createTheme}

export const createUI = (): ReturnType<typeof createEmotion> => {
  return createEmotion()
}
