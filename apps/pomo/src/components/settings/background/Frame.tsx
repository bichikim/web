import {For, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {
  type BackgroundController,
  getTransitionSelection,
  transitionSelectionPatch,
} from 'src/features/background'
import {PRadioSwitch} from '../../PRadioSwitch'
import {PSwitch} from '../../PSwitch'
import {PSelect} from '../../PSelect'
import {PSettingsActionButton} from '../ActionButton'
import {Item} from './Item'
import {Upload} from './Upload'
import {Sets} from './Sets'

const transitionOptions = () => [
  {label: m.background_transition_fade(), value: 'fade' as const},
  {label: m.background_transition_wipe(), value: 'directional-wipe' as const},
  {label: m.background_transition_warp(), value: 'cross-warp' as const},
  {label: m.background_transition_circle(), value: 'circle-open' as const},
  {label: m.background_transition_kinetic(), value: 'rgb-kinetic' as const},
]

const DISPLAY_DURATIONS = ['5', '10', '30', '60'] as const

export interface FrameProps {
  readonly background: BackgroundController
}
export const Frame = (props: FrameProps) => (
  <div class="grid gap-5">
    <p class="m-0 text-sm leading-6 text-muted-foreground">{m.background_description()}</p>
    <div class="grid gap-4 min-[60rem]:grid-cols-2">
      <PRadioSwitch
        label={m.background_order()}
        value={props.background.preferences().order}
        disabled={!props.background.ready()}
        options={[
          {label: m.background_sequential(), value: 'sequential'},
          {label: m.background_random(), value: 'random'},
        ]}
        onChange={(order) => {
          props.background.configure({order})
        }}
      />
      <PSelect
        disabled={!props.background.ready()}
        label={m.background_interval()}
        value={String(props.background.preferences().photoSeconds)}
        options={DISPLAY_DURATIONS.map((seconds) => ({
          label: m.background_seconds({seconds: Number(seconds)}),
          value: String(seconds),
        }))}
        onChange={(value) => {
          props.background.configure({photoSeconds: Number(value)})
        }}
      />
    </div>
    <PSelect
      label={m.background_video_mode()}
      description={m.background_video_mode_hint()}
      disabled={!props.background.ready()}
      value={props.background.preferences().videoMode}
      options={[
        {label: m.background_video_end(), value: 'end'},
        {label: m.background_video_hold(), value: 'hold'},
        {label: m.background_video_loop(), value: 'loop'},
      ]}
      onChange={(videoMode) => props.background.configure({videoMode})}
    />
    <PSelect
      multiple
      label={m.background_transition()}
      description={m.background_transition_selection_hint()}
      disabled={!props.background.ready()}
      value={getTransitionSelection(props.background.preferences())}
      options={transitionOptions()}
      placeholder={m.background_transition_none()}
      clearLabel={m.background_transition_clear()}
      selectionLabel={(options) =>
        options.length === 1
          ? options[0].label
          : m.background_transition_selected({
              count: options.length - 1,
              name: options[0]?.label ?? '',
            })
      }
      onChange={(values) => props.background.configure(transitionSelectionPatch(values))}
    />
    <PSwitch
      checked={props.background.preferences().pairPhotos}
      disabled={!props.background.ready()}
      label={m.background_pair_photos()}
      description={m.background_pair_description()}
      onChange={(pairPhotos) => {
        props.background.configure({pairPhotos})
      }}
    />
    <Show
      when={import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'}
      fallback={
        <Upload
          disabled={props.background.busy() || !props.background.ready()}
          onFiles={(files) => {
            props.background.add(files)
          }}
        />
      }
    >
      <PSettingsActionButton
        disabled={props.background.busy() || !props.background.ready()}
        icon="i-tabler-plus"
        onPress={() => {
          props.background.pick()
        }}
      >
        {m.background_add()}
      </PSettingsActionButton>
    </Show>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="m-0 text-xs leading-5 text-muted-foreground">{m.background_size_hint()}</p>
      <Sets background={props.background} />
    </div>
    <Show
      when={props.background.items().length > 0}
      fallback={<p class="m-0 py-6 text-center text-muted-foreground">{m.background_empty()}</p>}
    >
      <ol
        class="m-0 grid max-h-[min(20rem,40dvh)] list-none gap-3 overflow-y-auto overscroll-contain p-1"
        aria-label={m.background_list()}
        tabIndex={0}
      >
        <For each={props.background.items()}>
          {(item) => <Item item={item} background={props.background} />}
        </For>
      </ol>
    </Show>
    <p class="m-0 text-xs leading-5 text-muted-foreground">{m.background_local_notice()}</p>
  </div>
)
