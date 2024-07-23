// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const {commerce, company} = require('faker')
const {shuffle} = require('lodash')
const {getType} = require('./validate')

/**
 * Generates unique titles using array of titles or prefix and adds suffix
 * @param {String|Array<String>} [title] prefix for titles or array of titles
 * @param {String|Array<String>} [suffix] suffix for titles
 */
function* titleGenerator(title, suffix) {
  const generated = new Set()
  let cursor = 0
  let cycle = 0
  let computedTitle
  let shuffledTitles = Array.isArray(title) && shuffle(title)
  const prefix = getType(title) === 'string' ? `${title} ` : ''
  let titleSuffix = suffix ? ` ${suffix}` : ''

  while (true) {
    if (shuffledTitles) {
      titleSuffix += cycle > 0 ? ` ${cycle}` : ''
      computedTitle = shuffledTitles[cursor] + titleSuffix
      if (cursor === title.length - 1) {
        shuffledTitles = shuffle(title) // re-shuffle for new cycle
        cursor = -1
        cycle++
      }
    } else {
      do {
        computedTitle =
          `${prefix}${company.companyName()} - ${commerce.productAdjective()}` +
          ` ${commerce.productName()}${titleSuffix}`
      } while (generated.has(computedTitle))
      generated.add(computedTitle)
    }
    cursor++
    yield computedTitle
  }
}

module.exports = titleGenerator
