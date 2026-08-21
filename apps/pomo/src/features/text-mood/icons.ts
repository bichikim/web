import affectionFace from './assets/faces/affection.webp'
import angerFace from './assets/faces/anger.webp'
import anxietyFace from './assets/faces/anxiety.webp'
import calmFace from './assets/faces/calm.webp'
import dreamlikeFace from './assets/faces/dreamlike.webp'
import fearFace from './assets/faces/fear.webp'
import hopeFace from './assets/faces/hope.webp'
import joyFace from './assets/faces/joy.webp'
import longingFace from './assets/faces/longing.webp'
import neutralFace from './assets/faces/neutral.webp'
import sadnessFace from './assets/faces/sadness.webp'
import wonderFace from './assets/faces/wonder.webp'
import scribbleAffectionFace from './assets/faces/scribble/affection.webp'
import scribbleAngerFace from './assets/faces/scribble/anger.webp'
import scribbleAnxietyFace from './assets/faces/scribble/anxiety.webp'
import scribbleCalmFace from './assets/faces/scribble/calm.webp'
import scribbleDreamlikeFace from './assets/faces/scribble/dreamlike.webp'
import scribbleFearFace from './assets/faces/scribble/fear.webp'
import scribbleHopeFace from './assets/faces/scribble/hope.webp'
import scribbleJoyFace from './assets/faces/scribble/joy.webp'
import scribbleLongingFace from './assets/faces/scribble/longing.webp'
import scribbleNeutralFace from './assets/faces/scribble/neutral.webp'
import scribbleSadnessFace from './assets/faces/scribble/sadness.webp'
import scribbleWonderFace from './assets/faces/scribble/wonder.webp'
import type {PrimaryMoodId} from './labels'

export type PFaceIconStyle = 'original' | 'scribble'

const PRIMARY_MOOD_ICONS = {
  angry: angerFace,
  anxious: anxietyFace,
  awe: wonderFace,
  calm: calmFace,
  cheerful: joyFace,
  dreamlike: dreamlikeFace,
  fearful: fearFace,
  hopeful: hopeFace,
  neutral: neutralFace,
  nostalgic: longingFace,
  sad: sadnessFace,
  warm: affectionFace,
} satisfies Record<PrimaryMoodId, string>

const SCRIBBLE_PRIMARY_MOOD_ICONS = {
  angry: scribbleAngerFace,
  anxious: scribbleAnxietyFace,
  awe: scribbleWonderFace,
  calm: scribbleCalmFace,
  cheerful: scribbleJoyFace,
  dreamlike: scribbleDreamlikeFace,
  fearful: scribbleFearFace,
  hopeful: scribbleHopeFace,
  neutral: scribbleNeutralFace,
  nostalgic: scribbleLongingFace,
  sad: scribbleSadnessFace,
  warm: scribbleAffectionFace,
} satisfies Record<PrimaryMoodId, string>

const PRIMARY_MOOD_ICON_SETS = {
  original: PRIMARY_MOOD_ICONS,
  scribble: SCRIBBLE_PRIMARY_MOOD_ICONS,
} satisfies Record<PFaceIconStyle, Record<PrimaryMoodId, string>>

export const getPrimaryMoodIcon = (id: PrimaryMoodId, style: PFaceIconStyle = 'original') =>
  PRIMARY_MOOD_ICON_SETS[style][id]
