import {styled, createTheme, createStyled, createEmotion} from 'packages/ui/emotion'

export {styled, createEmotion, createStyled, createTheme}

export const createUI = (): ReturnType<typeof createEmotion> => {
  return createEmotion()
}
