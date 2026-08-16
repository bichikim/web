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
import type {PrimaryMoodId} from './labels'

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

export const getPrimaryMoodIcon = (id: PrimaryMoodId) => PRIMARY_MOOD_ICONS[id]
