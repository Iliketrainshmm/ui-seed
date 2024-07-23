// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const assert = require('assert')
const {red} = require('colors/safe')

/**
 * Assert if a required condition is met
 * @param {String} conditionStr string representation of a condition
 * @param {Boolean} isMet `true` of `false` indicating condition is met or not
 * @param {String} [namespace] prefix for error message (default: computed)
 * @param {String} [errorMessage] custom error message. (default: `required
 *  condition ${conditionStr} is not met`)
 */
function assertCondition(conditionStr, isMet, namespace, errorMessage) {
  const scope = namespace || computeNamespace()
  const msg = errorMessage || `required condition "${conditionStr}" is not met`
  assert(isMet, red(`${scope}: ${msg}`))
}

// todo: use pipeline dependency
/**
 * Assert if value is defined
 * @param {Object<string,any>} nameValuePairs name-value pair of variables' name
 *  and value
 * @param {Array<String>} [props] array of required properties if value are
 *  objects
 * @param {String} [namespace] prefix for error message (default: computed)
 */
function assertRequired(nameValuePairs, props, namespace) {
  const scope = namespace || computeNamespace()
  for (const [name, value] of Object.entries(nameValuePairs)) {
    assert(isDefined(value), red(`${scope}: ${name} is required, got ${value}`))
    if (props) {
      for (const prop of props) {
        assert(
          isDefined(value[prop]),
          red(
            `${scope}: ${name} object must have the  required property` +
              ` ${prop}, got ${value[prop]}`
          )
        )
      }
    }
  }
}

/**
 * Assert types of value(s)
 * @param {Object<string,any>} nameValuePairs name-value pair of variables' name
 *  and value
 * @param {String} expected expected type of the value
 * @param {Object.<string, any>} [props] an object with property of `value` as a
 *  key and expected type as a value
 * @param {String} [namespace] prefix for error message (default: computed)
 */
function assertTypes(nameValuePairs, expected, props, namespace) {
  const scope = namespace || computeNamespace()
  for (const [name, value] of Object.entries(nameValuePairs)) {
    const actual = getType(value)
    assert(
      actual === expected,
      red(`${scope}: ${name} must be of type ${expected}, got ${actual}`)
    )
    if (isDefined(value) && isDefined(props)) {
      for (const prop in props) {
        const actualPropType = getType(value[prop])
        const expectedPropType = props[prop]
        assert(
          actualPropType === expectedPropType,
          red(
            `${scope}: property ${prop} of ${name} must be of type ` +
              `${expectedPropType}, got ${actualPropType}`
          )
        )
      }
    }
  }
}

/**
 * Assert if value is one of valid values
 * @param {Object<string,any>} nameValuePairs name-value pair of variables' name
 *  and value
 * @param {Array} validValues list of valid values
 * @param {String} [namespace] prefix for error message (default: computed)
 */
function assertValues(nameValuePairs, validValues, namespace) {
  const scope = namespace || computeNamespace()
  const validValuesStr = validValues.join(', ')
  for (const [name, value] of Object.entries(nameValuePairs)) {
    assert(
      validValues.includes(value),
      red(`${scope}: ${name} must be one of [${validValuesStr}], got ${value}`)
    )
  }
}

/**
 * Compute the namespace of a caller function ({fileName}.{functionName})
 */
function computeNamespace() {
  const {stack} = new Error()
  const [, , , caller] = stack.split('\n') || []
  if (!caller) return
  const [, fn, file] = caller.trim().split(' ')
  const functionName = fn.includes('.') ? fn.split('.')[1] : fn
  const [fileName] = file
    .split('/')
    .pop()
    .split('.')
  return `${fileName}.${functionName}`
}

/**
 * Get the type of the value
 * @param {any} value value
 */
function getType(value) {
  return Array.isArray(value) ? 'array' : typeof value
}

/**
 * Return true if the value is defined (i.e. not `undefined` or `null`)
 */
function isDefined(value) {
  return value !== undefined && value !== null
}

module.exports = {
  assertCondition,
  assertRequired,
  assertTypes,
  assertValues,
  getType,
  isDefined,
}
