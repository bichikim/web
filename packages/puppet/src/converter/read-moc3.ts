/* eslint-disable no-magic-numbers -- MOC3 stores fixed-width binary tables. */
/*! @license
Binary table layout adapted from https://github.com/vtubing/moc3.
Copyright © 2023 Chris Olstrom <chris@olstrom.com>
Cubism 5.3 table layout: https://github.com/SakuraMotion/PurismCore (MIT).
Copyright (c) 2026 Sakura Motion Project. <https://sakura2d.org/>
Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the “Software”), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify,
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to the following
conditions: The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

export interface Moc3Table {
  readonly ids: ReadonlyArray<string>
  readonly columns: Readonly<Record<string, ReadonlyArray<number>>>
}

export interface Moc3Model {
  readonly version: number
  readonly counts: Readonly<Record<string, number>>
  readonly tables: Readonly<Record<string, Moc3Table>>
  readonly canvas: {
    readonly height: number
    readonly width: number
    readonly pixelsPerUnit: number
    readonly originX: number
    readonly originY: number
    readonly reverseY: boolean
  }
}

const BASE_SECTIONS = [
  ['parts', '_runtime ids binding begin count visible enabled parentPart'],
  ['deformers', '_runtime ids binding visible enabled parentPart parentDeformer type source'],
  ['warpDeformers', 'binding begin count vertices rows columns'],
  ['rotationDeformers', 'binding begin count angle:f'],
  [
    'artMeshes',
    [
      '_runtime0 _runtime1 _runtime2 _runtime3 ids binding begin count visible enabled parentPart',
      'parentDeformer texture flags:b vertices uvBegin indexBegin indexCount maskBegin maskCount',
    ].join(' '),
  ],
  [
    'parameters',
    '_runtime ids maximum:f minimum:f default:f repeat decimals bindingBegin bindingCount',
  ],
  ['partKeyforms', 'order:f'],
  ['warpKeyforms', 'opacity:f positionBegin'],
  ['rotationKeyforms', 'opacity:f angle:f x:f y:f scale:f reflectX reflectY'],
  ['meshKeyforms', 'opacity:f order:f positionBegin'],
  ['positions', 'values:f'],
  ['bindingIndices', 'values'],
  ['keyformBindings', 'begin count'],
  ['parameterBindings', 'begin count'],
  ['keys', 'values:f'],
  ['uvs', 'values:f'],
  ['indices', 'values:s'],
  ['masks', 'values'],
  ['orderGroups', 'begin count total maximum minimum'],
  ['orderObjects', 'type index self'],
  ['glue', '_runtime ids binding begin count meshA meshB infoBegin infoCount'],
  ['glueInfo', 'weight:f vertex:s'],
  ['glueKeyforms', 'intensity:f'],
] as const

const COLOR_SECTIONS = [
  ['multiplyColors', 'red:f green:f blue:f'],
  ['screenColors', 'red:f green:f blue:f'],
  ['blendBindings', 'begin count base'],
  ['blendKeyforms', 'binding begin count constraintBegin constraintCount'],
  ['blendWarps', 'target begin count'],
  ['blendMeshes', 'target begin count'],
  ['constraintIndices', 'values'],
  ['constraints', 'parameter begin count'],
  ['constraintValues', 'key:f weight:f'],
] as const

const readHeader = (bytes: Uint8Array) => {
  if (
    bytes.length < 704 ||
    bytes[0] !== 77 ||
    bytes[1] !== 79 ||
    bytes[2] !== 67 ||
    bytes[3] !== 51
  ) {
    throw new Error('Invalid MOC3 header')
  }
  const version = bytes[4]!
  if (version < 1 || version > 6) {
    throw new Error(`Unsupported MOC3 version: ${version}`)
  }
  if (bytes[5] !== 0 && bytes[5] !== 1) {
    throw new Error('Invalid MOC3 byte order')
  }
  const littleEndian = bytes[5] === 0
  return {littleEndian, version}
}

const readCanvas = (view: DataView, canvasOffset: number, littleEndian: boolean) => {
  const canvas = {
    height: view.getFloat32(canvasOffset + 16, littleEndian),
    originX: view.getFloat32(canvasOffset + 4, littleEndian),
    originY: view.getFloat32(canvasOffset + 8, littleEndian),
    pixelsPerUnit: view.getFloat32(canvasOffset, littleEndian),
    reverseY: view.getUint8(canvasOffset + 20) === 1,
    width: view.getFloat32(canvasOffset + 12, littleEndian),
  }
  if (
    !Object.values(canvas).every((value) => typeof value === 'boolean' || Number.isFinite(value)) ||
    canvas.width <= 0 ||
    canvas.height <= 0 ||
    canvas.pixelsPerUnit <= 0
  ) {
    throw new Error('Invalid MOC3 canvas')
  }
  return canvas
}

const readSections = (
  version: number,
  counts: Readonly<Record<string, number>>,
  section: (name: string, fields: string, count: number) => void,
) => {
  BASE_SECTIONS.forEach(([name, fields]) => section(name, fields, counts[name]!))
  if (version >= 2) {
    section('warpDeformers', 'quad', counts.warpDeformers!)
  }
  if (version >= 4) {
    section('parameters', '_runtime keysBegin keysCount', counts.parameters!)
    section('warpDeformers', 'colorBegin', counts.warpDeformers!)
    section('rotationDeformers', 'colorBegin', counts.rotationDeformers!)
    section('artMeshes', 'colorBegin', counts.artMeshes!)
    section('multiplyColors', COLOR_SECTIONS[0][1], counts.multiplyColors!)
    section('screenColors', COLOR_SECTIONS[1][1], counts.screenColors!)
    section('parameters', 'type blendBegin blendCount', counts.parameters!)
    COLOR_SECTIONS.slice(2).forEach(([name, fields]) => section(name, fields, counts[name]!))
  }
  if (version >= 5) {
    section('warpKeyforms', 'multiplyBegin screenBegin', counts.warpKeyforms!)
    section('rotationKeyforms', 'multiplyBegin screenBegin', counts.rotationKeyforms!)
    section('meshKeyforms', 'multiplyBegin screenBegin', counts.meshKeyforms!)
    section('blendParts', 'target begin count', counts.blendParts!)
    section('blendRotations', 'target begin count', counts.blendRotations!)
    section('blendGlue', 'target begin count', counts.blendGlue!)
  }
  if (version >= 6) {
    section('parts', 'offscreen', counts.parts!)
    section('artMeshes', 'blend', counts.artMeshes!)
    section('offscreens', '_runtime owner flags:b blend maskBegin maskCount', counts.offscreens!)
    section('partKeyforms', 'offscreenBegin', counts.partKeyforms!)
    section('offscreenKeyforms', 'opacity:f multiplyBegin screenBegin', counts.offscreenKeyforms!)
    section('blendOffscreens', 'target begin count', counts.blendOffscreens!)
  }
}

/** Reads native MOC3 tables without running Cubism Core or mutating the source bytes. */
export const readMoc3 = (source: ArrayBuffer | Uint8Array): Moc3Model => {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source)
  const {version, littleEndian} = readHeader(bytes)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const bounds = (offset: number, count: number, width: number) => {
    if (
      !Number.isInteger(offset) ||
      !Number.isInteger(count) ||
      count < 0 ||
      offset < 0 ||
      offset + count * width > bytes.length
    ) {
      throw new Error(`MOC3 table exceeds file bounds: ${offset}, count ${count}`)
    }
  }
  const integer = (offset: number) => {
    bounds(offset, 1, 4)
    return view.getUint32(offset, littleEndian)
  }
  const countOffset = integer(64)
  const canvasOffset = integer(68)
  const counts: Record<string, number> = {}
  const tables: Record<string, Moc3Table> = {}
  const sections = [
    ...BASE_SECTIONS,
    ...(version >= 4 ? COLOR_SECTIONS : []),
    ...(version >= 5
      ? ([
          ['blendParts', 'target begin count'],
          ['blendRotations', 'target begin count'],
          ['blendGlue', 'target begin count'],
        ] as const)
      : []),
    ...(version >= 6
      ? ([
          ['offscreens', '_runtime owner flags:b blend maskBegin maskCount'],
          ['offscreenKeyforms', 'opacity:f multiplyBegin screenBegin'],
          ['blendOffscreens', 'target begin count'],
        ] as const)
      : []),
  ]
  sections.forEach(([name], index) => {
    const count = integer(countOffset + index * 4)
    bounds(0, count, 1)
    counts[name] = count
  })
  let cursor = 72
  const section = (name: string, fields: string, count: number) => {
    const previous = tables[name]
    const columns: Record<string, ReadonlyArray<number>> = {...previous?.columns}
    let ids = previous?.ids ?? []
    for (const descriptor of fields.split(' ')) {
      const offset = integer(cursor)
      cursor += 4
      const [field, type] = descriptor.split(':')
      if (!field!.startsWith('_')) {
        const width = field === 'ids' ? 64 : type === 'b' ? 1 : type === 's' ? 2 : 4
        bounds(offset, count, width)
        if (field === 'ids') {
          ids = Array.from({length: count}, (_, index) => {
            const value = bytes.subarray(offset + index * width, offset + (index + 1) * width)
            const end = value.indexOf(0)
            return new TextDecoder('utf-8', {fatal: true}).decode(
              end < 0 ? value : value.subarray(0, end),
            )
          })
        } else {
          columns[field!] = Array.from({length: count}, (_, index) => {
            const position = offset + index * width
            const value =
              type === 'f'
                ? view.getFloat32(position, littleEndian)
                : type === 'b'
                  ? view.getUint8(position)
                  : type === 's'
                    ? view.getUint16(position, littleEndian)
                    : view.getInt32(position, littleEndian)
            if (!Number.isFinite(value)) {
              throw new Error(`MOC3 ${name}.${field} contains a non-finite number`)
            }
            return value
          })
        }
      }
    }
    tables[name] = {columns, ids}
  }
  readSections(version, counts, section)
  bounds(canvasOffset, 1, 21)
  const canvas = readCanvas(view, canvasOffset, littleEndian)
  return {canvas, counts, tables, version}
}
