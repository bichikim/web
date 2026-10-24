import {renderRaster} from './pane-image.js'
import {paneButton} from './pane-control.js'

/** Loads one revision-checked PDF page without modifying project files. */
export async function openPdf(request, document, page = 1) {
  const result = await request('code.pdfPreview', {
    page,
    path: document.path,
    revision: document.revision,
  })
  return {
    ...result,
    camera: document.camera ?? {mode: 'fit'},
    natural: {height: result.height, width: result.width},
  }
}
/** Describes PDF page navigation alongside the shared fit and zoom controls. */
export function renderPdf(view, preview) {
  const {Box, Input, Text} = view.elements
  const command = {path: preview.path, revision: preview.revision}
  const page = (key, label, value) =>
    paneButton(view, {command: {...command, kind: 'pdfPage', value}, key, label})
  return renderRaster(view, preview, [
    ...(preview.page > 1 ? [page('pdf-previous', '이전', preview.page - 1)] : []),
    Box({
      children: [
        Input({
          key: 'pdf-page',
          label: view.t('페이지'),
          onSubmit: (value) => view.send({...command, kind: 'pdfPage', value: Number(value)}),
          value: String(preview.page),
        }),
      ],
      flexShrink: 0,
      minWidth: 0,
      width: 8,
    }),
    Text({children: [`/ ${preview.pages}`]}),
    ...(preview.page < preview.pages ? [page('pdf-next', '다음', preview.page + 1)] : []),
  ])
}
