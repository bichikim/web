import {createResource, ErrorBoundary, Show, Suspense} from 'solid-js'
import {parseSpreadsheet} from './parse-spreadsheet'
import {parseWordDocument} from './parse-word-document'
import {SSpreadsheetDocument} from './SSpreadsheetDocument'
import {SWordDocument} from './SWordDocument'

interface SOfficeDocumentProps {
  blob: Pick<Blob, 'arrayBuffer'>
  kind: 'word' | 'spreadsheet'
}
export const SOfficeDocument = (props: SOfficeDocumentProps) => {
  const [document] = createResource(
    () => ({blob: props.blob, kind: props.kind}),
    async ({blob, kind}) => {
      const bytes = await blob.arrayBuffer()
      return kind === 'word' ? parseWordDocument(bytes) : parseSpreadsheet(bytes)
    },
  )
  return (
    <ErrorBoundary
      fallback={
        <p role="status" class="m-0 p-4 text-sm text-muted">
          문서를 불러오지 못했습니다.
        </p>
      }
    >
      <Suspense
        fallback={
          <p role="status" class="m-0 p-4 text-sm text-muted">
            문서 해석 중…
          </p>
        }
      >
        <Show when={document()} keyed>
          {(result) =>
            result.ok ? (
              'nodes' in result ? (
                <SWordDocument nodes={result.nodes} warnings={result.warnings} />
              ) : (
                <SSpreadsheetDocument sheets={result.sheets} />
              )
            ) : (
              <p role="status" class="m-0 p-4 text-sm text-muted">
                {result.message}
              </p>
            )
          }
        </Show>
      </Suspense>
    </ErrorBoundary>
  )
}
