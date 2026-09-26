export default {
  include: ['src/**/*.{ts,tsx,js,jsx,mts,mjs}'],
  jev: {concurrency: 4},
  provider: 'jev',
  rules: [['@natural-lint/unexpected-error-becomes-success-like-result', {severity: 'warn'}]],
}
