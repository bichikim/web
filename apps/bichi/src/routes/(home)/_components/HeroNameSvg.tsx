/** Gradient "Bichi Kim" text SVG for hero section. */
export function HeroNameSvg() {
  return (
    <svg
      class="inline-block h-[3.75rem] w-auto"
      viewBox="0 0 200 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMinYMid meet"
      aria-hidden
    >
      <defs>
        <linearGradient id="bichi-name-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#a163f1" />
          <stop offset="22%" stop-color="#6363f1" />
          <stop offset="40%" stop-color="#3498ea" />
          <stop offset="67%" stop-color="#40dfa3" />
          <stop offset="100%" stop-color="#40dfa3" stop-opacity="0" />
        </linearGradient>
      </defs>
      <text
        x="0"
        y="30"
        fill="url(#bichi-name-gradient)"
        font-weight="bold"
        font-size="28"
        font-family="ui-sans-serif, system-ui, sans-serif"
      >
        Bichi Kim
      </text>
    </svg>
  )
}
