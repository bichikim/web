import {DropdownMenu} from '@kobalte/core/dropdown-menu'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {type Accessor, type JSX} from 'solid-js'

const accountMenuMetadataButtonClass = cx(
  ':uno: flex w-full cursor-pointer items-center rounded-2 border-0 outline-none',
  'bg-transparent px-3 py-2.5 text-left text-3.5 font-600 text-#101114',
  'ui-highlighted:bg-black/5 ui-disabled:cursor-wait ui-disabled:opacity-60',
)

const accountMenuDeleteLinkClass = cx(
  ':uno: flex items-center rounded-2 px-3 py-2.5 text-3.5 font-600 outline-none',
  'text-#d13b3b no-underline ui-highlighted:bg-#d13b3b/8',
)

const accountMenuSignOutButtonClass = cx(
  ':uno: flex w-full cursor-pointer items-center rounded-2 border-0 outline-none',
  'bg-transparent px-3 py-2.5 text-left text-3.5 font-600 text-#101114',
  'ui-highlighted:bg-black/5',
)

const accountMenuTriggerClass = cx(
  ':uno: inline-flex h-9 max-w-68 items-center gap-2 rounded-full border border-black/8',
  'bg-white/75 px-3 text-3.5 font-700 text-#101114 shadow-[0_8px_20px_rgba(17,18,22,0.08)]',
  'backdrop-blur outline-none transition-colors ui-expanded:bg-white focus-visible:ring-2',
  'focus-visible:ring-#111216/18',
)

const accountMenuContentClass = cx(
  ':uno: z-50 min-w-58 rounded-3 bg-white p-1.5 text-left',
  'shadow-[0_18px_44px_rgba(17,18,22,0.18)] ring-1 ring-black/8',
)

interface AccountMenuPanelProps {
  isUpdatingMetadata: boolean
  onSignOut: () => Promise<void>
  onUpdateUserMetadata: () => Promise<void>
}

const AccountMenuPanel = (props: AccountMenuPanelProps) => {
  return (
    <>
      <DropdownMenu.Item
        class={accountMenuMetadataButtonClass}
        disabled={props.isUpdatingMetadata}
        onSelect={() => {
          props.onUpdateUserMetadata().catch(() => undefined)
        }}
      >
        {props.isUpdatingMetadata ? 'Updating...' : 'Update user metadata'}
      </DropdownMenu.Item>
      <DropdownMenu.Item as={A} href="/auth/delete-account" class={accountMenuDeleteLinkClass}>
        Delete account
      </DropdownMenu.Item>
      <DropdownMenu.Separator class=":uno: my-1 h-px bg-black/8" />
      <DropdownMenu.Item
        class={accountMenuSignOutButtonClass}
        onSelect={() => {
          props.onSignOut().catch(() => undefined)
        }}
      >
        Sign out
      </DropdownMenu.Item>
    </>
  )
}

export interface AccountMenuProps {
  isUpdatingMetadata: boolean
  onSignOut: () => Promise<void>
  onUpdateUserMetadata: () => Promise<void>
  signedInEmail: Accessor<string>
}

export const AccountMenu = (props: AccountMenuProps): JSX.Element => {
  return (
    <DropdownMenu placement="bottom-end" gutter={8}>
      <DropdownMenu.Trigger class={accountMenuTriggerClass}>
        <span class=":uno: max-w-52 truncate">{props.signedInEmail()}</span>
        <DropdownMenu.Icon
          class={cx(
            ':uno: inline-flex h-4 w-4 items-center justify-center transition-transform',
            'ui-expanded:rotate-180',
          )}
        >
          <span class=":uno: h-4 w-4 i-tabler:chevron-down" aria-hidden="true" />
        </DropdownMenu.Icon>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class={accountMenuContentClass}>
          <AccountMenuPanel
            isUpdatingMetadata={props.isUpdatingMetadata}
            onSignOut={props.onSignOut}
            onUpdateUserMetadata={props.onUpdateUserMetadata}
          />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  )
}
