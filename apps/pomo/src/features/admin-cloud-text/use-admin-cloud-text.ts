import {createEffect, createResource, createSignal, onMount} from 'solid-js'
import {
  readAdminCloudTextUsers,
  resetAdminCloudTextUsage,
  updateAdminCloudTextLimit,
  type UpdateCloudTextLimitResult,
} from './api'
import {
  type AdminCloudTextQuery,
  adminCloudTextQuerySchema,
  type AdminCloudTextUser,
  type CloudTextLimitUpdate,
  cloudTextLimitUpdateSchema,
} from './contracts'

/** Owns paginated admin reads, persistent limits, and explicit usage resets. */
export const useAdminCloudText = () => {
  const [active, setActive] = createSignal(false)
  const [query, setQuery] = createSignal<AdminCloudTextQuery>({})
  const [users, setUsers] = createSignal<ReadonlyArray<AdminCloudTextUser>>([])
  const [nextCursor, setNextCursor] = createSignal<string | null>(null)
  const [savingUserId, setSavingUserId] = createSignal<string | null>(null)
  const [feedback, setFeedback] = createSignal<UpdateCloudTextLimitResult['kind'] | 'reset' | null>(
    null,
  )
  const [page] = createResource(() => (active() ? query() : false), readAdminCloudTextUsers)
  onMount(() => setActive(true))
  createEffect(() => {
    if (page.loading || page.error !== undefined) {
      return
    }
    const current = page()
    if (current === undefined) {
      return
    }
    const append = query().cursor !== undefined
    setUsers((previous) => (append ? [...previous, ...current.users] : current.users))
    setNextCursor(current.nextCursor)
  })
  const search = (userId: string): void => {
    const parsed = adminCloudTextQuerySchema.safeParse(
      userId.trim() === '' ? {} : {userId: userId.trim()},
    )
    if (!parsed.success) {
      setFeedback('invalid')
      return
    }
    setFeedback(null)
    setQuery(parsed.data)
  }
  const refresh = (): void => {
    const {userId} = query()
    setQuery(userId === undefined ? {} : {userId})
  }
  const loadMore = (): void => {
    const cursor = nextCursor()
    if (cursor !== null && !page.loading) {
      setQuery({...query(), cursor})
    }
  }
  const updateUser = async (
    userId: string,
    operation: () => Promise<UpdateCloudTextLimitResult>,
    success: 'updated' | 'reset',
  ): Promise<void> => {
    if (savingUserId() !== null || page.loading) {
      return
    }
    setSavingUserId(userId)
    setFeedback(null)
    try {
      const result = await operation()
      setFeedback(result.kind === 'updated' ? success : result.kind)
      if (result.kind === 'updated') {
        setUsers((previous) =>
          previous.map((user) => (user.id === result.user.id ? result.user : user)),
        )
      }
    } finally {
      setSavingUserId(null)
    }
  }
  const saveLimit = (options: CloudTextLimitUpdate & {readonly userId: string}): Promise<void> => {
    if (!cloudTextLimitUpdateSchema.safeParse(options).success) {
      setFeedback('invalid')
      return Promise.resolve()
    }
    return updateUser(options.userId, () => updateAdminCloudTextLimit(options), 'updated')
  }
  const resetUsage = (userId: string): Promise<void> =>
    updateUser(userId, () => resetAdminCloudTextUsage(userId), 'reset')
  return {
    feedback,
    hasMore: () => nextCursor() !== null,
    isLoading: () => !active() || page.loading,
    loadFailed: () => page.error !== undefined,
    loadMore,
    refresh,
    resetUsage,
    saveLimit,
    savingUserId,
    search,
    users,
  }
}
