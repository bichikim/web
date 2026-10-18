import {cx} from 'class-variance-authority'
import {createEffect, createSignal, type JSX} from 'solid-js'
import * as m from '@paraglide/message'
import {
  type AdminCloudTextUser,
  type CloudTextLimitUpdate,
  MAXIMUM_CLOUD_TEXT_DAILY_LIMIT,
} from 'src/features/admin-cloud-text'

interface PAdminCloudTextUserRowProps {
  readonly disabled?: boolean
  readonly onSave: (options: CloudTextLimitUpdate & {readonly userId: string}) => Promise<void>
  readonly onReset: (userId: string) => Promise<void>
  readonly user: AdminCloudTextUser
}

const ACTION_CLASSES = cx(
  'flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-1 text-xs text-white/75 outline-none',
  'hover:text-#f3d1a9 focus-visible:ring-2 focus-visible:ring-#e8bc88 disabled:opacity-35',
)

export const PAdminCloudTextUserRow = (props: PAdminCloudTextUserRowProps) => {
  const [limit, setLimit] = createSignal('')
  const [unlimited, setUnlimited] = createSignal(false)
  createEffect(() => {
    const current = props.user.usage.limit
    setUnlimited(current === null)
    setLimit(current === null ? '' : String(current))
  })
  const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (event) => {
    event.preventDefault()
    props.onSave({dailyLimit: unlimited() ? 'unlimited' : Number(limit()), userId: props.user.id})
  }
  const handleRestore = () => props.onSave({dailyLimit: null, userId: props.user.id})
  const handleReset = () => props.onReset(props.user.id)
  return (
    <tr
      class={cx(
        'grid grid-cols-2 items-center gap-x-4 gap-y-5 rounded-3 border border-white/10 bg-white/3 p-5',
        'md:grid-cols-[minmax(0,1fr)_5rem_9rem] 2xl:table-row 2xl:rounded-0',
        '2xl:border-x-0 2xl:border-t-0 2xl:bg-transparent 2xl:p-0 2xl:last:border-b-0',
      )}
    >
      <th
        class="col-span-2 block text-left font-500 md:col-span-1 2xl:table-cell 2xl:px-5 2xl:py-5 2xl:align-middle"
        scope="row"
      >
        <code class="block break-all text-xs leading-5 text-white/90 2xl:whitespace-nowrap 2xl:text-[11px]">
          {props.user.id}
        </code>
        <span
          class={cx(
            'mt-1.5 inline-flex items-center rounded-1 bg-white/6 px-1.5 py-0.5',
            'text-[11px] leading-4 text-white/70',
          )}
        >
          {props.user.providers
            .map((provider) => (provider === 'neon' ? 'Email' : 'Toss'))
            .join(' · ') || '—'}
        </span>
      </th>
      <td class="block 2xl:table-cell 2xl:px-4 2xl:py-5 2xl:text-center 2xl:align-middle">
        <span class="mb-1 block text-xs text-white/65 2xl:hidden">{m.admin_cloud_used()}</span>
        <span class="text-lg font-650 tabular-nums 2xl:text-sm">{props.user.usage.used}</span>
      </td>
      <td class="block 2xl:table-cell 2xl:px-4 2xl:py-5 2xl:text-center 2xl:align-middle">
        <span class="mb-1 block text-xs text-white/65 2xl:hidden">{m.admin_cloud_remaining()}</span>
        <span class="text-lg font-650 tabular-nums text-#f3d1a9 2xl:text-sm">
          {props.user.usage.remaining ?? m.admin_cloud_unlimited()}
        </span>
      </td>
      <td class="col-span-2 block 2xl:table-cell 2xl:px-4 2xl:py-5 2xl:align-middle">
        <span class="mb-2 block text-xs text-white/65 2xl:hidden">
          {m.admin_cloud_daily_limit()}
        </span>
        <form class="flex items-center gap-3" onSubmit={handleSubmit}>
          <input
            aria-label={m.admin_cloud_limit_input({userId: props.user.id})}
            class={cx(
              'h-9 w-18 shrink-0 rounded-2 border border-white/40 bg-#211d19 px-2.5',
              'text-sm tabular-nums text-white outline-none focus-visible:border-#e8bc88',
              'focus-visible:ring-2 focus-visible:ring-#e8bc88/25 disabled:opacity-40',
            )}
            disabled={props.disabled || unlimited()}
            max={MAXIMUM_CLOUD_TEXT_DAILY_LIMIT}
            min={0}
            onInput={(event) => setLimit(event.currentTarget.value)}
            required={!unlimited()}
            step={1}
            type="number"
            value={limit()}
          />
          <label class="flex cursor-pointer items-center gap-2 whitespace-nowrap text-xs text-white/85">
            <input
              class="m-0 h-4 w-4 accent-#e8bc88 disabled:cursor-default"
              checked={unlimited()}
              disabled={props.disabled}
              onChange={(event) => setUnlimited(event.currentTarget.checked)}
              type="checkbox"
            />
            {m.admin_cloud_unlimited()}
          </label>
          <button
            class={cx(
              'h-9 shrink-0 rounded-2 bg-#e8bc88 px-4 text-xs font-700 text-#15120f outline-none',
              'hover:bg-#f3d1a9 focus-visible:ring-2 focus-visible:ring-#e8bc88',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-#15120f disabled:opacity-40',
            )}
            disabled={props.disabled}
            type="submit"
          >
            {m.admin_cloud_save()}
          </button>
        </form>
      </td>
      <td
        class={cx(
          'col-span-2 block border-t border-white/8 pt-3 md:col-span-1 md:border-t-0 md:pt-0',
          '2xl:table-cell 2xl:px-4 2xl:py-5 2xl:align-middle',
        )}
      >
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 md:flex-col md:items-start md:gap-1">
          <button
            class={ACTION_CLASSES}
            disabled={props.disabled || props.user.usage.used === 0}
            onClick={handleReset}
            type="button"
          >
            <span aria-hidden="true" class="i-tabler-rotate-clockwise h-3.5 w-3.5" />
            {m.admin_cloud_reset_usage()}
          </button>
          <button
            class={ACTION_CLASSES}
            disabled={props.disabled || props.user.dailyLimitOverride === null}
            onClick={handleRestore}
            type="button"
          >
            <span aria-hidden="true" class="i-tabler-arrow-back-up h-3.5 w-3.5" />
            {m.admin_cloud_restore()}
          </button>
        </div>
      </td>
    </tr>
  )
}
