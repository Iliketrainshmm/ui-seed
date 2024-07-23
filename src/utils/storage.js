// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const storage = {}

/**
 * Get value associated with key from storage
 * @param {String} key
 */
function get(key) {
  return storage[key]
}

/**
 * Remove key-value from storage
 * @param {String} key
 */
function remove(key) {
  delete storage[key]
}

/**
 * Save key-value pair to storage
 * @param {String} key
 * @param {String} value
 */
function set(key, value) {
  storage[key] = value
}

/**
 * Returns string representation of storage state
 */
function toString() {
  return JSON.stringify(storage)
}

module.exports = {get, remove, set, toString}
