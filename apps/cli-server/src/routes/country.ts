import {Hono} from 'hono'

/** 컨트리 음악 톤의 도입부(인트로)만 — 전곡/후렴 없음. */
const COUNTRY_MUSIC_INTRO = `Sun on the fender, dust on the glass,
A four-bar lick and a day movin' fast.
That steel guitar hums low and true,
This ain't the chorus — it’s the intro, through and through.`

/** `GET /country` */
export const countryRoute = new Hono()

countryRoute.get('/', (context) => {
  return context.text(COUNTRY_MUSIC_INTRO, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
  })
})
