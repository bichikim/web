import {Tabs} from '@kobalte/core/tabs'
import type {WeatherState} from '../../features/weather'
import {clearCalendarMonthCache} from '../../features/calendar'
import {CalendarConnections} from '../CalendarConnections'
import {CalendarMonth} from '../CalendarMonth'
import {MemoryMemoList} from './Memos'
import {PictureDiary} from './PictureDiary'
import {LanguageLearningLibrary} from '../language-learning/Library'
import {LanguageLearningWords} from '../language-learning/Words'

interface PMemoryAssistContentProps {
  readonly weatherState?: WeatherState
  readonly calendarRevision?: number
  readonly onRefreshCalendar?: () => void
  readonly onRequestClose?: () => void
}
export const PMemoryAssistContent = (props: PMemoryAssistContentProps) => (
  <>
    <Tabs.Content value="sentences">
      <LanguageLearningLibrary onRequestClose={props.onRequestClose} />
    </Tabs.Content>
    <Tabs.Content value="words">
      <LanguageLearningWords />
    </Tabs.Content>
    <Tabs.Content value="memos">
      <MemoryMemoList />
    </Tabs.Content>
    <Tabs.Content value="picture-diary">
      <PictureDiary weatherState={props.weatherState} />
    </Tabs.Content>
    <Tabs.Content value="calendar">
      <CalendarMonth
        revision={props.calendarRevision ?? 0}
        settings={
          <CalendarConnections
            onConnectionsChange={() => {
              clearCalendarMonthCache()
              props.onRefreshCalendar?.()
            }}
          />
        }
      />
    </Tabs.Content>
  </>
)
