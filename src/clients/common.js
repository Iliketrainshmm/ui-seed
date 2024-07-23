// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const {get} = require('lodash')
const {
  log,
  validate: {assertRequired},
} = require('../utils')
const {sendRequest} = require('./helpers/api-clients')

/**
 * Find an object in array of objects at an endpoint with matching key-value
 *  provided
 * @param {String} app target app (admin or manager)
 * @param {String} endpoint endpoint expected to return results that is an
 *  array of object
 * @param {String} key property in object
 * @param {String} value subset of the value for the property in an object
 */
async function apiFind(app, endpoint, key, value) {
  assertRequired({app, endpoint, key, value})
  const data = await apiGet(app, endpoint)
  if (!Array.isArray(data)) {
    return log.error(`data available at ${endpoint} is not an array`)
  }
  log.debug(`finding key-value pair ${key}-${value} in:`, data)
  return data.find((d) => {
    return d[key].includes(value)
  })
}

/**
 * get results at an endpoint. Response object for get endpoints, results
 *  property of an object for list endpoints, or property `prop` in response
 *  object
 * @param {String} app target app (admin or manager or consumer)
 * @param {String} endpoint target endpoint
 * @param {String} [prop] property to get in response object
 * @param {String} [providerOrg] provider org name (if app == consumer)
 * @param {String} [catalog] catalog name (if app == consumer)
 */
async function apiGet(app, endpoint, prop, providerOrg, catalog) {
  assertRequired({app, endpoint})
  log.debug(`getting ${app} data from ${endpoint}`)
  const headers =
    app === 'consumer'
      ? {'X-IBM-Consumer-Context': `${providerOrg}.${catalog}`}
      : {}
  const res = await sendRequest(app, endpoint, {headers})
  const {results} = res.body || {}
  return prop ? get(res.body, prop) : results || res
}

/**
 * Get array of role urls matching roles in `roles` arg
 * @param {String} app target app (admin or manager or consumer)
 * @param {String} endpoint endpoint to get list of relevant role objects
 * @param {Array.<String>} roles  any of:
 *  - administrator
 *  - api-administrator
 *  - community-manager
 *  - developer
 *  - member
 *  - owner
 *  - viewer
 * @param {String} [providerOrg] provider org name (if app == consumer)
 * @param {String} [catalog] catalog name (if app == consumer)
 */
async function getRoleUrls(app, endpoint, roles, providerOrg, catalog) {
  assertRequired({app, endpoint, roles})
  const role_urls = []
  const availableRoles = await apiGet(
    app,
    endpoint,
    null,
    providerOrg,
    catalog
  )
  if (!availableRoles || !Array.isArray(availableRoles)) {
    log.error(`failed to get ${app} roles at endpoint ${endpoint}`)
    return role_urls
  }
  for (const role of roles) {
    const roleData = availableRoles.find((r) => {
      return r.name === role
    })
    if (roleData) {
      role_urls.push(roleData.url)
    } else {
      log.warn(`omitted invalid ${app} role ${role}`)
    }
  }
  return role_urls
}

module.exports = {apiFind, apiGet, getRoleUrls}
