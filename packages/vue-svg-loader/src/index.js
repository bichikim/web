const {optimize} = require('svgo')
const {getOptions} = require('loader-utils')

module.exports = function vueSvgLoader(svg) {
  const {svgo: svgoConfig} = getOptions(this) || {}

  if (svgoConfig !== false) {
    ({data: svg} = optimize(svg, {
      path: this.resourcePath,
      ...svgoConfig,
    }))
  }

  return `<template>${svg}</template>`
}
