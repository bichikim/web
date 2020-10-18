import {styled, createTheme, createStyled, createEmotion, createGlobalStyle} from '@innovirus/emotion'
import {Plugin} from 'vue'

export {styled, createEmotion, createStyled, createTheme}

const isWeb = () => typeof window === 'object'

export const createUI = (): Plugin => {
  return {
    install(app) {
      const emotion = createEmotion()
      const global = createGlobalStyle({
        body: {
          display: 'block',
          padding: 0,
          margin: 0,
          color: 'black',
        },
      })
      emotion.install(app)
      global.install(app)
      if (isWeb()) {
        const dom = window.document.createElement('div')
        dom.style.position = 'fixed'
        dom.style.top = '0'
        dom.style.left = '0'
        window.document.body.appendChild(dom)
      }
    },
  }
}
