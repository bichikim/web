import {Tabs} from '@kobalte/core/tabs'
import {For} from 'solid-js'

import {POMODORO_TIMER_CONFIG} from '../features/pomodoro-timer'
import * as m from '../paraglide/messages.js'

const SECONDS_PER_MINUTE = 60
const minutes = (seconds: number) => seconds / SECONDS_PER_MINUTE
const getGuideSections = () => [
  {
    details: [m.guide_start_one(), m.guide_start_two()],
    title: m.guide_start_title(),
  },
  {
    details: [m.guide_scene_one(), m.guide_scene_two(), m.guide_scene_three()],
    title: m.guide_scene_title(),
  },
  {
    details: [
      m.guide_pomodoro_cycle({
        focus: minutes(POMODORO_TIMER_CONFIG.focusSeconds),
        longBreak: minutes(POMODORO_TIMER_CONFIG.longBreakSeconds),
        sessions: POMODORO_TIMER_CONFIG.focusSessionsPerCycle,
        shortBreak: minutes(POMODORO_TIMER_CONFIG.shortBreakSeconds),
      }),
      m.guide_pomodoro_two(),
      m.guide_pomodoro_three(),
    ],
    title: m.guide_pomodoro_title(),
  },
  {
    details: [m.guide_music_one(), m.guide_music_two()],
    title: m.guide_music_title(),
  },
  {
    details: [m.guide_dialogue_one(), m.guide_dialogue_two()],
    title: m.guide_dialogue_title(),
  },
  {
    details: [m.guide_feed_one(), m.guide_feed_two()],
    title: m.guide_feed_title(),
  },
  {
    details: [m.guide_display_one(), m.guide_display_two(), m.guide_display_three()],
    title: m.guide_display_title(),
  },
]

export const PGuideSettings = () => (
  <Tabs.Content value="guide">
    <section class="grid gap-6">
      <div class="divide-y divide-border">
        <For each={getGuideSections()}>
          {(section) => (
            <section class="py-5 first:pt-0 last:pb-0">
              <h3 class="m-0 text-base font-750 text-foreground">{section.title}</h3>
              <ul class="mb-0 mt-3 grid gap-2 pl-5 text-sm leading-6 text-muted-foreground marker:text-highlight">
                <For each={section.details}>{(detail) => <li>{detail}</li>}</For>
              </ul>
            </section>
          )}
        </For>
      </div>
    </section>
  </Tabs.Content>
)
