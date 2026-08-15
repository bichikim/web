import type {HistoricalMomentDraft} from './contract'

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

/** Renders validated historical prose and source links into safe feed HTML. */
export const renderHistoryContentHtml = (moment: HistoricalMomentDraft): string => {
  const sources = moment.sources
    .map((source) => {
      const label = `${escapeHtml(source.publisher)} — ${escapeHtml(source.title)}`

      return `<li><a href="${escapeHtml(source.url)}">${label}</a></li>`
    })
    .join('')

  const event = `<p>${escapeHtml(moment.sections.event.text)}</p>`
  const context = `<p>${escapeHtml(moment.sections.context.text)}</p>`
  const significance = escapeHtml(moment.sections.significance.text)

  const sourceList = `<footer data-pomo-speech="exclude"><p><strong>출처</strong></p><ol>${sources}</ol></footer>`

  return `${event}${context}<p><strong>왜 기억할까</strong> ${significance}</p>${sourceList}`
}
