import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {type Accessor, type JSX} from 'solid-js'
import {
  HSelectItem,
  HSelectRoot,
  HSelectSeparator,
  SSelectList,
  SSelectTrigger,
  useSelectMenuContext,
} from 'src/components/select-menu'

const accountMenuMetadataButtonClass = cx(
  ':uno: flex w-full cursor-pointer items-center rounded-2 border-0',
  'bg-transparent px-3 py-2.5 text-left text-3.5 font-600 text-#101114',
  'hover:bg-black/5 disabled:cursor-wait disabled:opacity-60',
)

const accountMenuDeleteLinkClass = cx(
  ':uno: flex items-center rounded-2 px-3 py-2.5 text-3.5 font-600',
  'text-#d13b3b no-underline hover:bg-#d13b3b/8',
)

const accountMenuSignOutButtonClass = cx(
  ':uno: flex w-full cursor-pointer items-center rounded-2 border-0',
  'bg-transparent px-3 py-2.5 text-left text-3.5 font-600 text-#101114',
  'hover:bg-black/5',
)

interface AccountMenuPanelProps {
  isUpdatingMetadata: boolean
  onHide: () => void
  onSignOut: () => Promise<void>
  onUpdateUserMetadata: () => Promise<void>
}

const AccountMenuPanel = (props: AccountMenuPanelProps) => {
  return (
    <>
      <HSelectItem
        class={accountMenuMetadataButtonClass}
        disabled={props.isUpdatingMetadata}
        onSelect={() => {
          props.onUpdateUserMetadata().catch(() => undefined)
        }}
      >
        {props.isUpdatingMetadata ? 'Updating...' : 'Update user metadata'}
      </HSelectItem>
      <A
        href="/auth/delete-account"
        role="menuitem"
        class={accountMenuDeleteLinkClass}
        onClick={() => props.onHide()}
      >
        Delete account
      </A>
      <HSelectSeparator class=":uno: my-1 h-px bg-black/8" />
      <HSelectItem
        class={accountMenuSignOutButtonClass}
        onSelect={() => {
          props.onSignOut().catch(() => undefined)
        }}
      >
        Sign out
      </HSelectItem>
    </>
  )
}

interface AccountMenuChevronProps {
  isOpen: Accessor<boolean>
}

const AccountMenuChevron = (props: AccountMenuChevronProps) => {
  return (
    <span
      class={`:uno: h-4 w-4 ${props.isOpen() ? 'i-tabler:chevron-up' : 'i-tabler:chevron-down'}`}
      aria-hidden="true"
    />
  )
}

export interface AccountMenuProps {
  isUpdatingMetadata: boolean
  onSignOut: () => Promise<void>
  onUpdateUserMetadata: () => Promise<void>
  signedInEmail: Accessor<string>
}

const AccountMenuBody = (props: AccountMenuProps): JSX.Element => {
  const {controller} = useSelectMenuContext()

  return (
    <>
      <SSelectTrigger>
        <span class=":uno: max-w-52 truncate">{props.signedInEmail()}</span>
        <AccountMenuChevron isOpen={controller.isOpen} />
      </SSelectTrigger>
      <SSelectList>
        <AccountMenuPanel
          isUpdatingMetadata={props.isUpdatingMetadata}
          onHide={controller.onHide}
          onSignOut={props.onSignOut}
          onUpdateUserMetadata={props.onUpdateUserMetadata}
        />
      </SSelectList>
    </>
  )
}

export const AccountMenu = (props: AccountMenuProps): JSX.Element => {
  return (
    <HSelectRoot>
      <AccountMenuBody {...props} />
    </HSelectRoot>
  )
}
