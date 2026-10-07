import {type Stats, statSync} from 'node:fs'
import {failure, type Result, success} from '../shared/contracts'
import {fileFormat} from '../shared/file-formats'
import {resolveFile} from './file-access'

const MAX_MEDIA_BYTES = 134217728

export const mediaRevision = (stats: Stats): string =>
  `${stats.dev}:${stats.ino}:${stats.size}:${stats.mtimeMs}:${stats.ctimeMs}`

interface MediaInfo {
  readonly path: string
  readonly revision: string
  readonly media: {kind: 'image' | 'video' | 'audio' | 'pdf'; mimeType: string; size: number}
}
export const readMediaInfo = (root: string, path: string): Result<MediaInfo> => {
  const resolved = resolveFile(root, path)
  if (!resolved.ok) {
    return resolved
  }
  const format = fileFormat(resolved.value)
  if (format === undefined || !('mimeType' in format)) {
    return failure('unsupported-file')
  }
  try {
    const stats = statSync(resolved.value)
    if (!stats.isFile()) {
      return failure('unsupported-file')
    }
    if (stats.size > MAX_MEDIA_BYTES) {
      return failure('media-too-large')
    }
    return success({
      media: {...format, size: stats.size},
      path: resolved.value,
      revision: mediaRevision(stats),
    })
  } catch {
    return failure('read-failed')
  }
}
