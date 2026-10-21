import type {WallpaperController} from '../features/settings'
import type {InteractionSettings} from '@winter-love/wallpaper/interaction/types'
import {SSelect} from './SSelect'

interface SWallpaperInteractionProps {
  readonly controller: WallpaperController
}

export const SWallpaperInteraction = (props: SWallpaperInteractionProps) => {
  const settings = () => props.controller.current()!.interaction
  const handleActivation = (activation: InteractionSettings['activation']) =>
    props.controller.setInteraction({activation})
  return (
    <section aria-label="배경 조작" class="grid gap-4 pt-2">
      <h2 class="m-0 text-base font-semibold">배경 조작</h2>
      <div class="wallpaper-row">
        <span>배경 입력</span>
        <SSelect
          label="배경 입력"
          options={[
            {label: '입력 통과', value: 'passThrough'},
            {label: '조작 허용', value: 'always'},
          ]}
          value={settings().activation}
          onChange={handleActivation}
        />
      </div>
    </section>
  )
}
