import type {QwenFileProgress, QwenProgress} from './messages'

const MAXIMUM_PERCENTAGE = 100

interface FileLoadingProgress {
  readonly loaded: number
  readonly total: number
}

export interface CreateQwenProgressOptions {
  readonly files: Readonly<Record<string, FileLoadingProgress>>
  readonly loadedBytes: number
  readonly totalBytes: number
}

const calculatePercentage = (loadedBytes: number, totalBytes: number) =>
  totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * MAXIMUM_PERCENTAGE) : 0

export const createQwenProgress = (options: CreateQwenProgressOptions): QwenProgress => ({
  files: Object.entries(options.files).map<QwenFileProgress>(([fileName, {loaded, total}]) => ({
    fileName,
    loadedBytes: loaded,
    percentage: calculatePercentage(loaded, total),
    totalBytes: total,
  })),
  loadedBytes: options.loadedBytes,
  percentage: calculatePercentage(options.loadedBytes, options.totalBytes),
  totalBytes: options.totalBytes,
})
