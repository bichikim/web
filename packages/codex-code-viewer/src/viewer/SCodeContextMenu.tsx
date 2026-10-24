import {useTranslations} from './locale/use-translations'
import type {ContextMenuCloseOptions} from './types'
import {SContextMenu} from './SContextMenu'

interface SCodeContextMenuProps {
  x: number
  y: number
  onCopy?: () => void
  onShare?: () => void
  onFind?: () => void
  onClose?: (options?: ContextMenuCloseOptions) => void
}

export const SCodeContextMenu = (props: SCodeContextMenuProps) => {
  const t = useTranslations()
  return (
    <SContextMenu
      x={props.x}
      y={props.y}
      label={t('코드 작업')}
      items={[
        {key: 'c', label: t('코드 복사'), onSelect: props.onCopy},
        {label: t('채팅창에 추가'), onSelect: props.onShare},
        {key: 'f', label: t('파일 내 검색'), onSelect: props.onFind, shortcut: '⌘/Ctrl F'},
      ]}
      onClose={props.onClose}
    />
  )
}
