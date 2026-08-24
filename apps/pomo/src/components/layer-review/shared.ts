import {cx} from 'class-variance-authority'
import {type PViseme} from '../../features/lip-sync/index'

export const VISEME_LABELS: Readonly<Record<PViseme, string>> = {
  closed: '입술 닫힘 · ㅁ/ㅂ/ㅍ',
  narrow: '좁은 입 · ㅡ/가벼운 자음',
  open: '열린 입 · ㅏ/ㅓ',
  rest: '기본 미소 · 무음',
  round: '둥근 입 · ㅗ/ㅜ',
  wide: '넓은 입 · ㅐ/ㅔ/ㅣ',
}

export const PANEL_CLASSES = cx(
  'rounded-6 border border-white/10 bg-#17131f/82',
  'shadow-[0_24px_70px_rgba(5,2,10,0.24)] backdrop-blur-xl',
)
