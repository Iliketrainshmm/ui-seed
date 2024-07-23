// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

// todo: use pipeline dependency
// ref https://github.ibm.com/velox/pipeline

const {assertRequired, assertTypes} = require('./validate')

/**
 * Mimics sleep functionality by having setTimeout resolve promise
 *  after X milliseconds provided
 * @param {Number} ms number of milliseconds to wait before resolving
 */
function sleep(ms) {
  assertRequired({ms})
  assertTypes({ms}, 'number')
  return new Promise(resolve => {
    return setTimeout(resolve, ms)
  })
}

module.exports = sleep
