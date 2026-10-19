import {imageSource, renderImage} from './pane-image.js'
import {openSpreadsheet} from './pane-table.js'
import {renderTable} from './pane-table-view.js'
import {wordImages, wordMarkdown} from './word-markdown.js'
const BLOCKS_PER_PAGE = 8
const MAX_PAGE_CHARS = 30000
let pages = []
let page = 0
const wordPages = (nodes) =>
  Array.from({length: Math.ceil(nodes.length / BLOCKS_PER_PAGE)}, (_, index) => {
    const blocks = nodes.slice(index * BLOCKS_PER_PAGE, (index + 1) * BLOCKS_PER_PAGE)
    const source = wordMarkdown(blocks)
    const textPages = Array.from(
      {length: Math.max(1, Math.ceil(source.length / MAX_PAGE_CHARS))},
      (_, offset) => ({
        images: [],
        text: source.slice(offset * MAX_PAGE_CHARS, (offset + 1) * MAX_PAGE_CHARS),
      }),
    )
    return [...textPages, ...wordImages(blocks).map((image) => ({images: [image], text: ''}))]
  }).flat()
/** Loads Office data through the revision-checked workspace reader. */
export async function openOffice(request, current) {
  const result = await request('code.documentPreview', {
    path: current.path,
    revision: current.revision,
  })
  const {document} = result
  pages = []
  if (result.kind === 'word' && document.ok) {
    pages = wordPages(document.nodes)
  }
  page = 0
  if (result.kind === 'spreadsheet' && document.ok) {
    openSpreadsheet(document)
  }
  return result
}
/** Changes only the native Word document page. */
export function changeOffice(command) {
  if (command.kind !== 'officePage' || pages.length === 0) {
    return false
  }
  page = Math.max(0, Math.min(pages.length - 1, page + command.delta))
  return true
}
/** Describes worksheet controls or native formatted Word blocks and embedded images. */
export function renderOffice(view, preview) {
  const {Button, Box, Markdown, Select, Text} = view.elements
  if (!preview.document.ok) {
    return [Text({children: [preview.document.message]})]
  }
  if (preview.kind === 'spreadsheet') {
    return [
      Select({
        key: 'table-sheet',
        label: view.t('시트'),
        onSelect: (value) => view.send({kind: 'tableSheet', value}),
        options: view.tableSheets.map((label, index) => ({label, value: String(index)})),
        value: String(view.tableSheet),
      }),
      ...renderTable(view),
    ]
  }
  const current = pages[page] ?? {images: [], text: ''}
  const count = Math.max(1, pages.length)
  const button = (key, label, delta) =>
    Button({key, label: view.t(label), onPress: () => view.send({delta, kind: 'officePage'})})
  return [
    Markdown({text: current.text}),
    ...current.images.map((node) => {
      const source = imageSource(node.src)
      return source === undefined
        ? Text({children: [node.alt]})
        : renderImage(view, source, node.alt)
    }),
    ...(count > 1
      ? [
          Box({
            children: [
              ...(page > 0 ? [button('office-previous', '이전', -1)] : []),
              Text({children: [`${page + 1}/${count}`]}),
              ...(page + 1 < count ? [button('office-next', '다음', 1)] : []),
            ],
            flexWrap: 'wrap',
          }),
        ]
      : []),
  ]
}
