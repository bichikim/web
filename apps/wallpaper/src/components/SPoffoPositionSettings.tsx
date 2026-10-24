import {DEFAULT_POFFO_PLACEMENT, type PoffoPlacement} from '@winter-love/wallpaper/settings/model'
import type {WallpaperController} from '../features/settings'
import {SNumberInput} from './SNumberInput'

const PERCENT = 100

interface SPoffoPositionSettingsProps {
  readonly controller: WallpaperController
}

export const SPoffoPositionSettings = (props: SPoffoPositionSettingsProps) => {
  const placement = () => {
    const content = props.controller.current()?.content
    return content?.mode === 'puppet'
      ? (content.placement ?? DEFAULT_POFFO_PLACEMENT)
      : DEFAULT_POFFO_PLACEMENT
  }
  const change = (patch: Partial<PoffoPlacement>) => {
    const current = props.controller.current()?.content
    if (current?.mode === 'puppet') {
      return props.controller.setContent({...current, placement: {...placement(), ...patch}})
    }
  }
  return (
    <details>
      <summary class="wallpaper-disclosure">캐릭터 위치·크기</summary>
      <div class="wallpaper-row">
        <span>가로 위치</span>
        <span class="flex items-center justify-end gap-2">
          <SNumberInput
            label="캐릭터 가로 위치 (%)"
            value={Math.round(placement().x * PERCENT)}
            min={0}
            max={100}
            onChange={(value) => change({x: value / PERCENT})}
          />
          %
        </span>
      </div>
      <div class="wallpaper-row">
        <span>세로 위치</span>
        <span class="flex items-center justify-end gap-2">
          <SNumberInput
            label="캐릭터 세로 위치 (%)"
            value={Math.round(placement().y * PERCENT)}
            min={0}
            max={100}
            onChange={(value) => change({y: value / PERCENT})}
          />
          %
        </span>
      </div>
      <div class="wallpaper-row">
        <span>크기</span>
        <span class="flex items-center justify-end gap-2">
          <SNumberInput
            label="캐릭터 크기 (%)"
            value={Math.round(placement().scale * PERCENT)}
            min={10}
            max={200}
            step={5}
            onChange={(value) => change({scale: value / PERCENT})}
          />
          %
        </span>
      </div>
      <button
        type="button"
        class="wallpaper-file-button mt-2"
        onClick={() => change(DEFAULT_POFFO_PLACEMENT)}
      >
        위치 초기화
      </button>
    </details>
  )
}
