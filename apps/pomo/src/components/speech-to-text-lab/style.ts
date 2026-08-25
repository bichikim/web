import {cx} from 'class-variance-authority'

export const SPEECH_PANEL_CLASSES = cx(
  'relative w-full overflow-hidden rounded-8 border border-white/10 bg-#211a2b/92 p-5',
  'shadow-[0_28px_100px_rgba(5,2,10,0.45)] backdrop-blur-xl xs:p-8',
)

export const SPEECH_TEXTAREA_CLASSES = cx(
  'min-h-64 w-full resize-y rounded-5 border border-white/10 bg-#17131f p-5 pb-22',
  'text-base leading-7 text-#f8edf1 outline-none transition placeholder:text-#655b6c',
  'focus:border-#9ed6bb/65 xs:min-h-72 xs:text-lg xs:leading-8',
)

export const SPEECH_BUTTON_CLASSES = cx(
  'absolute bottom-5 right-4 grid h-14 w-14 place-items-center rounded-full border-0',
  'bg-#9ed6bb text-#173126 shadow-[0_10px_30px_rgba(158,214,187,0.2)] transition',
  'hover:bg-#b8e8d0 disabled:cursor-not-allowed disabled:opacity-35 xs:bottom-6 xs:right-5',
)
