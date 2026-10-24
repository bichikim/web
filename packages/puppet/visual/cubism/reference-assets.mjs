import {waitForReady} from './wait-for-ready.mjs'

const readAsset = async (url, signal) => {
  const response = await fetch(url, {signal})
  if (!response.ok) {
    throw new Error(`SDK 파일을 읽지 못했습니다: ${url} (${response.status})`)
  }
  return response.arrayBuffer()
}

export const loadCore = async (origin, signal) => {
  if (!globalThis.Live2DCubismCore) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `${origin}/Core/live2dcubismcore.js`
      script.onload = resolve
      script.onerror = () => reject(new Error('Cubism Core를 불러오지 못했습니다.'))
      document.head.append(script)
    })
  }
  // Core는 Wasm 초기화 완료를 공개 이벤트로 알리지 않는다.
  await waitForReady(() => {
    try {
      return globalThis.Live2DCubismCore.Version.csmGetVersion() > 0
    } catch {
      return false
    }
  }, signal)
}

export const loadModules = async (frameworkUrl) => {
  const module = (name) => import(/* @vite-ignore */ `${frameworkUrl + name}.ts`)
  const [
    {CubismFramework},
    {CubismMoc},
    {CubismRenderer_WebGL: SdkRenderer},
    {CubismMatrix44},
    {CubismMotion},
    {CubismMotionQueueEntry},
    {CubismPhysics},
    {CubismPose},
    {CubismShaderManager_WebGL: ShaderManager},
  ] = await Promise.all([
    module('live2dcubismframework'),
    module('model/cubismmoc'),
    module('rendering/cubismrenderer_webgl'),
    module('math/cubismmatrix44'),
    module('motion/cubismmotion'),
    module('motion/cubismmotionqueueentry'),
    module('physics/cubismphysics'),
    module('effect/cubismpose'),
    module('rendering/cubismshader_webgl'),
  ])
  return {
    CubismFramework,
    CubismMatrix44,
    CubismMoc,
    CubismMotion,
    CubismMotionQueueEntry,
    CubismPhysics,
    CubismPose,
    SdkRenderer,
    ShaderManager,
  }
}

export const loadModel = async (sdkOrigin, signal) => {
  const root = `${sdkOrigin}/Resources/Hiyori/`
  const settings = JSON.parse(
    new TextDecoder().decode(await readAsset(`${root}Hiyori.model3.json`, signal)),
  )
  const refs = settings.FileReferences
  const [mocBytes, physicsBytes, poseBytes, entries, images] = await Promise.all([
    readAsset(root + refs.Moc, signal),
    readAsset(root + refs.Physics, signal),
    readAsset(root + refs.Pose, signal),
    Promise.all(
      Object.entries(refs.Motions).flatMap(([group, motions]) =>
        motions.map(async (motion, index) => [
          `${group}:${index}`,
          await readAsset(root + motion.File, signal),
        ]),
      ),
    ),
    Promise.all(
      refs.Textures.map(async (file) => {
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.src = root + file
        await image.decode()
        signal.throwIfAborted()
        return image
      }),
    ),
  ])
  return {images, mocBytes, motions: new Map(entries), physicsBytes, poseBytes, settings}
}
