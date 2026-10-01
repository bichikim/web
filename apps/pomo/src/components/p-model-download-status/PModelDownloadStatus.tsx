import {createMemo, For, Show} from 'solid-js'

import {type ModelDownloadTarget, useModelDownload} from '../../features/model-download'
import {PModelDownloadStatusItem} from './PModelDownloadStatusItem'

const getTargetKey = (target: ModelDownloadTarget) => `${target.kind}:${target.modelId}`

export const PModelDownloadStatus = () => {
  const download = useModelDownload()
  const targetKeys = createMemo(() => download.downloads().map((item) => getTargetKey(item.target)))
  const handleItem = (key: string) => (
    <PModelDownloadStatusItem
      item={download.downloads().find((item) => getTargetKey(item.target) === key)}
      onCancel={download.cancel}
      onDismissError={download.dismissError}
    />
  )

  return (
    <Show when={targetKeys().length > 0}>
      <div class="grid max-h-64 gap-2 overflow-y-auto" aria-label="모델 다운로드 목록">
        <For each={targetKeys()}>{handleItem}</For>
      </div>
    </Show>
  )
}
