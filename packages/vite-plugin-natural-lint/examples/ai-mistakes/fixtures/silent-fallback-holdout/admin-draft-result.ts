type DraftReadResult =
  | {readonly data: string | null; readonly success: true}
  | {readonly error: unknown; readonly success: false}

declare const readStoredDraft: () => string | null

export const readDraft = (): DraftReadResult => {
  try {
    return {data: readStoredDraft(), success: true}
  } catch (error: unknown) {
    return {error, success: false}
  }
}
