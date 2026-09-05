import {For} from 'solid-js'
import {ASPECT_RATIOS, type ImageGenerationController} from 'src/features/image-generation'

export interface SettingsProps {
  readonly studio: ImageGenerationController
}
export const Settings = (props: SettingsProps) => (
  <div class="image-studio-size">
    <span>이미지 비율</span>
    <div class="image-studio-presets" role="group" aria-label="이미지 비율 프리셋">
      <For each={ASPECT_RATIOS}>
        {(ratio) => (
          <button type="button" onClick={() => props.studio.selectRatio(ratio)}>
            {ratio}
          </button>
        )}
      </For>
    </div>
    <label class="image-studio-slider" for="image-width">
      <span>너비</span>
      <input
        id="image-width"
        type="range"
        min={256}
        max={1024}
        step={16}
        value={props.studio.width()}
        onInput={(event) => props.studio.setWidth(event.currentTarget.valueAsNumber)}
      />
      <output for="image-width">{props.studio.width()}</output>
    </label>
    <label class="image-studio-slider" for="image-height">
      <span>높이</span>
      <input
        id="image-height"
        type="range"
        min={256}
        max={1024}
        step={16}
        value={props.studio.height()}
        onInput={(event) => props.studio.setHeight(event.currentTarget.valueAsNumber)}
      />
      <output for="image-height">{props.studio.height()}</output>
    </label>
    <label class="image-studio-slider" for="image-steps">
      <span>스텝</span>
      <input
        id="image-steps"
        type="range"
        min={1}
        max={50}
        step={1}
        value={props.studio.steps()}
        onInput={(event) => props.studio.setSteps(event.currentTarget.valueAsNumber)}
      />
      <output for="image-steps">{props.studio.steps()}</output>
    </label>
    <div class="image-studio-seed">
      <label for="image-seed">시드</label>
      <input
        id="image-seed"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        maxlength={10}
        placeholder="랜덤"
        value={props.studio.seed()}
        onInput={(event) => props.studio.setSeed(event.currentTarget.value)}
      />
      <button
        aria-label="시드 무작위 선택"
        type="button"
        onClick={() => props.studio.randomizeSeed()}
      >
        <span aria-hidden="true" class="i-tabler-dice-5 size-5" />
      </button>
    </div>
  </div>
)
