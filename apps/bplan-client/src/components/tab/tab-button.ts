import {createMemo, useContext} from 'solid-js'
import {TabContext} from './context'
import {MaybeAccessor, resolveAccessor} from '@winter-love/solid-use'
import {getId} from '@winter-love/solid-components'

export const useTabButton = (targetValue: MaybeAccessor<string>) => {
  const targetValueAccessor = resolveAccessor(targetValue)
  const {setTabValue, tabValue, id} = useContext(TabContext)

  const handleSelect = () => {
    setTabValue(targetValueAccessor())
  }

  const tabId = createMemo(() => getId(id, targetValueAccessor()))

  const isSelected = createMemo(() => tabValue() === targetValueAccessor())

  return {
    handleSelect,
    id: tabId,
    isSelected,
  }
}
