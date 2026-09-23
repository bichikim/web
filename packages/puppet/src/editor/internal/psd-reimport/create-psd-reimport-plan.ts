import type {
  PuppetDocument,
  PuppetPart,
  PuppetPsdSource,
  PuppetSceneNode,
} from '../../../player/document'
import {getPsdSourceSelection} from './get-psd-source-selection'
import type {PsdReimportPlan, PsdReimportRow} from './types'
import {getDocumentScene} from '../../../player/scene'
import {isSceneNodeLocked} from '../scene-graph'

const SOURCE_COORDINATE_TOLERANCE = 0.0001

const scenePaths = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  path: ReadonlyArray<string> = [],
): Array<readonly [string, ReadonlyArray<string>]> =>
  nodes.flatMap((node) =>
    node.kind === 'part'
      ? [[node.id, [...path, node.name]] as const]
      : scenePaths(node.children, [...path, node.name]),
  )

const inferSource = (
  part: PuppetPart,
  path: ReadonlyArray<string>,
): PuppetPsdSource | undefined => {
  if (part.psdSource !== undefined) {
    return part.psdSource
  }
  const {vertices, uvs} = part.mesh
  const {width, height} = part.texture
  const x = vertices[0]! - uvs[0]! * width
  const y = vertices[1]! - uvs[1]! * height
  const matches = vertices.every(
    (value, index) =>
      Math.abs(value - (index % 2 === 0 ? x + uvs[index]! * width : y + uvs[index]! * height)) <
      SOURCE_COORDINATE_TOLERANCE,
  )
  return matches ? {height, path, width, x, y} : undefined
}

const replaceTexture = (
  part: PuppetPart,
  incoming: PuppetPart,
  path: ReadonlyArray<string>,
): PuppetPart | undefined => {
  const previous = inferSource(part, path)
  const next = incoming.psdSource
  if (previous === undefined || next === undefined) {
    return undefined
  }
  const uvs = part.mesh.uvs.map((uv, index) =>
    index % 2 === 0
      ? (previous.x + uv * previous.width - next.x) / next.width
      : (previous.y + uv * previous.height - next.y) / next.height,
  )
  if (uvs.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
    return undefined
  }
  return {
    ...part,
    mesh: {...part.mesh, uvs},
    psdSource: {
      ...next,
      documentId: part.psdSource?.documentId ?? next.documentId,
      fileName: part.psdSource?.fileName ?? next.fileName,
    },
    texture: incoming.texture,
  }
}

const describeUpdate = (
  document: PuppetDocument,
  target: PuppetPart,
  part: PuppetPart,
  path: ReadonlyArray<string>,
): PsdReimportRow => {
  const source = part.psdSource
  const name = source?.path.join(' / ') ?? part.id
  const updated = replaceTexture(target, part, path)
  const locked = isSceneNodeLocked(document, target.id)
  if (updated === undefined || locked) {
    return {
      detail: locked
        ? '잠긴 레이어는 갱신하지 않습니다.'
        : '이미지 범위가 기존 메시를 덮지 않거나 원본 위치를 확인할 수 없습니다.',
      id: target.id,
      kind: 'conflict',
      name,
    }
  }
  const old = inferSource(target, path)!
  const moved =
    old.x !== source?.x ||
    old.y !== source?.y ||
    old.width !== source?.width ||
    old.height !== source?.height
  return {
    detail: moved
      ? '크기·위치 변경 · 메시 위치를 유지하며 이미지 좌표 갱신'
      : '그림 갱신 · 기존 리깅 유지',
    id: target.id,
    incomingId: part.id,
    kind: 'update',
    name,
    part: updated,
  }
}

const resolveAdditions = (
  rows: ReadonlyArray<PsdReimportRow>,
  mapping: ReadonlyMap<string, string>,
): ReadonlyArray<PsdReimportRow> => {
  const additions = new Set(rows.flatMap((row) => (row.kind === 'add' ? [row.part.id] : [])))
  let removed = true
  while (removed) {
    removed = false
    for (const row of rows) {
      if (
        row.kind === 'add' &&
        additions.has(row.part.id) &&
        row.part.properties?.clippingMaskIds?.some((id) => !mapping.has(id) && !additions.has(id))
      ) {
        additions.delete(row.part.id)
        removed = true
      }
    }
  }
  return rows.map((row) =>
    row.kind === 'add' && !additions.has(row.part.id)
      ? {
          detail: '클리핑 기준 레이어를 대응할 수 없어 추가하지 않습니다.',
          id: row.id,
          kind: 'conflict' as const,
          name: row.name,
        }
      : row,
  )
}

export const createPsdReimportPlan = (
  document: PuppetDocument,
  incoming: PuppetDocument,
  selectedSource?: string,
): PsdReimportPlan => {
  const paths = new Map(scenePaths(getDocumentScene(document).roots))
  const {sources, sourceId, candidates} = getPsdSourceSelection(document, incoming, selectedSource)
  if (sources.length > 1 && sourceId === undefined) {
    return {
      document,
      incoming,
      mapping: new Map(),
      rows: [],
      sourceId,
      sources,
      viewportChanged: false,
    }
  }
  const matches = new Map(
    incoming.parts.map((part) => {
      const source = part.psdSource
      const byId =
        source?.layerId === undefined
          ? []
          : candidates.filter((candidate) => candidate.psdSource?.layerId === source.layerId)
      const byPath = candidates.filter(
        (candidate) =>
          JSON.stringify(candidate.psdSource?.path ?? paths.get(candidate.id)) ===
          JSON.stringify(source?.path),
      )
      return [part.id, byId.length > 0 ? byId : byPath] as const
    }),
  )
  const rows: Array<PsdReimportRow> = []
  const claimed = new Set<string>()
  for (const part of incoming.parts) {
    const source = part.psdSource
    const name = source?.path.join(' / ') ?? part.id
    const targets = matches.get(part.id) ?? []
    const target = targets[0]
    if (targets.length === 0) {
      rows.push({
        detail: '새 레이어 · 선택하면 추가',
        id: `new:${part.id}`,
        kind: 'add',
        name,
        part,
      })
    } else if (
      targets.length !== 1 ||
      [...matches.values()].filter((values) => values.some((value) => value.id === target?.id))
        .length !== 1
    ) {
      targets.forEach((target) => claimed.add(target.id))
      rows.push({
        detail: '같은 식별자 또는 경로가 중복되어 대응할 수 없습니다.',
        id: `conflict:${part.id}`,
        kind: 'conflict',
        name,
      })
    } else if (target !== undefined) {
      claimed.add(target.id)
      rows.push(describeUpdate(document, target, part, paths.get(target.id) ?? [target.id]))
    }
  }
  for (const part of candidates) {
    if (!claimed.has(part.id)) {
      rows.push({
        detail: '원본에서 찾을 수 없음 · 기존 레이어 유지',
        id: `keep:${part.id}`,
        kind: 'keep',
        name: (part.psdSource?.path ?? paths.get(part.id) ?? [part.id]).join(' / '),
        removablePartId: isSceneNodeLocked(document, part.id) ? undefined : part.id,
      })
    }
  }
  const mapping = new Map(
    [...matches].flatMap(([id, targets]) =>
      targets.length === 1 &&
      [...matches.values()].filter((values) => values.some((value) => value.id === targets[0]!.id))
        .length === 1
        ? [[id, targets[0]!.id] as const]
        : [],
    ),
  )
  const resolvedRows = resolveAdditions(rows, mapping)
  return {
    document,
    incoming,
    mapping,
    rows: resolvedRows,
    sourceId,
    sources,
    viewportChanged:
      document.viewport.width !== incoming.viewport.width ||
      document.viewport.height !== incoming.viewport.height,
  }
}
