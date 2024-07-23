// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

// todo: use pipeline dependency
// ref https://github.ibm.com/velox/pipeline

const {red} = require('colors/safe')
const {assertRequired, assertTypes, isDefined} = require('./validate')
const {get} = require('./options.js')
const {log} = require('./log.js')
const sleep = require('./sleep')

/**
 * Retry an asynchronous function
 * @param {Number} times number of times to retry
 * @param {Function} method asynchronous method to retry
 * @param {Number} [pause] number of ms to pause between each retry
 * @param {...*} [args] ordered list of arguments to pass to function
 */
module.exports = async (times, method, pause, ...args) => {
  assertRequired({times, method})
  assertTypes({times}, 'number')
  assertTypes({method}, 'function')
  if (isDefined(pause)) assertTypes({pause}, 'number')

  const totalAttempts = times + 1
  let attemptsRemaining = totalAttempts
  const retryErrors = []

  while (attemptsRemaining > 0) {
    try {
      const result = await method(...args)
      return result
    } catch (e) {
      attemptsRemaining--
      const currentAttempt = totalAttempts - attemptsRemaining
      if (!get('silentRetry')) {
        log(
          `${red(
            `Method failed (Attempt: ${currentAttempt}/${totalAttempts})` +
              `${attemptsRemaining > 0 ? ' Retrying...' : ''}`
          )}\n${e.stack}`
        )
      }
      retryErrors.push(e)
    }
    if (isDefined(pause) && attemptsRemaining > 0) await sleep(pause)
  }

  return {retryErrors}
}
