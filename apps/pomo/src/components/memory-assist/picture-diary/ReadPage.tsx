import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import * as m from '@paraglide/message'
import {type PictureDiaryEntry} from '../../../features/picture-diary'
import {getLocalizedWeatherLabel} from '../../../features/localization'
import {getWeatherPresentation} from '../../../features/weather'
import {HConfirmButton} from '../../HConfirmButton'
import {PictureDiaryCanvas} from './Canvas'
import {type PageSide} from './editor-props'

const DELETE_CLASSES =
  '[&[data-confirming]]:[border-color:rgb(187_66_50/28%)] ' +
  '[&[data-confirming]]:[background:rgb(187_66_50/9%)] ' +
  '[&[data-confirming]]:[color:rgb(151_46_34)] [&[data-confirming]]:px-[0.65rem]'

const ACTION_CLASSES =
  'box-border inline-flex min-w-8 min-h-8 cursor-pointer items-center justify-center ' +
  'border border-solid border-transparent rounded-[999rem] outline-none bg-transparent ' +
  '[color:rgb(var(--picture-diary-muted-ink))] [font:inherit] text-modal-detail font-700 leading-none ' +
  'p-[0.4rem] whitespace-nowrap [transition:color_160ms_ease,border-color_160ms_ease,background-color_160ms_ease] ' +
  'hover:[background:rgb(var(--picture-diary-rule)/8%)] hover:[color:rgb(var(--picture-diary-ink))] ' +
  'focus-visible:[box-shadow:0_0_0_0.125rem_rgb(var(--pomo-color-primary-channels)/72%)]'

const formatPageDate = (date: string) => `${date.replaceAll('-', '. ')}.`

const formatTemperature = (temperature: number | null) =>
  temperature === null ? null : `${Math.round(temperature)}°`

interface PictureDiaryReadPageProps {
  readonly entry?: PictureDiaryEntry | null
  readonly onEdit?: (entry: PictureDiaryEntry) => void
  readonly onDelete?: (id: string) => void
  readonly side: PageSide
}

export const PictureDiaryReadPage = (props: PictureDiaryReadPageProps) => (
  <section
    class={`picture-diary-book__page picture-diary-book__page--${props.side}`}
    data-picture-diary-mode="read"
    data-picture-diary-page={props.side}
  >
    <Show when={props.entry}>
      {(entry) => (
        <>
          <div class="picture-diary-book__heading picture-diary-book__heading--read">
            <div class="picture-diary-book__heading-primary">
              <time class="picture-diary-book__date" datetime={entry().date}>
                {formatPageDate(entry().date)}
              </time>
              <Show when={props.onEdit}>
                <button
                  aria-label={m.picture_diary_edit_entry()}
                  class={ACTION_CLASSES}
                  type="button"
                  onClick={() => props.onEdit?.(entry())}
                >
                  <span aria-hidden="true" class="i-tabler-pencil w-4 h-4" />
                </button>
              </Show>
              <Show when={props.onDelete}>
                {(onDelete) => (
                  <HConfirmButton
                    accessibleLabel={m.picture_diary_delete_entry({
                      date: formatPageDate(entry().date),
                    })}
                    class={cx(ACTION_CLASSES, DELETE_CLASSES)}
                    confirmationAccessibleLabel={m.picture_diary_delete_confirm_label({
                      date: formatPageDate(entry().date),
                    })}
                    confirmationChildren={
                      <span class="picture-diary-book__delete-confirmation">
                        {m.picture_diary_delete_confirm()}
                      </span>
                    }
                    onConfirm={() => onDelete()(entry().id)}
                  >
                    <span aria-hidden="true" class="i-tabler-x w-4 h-4" />
                  </HConfirmButton>
                )}
              </Show>
            </div>
            <Show when={entry().weather}>
              {(weather) => {
                const presentation = getWeatherPresentation(weather().condition)
                const temperature = formatTemperature(weather().temperatureCelsius)

                return (
                  <span class="picture-diary-book__weather">
                    <span
                      aria-hidden="true"
                      class={`${presentation.icon} picture-diary-book__weather-icon`}
                    />
                    <span>{getLocalizedWeatherLabel(weather().condition)}</span>
                    <Show when={temperature}>{(label) => <span> · {label()}</span>}</Show>
                  </span>
                )
              }}
            </Show>
          </div>
          <PictureDiaryCanvas
            accessibleLabel={m.picture_diary_saved_drawing()}
            image={entry().image}
            readOnly={true}
            strokes={entry().strokes}
          />
          <div class="picture-diary-book__entry-writing">
            <p>{entry().text}</p>
          </div>
        </>
      )}
    </Show>
  </section>
)
