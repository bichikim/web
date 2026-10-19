import {createEffect, createResource, createSignal, onMount} from 'solid-js'
import {
  readAdminApiAiPage,
  saveAdminApiAiCatalog,
  type SaveApiAiRoutingResult,
  testAdminApiAiModel,
} from './api'
import {
  type AdminApiAiPage,
  type ApiAiModel,
  apiAiModelSchema,
  type ApiAiModelTestResult,
} from './contracts'

interface ModelTesting {
  readonly kind: 'testing'
}
export type ApiAiTestState = ModelTesting | ApiAiModelTestResult
export type ApiAiCatalogController = ReturnType<typeof useApiAiCatalog>
const modelKey = (entry: ApiAiModel): string => `${entry.providerId}:${entry.model}`

/** Owns provider model registrations and independent test results without editing execution order. */
export const useApiAiCatalog = () => {
  const [active, setActive] = createSignal(false)
  const [saved, setSaved] = createSignal<AdminApiAiPage | null>(null)
  const [providerId, setProviderId] = createSignal('')
  const [modelId, setModelId] = createSignal('')
  const [label, setLabel] = createSignal('')
  const [saving, setSaving] = createSignal(false)
  const [feedback, setFeedback] = createSignal<SaveApiAiRoutingResult['kind'] | null>(null)
  const [tests, setTests] = createSignal<Readonly<Record<string, ApiAiTestState>>>({})
  const [page, {refetch}] = createResource(active, readAdminApiAiPage)
  onMount(() => setActive(true))
  createEffect(() => {
    if (!page.loading && page.error === undefined) {
      const value = page()
      if (value !== undefined) {
        setSaved(value)
        setProviderId((previous) =>
          value.providers.some((provider) => provider.id === previous)
            ? previous
            : (value.providers[0]?.id ?? ''),
        )
      }
    }
  })
  const persist = async (operation: 'register' | 'remove', entry: ApiAiModel): Promise<void> => {
    const current = saved()
    if (current === null || saving() || page.loading || page.error !== undefined) {
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      const result = await saveAdminApiAiCatalog({
        entry: {label: entry.label, model: entry.model, providerId: entry.providerId},
        operation,
        revision: current.revision,
      })
      setFeedback(result.kind)
      if (result.kind === 'saved') {
        setSaved(result.page)
        if (operation === 'register') {
          setModelId('')
          setLabel('')
        }
      }
    } finally {
      setSaving(false)
    }
  }
  const register = async (): Promise<void> => {
    const parsed = apiAiModelSchema.safeParse({
      label: label(),
      model: modelId(),
      providerId: providerId(),
    })
    if (!parsed.success) {
      setFeedback('invalid')
      return
    }
    await persist('register', parsed.data)
  }
  const remove = (entry: ApiAiModel): Promise<void> => persist('remove', entry)
  const test = async (entry: ApiAiModel): Promise<void> => {
    const key = modelKey(entry)
    if (tests()[key]?.kind === 'testing' || saving() || page.loading || page.error !== undefined) {
      return
    }
    setTests((previous) => ({...previous, [key]: {kind: 'testing'}}))
    const result = await testAdminApiAiModel({model: entry.model, providerId: entry.providerId})
    setTests((previous) => ({...previous, [key]: result}))
  }
  const refresh = (): void => {
    if (!saving()) {
      setFeedback(null)
      refetch()
    }
  }
  return {
    feedback,
    isLoading: () => !active() || page.loading,
    label,
    loadFailed: () => page.error !== undefined,
    modelId,
    providerId,
    refresh,
    register,
    remove,
    saved,
    saving,
    setLabel,
    setModelId,
    setProviderId,
    test,
    testState: (entry: ApiAiModel) => tests()[modelKey(entry)],
  }
}
