import {cva} from 'class-variance-authority'
import {SPlayerButton, SPlayerButtonProps} from './SPlayerButton'
import {createEffect, mergeProps, splitProps} from 'solid-js'

export interface SRepeatButtonProps extends SPlayerButtonProps {
  hasManyItems?: boolean
  onChangeRepeat?: (value: RepeatType) => void
  repeat?: RepeatType
}

export type RepeatType = 'no' | 'all' | 'one'

const iconStyle = cva('block text-8', {
  variants: {
    repeat: {
      all: 'i-hugeicons:repeat',
      no: 'i-hugeicons:arrow-right-03',
      one: 'i-hugeicons:repeat-one-01',
    },
  },
})

export const SRepeatButton = (props: SRepeatButtonProps) => {
  const defaultProps = mergeProps({repeat: 'no' as const}, props)
  const [innerProps, restProps] = splitProps(defaultProps, [
    'onClick',
    'onChangeRepeat',
    'repeat',
    'hasManyItems',
  ])
  const repeatLoopOrder: RepeatType[] = ['no', 'one', 'all']

  const handelChangeRepeat = () => {
    // console.log('??')
    if (!innerProps.hasManyItems) {
      const current = innerProps.repeat || 'no'
      if (current === 'no') {
        innerProps.onChangeRepeat?.('one')
        return
      }
      // console.log('no')
      innerProps.onChangeRepeat?.('no')
      return
    }

    const current = innerProps.repeat || 'no'
    const index = repeatLoopOrder.indexOf(current) + 1
    const next = repeatLoopOrder[index % repeatLoopOrder.length]
    innerProps.onChangeRepeat?.(next ?? 'no')
  }

  const fixRepeat = (hasManyItems: boolean | undefined) => {
    if (!hasManyItems && innerProps.repeat === 'all') {
      // console.log('???')
      innerProps.onChangeRepeat?.('one')
    }
  }

  createEffect(() => {
    fixRepeat(innerProps.hasManyItems)
  })

  return (
    <SPlayerButton
      {...restProps}
      onClick={handelChangeRepeat}
      title={`repeat ${innerProps.repeat}`}
    >
      <span class={iconStyle({repeat: innerProps.repeat})} />
    </SPlayerButton>
  )
}
