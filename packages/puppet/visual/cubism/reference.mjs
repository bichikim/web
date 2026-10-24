import {waitForReady} from './wait-for-ready.mjs'
import {loadCore, loadModel, loadModules} from './reference-assets.mjs'

const FADE_MIDPOINT = 0.5
const ease = (value) =>
  FADE_MIDPOINT - FADE_MIDPOINT * Math.cos(Math.PI * Math.min(1, Math.max(0, value)))

const createSimulation = ({options, sdk, assets, model, raw}) => {
  const {CubismFramework, CubismMotion, CubismMotionQueueEntry, CubismPhysics, CubismPose} = sdk
  const {settings, motions, physicsBytes, poseBytes} = assets
  const id = (value) => CubismFramework.getIdManager().getId(value)
  const effects = (name) => settings.Groups.find((group) => group.Name === name).Ids.map(id)
  let motion
  let nativeMotion
  let queue
  let physics
  let pose
  const reset = (motionId) => {
    raw.parameters.values.set(raw.parameters.defaultValues)
    model.setPartOpacityById(id('PartArmA'), 1)
    model.setPartOpacityById(id('PartArmB'), 0)
    const bytes = motions.get(motionId)
    motion = bytes ? CubismMotion.create(bytes, bytes.byteLength) : undefined
    nativeMotion = options.document.motions.find((candidate) => candidate.id === motionId)
    if (motion && nativeMotion) {
      motion.setEffectIds(effects('EyeBlink'), effects('LipSync'))
      motion.setFadeInTime(nativeMotion.fadeInTime)
      motion.setFadeOutTime(nativeMotion.fadeOutTime)
      queue = new CubismMotionQueueEntry()
      queue.setStartTime(0)
      queue.setFadeInStartTime(0)
      queue.setEndTime(nativeMotion.duration)
    }
    physics = CubismPhysics.create(physicsBytes, physicsBytes.byteLength)
    pose = CubismPose.create(poseBytes, poseBytes.byteLength)
    pose.reset(model)
    pose.updateParameters(model, 0)
    model.saveParameters()
    physics.stabilization(model)
  }
  const applyOverrides = (overrides) => {
    for (const [name, value] of Object.entries(overrides)) {
      model.setParameterValueById(id(name), value)
    }
  }
  return {
    reset,
    step(time, deltaTime, overrides) {
      model.loadParameters()
      if (motion) {
        const weight =
          ease(time / nativeMotion.fadeInTime) *
          ease((nativeMotion.duration - time) / nativeMotion.fadeOutTime)
        motion.doUpdateParameters(model, time, weight, queue)
      }
      model.saveParameters()
      applyOverrides(overrides)
      if (deltaTime > 0) {
        physics.evaluate(model, deltaTime)
      }
      pose.updateParameters(model, deltaTime)
      model.update()
    },
    values() {
      return Object.fromEntries(
        options.document.parameters.map((parameter) => [
          parameter.id,
          model.getParameterValueById(id(parameter.id)),
        ]),
      )
    },
  }
}

/** 개발용 SDK 자원과 실행 모델. destroy가 Wasm·GPU 자원을 해제한다. */
const bindTextures = (gl, renderer, images, textures) => {
  for (const [index, image] of images.entries()) {
    const texture = gl.createTexture()
    if (!texture) {
      throw new Error('SDK 텍스처를 만들지 못했습니다.')
    }
    textures.push(texture)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.generateMipmap(gl.TEXTURE_2D)
    renderer.bindTexture(index, texture)
  }
}

export const createReference = async (options) => {
  const {sdkOrigin, frameworkUrl, signal, canvas} = options
  await loadCore(sdkOrigin, signal)
  const [sdk, assets] = await Promise.all([loadModules(frameworkUrl), loadModel(sdkOrigin, signal)])
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
  })
  if (!gl) {
    throw new Error('SDK WebGL을 시작하지 못했습니다.')
  }
  let moc
  let model
  let renderer
  let destroyed = false
  const textures = []
  const destroy = () => {
    if (destroyed) {
      return
    }
    destroyed = true
    renderer?.release()
    textures.forEach((texture) => gl.deleteTexture(texture))
    if (moc && model) {
      moc.deleteModel(model)
    }
    moc?.release()
    sdk.CubismFramework.dispose()
  }
  try {
    sdk.CubismFramework.startUp()
    sdk.CubismFramework.initialize()
    moc = sdk.CubismMoc.create(assets.mocBytes, true)
    if (!moc) {
      throw new Error('MOC3를 읽지 못했습니다.')
    }
    model = moc.createModel()
    const raw = model.getModel()
    renderer = new sdk.SdkRenderer(canvas.width, canvas.height)
    renderer.initialize(model)
    renderer.startUp(gl)
    renderer.setIsPremultipliedAlpha(true)
    bindTextures(gl, renderer, assets.images, textures)
    const shaderPath = `${sdkOrigin}/Framework/Shaders/WebGL/`
    renderer.loadShaders(shaderPath)
    await waitForReady(() => sdk.ShaderManager.getInstance().getShader(gl)._isShaderLoaded, signal)
    return {
      ...createSimulation({assets, model, options, raw, sdk}),
      destroy,
      draw() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        renderer.drawModel(shaderPath)
      },
      resize(width, height) {
        canvas.width = width
        canvas.height = height
        const scale = Math.min(
          width / options.document.viewport.width,
          height / options.document.viewport.height,
        )
        const matrix = new sdk.CubismMatrix44()
        matrix.scale(
          (2 * scale * raw.canvasinfo.PixelsPerUnit) / width,
          (2 * scale * raw.canvasinfo.PixelsPerUnit) / height,
        )
        renderer.setMvpMatrix(matrix)
        renderer.setRenderState(null, [0, 0, width, height])
      },
    }
  } catch (error) {
    destroy()
    throw error
  }
}
