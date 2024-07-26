// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const {
  options: {get: getOption},
  http: {send},
  log,
  validate: {assertRequired, assertValues, isDefined},
  tryCatch,
  constants: {HOST_TYPES},
} = require('../../utils')

let configs = {}

function getBaseConfigs() {
  const baseConfigs = {
    protocol: getOption('http') ? 'http://' : 'https://',
  }
  if (getOption('useHostOptions')) {
    // Script mode
    const baseHost = getOption('baseHost')
    if (!baseHost) {
      const hostOptionsList = HOST_TYPES.join(', ')
      log.throw(
        `You must provide all required hosts (${hostOptionsList}) in` +
          ' options or provide the option baseHost to have hosts auto computed.'
      )
    }
    baseConfigs.API_HOST = baseHost
  } else {
    // CLI mode
    const {API_HOST} = process.env
    const {argv} = process
    let flagStartIndex = argv.findIndex(arg => {
      return arg.startsWith('-')
    })
    flagStartIndex = flagStartIndex > 0 ? flagStartIndex : 5
    const [cluster, namespace] = process.argv.slice(3, flagStartIndex)
    if (!API_HOST && (!cluster || !namespace)) {
      log.throw(
        'Environment variable "API_HOST" is not set and' +
          ' cluster or namespace was not passed as an argument'
      )
    }
    baseConfigs.API_HOST = API_HOST
    baseConfigs.cluster = cluster
    baseConfigs.namespace = namespace
  }

  return baseConfigs
}

async function isHostReachable({host}) {
  if (SaaS === false) {
    options = {url: `${host}/api/me`, timeout: 10000}
  }
  else {
    options = {url: `${host}/api/token`, timeout: 10000}
  }
  log.info(options)
  const {res} = await tryCatch(send, options)
  return res && res.status === 401
}

async function getAppHosts({protocol, host}) {
  const addPrefix = await isHostReachable({host: `${protocol}manager.${host}`})
  const admin = `${protocol}${addPrefix ? `admin.${host}` : host}`
  if (SaaS === true) {
    log.info(host)
    manager = `${protocol}${addPrefix ? `platform-api.${host}` : host}`
  }
  else {
    manager = `${protocol}${addPrefix ? `manager.${host}` : host}`
  }
  const consumer = `${protocol}${addPrefix ? `consumer.${host}` : host}`
  const hostIsReachable = await isHostReachable({host: manager})
  if (!hostIsReachable) log.throw(`API host ${host} is unreachable`)
  return [admin, manager, consumer]
}

function getGatewayEndpoint({protocol, host, type}) {
  const infix = type === 'v5' ? 'gwd' : 'rgwd'
  const postfix = getGatewayHostPostfix({host})

  if (postfix === '.fyre.ibm.com') {
    return `${protocol}${infix}.${host}`
  }

  const prefix = getGatewayHostPrefix({host})
  return `${protocol}${prefix}${infix}${postfix}`
}

function getGatewayEndpointBase({protocol, host, type}) {
  const infix = type === 'v5' ? 'gw' : 'rgw'
  const postfix = getGatewayHostPostfix({host})

  if (postfix === '.fyre.ibm.com') {
    return `${protocol}${infix}.${host}`
  }

  const prefix = getGatewayHostPrefix({host})
  return `${protocol}${prefix}${infix}${postfix}`
}

function getGatewayHostPrefix({host}) {
  return `${host.split('.').shift()}-`
}

function getGatewayHostPostfix({host}) {
  return `.${host
    .split('.')
    .splice(1)
    .join('.')}`
}

function getDomain({host}) {
  return host.slice(host.lastIndexOf('/') + 1)
}

function getAnalyticsEndpoint({protocol, host}) {
  return `${protocol}ai.${getDomain({host})}`
}

function getPortalEndpoint({protocol, host}) {
  return `${protocol}api.portal.${getDomain({host})}`
}

function getPortalEndpointBase({protocol, host}) {
  return `${protocol}portal.${getDomain({host})}`
}

function getCustomPortalEndpointBase({protocol, host}) {
  return `${protocol}custom-portal.${getDomain({host})}`
}

async function computeHosts() {
  const useAPIHost = getOption('useAPIHost')
  const {API_HOST, cluster, namespace, protocol} = getBaseConfigs()
  let host = API_HOST && API_HOST.replace(/http.?:\/\/(manager\.|admin\.|consumer\.)?/, '')
  if (cluster && namespace && !useAPIHost)
    if (SaaS === false) {
      host = `${namespace}.${cluster}.dev.ciondemand.com`
    }
    else {
      host = `platform-api.${region}.apiconnect.automation.ibm.com`
    }
  // Skip computing hosts if already computed before
  if (configs.hosts && configs.baseHost === host) return

  log.info(`Computing hosts for ${host}`)

  const [admin, manager, consumer] = await getAppHosts({protocol, host})
  configs.baseHost = host
  configs.hosts = {
    admin,
    manager,
    consumer,
    analyticsEndpoint: getAnalyticsEndpoint({protocol, host}),
    portalEndpoint: getPortalEndpoint({protocol, host}),
    portalEndpointBase: getPortalEndpointBase({protocol, host}),
    customPortalEndpointBase: getCustomPortalEndpointBase({protocol, host}),
    v5GatewayEndpoint: getGatewayEndpoint({protocol, host, type: 'v5'}),
    v5GatewayEndpointBase: getGatewayEndpointBase({protocol, host, type: 'v5'}),
    v6GatewayEndpoint: getGatewayEndpoint({protocol, host, type: 'v6'}),
    v6GatewayEndpointBase: getGatewayEndpointBase({protocol, host, type: 'v6'}),
  }
}

/**
 * Get hosts for the namespace in cluster from GOA, which includes:
 * @param {('admin'|'manager'|'consumer'|'analyticsEndpoint'|'portalEndpoint'|'portalEndpointBase'|
 * 'v5GatewayEndpoint'|'v5GatewayEndpointBase'|'v6GatewayEndpoint'|
 * 'v6GatewayEndpointBase'|'all')} type one of:
 *  - admin: URl to API Admin application
 *  - manager: URl to API Manager application
 *  - consumer: URl to API Consumer application
 *  - analyticsEndpoint: URL to analytics endpoint
 *  - portalEndpoint: URL to portal endpoint
 *  - portalEndpointBase: URL to portal base endpoint
 *  - v5GatewayEndpoint: URL to v5 gateway endpoint
 *  - v5GatewayEndpointBase: URL to v5 gateway base endpoint
 *  - v6GatewayEndpoint: URL to v6 gateway endpoint
 *  - v6GatewayEndpointBase: URL to v6 gateway base endpoint
 *
 *
 *  - all: all hosts listed above in an object
 *
 * @param {boolean} [resetComputed]  indicates if previously computed configs
 *  cache should be cleared
 *
 * @returns {String|object|undefined}
 */
async function getHost(type, resetComputed) {
  if (resetComputed) configs = {}

  const validTypes = [...HOST_TYPES, 'all']

  assertRequired({type})
  assertValues({type}, validTypes)

  if (type === 'all') {
    const allHosts = {}
    for (const type of HOST_TYPES) {
      allHosts[type] = await getHost(type)
    }
    return allHosts
  }

  if (getOption('useHostOptions')) {
    const host = getOption(type)
    if (isDefined(host)) return host
  }
  await computeHosts()
  return configs.hosts[type]
}

module.exports = getHost
