export default {
  keyDetector: ({imported, source}) => (imported === 't' && source === '@/i18n' ? 0 : undefined),
  scanInclude: ['src/**/*.ts'],
}
