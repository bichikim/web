declare const saveDraft: () => Promise<void>

type SaveResult = {readonly error: unknown; readonly ok: false} | {readonly ok: true}

export const saveDraftResult = async (): Promise<SaveResult> => {
  try {
    await saveDraft()
    return {ok: true}
  } catch (error: unknown) {
    return {error, ok: false}
  }
}
