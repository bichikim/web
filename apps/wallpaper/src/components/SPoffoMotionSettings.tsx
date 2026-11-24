import {text as uiText} from '../features/localization'
import {createMemo} from 'solid-js'
import {SSelect} from './SSelect'

interface SPoffoMotionSettingsProps {
  readonly motions?: readonly string[]
  readonly value?: string | null
  readonly onChange?: (motionId: string | null | undefined) => void | Promise<void>
}
export const SPoffoMotionSettings = (props: SPoffoMotionSettingsProps) => {
  const value = () => {
    const motion = props.value
    return motion === undefined ? 'auto' : motion === null ? 'off' : `motion:${motion}`
  }
  const options = createMemo(() => {
    const motions = props.motions ?? []
    const saved = props.value
    const missing =
      typeof saved === 'string' && !motions.includes(saved)
        ? [
            {
              get label() {
                return uiText('{value0} (사용 불가)', {value0: String(saved)})
              },
              value: `motion:${saved}`,
            },
          ]
        : []
    return [
      {
        get label() {
          return motions[0] === undefined
            ? uiText('자동')
            : uiText('자동 · {value0}', {value0: String(motions[0])})
        },
        value: 'auto',
      },
      {
        get label() {
          return uiText('재생 안 함')
        },
        value: 'off',
      },
      ...motions.map((id) => ({label: id, value: `motion:${id}`})),
      ...missing,
    ]
  })
  const handleChange = (value: string) => {
    if (value === 'auto') {
      return props.onChange?.(undefined)
    }
    if (value === 'off') {
      return props.onChange?.(null)
    }
    return props.onChange?.(value.slice('motion:'.length))
  }
  return (
    <div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 text-[13px]">
      <span class="whitespace-nowrap">{uiText('기본 애니메이션')}</span>
      <SSelect
        label={uiText('기본 애니메이션')}
        value={value()}
        options={options()}
        disabled={props.onChange === undefined}
        onChange={handleChange}
      />
    </div>
  )
}
