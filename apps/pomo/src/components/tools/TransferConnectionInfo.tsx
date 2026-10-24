// oxlint-disable no-magic-numbers -- QR quiet-zone geometry uses fixed values.
import {createMemo, createSignal, Show} from 'solid-js'
import * as m from '@paraglide/message'
import qrcode from 'qrcode-generator'
import {copyToolResult} from 'src/features/tools'
import {PButton} from '../p-button/PButton'

const qrGeometry = (url: string) => {
  const code = qrcode(0, 'M')
  code.addData(url)
  code.make()
  const size = code.getModuleCount()
  const path = Array.from({length: size}, (_, row) =>
    Array.from({length: size}, (_, column) =>
      code.isDark(row, column) ? `M${column + 4} ${row + 4}h1v1h-1z` : '',
    ).join(''),
  ).join('')
  return {path, viewBox: `0 0 ${size + 8} ${size + 8}`}
}

export interface TransferConnectionInfoProps {
  readonly waiting?: boolean
  readonly onApprove?: () => void
  readonly url: string
  readonly connected?: boolean
  readonly connecting?: boolean
}

const handleAddressFocus = (event: FocusEvent & {currentTarget: HTMLInputElement}) =>
  event.currentTarget.select()

export const TransferConnectionInfo = (props: TransferConnectionInfoProps) => {
  const [copyResult, setCopyResult] = createSignal<{readonly success: boolean} | null>(null)
  const qr = createMemo(() => qrGeometry(props.url))

  const handleCopy = () => {
    copyToolResult(props.url)
      .then((success) => setCopyResult({success}))
      .catch(() => setCopyResult({success: false}))
  }
  const handleFeedbackEnd = () => setCopyResult(null)
  return (
    <div class="grid min-w-0 gap-4">
      <svg
        aria-label={m.transfer_qr()}
        class="size-48 max-w-full justify-self-center rounded-control bg-white"
        role="img"
        viewBox={qr().viewBox}
      >
        <rect width="100%" height="100%" class="fill-white" />
        <path d={qr().path} class="fill-black" />
      </svg>
      <div class="flex min-w-0 items-center gap-1 rounded-control border border-border bg-surface-overlay p-1">
        <input
          aria-label={m.transfer_copy()}
          class={
            'h-control-sm min-w-0 w-full flex-1 rounded-control border-0 bg-transparent px-2 ' +
            'text-xs text-muted-foreground outline-none focus-visible:shadow-focus'
          }
          readOnly
          value={props.url}
          onFocus={handleAddressFocus}
        />
        <PButton
          size="small"
          class="min-w-28 shrink-0"
          icon={copyResult()?.success ? 'i-tabler-check' : 'i-tabler-copy'}
          onPress={handleCopy}
        >
          <span aria-live="polite">
            <Show when={copyResult()} keyed fallback={m.transfer_copy()}>
              {(result) => (
                <span class="animate-feedback-hold" onAnimationEnd={handleFeedbackEnd}>
                  {result.success ? m.tools_copied() : m.tools_copy_failed()}
                </span>
              )}
            </Show>
          </span>
        </PButton>
      </div>
      <Show when={props.connected}>
        <p class="m-0 text-center text-xs leading-5 text-muted-foreground">
          {m.transfer_invite_used()}
        </p>
      </Show>
      <Show when={props.waiting}>
        <p
          role="status"
          class="mb-0 mt-0 border-t border-border pt-3 text-center text-xs leading-5 text-muted-foreground"
        >
          {m.transfer_waiting()}
        </p>
      </Show>
      <Show when={props.onApprove || props.connecting}>
        <div class="flex justify-center" aria-busy={props.connecting}>
          <PButton
            disabled={props.connecting}
            icon={props.connecting ? 'i-tabler-loader-2' : undefined}
            iconClass="size-5 animate-spin motion-reduce:animate-none"
            onPress={props.onApprove}
          >
            <span aria-live="polite">
              {props.connecting ? m.transfer_joining() : m.transfer_approve()}
            </span>
          </PButton>
        </div>
      </Show>
    </div>
  )
}
