import type {AiJobStorage, StoredAiTextJob} from './storage'

export const createAiJobSession = (storage: AiJobStorage) => {
  let revision = 0
  let disposed = false
  const begin = () => {
    revision += 1
    return revision
  }
  const isCurrent = (candidate: number) => !disposed && candidate === revision
  const dispose = () => {
    disposed = true
    revision += 1
  }
  const persist = (job: StoredAiTextJob) => {
    try {
      storage.write(job)
    } catch (error: unknown) {
      console.error('Failed to persist the AI job recovery record.', error)
    }
  }
  return {
    begin,
    dispose,
    isCurrent,
    isDisposed: () => disposed,
    persist,
    restore: () => storage.read(),
  }
}
export type AiJobSession = ReturnType<typeof createAiJobSession>
