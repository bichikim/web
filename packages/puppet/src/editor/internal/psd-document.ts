import {encodePsdTexture} from './encode-psd-texture'
import {readPsdPixels} from './psd-pixels'
import {type Layer, type Psd} from 'ag-psd'
import {generateMesh} from '../../mesh'
import {
  PUPPET_DOCUMENT_FORMAT,
  PUPPET_DOCUMENT_VERSION,
  type PuppetPart,
  type PuppetPartBlendMode,
  type PuppetSceneNode,
} from '../../player/document'
import type {ImportPsdResult} from '../import-psd'
import {MAXIMUM_TEXTURE_PIXELS} from './texture-limits'

/** Photoshop layer blend modes (ag-psd names) that Puppet draws the same way. */
const PSD_BLEND_MODES: Readonly<Record<string, PuppetPartBlendMode>> = {
  color: 'color',
  'color burn': 'color-burn',
  'color dodge': 'color-dodge',
  darken: 'darken',
  difference: 'difference',
  exclusion: 'exclusion',
  'hard light': 'hard-light',
  hue: 'hue',
  lighten: 'lighten',
  'linear burn': 'linear-burn',
  'linear dodge': 'add',
  'linear light': 'linear-light',
  luminosity: 'luminosity',
  multiply: 'multiply',
  normal: 'normal',
  overlay: 'overlay',
  saturation: 'saturation',
  screen: 'screen',
  'soft light': 'soft-light',
}

const MAXIMUM_TOTAL_PIXELS = 134_217_728
const MAXIMUM_LAYERS = 1024
const MAXIMUM_DEPTH = 64

const withinBudget = (
  layers: ReadonlyArray<Layer>,
  budget = {layers: 0, pixels: 0},
  depth = 0,
): boolean => {
  if (depth > MAXIMUM_DEPTH) {
    return false
  }
  return layers.every((layer) => {
    budget.layers += 1
    const pixels =
      Math.max(0, (layer.right ?? 0) - (layer.left ?? 0)) *
      Math.max(0, (layer.bottom ?? 0) - (layer.top ?? 0))
    const {mask} = layer
    const maskPixels =
      Math.max(0, (mask?.right ?? 0) - (mask?.left ?? 0)) *
      Math.max(0, (mask?.bottom ?? 0) - (mask?.top ?? 0))
    budget.pixels += pixels + maskPixels
    return (
      pixels <= MAXIMUM_TEXTURE_PIXELS &&
      maskPixels <= MAXIMUM_TEXTURE_PIXELS &&
      budget.pixels <= MAXIMUM_TOTAL_PIXELS &&
      budget.layers <= MAXIMUM_LAYERS &&
      withinBudget(layer.children ?? [], budget, depth + 1)
    )
  })
}

interface ConversionContext {
  readonly parts: Array<PuppetPart>
  readonly warnings: Set<string>
  count: number
}
interface LayerContext {
  readonly path?: ReadonlyArray<string>
  readonly clippingBase?: ReadonlyArray<string>
  readonly opacity: number
  readonly masks: ReadonlyArray<Layer>
}
interface PartOptions {
  readonly path: ReadonlyArray<string>
  readonly layer: Layer
  readonly masks: ReadonlyArray<Layer>
  readonly context: ConversionContext
  readonly id: string
  readonly opacity: number
  readonly clippingBase?: ReadonlyArray<string>
}
const convertPart = async (options: PartOptions): Promise<PuppetPart | undefined> => {
  const {layer, masks, context, id, opacity, clippingBase} = options
  const pixels = readPsdPixels(layer, masks)
  if (pixels === undefined) {
    context.warnings.add('저장된 이미지가 없는 레이어는 제외했습니다.')
    return undefined
  }
  const mesh = generateMesh({alphaThreshold: 0, pixels})
  if (!mesh.ok) {
    context.warnings.add('비어 있거나 완전히 투명한 레이어는 제외했습니다.')
    return undefined
  }
  const mode = layer.blendMode ?? 'normal'
  const blendMode = PSD_BLEND_MODES[mode]
  if (blendMode === undefined) {
    context.warnings.add('지원하지 않는 블렌드 모드는 normal로 가져옵니다.')
  }
  if (clippingBase?.length === 0) {
    context.warnings.add('기준 이미지가 없는 클리핑 레이어는 숨겼습니다.')
  }
  return {
    id,
    mesh: {
      ...mesh.mesh,
      vertices: mesh.mesh.vertices.map(
        (value, index) => value + (index % 2 === 0 ? (layer.left ?? 0) : (layer.top ?? 0)),
      ),
    },
    properties: {
      blendMode: blendMode ?? 'normal',
      clippingMaskIds: clippingBase,
      opacity: clippingBase?.length === 0 ? 0 : opacity * (layer.fillOpacity ?? 1),
      renderWhenUsedAsMask: true,
    },
    psdSource: {
      height: pixels.height,
      layerId: layer.id,
      path: options.path,
      width: pixels.width,
      x: layer.left ?? 0,
      y: layer.top ?? 0,
    },
    texture: {
      height: pixels.height,
      src: await encodePsdTexture(pixels),
      width: pixels.width,
    },
  }
}

const warnLayer = (layer: Layer, warnings: Set<string>) => {
  if (
    layer.effects ||
    layer.adjustment ||
    layer.vectorMask ||
    layer.mask?.userMaskFeather ||
    layer.mask?.userMaskDensity !== undefined
  ) {
    warnings.add('레이어 효과·조정·벡터 마스크·마스크 농도/페더는 재현하지 않습니다.')
  }
}

const collectMaskParts = (nodes: ReadonlyArray<PuppetSceneNode>): Array<string> =>
  nodes.flatMap((node) =>
    node.visible === false
      ? []
      : node.kind === 'part'
        ? [node.id]
        : 'children' in node
          ? collectMaskParts(node.children)
          : [],
  )

const convertLayers = async (
  layers: ReadonlyArray<Layer>,
  context: ConversionContext,
  parent: LayerContext,
): Promise<Array<PuppetSceneNode>> => {
  const nodes: Array<PuppetSceneNode> = []
  let clippingBase: ReadonlyArray<string> = []
  // Preserve the back-to-front channel order returned by the PSD reader.
  for (const layer of layers) {
    context.count += 1
    const id = `psd-${context.count}`
    const name = layer.name?.trim() || `레이어 ${context.count}`
    const base = {id, locked: layer.protected?.composite === true, name, visible: !layer.hidden}
    const masks = [...parent.masks, layer]
    const opacity = parent.opacity * (layer.opacity ?? 1)
    const appliedMask = layer.clipping ? clippingBase : parent.clippingBase
    warnLayer(layer, context.warnings)
    if (layer.children === undefined) {
      // oxlint-disable-next-line no-await-in-loop -- Preserve clipping order and bound decoded layer memory.
      const part = await convertPart({
        clippingBase: appliedMask,
        context,
        id,
        layer,
        masks,
        opacity,
        path: [...(parent.path ?? []), name],
      })
      if (part !== undefined) {
        context.parts.push(part)
        nodes.push({...base, kind: 'part'})
      }
      if (!layer.clipping) {
        clippingBase = part === undefined ? [] : [part.id]
      }
    } else {
      if (
        opacity !== 1 ||
        (layer.blendMode && layer.blendMode !== 'pass through' && layer.blendMode !== 'normal')
      ) {
        context.warnings.add('그룹 합성은 파츠별 불투명도로 근사합니다.')
      }
      // oxlint-disable-next-line no-await-in-loop -- Following clipped layers depend on this group.
      const children = await convertLayers(layer.children, context, {
        clippingBase: appliedMask,
        masks,
        opacity,
        path: [...(parent.path ?? []), name],
      })
      nodes.push({
        ...base,
        children,
        kind: 'group',
      })
      if (!layer.clipping) {
        clippingBase = collectMaskParts(children)
      }
    }
  }
  return nodes
}

export const createPsdDocument = async (psd: Psd): Promise<ImportPsdResult> => {
  if (!withinBudget(psd.children ?? [])) {
    return {error: {code: 'too-large'}, ok: false}
  }
  const context: ConversionContext = {count: 0, parts: [], warnings: new Set()}
  const roots = await convertLayers(psd.children ?? [], context, {masks: [], opacity: 1})
  if (context.parts.length === 0) {
    return {error: {code: 'empty-document'}, ok: false}
  }
  return {
    document: {
      format: PUPPET_DOCUMENT_FORMAT,
      motions: [],
      parts: context.parts,
      scene: {roots},
      version: PUPPET_DOCUMENT_VERSION,
      viewport: {height: psd.height, width: psd.width},
    },
    ok: true,
    warnings: [...context.warnings],
  }
}
