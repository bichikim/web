import {isObject} from 'src/utils/is-object'

interface RainBlendRenderer {
  readonly gl: Pick<
    WebGLRenderingContext,
    'ONE' | 'ONE_MINUS_DST_COLOR' | 'ONE_MINUS_SRC_ALPHA' | 'ONE_MINUS_SRC_COLOR'
  >
  readonly state: unknown
}

/** Installs the reference rain factors after checking Pixi's internal state shape. */
export const installRainBlendMode = (renderer: RainBlendRenderer): void => {
  const {state} = renderer
  const blendModes = isObject(state) ? state.blendModesMap : undefined
  if (!isObject(blendModes)) {
    throw new Error('PixiJS WebGL blend-mode map is unavailable')
  }
  const {gl} = renderer
  blendModes.exclusion = [
    gl.ONE_MINUS_DST_COLOR,
    gl.ONE_MINUS_SRC_COLOR,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA,
  ]
}
