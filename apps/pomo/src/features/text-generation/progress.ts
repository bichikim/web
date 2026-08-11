const MAXIMUM_PERCENTAGE = 100

export interface FileLoadingProgress {
  readonly loaded: number
  readonly total: number
}

export interface TextGenerationFileProgress {
  readonly fileName: string
  readonly loadedBytes: number
  readonly percentage: number
  readonly totalBytes: number
}

export interface TextGenerationProgress {
  readonly files: ReadonlyArray<TextGenerationFileProgress>
  readonly loadedBytes: number
  readonly percentage: number
  readonly totalBytes: number
}

export interface CreateTextGenerationProgressOptions {
  readonly files: Readonly<Record<string, FileLoadingProgress>>
  readonly loadedBytes: number
  readonly totalBytes: number
}

const calculatePercentage = (loadedBytes: number, totalBytes: number) =>
  totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * MAXIMUM_PERCENTAGE) : 0

export const createTextGenerationProgress = (
  options: CreateTextGenerationProgressOptions,
): TextGenerationProgress => ({
  files: Object.entries(options.files).map<TextGenerationFileProgress>(
    ([fileName, {loaded, total}]) => ({
      fileName,
      loadedBytes: loaded,
      percentage: calculatePercentage(loaded, total),
      totalBytes: total,
    }),
  ),
  loadedBytes: options.loadedBytes,
  percentage: calculatePercentage(options.loadedBytes, options.totalBytes),
  totalBytes: options.totalBytes,
})
