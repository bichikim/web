import {generateMesh, type GenerateMeshErrorCode} from '../mesh'
import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetDocument,
} from '../player/document'
import {MAXIMUM_TEXTURE_PIXELS} from './internal/texture-limits'

export type ImportPngErrorCode =
  | GenerateMeshErrorCode
  | 'decode-failed'
  | 'invalid-file'
  | 'read-failed'
  | 'render-failed'
  | 'too-large'

export interface ImportPngFailure {
  readonly error: {readonly code: ImportPngErrorCode}
  readonly ok: false
}

export interface ImportPngSuccess {
  readonly document: PuppetDocument
  readonly ok: true
}

export type ImportPngResult = ImportPngFailure | ImportPngSuccess

const PNG_FILE_PATTERN = /\.png$/iu

const readFileSource = (file: File): Promise<string | undefined> =>
  new Promise((resolve) => {
    const reader = new FileReader()
    reader.addEventListener('error', () => resolve(undefined), {once: true})
    reader.addEventListener(
      'load',
      () => resolve(typeof reader.result === 'string' ? reader.result : undefined),
      {once: true},
    )
    reader.readAsDataURL(file)
  })

const decodeImage = async (source: string) => {
  const image = new Image()
  image.decoding = 'async'
  image.src = source

  try {
    await image.decode()
    return image
  } catch {
    return undefined
  }
}

const createPartId = (fileName: string) => {
  const name = fileName.replace(PNG_FILE_PATTERN, '').trim().toLowerCase()
  const normalizedName = name.replace(/[^a-z0-9가-힣_-]+/gu, '-').replace(/^-+|-+$/gu, '')

  return normalizedName.length === 0 ? 'image' : normalizedName
}

export const importPng = async (file: File): Promise<ImportPngResult> => {
  if (file.type !== 'image/png' && !PNG_FILE_PATTERN.test(file.name)) {
    return {error: {code: 'invalid-file'}, ok: false}
  }

  const source = await readFileSource(file)

  if (source === undefined) {
    return {error: {code: 'read-failed'}, ok: false}
  }

  const image = await decodeImage(source)

  if (image === undefined) {
    return {error: {code: 'decode-failed'}, ok: false}
  }

  if (image.naturalWidth * image.naturalHeight > MAXIMUM_TEXTURE_PIXELS) {
    return {error: {code: 'too-large'}, ok: false}
  }

  const canvas = window.document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', {willReadFrequently: true})

  if (context === null) {
    return {error: {code: 'render-failed'}, ok: false}
  }

  context.drawImage(image, 0, 0)
  const generatedMesh = generateMesh({
    pixels: context.getImageData(0, 0, image.naturalWidth, image.naturalHeight),
  })

  if (!generatedMesh.ok) {
    return generatedMesh
  }

  return {
    document: {
      format: PUPPET_DOCUMENT_FORMAT,
      motions: [],
      parts: [
        {
          id: createPartId(file.name),
          mesh: generatedMesh.mesh,
          texture: {height: image.naturalHeight, src: source, width: image.naturalWidth},
        },
      ],
      scene: {
        roots: [
          {
            id: createPartId(file.name),
            kind: 'part',
            locked: false,
            name: file.name.replace(PNG_FILE_PATTERN, ''),
            visible: true,
          },
        ],
      },
      version: PUPPET_DOCUMENT_VERSION,
      viewport: {height: image.naturalHeight, width: image.naturalWidth},
    },
    ok: true,
  }
}
