export default {
  // Test-only deterministic hook. Supplying it bypasses the Worker.
  __embeddingProvider: {
    async embed(texts) {
      return texts.map(() => Float32Array.from([1, 0]))
    },
    identifier: 'packaged-cli-fixture',
    revision: '1',
  },
  keyDetector: ({imported, source}) => (imported === 't' && source === '@/i18n' ? 0 : undefined),
  scanInclude: ['src/**/*.ts'],
}
