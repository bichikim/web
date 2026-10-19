import {COLUMN_PIXELS, ROW_PIXELS} from './graphics.js'
import {paneButton} from './pane-control.js'
import {imageView, zoomImage} from '../../../src/headless/image-camera.ts'
import {paneGeometry} from './pane-geometry.ts'
const IMAGE_WIDTH = 960
const IMAGE_HEIGHT = 720
const MAX_BASE64_LENGTH = 122880
const ZOOM_STEP = 1.25
const PERCENT_PRECISION = 1000
const TENTHS = 10
/** Embeds a supported raster data URI within the Desktop SVG document limit. */
export function imageSource(uri, frame) {
  if (
    typeof uri !== 'string' ||
    uri.length > MAX_BASE64_LENGTH ||
    !/^data:image\/(?:png|jpeg|gif|webp|avif|bmp|x-icon);base64,[a-z\d+/=]*$/iu.test(uri)
  ) {
    return undefined
  }
  const viewport = frame?.viewport ?? {height: IMAGE_HEIGHT, width: IMAGE_WIDTH}
  const placement = frame?.placement ?? {height: IMAGE_HEIGHT, width: IMAGE_WIDTH, x: 0, y: 0}
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewport.width} ${viewport.height}">` +
    `<image x="${placement.x}" y="${placement.y}" width="${placement.width}" ` +
    `height="${placement.height}" href="${uri}"/></svg>`
  )
}

/** Describes a raster camera using the original viewer's fit and zoom calculations. */
export function renderRaster(view, preview, controls = []) {
  if (preview.natural === undefined) {
    return [renderImage(view, preview.source, view.document.path)]
  }
  const {Box, Client, Input, Svg} = view.elements
  const viewport = {
    height: Math.max(1, view.rowCount - 2) * ROW_PIXELS,
    width: paneGeometry(view.bodyColumns, view.preferences).codeColumns * COLUMN_PIXELS,
  }
  const placement = imageView({camera: preview.camera, natural: preview.natural, viewport})
  const percent = Math.round(placement.scale * PERCENT_PRECISION) / TENTHS
  const command = {path: preview.path, revision: preview.revision, viewport}
  const button = (key, label, action, options) =>
    paneButton(view, {
      command: {...command, ...action},
      key,
      label,
      options: {document: true, ...options},
    })
  return [
    Box({
      children: [
        ...controls,
        button('image-fit', '화면에 맞춤', {kind: 'imageFit'}),
        button(
          'image-zoom-out',
          '이미지 축소',
          {kind: 'imageZoom', percent: percent / ZOOM_STEP},
          {columns: 4, icon: 'minus'},
        ),
        Box({
          children: [
            Input({
              key: 'image-percent',
              label: '%',
              onInput: (value) => view.send({...command, kind: 'imagePercent', value}),
              onSubmit: (value) =>
                view.send({...command, kind: 'imageZoom', percent: Number(value)}),
              value: preview.percentDraft ?? String(percent),
            }),
          ],
          flexShrink: 0,
          minWidth: 0,
          width: 8,
        }),
        button(
          'image-zoom-in',
          '이미지 확대',
          {kind: 'imageZoom', percent: percent * ZOOM_STEP},
          {columns: 4, icon: 'plus'},
        ),
      ],
      flexWrap: 'wrap',
    }),
    Box({
      children: [
        Box({
          children: [
            Svg({
              alt: view.document.path,
              height: viewport.height,
              source: imageSource(preview.uri, {placement, viewport}),
              width: viewport.width,
            }),
          ],
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }),
        Client({
          height: viewport.height / ROW_PIXELS,
          key: 'image-preview',
          module: './image-client.js',
          props: {...command, percent, rows: viewport.height / ROW_PIXELS},
          width: '100%',
        }),
      ],
      height: viewport.height / ROW_PIXELS,
      position: 'relative',
    }),
  ]
}

/** Applies explicit image zoom or fit without changing any source document. */
export function imageCommand(preview, command) {
  if (
    !['imageFit', 'imageZoom', 'imagePercent', 'imagePan'].includes(command.kind) ||
    preview?.natural === undefined ||
    preview.path !== command.path ||
    preview.revision !== command.revision ||
    !Number.isFinite(command.viewport?.width) ||
    !Number.isFinite(command.viewport?.height) ||
    command.viewport.width <= 0 ||
    command.viewport.height <= 0
  ) {
    return undefined
  }
  if (command.kind === 'imagePercent') {
    return {...preview, percentDraft: command.value}
  }
  const current = imageView({
    camera: preview.camera,
    natural: preview.natural,
    viewport: command.viewport,
  })
  if (command.kind === 'imagePan') {
    return Number.isFinite(command.delta?.x) && Number.isFinite(command.delta?.y)
      ? {
          ...preview,
          camera: {
            mode: 'zoom',
            scale: current.scale,
            x: current.x + command.delta.x,
            y: current.y + command.delta.y,
          },
        }
      : undefined
  }
  return {
    ...preview,
    camera:
      command.kind === 'imageFit'
        ? {mode: 'fit'}
        : Number.isFinite(command.percent)
          ? zoomImage({
              anchor: {x: command.viewport.width / 2, y: command.viewport.height / 2},
              current,
              percent: command.percent,
            })
          : preview.camera,
    percentDraft: undefined,
  }
}
/** Describes an image fitted inside the current document viewport. */
export function renderImage(view, source, alt) {
  return view.elements.Svg({
    alt,
    height: Math.min(IMAGE_HEIGHT, view.rowCount * ROW_PIXELS),
    source,
  })
}
