import {imageCommand, imageSource, renderRaster} from './pane-image.js'
import {imageSize} from './image-size.js'
import {changeOffice, openOffice, renderOffice} from './pane-office.js'
import {openPdf, renderPdf} from './pane-pdf.js'
const MAX_IMAGE_BYTES = 92160
const MAX_BASE64_LENGTH = 122880
const MAX_PDF_PREVIEWS = 4
const mimeTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/x-icon',
])
let preview
const cameras = new Map()
const pdfPreviews = new Map()
function rememberPdf() {
  if (preview?.kind === 'pdf') {
    const key = `${preview.path}:${preview.revision}`
    pdfPreviews.delete(key)
    pdfPreviews.set(key, preview)
    if (pdfPreviews.size > MAX_PDF_PREVIEWS) {
      pdfPreviews.delete(pdfPreviews.keys().next().value)
    }
  }
}
/** Loads revision-checked image bytes inside the Desktop SVG document limit. */
export async function openMedia(request, document) {
  preview = undefined
  if (['pdf', 'word', 'spreadsheet', 'image'].includes(document.media?.kind)) {
    preview = {path: document.path, revision: document.revision, status: 'loading'}
  }
  try {
    const loaded = await loadMedia(request, document)
    if (!loaded) {
      preview = undefined
    }
    return loaded
  } catch (error) {
    preview = {
      message: '미리보기를 불러오지 못했습니다.',
      path: document.path,
      revision: document.revision,
    }
    throw error
  }
}
async function loadMedia(request, document) {
  const identity = {path: document.path, revision: document.revision}
  if (document.media?.kind === 'pdf') {
    preview = pdfPreviews.get(`${identity.path}:${identity.revision}`) ?? {
      ...identity,
      ...(await openPdf(request, document)),
    }
    rememberPdf()
    return true
  }
  if (['word', 'spreadsheet'].includes(document.media?.kind)) {
    preview = {...identity, ...(await openOffice(request, document))}
    return true
  }
  if (document.media?.kind !== 'image' || !mimeTypes.has(document.media.mimeType)) {
    return false
  }
  if (document.media.size > MAX_IMAGE_BYTES) {
    preview = {...identity, message: '이미지 크기가 Pane 표시 한도를 초과했습니다.'}
    return true
  }
  const chunk = await request('code.media', {
    offset: 0,
    path: document.path,
    revision: document.revision,
  })
  if (
    chunk.next !== document.media.size ||
    typeof chunk.data !== 'string' ||
    !/^[a-z\d+/=]*$/iu.test(chunk.data) ||
    chunk.data.length > MAX_BASE64_LENGTH
  ) {
    throw new Error('이미지 데이터를 읽을 수 없습니다.')
  }
  const uri = `data:${document.media.mimeType};base64,${chunk.data}`
  preview = {
    ...identity,
    camera: cameras.get(`${identity.path}:${identity.revision}`) ?? {mode: 'fit'},
    natural: imageSize(uri),
    source: imageSource(uri),
    uri,
  }
  return true
}
/** Captures the image associated with this file and revision. */
export function mediaView(document) {
  return {
    mediaPreview:
      preview?.path === document?.path && preview?.revision === document?.revision
        ? preview
        : undefined,
  }
}

/** Describes a bounded image or the reason it cannot be presented here. */
export function renderMedia(view) {
  const {Text} = view.elements
  if (view.mediaPreview.kind === 'pdf') {
    return renderPdf(view, view.mediaPreview)
  }
  if (view.mediaPreview.kind !== undefined) {
    return renderOffice(view, view.mediaPreview)
  }
  return view.mediaPreview.message === undefined
    ? renderRaster(view, view.mediaPreview)
    : [Text({children: [view.t(view.mediaPreview.message)]})]
}
export async function changeMedia(command, request) {
  if (command.kind === 'pdfPage') {
    if (
      preview?.kind === 'pdf' &&
      preview.path === command.path &&
      preview.revision === command.revision &&
      Number.isInteger(command.value) &&
      command.value >= 1 &&
      command.value <= preview.pages
    ) {
      const current = preview
      const result = await openPdf(request, current, command.value)
      if (preview === current) {
        preview = {...current, ...result}
        rememberPdf()
      }
    }
    return true
  }
  const next = imageCommand(preview, command)
  if (next !== undefined) {
    preview = next
    cameras.set(`${preview.path}:${preview.revision}`, preview.camera)
    rememberPdf()
    return true
  }
  return changeOffice(command)
}
