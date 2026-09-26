import {expect, test} from 'vitest'
import {createDemoDocument, parseDocument, serializeDocument} from '../../../player'
import {addGlue} from '../glue'
import {applyPsdReimport, createPsdReimportPlan} from '../psd-reimport'

const source = () => {
  const document = addGlue(
    createDemoDocument(),
    {partId: 'mesh-preview', vertexIndex: 0},
    {partId: 'shape-diamond', vertexIndex: 0},
  )!
  return {
    ...document,
    parts: document.parts.map((part, index) => ({
      ...part,
      psdSource: {
        height: part.texture.height,
        layerId: index + 10,
        path: [part.id],
        width: part.texture.width,
        x: 0,
        y: 0,
      },
    })),
  }
}

test('should update textures while retaining geometry, keyforms, Glue and the scene', () => {
  const document = source()
  const incoming = {
    ...document,
    parts: document.parts.map((part) => ({
      ...part,
      texture: {...part.texture, src: 'updated.png'},
    })),
  }
  const plan = createPsdReimportPlan(document, incoming)
  expect(plan.rows.every((row) => row.kind === 'update')).toBe(true)
  const result = applyPsdReimport(plan)
  expect(result.parts[0]!.texture.src).toBe('updated.png')
  expect(result.parts[0]!.mesh.vertices).toBe(document.parts[0]!.mesh.vertices)
  expect(result.parameterBindings).toBe(document.parameterBindings)
  expect(result.motions).toBe(document.motions)
  expect(result.glue).toBe(document.glue)
  expect(result.scene!.roots).toEqual(document.scene!.roots)
  expect(parseDocument(serializeDocument(result)).ok).toBe(true)
})

test('should remap UVs for expanded images without moving the mesh', () => {
  const document = source()
  const incoming = {
    ...document,
    parts: document.parts.map((part) => ({
      ...part,
      psdSource: {...part.psdSource, width: part.texture.width * 2},
      texture: {...part.texture, width: part.texture.width * 2},
    })),
  }
  const result = applyPsdReimport(createPsdReimportPlan(document, incoming))
  expect(result.parts[0]!.mesh.uvs[2]).toBe(document.parts[0]!.mesh.uvs[2]! / 2)
  expect(result.parts[0]!.mesh.vertices).toBe(document.parts[0]!.mesh.vertices)
})

test('should retain cropped, missing and ambiguous layers instead of overwriting their rig', () => {
  const document = source()
  const first = document.parts[0]!
  const incoming = {...document, parts: [{...first, psdSource: {...first.psdSource, width: 1}}]}
  const plan = createPsdReimportPlan(document, incoming)
  expect(plan.rows.map((row) => row.kind)).toEqual(['conflict', 'keep', 'keep'])
  expect(applyPsdReimport(plan).parts).toEqual(document.parts)
  const duplicate = createPsdReimportPlan(document, {
    ...document,
    parts: [first, {...first, id: 'duplicate'}],
  })
  expect(duplicate.rows.filter((row) => row.kind === 'conflict')).toHaveLength(2)
})

test('should append selected new layers with collision-free ids and mapped clipping', () => {
  const document = source()
  const fresh = {
    ...document.parts[0]!,
    properties: {clippingMaskIds: [document.parts[1]!.id]},
    psdSource: {...document.parts[0]!.psdSource, layerId: 999, path: ['new']},
  }
  const incoming = {
    ...document,
    parts: [fresh, document.parts[1]!],
    scene: {
      roots: [
        {id: fresh.id, kind: 'part' as const, locked: false, name: 'new', visible: true},
        {
          id: document.parts[1]!.id,
          kind: 'part' as const,
          locked: false,
          name: 'existing',
          visible: true,
        },
      ],
    },
  }
  const plan = createPsdReimportPlan(document, incoming)
  const withoutAdditions = {...plan, rows: plan.rows.filter((row) => row.kind !== 'add')}
  expect(applyPsdReimport(withoutAdditions).parts).toHaveLength(3)
  const selected = {
    ...plan,
    rows: plan.rows.filter((row) => row.kind === 'add' || row.kind === 'update'),
  }
  const result = applyPsdReimport(selected)
  expect(parseDocument(serializeDocument(result)).ok).toBe(true)
  expect(result.parts).toHaveLength(4)
  expect(result.parts[3]!.id).not.toBe(fresh.id)
  expect(result.parts[3]!.properties!.clippingMaskIds).toEqual([document.parts[1]!.id])
})

test('should reject additions with unresolved transitive clipping targets', () => {
  const document = source()
  const first = document.parts[0]!
  const makePart = (id: string, mask: string) => ({
    ...first,
    id,
    properties: {clippingMaskIds: [mask]},
    psdSource: {...first.psdSource, layerId: undefined, path: [id]},
  })
  const plan = createPsdReimportPlan(document, {
    ...document,
    parts: [makePart('dependent', 'base'), makePart('base', 'missing')],
  })
  expect(plan.rows.filter((row) => row.kind === 'add')).toHaveLength(0)
  expect(plan.rows.filter((row) => row.kind === 'conflict')).toHaveLength(2)
})

test('should reject invalid PSD provenance while round tripping valid provenance', () => {
  const document = source()
  expect(parseDocument(serializeDocument(document)).ok).toBe(true)
  for (const change of [{width: 0}, {path: []}, {x: Infinity}, {layerId: -1}]) {
    const invalid = {
      ...document,
      parts: document.parts.map((part) => ({...part, psdSource: {...part.psdSource, ...change}})),
    }
    expect(parseDocument(serializeDocument(invalid)).ok).toBe(false)
  }
})

test('should scope updates and missing-layer deletion to the selected PSD source', () => {
  const document = source()
  const parts = document.parts.map((part, index) => ({
    ...part,
    psdSource: {
      ...part.psdSource,
      documentId: index === 0 ? 'a.psd' : 'b.psd',
      fileName: index === 0 ? 'a.psd' : 'b.psd',
    },
  }))
  const incoming = {
    ...document,
    parts: [{...parts[0]!, texture: {...parts[0]!.texture, src: 'changed.png'}}],
  }
  const plan = createPsdReimportPlan({...document, parts}, incoming)
  expect(plan.rows).toHaveLength(1)
  expect(plan.rows[0]!.kind).toBe('update')
})

test('should require a source choice for duplicate file names and preserve it after adding layers', () => {
  const original = source()
  const document = {
    ...original,
    parts: original.parts.map((part, index) => ({
      ...part,
      psdSource: {
        ...part.psdSource,
        documentId: index === 0 ? 'copy-a' : 'copy-b',
        fileName: 'model.psd',
      },
    })),
  }
  const first = document.parts[0]!
  const incoming = {
    ...document,
    parts: [
      {...first, psdSource: {...first.psdSource, documentId: 'model.psd'}},
      {
        ...first,
        id: 'new-part',
        psdSource: {...first.psdSource, documentId: 'model.psd', layerId: 99, path: ['new']},
      },
    ],
    scene: {
      roots: [
        {id: first.id, kind: 'part' as const, locked: false, name: 'first', visible: true},
        {id: 'new-part', kind: 'part' as const, locked: false, name: 'new', visible: true},
      ],
    },
  }
  const undecided = createPsdReimportPlan(document, incoming)
  expect(undecided.sourceId).toBeUndefined()
  expect(undecided.rows).toEqual([])
  const plan = createPsdReimportPlan(document, incoming, 'copy-a')
  const selected = {
    ...plan,
    rows: plan.rows.filter((row) => row.kind === 'add' || row.kind === 'update'),
  }
  const result = applyPsdReimport(selected)
  expect(result.parts[0]!.psdSource!.documentId).toBe('copy-a')
  expect(result.parts[3]!.psdSource!.documentId).toBe('copy-a')
  expect(result.parts[1]).toBe(document.parts[1])
  expect(
    createPsdReimportPlan(result, incoming, 'copy-a').rows.every((row) => row.kind === 'update'),
  ).toBe(true)
})
