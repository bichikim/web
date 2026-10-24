type ImportResult =
  | {readonly documentId: string; readonly success: true}
  | {readonly error: unknown; readonly success: false}

declare const importDocument: () => string

export const runImport = (): ImportResult => {
  try {
    return {documentId: importDocument(), success: true}
  } catch (error: unknown) {
    return {error, success: false}
  }
}
