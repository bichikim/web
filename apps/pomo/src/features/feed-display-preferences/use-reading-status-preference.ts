import {usePreference} from 'src/hooks/use-preference'

/** Shares the persisted feed progress visibility preference across mounted consumers. */
export const useReadingStatusPreference = () => {
  const [visible, setVisible] = usePreference({
    defaultValue: true,
    key: 'pomo:feed-reading-status-visible:v1',
    parse: (value) => (typeof value === 'boolean' ? value : null),
  })
  return {
    onVisibleChange: setVisible,
    visible,
  }
}
