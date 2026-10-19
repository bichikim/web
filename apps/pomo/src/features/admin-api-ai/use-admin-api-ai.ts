import {createEffect, createResource, createSignal, onMount} from 'solid-js'
import {readAdminApiAiPage, saveAdminApiAiRouting, type SaveApiAiRoutingResult} from './api'
import {
  type AdminApiAiPage,
  type ApiAiRoute,
  apiAiRoutingUpdateSchema,
  MAXIMUM_API_AI_ROUTES,
} from './contracts'

export type AdminApiAiController = ReturnType<typeof useAdminApiAi>

/** Owns the saved model order, editable draft and revision-aware save state. */
export const useAdminApiAi = () => {
  const [active, setActive] = createSignal(false)
  const [saved, setSaved] = createSignal<AdminApiAiPage | null>(null)
  const [routes, setRoutes] = createSignal<ReadonlyArray<ApiAiRoute>>([])
  const [saving, setSaving] = createSignal(false)
  const [feedback, setFeedback] = createSignal<SaveApiAiRoutingResult['kind'] | null>(null)
  const [page, {refetch}] = createResource(active, readAdminApiAiPage)
  const applyPage = (value: AdminApiAiPage): void => {
    setSaved(value)
    setRoutes(value.routes)
  }
  onMount(() => setActive(true))
  createEffect(() => {
    if (!page.loading && page.error === undefined) {
      const value = page()
      if (value !== undefined) {
        applyPage(value)
      }
    }
  })
  const replaceRoute = (index: number, route: ApiAiRoute): void => {
    setRoutes((previous) => previous.map((value, position) => (position === index ? route : value)))
    setFeedback(null)
  }
  const changeProvider = (index: number, providerId: string): void => {
    const model = saved()?.catalog.find((value) => value.providerId === providerId)?.model ?? ''
    replaceRoute(index, {model, providerId})
  }
  const moveRoute = (index: number, offset: -1 | 1): void => {
    const target = index + offset
    setRoutes((previous) =>
      target < 0 || target >= previous.length
        ? previous
        : previous.map((value, position) => {
            if (position === index) {
              return previous[target]
            }
            if (position === target) {
              return previous[index]
            }
            return value
          }),
    )
    setFeedback(null)
  }
  const addRoute = (): void => {
    const current = routes()
    const candidates = (saved()?.catalog ?? []).filter((entry) =>
      saved()?.providers.some((provider) => provider.id === entry.providerId),
    )
    const [first] = candidates
    if (first === undefined || current.length >= MAXIMUM_API_AI_ROUTES) {
      return
    }
    const unused = candidates.find(
      (candidate) =>
        !current.some(
          (route) => route.providerId === candidate.providerId && route.model === candidate.model,
        ),
    )
    setRoutes([
      ...current,
      unused === undefined
        ? {model: '', providerId: first.providerId}
        : {model: unused.model, providerId: unused.providerId},
    ])
    setFeedback(null)
  }
  const removeRoute = (index: number): void => {
    if (routes().length > 1) {
      setRoutes((previous) => previous.filter((_value, position) => position !== index))
      setFeedback(null)
    }
  }
  const refresh = (): void => {
    if (!saving()) {
      setFeedback(null)
      refetch()
    }
  }
  const save = async (): Promise<void> => {
    const current = saved()
    if (current === null || saving() || page.loading || page.error !== undefined) {
      return
    }
    const parsed = apiAiRoutingUpdateSchema.safeParse({
      revision: current.revision,
      routes: routes(),
    })
    if (!parsed.success) {
      setFeedback('invalid')
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      const result = await saveAdminApiAiRouting(parsed.data)
      setFeedback(result.kind)
      if (result.kind === 'saved') {
        applyPage(result.page)
      }
    } finally {
      setSaving(false)
    }
  }
  return {
    addRoute,
    changeProvider,
    feedback,
    isLoading: () => !active() || page.loading,
    loadFailed: () => page.error !== undefined,
    moveRoute,
    refresh,
    removeRoute,
    replaceRoute,
    routes,
    save,
    saved,
    saving,
  }
}
