import type {JSX} from 'solid-js'

interface PStatusProps {
  /** 생략하면 메시지만 표시하며, 제공하면 메시지 뒤에 후속 동작을 표시한다. */
  readonly children?: JSX.Element
  /** 호출부에서 선택한 안내 문구. */
  readonly message: string
  /** 생략하면 역할을 지정하지 않으며, 즉시 알려야 하는 오류에는 alert를 지정한다. */
  readonly role?: 'alert'
}

export const PStatus = (props: PStatusProps) => (
  <div
    class="grid min-h-32 place-items-center rounded-control border border-dashed
      border-border p-5 text-center"
    role={props.role}
  >
    <div>
      <span
        aria-hidden="true"
        class="i-tabler-music-off mx-auto mb-2 block size-6 text-highlight"
      />
      <p class="m-0 text-sm font-650">{props.message}</p>
      {props.children}
    </div>
  </div>
)
