import type {Element} from '@xmldom/xmldom'
import {child, elementChildren, field, getSources, guid, resolve} from './cmo3-xml'

interface DrawableSource {
  readonly id: string
  readonly source: Element
}

/** 같은 그리기 순서에서는 파츠 트리의 자식 목록을 뒤에서부터 그린다. 디포머 계층과는 독립적이다. */
export const readCmo3PaintOrder = (
  model: Element,
  references: ReadonlyMap<string, Element>,
  meshes: ReadonlyArray<DrawableSource>,
): ReadonlyArray<string> => {
  const groups = getSources(model, 'CPartSourceSet', references)
  const groupByGuid = new Map(
    groups.map((source) => [guid(field(source, 'CPartGuid', 'guid'), references), source]),
  )
  const meshByGuid = new Map(
    meshes.map(({id, source}) => [guid(field(source, 'CDrawableGuid', 'guid'), references), id]),
  )
  const visited = new Set<string>()
  const output = new Set<string>()
  const visit = (identifier: string | undefined) => {
    if (identifier === undefined) {
      return
    }
    const mesh = meshByGuid.get(identifier)
    if (mesh !== undefined) {
      output.add(mesh)
      return
    }
    const group = groupByGuid.get(identifier)
    if (group === undefined || visited.has(identifier)) {
      return
    }
    visited.add(identifier)
    const children = resolve(child(group, 'carray_list', '_childGuids'), references)
    for (const entry of [...(children === undefined ? [] : elementChildren(children))].reverse()) {
      visit(guid(entry, references))
    }
  }
  for (const group of groups) {
    if (guid(field(group, 'CPartGuid', 'parentGuid'), references) === undefined) {
      visit(guid(field(group, 'CPartGuid', 'guid'), references))
    }
  }
  for (const mesh of [...meshes].reverse()) {
    output.add(mesh.id)
  }
  return [...output]
}
