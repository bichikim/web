import {strFromU8} from 'fflate'
import {embeddedFile} from './embedded-data'
import {waitForReady} from './wait-for-ready.mjs'
import * as sdk from 'virtual:cubism-framework'

export const loadCore = async (_origin, signal) => {
  await waitForReady(() => {
    try {
      return globalThis.Live2DCubismCore.Version.csmGetVersion() > 0
    } catch {
      return false
    }
  }, signal)
}

export const loadModules = async () => sdk

const base64 = (bytes) => {
  const CHUNK_SIZE = 8192
  const chunks = []
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + CHUNK_SIZE)))
  }
  return btoa(chunks.join(''))
}

export const loadModel = async (_origin, signal) => {
  const root = 'Hiyori/'
  const file = (path) => embeddedFile(root + path)
  const settings = JSON.parse(strFromU8(file('Hiyori.model3.json')))
  const refs = settings.FileReferences
  const entries = Object.entries(refs.Motions).flatMap(([group, motions]) =>
    motions.map((motion, index) => [`${group}:${index}`, file(motion.File).slice().buffer]),
  )
  const images = await Promise.all(
    refs.Textures.map(async (path) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64(file(path))}`
      await image.decode()
      signal.throwIfAborted()
      return image
    }),
  )
  return {
    images,
    mocBytes: file(refs.Moc).slice().buffer,
    motions: new Map(entries),
    physicsBytes: file(refs.Physics).slice().buffer,
    poseBytes: file(refs.Pose).slice().buffer,
    settings,
  }
}
