# H3 mouth transition prompt template

Use the following structure for a restrained mouth-shape interpolation. Describe geometry rather than speech or pronunciation.

```text
Create one restrained geometric mouth transition between the exact supplied first and last images. This is a subtle image interpolation, not a facial performance. Keep the mouth naturally small and proportional to the face in every frame. Start from the exact supplied [START_SHAPE]. [DIRECT_GEOMETRIC_MOVEMENT] Finish at the exact supplied [END_SHAPE]. Every intermediate outer-lip contour, mouth opening, jaw position, and chin position must remain inside the geometric range defined by the two supplied endpoints; never overshoot either endpoint. Use one continuous monotonic transition with no extra pose or size peak. Briefly hold the initial shape, change gradually through the middle, then briefly hold the final shape. Preserve the character's small mouth and delicate facial proportions. Only the lips, lower jaw, and chin may move subtly. Keep the head, eyes, nose, hair, body, hands, book, camera, lighting, colors, illustration style, and background completely unchanged. No speech, pronunciation, syllables, acting, surprise, smile, singing, teeth emphasis, tongue, exaggerated lip protrusion, dramatic opening, lip stretching, overshoot, reversal, repetition, pulsing, chewing, blinking, head movement, or camera movement.
```

The approved `open-wide` prompt is the source pattern for this template. Retain the geometric limits and negative constraints when adapting another transition.
