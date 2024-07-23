// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const {shuffle, range} = require('lodash')

/**
 * Generate a random number between the range [min, max] or array of n unique
 *  random numbers between [min, max]
 * @param {Number} min smallest random number
 * @param {Number} max largest random number
 * @param {Number} [amount] number of unique random numbers to generate between
 *  the range [min, max] (default: 1)
 */
module.exports = (min, max, amount) => {
  if (!amount) return Math.floor(Math.random() * (max - min + 1)) + min
  return shuffle(range(min, max + 1)).slice(0, amount)
}
