import {
  type CodeLocation,
  type CodeSource,
  MAX_NAVIGATION_PREVIEW_LINES,
  MAX_REFERENCE_PREVIEW,
  type NavigationLocation,
} from '../shared/contracts'
import {readSource, resolveFile} from './file-access'

interface ReadReferencePreviewsProps {
  readonly root: string
  readonly locations: readonly CodeLocation[]
  readonly sources?: readonly CodeSource[]
}
/** Adds bounded source context, retaining destinations when a preview is unavailable. */
export const readReferencePreviews = (props: ReadReferencePreviewsProps): NavigationLocation[] => {
  const drafts = new Map(
    (props.sources ?? []).flatMap((source) => {
      const file = resolveFile(props.root, source.path)
      return file.ok ? [[file.value, source.source] as const] : []
    }),
  )
  const lines = new Map<string, readonly string[]>(
    [...new Set(props.locations.map((location) => location.path))].map((path) => {
      const file = resolveFile(props.root, path)
      if (!file.ok) {
        return [path, []] as const
      }
      const draft = drafts.get(file.value)
      if (draft !== undefined) {
        return [path, draft.split(/\r\n|\n|\r/u)] as const
      }
      const source = readSource(props.root, path)
      return [path, source.ok ? source.value.split(/\r\n|\n|\r/u) : []] as const
    }),
  )
  return props.locations.map((location) => {
    const source = lines.get(location.path)
    if (source?.[location.line - 1] === undefined) {
      return location
    }
    const preview = source
      .slice(location.line - 1, location.line - 1 + MAX_NAVIGATION_PREVIEW_LINES)
      .map((line) => line.trimEnd().slice(0, MAX_REFERENCE_PREVIEW))
      .join('\n')
      .trim()
    return {...location, preview}
  })
}
