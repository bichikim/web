function jasmineDomFactory(files) {
  files.unshift({
    included: true,
    pattern: `${__dirname}/jasmine-dom.global.js`,
    served: true,
    watched: false,
  })
}

jasmineDomFactory.$inject = ['config.files']

module.exports = {
  'framework:testing-library-jasmine-dom': ['factory', jasmineDomFactory],
}
