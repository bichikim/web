import type {PlayerCanvasStatus} from '../PlayerCanvas'

const STATUS_LABEL: Readonly<Record<PlayerCanvasStatus, string>> = {
  error: '플레이어 오류',
  loading: '데이터 적용 중',
  ready: '배포 데이터 재생 중',
}

export interface EditorToolbarProps {
  readonly playerStatus: PlayerCanvasStatus
  readonly onExport: () => void
  readonly onJsonImport: (file: File | undefined) => void
  readonly onPngImport: (file: File | undefined) => void
}

export const EditorToolbar = (props: EditorToolbarProps) => (
  <header class="toolbar">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">
        P
      </span>
      <div>
        <strong>Puppet</strong>
        <span>2D mesh editor</span>
      </div>
    </div>
    <div class="toolbar-actions">
      <label class="toolbar-button primary">
        PNG 불러오기
        <input
          accept="image/png,.png"
          type="file"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            props.onPngImport(file)
          }}
        />
      </label>
      <label class="toolbar-button">
        JSON 가져오기
        <input
          accept="application/json,.json"
          type="file"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            props.onJsonImport(file)
          }}
        />
      </label>
      <button class="toolbar-button primary" type="button" onClick={() => props.onExport()}>
        JSON 내보내기
      </button>
      <div class="renderer-status" data-status={props.playerStatus}>
        <span class="status-dot" aria-hidden="true" />
        {STATUS_LABEL[props.playerStatus]}
      </div>
    </div>
  </header>
)
