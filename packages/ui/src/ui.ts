import {styled, createTheme, createStyled, createEmotion, createGlobalStyle} from '@winter-love/emotion'
import {Plugin} from 'vue'
import {createTeleport} from '@/teleport'
import {createImage, ImageContext} from '@/image'

export {styled, createEmotion, createStyled, createTheme}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface UIOptions extends ImageContext {}

export const createUI = (): Plugin => {
  return {
    install(app, options: UIOptions = {}) {
      const {baseUrl} = options
      const emotion = createEmotion()
      const global = createGlobalStyle({
        body: {
          display: 'block',
          padding: 0,
          margin: 0,
          color: 'black',
        },
      })
      const teleport = createTeleport()
      const image = createImage()
      emotion.install(app)
      global.install(app)
      teleport.install(app)
      image.install(app, {baseUrl})
    },
  }
}
