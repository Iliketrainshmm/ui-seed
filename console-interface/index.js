
// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

/* eslint-disable no-console */
/* eslint-env browser */
/* globals _, faker */

/************************************************************
 *   Core
 ************************************************************/

const client_id = 'caa87d9a-8cd7-4686-8b6e-ee2cdc5ee267'
const client_secret = '3ecff363-7eb3-44be-9e07-6d4386c48b0b'
const defaultLimit = 25

const http = {
  send(url, method, body, headers) {
    return new Promise((resolve) => {
      const XHR = new XMLHttpRequest()
      XHR.open(method || 'GET', url)
      XHR.onload = () => {
        resolve(XHR.response)
      }
      if (headers) {
        for (const header in headers) {
          XHR.setRequestHeader(header, headers[header])
        }
      }
      XHR.send(body)
    })
  },
  async sendJSON(url, method, body, headers = {}) {
    const strBody = typeof body === 'string' ? body : JSON.stringify(body)
    const computedHeader = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    }
    try {
      return JSON.parse(await this.send(url, method, strBody, computedHeader))
    } catch (e) {
      console.error(`sendJSON: request failed\n${e.stack}`)
    }
  },
}

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
  let shuffledTitles = Array.isArray(title) && _.shuffle(title)
  const prefix = getType(title) === 'string' ? `${title} ` : ''
  let titleSuffix = suffix ? ` ${suffix}` : ''

  while (true) {
    if (shuffledTitles) {
      titleSuffix += cycle > 0 ? ` ${cycle}` : ''
      computedTitle = shuffledTitles[cursor] + titleSuffix
      if (cursor === title.length - 1) {
        shuffledTitles = _.shuffle(title) // re-shuffle for new cycle
        cursor = -1
        cycle++
      }
    } else {
      do {
        computedTitle =
          `${prefix}${faker.company.companyName()}` +
          ` - ${faker.commerce.productAdjective()}` +
          ` ${faker.commerce.productName()}${titleSuffix}`
      } while (generated.has(computedTitle))
      generated.add(computedTitle)
    }
    cursor++
    yield computedTitle
  }
}

/**
 * Execute multiple instance of an asynchronous method concurrently
 * @param {Function} method asynchronous method to execute
 * @param {Function} argResolver function which accepts i as an argument and
 *  returns an array of values to use as an argument for the method for ith
 *  execution (1-indexed) [Note: Return `null` or `undefined` to skip the
 *  ith execution]
 * @param {Number} times Number of times method should be executed
 * @param {Number} [limit] Maximum number of concurrent execution of the method
 */
async function concurrent(method, argsResolver, times, limit) {
  const computedLimit = limit || defaultLimit
  let results = []
  let currentSet = []

  for (let i = 1; i <= times; i++) {
    const args = await argsResolver(i)
    if (!args) continue
    const argsArray = Array.isArray(args) ? args : [args]
    currentSet.push(method(...argsArray))
    if (currentSet.length === computedLimit || i === times) {
      results = results.concat(await Promise.all(currentSet))
      currentSet = []
    }
  }

  return results
}

/**
 * Generate a random number between the range [min, max] or array of n unique
 *  random numbers between [min, max]
 * @param {Number} min smallest random number
 * @param {Number} max largest random number
 * @param {Number} [amount] number of unique random numbers to generate between
 *  the range [min, max] (default: 1)
 */
function randNum(min, max, amount) {
  if (!amount) return Math.floor(Math.random() * (max - min + 1)) + min
  return _.shuffle(_.range(min, max + 1)).slice(0, amount)
}

/**
 * try and catch an asynchronous function and return an object with prop `err`
 *  on failure or an object with prop res on success
 * @param {function} fn an asynchronous function which may throw an error
 * @param  {...any} [args] arguments for the function
 */
async function tryCatch(fn, ...args) {
  try {
    const res = await fn(...args)
    return {res}
  } catch (err) {
    return {err}
  }
}

const url = {
  /**
   * Get query from url
   * @param {String} url full url with protocol, domain, path, etc.
   * @param {String} query name of the query
   */
  getQuery(urlString, queryName) {
    const parsedURL = new URL(urlString)
    const queries = new URLSearchParams(parsedURL.search)
    return queries.get(queryName)
  },

  /**
   * Get path from url
   * @param {String} url full url with protocol, domain, path, etc.
   */
  getPath(urlString) {
    const parsedURL = new URL(urlString)
    return parsedURL.pathname
  },

  getAPIEndpoint(url) {
    if (typeof url !== 'string') return
    return `/api/${url.split('/api/')[1]}`
  },
}

const hosts = {
  protocol: 'https://',
  setAPIHost: (host) => {
    localStorage.setItem('API_HOST', host)
  },
  getAPIHost: () => {
    let apiHost
    if (location.hostname === 'localhost')
      apiHost = localStorage.getItem('API_HOST')
    else apiHost = location.href
    if (!apiHost)
      throw new Error(
        'You must manually set the API_HOST for localhost using' +
          ' hosts.setAPIHost method'
      )
    const parsedHost = new URL(apiHost)
    return parsedHost.hostname.replace(/^(manager|admin)./, '')
  },
  getGatewayEndpoint(gatewayType) {
    const prefix = this.getGatewayHostPrefix()
    const postfix = this.getGatewayHostPostfix()
    const infix = gatewayType === 'v5' ? 'gwd' : 'rgwd'
    return `${this.protocol}${prefix}${infix}${postfix}`
  },
  getGatewayEndpointBase(gatewayType) {
    const prefix = this.getGatewayHostPrefix()
    const postfix = this.getGatewayHostPostfix()
    const infix = gatewayType === 'v5' ? 'gw' : 'rgw'
    return `${this.protocol}${prefix}${infix}${postfix}`
  },
  getGatewayHostPrefix() {
    const host = this.getAPIHost()
    return `${host.split('.').shift()}-`
  },
  getGatewayHostPostfix() {
    const host = this.getAPIHost()
    return `.${host.split('.').splice(1).join('.')}`
  },
  getDomain() {
    const host = this.getAPIHost()
    return host.slice(host.lastIndexOf('/') + 1)
  },
  getPortalEndpoint() {
    return `${this.protocol}api.portal.${this.getDomain()}`
  },
  getPortalEndpointBase() {
    return `${this.protocol}portal.${this.getDomain()}`
  },
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

// function assertCondition(conditionStr, isMet, namespace, errorMessage) {
//   const scope = namespace || computeNamespace()
//   const msg = errorMessage || `required condition ${conditionStr} is not met`
//   assert(isMet, `${scope}: ${msg}`)
// }

function assertRequired(nameValuePairs, props, namespace) {
  const scope = namespace || computeNamespace()
  for (const [name, value] of Object.entries(nameValuePairs)) {
    assert(isDefined(value), `${scope}: ${name} is required, got ${value}`)
    if (props) {
      for (const prop of props) {
        assert(
          isDefined(value[prop]),
          `${scope}: ${name} object must have the  required property` +
            ` ${prop}, got ${value[prop]}`
        )
      }
    }
  }
}

function assertTypes(nameValuePairs, expected, props, namespace) {
  const scope = namespace || computeNamespace()
  for (const [name, value] of Object.entries(nameValuePairs)) {
    const actual = getType(value)
    assert(
      actual === expected,
      `${scope}: ${name} must be of type ${expected}, got ${actual}`
    )
    if (isDefined(value) && isDefined(props)) {
      for (const prop in props) {
        const actualPropType = getType(value[prop])
        const expectedPropType = props[prop]
        assert(
          actualPropType === expectedPropType,
          `${scope}: property ${prop} of ${name} must be of type ` +
            `${expectedPropType}, got ${actualPropType}`
        )
      }
    }
  }
}

// function assertValues(nameValuePairs, validValues, namespace) {
//   const scope = namespace || computeNamespace()
//   const validValuesStr = validValues.join(', ')
//   for (const [name, value] of Object.entries(nameValuePairs)) {
//     assert(
//       validValues.includes(value),
//       `${scope}: ${name} must be one of [${validValuesStr}], got ${value}`
//     )
//   }
// }

function computeNamespace() {
  const {stack} = new Error()
  const [, , , caller] = stack.split('\n') || []
  if (!caller) return
  const [, functionName] = caller.trim().split(' ')
  return functionName.replace(/^Object./, '')
}

function getType(value) {
  return Array.isArray(value) ? 'array' : typeof value
}

function isDefined(value) {
  return value !== undefined && value !== null
}

const log = {
  info(...msg) {
    console.log('%cInfo:', 'color: #03a9f4', ...msg)
  },
  warn(...msg) {
    console.warn(...msg)
  },
  success(...msg) {
    console.log('%cSuccess:', 'color: #01d601', ...msg)
  },
  error(...msg) {
    console.error(...msg)
  },
  throw(msg) {
    throw new Error(msg)
  },
}

function slugify(str) {
  if (typeof str !== 'string') return str
  return _.kebabCase(str.toLowerCase())
}

/************************************************************
 *   Common
 ************************************************************/

async function apiGet(app, endpoint, prop) {
  const apiClient = app === 'admin' ? sendAdmin : sendManager
  const res = await apiClient(endpoint)
  const {results} = res || {}
  return prop ? _.get(res.body, prop) : results || res
}

async function apiFind(app, endpoint, key, value) {
  const data = await apiGet(app, endpoint)
  if (!Array.isArray(data)) {
    return console.error(`data available at ${endpoint} is not an array`)
  }
  log.info(`finding key-value pair ${key}-${value} in:`, data)
  return data.find((d) => {
    return d[key].includes(value)
  })
}

async function getRoleUrls(app, endpoint, roles) {
  const role_urls = []
  const availableRoles = await apiGet(app, endpoint)
  if (!availableRoles || !Array.isArray(availableRoles)) {
    console.error(`failed to get roles at endpoint ${endpoint}`)
    return role_urls
  }
  for (const role of roles) {
    const roleData = availableRoles.find((r) => {
      return r.name === role
    })
    if (roleData) {
      role_urls.push(roleData.url)
    } else {
      console.warn(`omitted invalid role ${role}`)
    }
  }
  return role_urls
}

async function getIdProviders(app) {
  const scope = app === 'manager' ? 'provider' : 'admin'
  const res = await http.sendJSON(`/api/cloud/${scope}/identity-providers`)
  return res && res.results
}

async function getDefaultIdProvider(app) {
  const idps = (await getIdProviders(app)) || []
  return idps.find((idp) => {
    return idp.default
  })
}

async function signIn(app, username, password, idProvider) {
  const {name: defaultIdp} = (await getDefaultIdProvider(app)) || {}
  if (!idProvider && !defaultIdp)
    console.error('Failed to get default identity provider')
  const scope = app === 'manager' ? 'provider' : 'admin'
  const data = {
    username,
    password,
    realm: `${scope}/${idProvider || defaultIdp}`,
    client_id,
    client_secret,
    grant_type: 'password',
  }
  const result = await http.sendJSON('/api/token', 'POST', data)
  const {access_token} = result || {}
  if (!access_token) throw new Error('Sign in failed!')
  console.log(`Signed into ${app} successfully!`)
  localStorage.setItem(`token:${app}`, access_token)
  return result
}

/************************************************************
 *   Manager
 ************************************************************/

async function sendManager(endpoint, method, data, headers = {}) {
  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem('token:manager')}`,
  }
  const computedHeader = {...authHeader, ...headers}
  return http.sendJSON(endpoint, method, data, computedHeader)
}

const apim = {}

apim.signIn = async (username, password) => {
  assertRequired({username, password})
  await signIn('manager', username, password)
}

apim.setAuthToken = (token) => {
  assertRequired({token})
  localStorage.setItem('token:manager', token.replace(/Bearer\s+/, ''))
}

apim.debug = async (endpoint, method, data, header) => {
  assertRequired({endpoint})
  console.log(await sendManager(endpoint, method, data, header))
}

/**
 * Gets draft APIs in provider organization provided
 * @param {String} org name or id of provider organization
 * @param {String} [catalog] name or id of catalog
 * @param {String} [space] name or id of space
 * @param {Boolean} [fullAPI] include draft_api field in result
 */
apim.getAPIs = async (org, catalog, space, fullAPI) => {
  assertTypes({org}, 'string')
  let endpoint
  if (space) endpoint = `/api/spaces/${org}/${catalog}/${space}/apis`
  else if (catalog) endpoint = `/api/catalogs/${org}/${catalog}/apis`
  else endpoint = `/api/orgs/${org}/drafts/draft-apis`
  if (fullAPI) endpoint += '?fields=add(draft_api)'
  const {results} = await sendManager(endpoint)
  console.log(results)
  return results
}

apim.createAPI = async (org, title, versions = 1, gateway, limit) => {
  assertRequired({org, title})
  const defaultResponse = {
    responses: {200: {description: 'success', schema: {type: 'string'}}},
    consumes: [],
    produces: [],
  }
  const baseAPI = {
    swagger: '2.0',
    'x-ibm-configuration': {
      cors: {enabled: true},
      gateway: gateway === 'v6' ? 'datapower-api-gateway' : 'datapower-gateway',
    },
    paths: {
      '/': {
        get: defaultResponse,
        put: defaultResponse,
        post: defaultResponse,
        delete: defaultResponse,
        options: defaultResponse,
        head: defaultResponse,
        patch: defaultResponse,
      },
    },
    securityDefinitions: {
      clientID: {type: 'apiKey', in: 'header', name: 'X-IBM-Client-Id'},
    },
    security: [{clientID: []}],
  }
  const name = slugify(title)
  const endpoint = `/api/orgs/${org}/drafts/draft-apis`
  const argsResolver = (i) => {
    const body = {
      draft_api: {
        ...baseAPI,
        basePath: `/${name}`,
        info: {title, 'x-ibm-name': `${name}`, version: `${i}.0.0`},
      },
    }
    return [endpoint, 'POST', body]
  }
  const result = await concurrent(sendManager, argsResolver, versions, limit)
  console.log(result)
  return result
}

apim.createAPIs = async (org, amount, prefix, gateway) => {
  assertRequired({org, amount})
  let amountRemaining = amount
  const apiTitleGenerator = titleGenerator(prefix, 'API')
  const results = []
  while (amountRemaining > 0) {
    const apiTitle = apiTitleGenerator.next().value
    let apiSet = []
    const maxVersions = Math.min(Math.floor(amount / 5), 25)
    let versions = Math.min(randNum(1, maxVersions), amountRemaining)
    versions = randNum(0, 9) < 7 ? 1 : versions
    apiSet = await apim.createAPI(org, apiTitle, versions, gateway)
    amountRemaining -= versions
    results.push(...(apiSet || []))
  }
  return results
}

apim.getProducts = async (org, catalog, space) => {
  assertRequired({org})
  let result
  if (catalog || space) {
    const endpoint = space
      ? `/api/spaces/${org}/${catalog}/${space}/products`
      : `/api/catalogs/${org}/${catalog}/products`
    result = (await sendManager(endpoint)).results
  } else {
    result = (await sendManager(`/api/orgs/${org}/drafts`)).draft_products
  }
  console.log(result)
  return result
}

apim.createProducts = async (org, amount, apis, distribute, prefix, limit) => {
  assertRequired({org, amount})
  const apiObject = {}
  if (apis) {
    if (Array.isArray(apis)) {
      apis.forEach((api) => {
        apiObject[`${api.name}${api.version}`] = {
          name: `${api.name}:${api.version}`,
        }
      })
    } else if (apis.name && apis.version) {
      apiObject[`${apis.name}${apis.version}`] = {
        name: `${apis.name}:${apis.version}`,
      }
    } else {
      throw new Error(
        'A valid API object or array of valid API objects is required'
      )
    }
  }
  const apiObjectKeys = Object.keys(apiObject)
  const distributeAPIs = distribute && apiObjectKeys.length >= amount
  const baseProduct = {
    gateways: ['datapower-gateway'],
    plans: {
      'default-plan': {
        'rate-limits': {default: {value: '100/1hour'}},
        title: 'Default Plan',
        description: 'Default Plan',
        approval: false,
      },
    },
    apis: apiObject,
    visibility: {
      view: {type: 'public', orgs: [], tags: [], enabled: true},
      subscribe: {type: 'authenticated', orgs: [], tags: [], enabled: true},
    },
    product: '1.0.0',
  }

  const productTitleGenerator = titleGenerator(prefix, 'Product')
  const endpoint = `/api/orgs/${org}/drafts/draft-products`
  const argsResolver = (i) => {
    const title = productTitleGenerator.next().value
    const productInfo = {
      draft_product: {
        ...baseProduct,
        info: {version: '1.0.0', title, name: slugify(title)},
      },
    }
    if (distributeAPIs) {
      productInfo.draft_product.apis = {
        [apiObjectKeys[i - 1]]: apiObject[apiObjectKeys[i - 1]],
      }
    }
    return [endpoint, 'POST', productInfo]
  }
  const result = await concurrent(sendManager, argsResolver, amount, limit)
  console.log(result)
  return result
}

apim.publishProducts = async (org, products, catalog, space, limit = 1) => {
  assertRequired({org, products, catalog})
  const productsArray = Array.isArray(products) ? products : [products]
  const endpoint = space
    ? `/api/spaces/${org}/${catalog}/${space}/publish-draft-product`
    : `/api/catalogs/${org}/${catalog}/publish-draft-product`
  const argsResolver = (i) => {
    return [endpoint, 'POST', {draft_product_url: productsArray[i - 1].url}]
  }
  const result = await concurrent(
    sendManager,
    argsResolver,
    productsArray.length,
    limit
  )
  console.log(result)
  return result
}

apim.getCatalogs = async (org) => {
  assertRequired({org})
  const endpoint = org ? `/api/orgs/${org}/catalogs` : '/api/catalogs'
  const results = await apiGet('manager', endpoint)
  console.log(results)
  return results
}

/**
 * create a catalog
 * @param {String} org name or id of provider organization
 * @param {String} title title for the catalog
 */
apim.createCatalog = async (org, title) => {
  assertRequired({org, title})
  const body = {title, name: slugify(title)}
  const result = await sendManager(`/api/orgs/${org}/catalogs`, 'POST', body)
  console.log(result)
  return result
}

apim.createCatalogs = async (org, amount, prefix, limit) => {
  assertRequired({org, amount})
  const catalogTitleGenerator = titleGenerator(prefix, 'Catalog')
  const argsResolver = () => {
    const title = catalogTitleGenerator.next().value
    const endpoint = `/api/orgs/${org}/catalogs`
    const catalog = {title, name: slugify(title)}
    return [endpoint, 'POST', catalog]
  }
  const result = await concurrent(sendManager, argsResolver, amount, limit)
  console.log(result)
  return result
}

apim.enableSpace = async (org, catalog) => {
  assertRequired({org, catalog})
  const result = await sendManager(
    `/api/catalogs/${org}/${catalog}/settings`,
    'PUT',
    {spaces_enabled: true, application_lifecycle: {}}
  )
  console.log(result)
  return result
}

apim.getSpaces = async (org, catalog) => {
  assertRequired({org, catalog})
  const endpoint = `/api/catalogs/${org}/${catalog}/spaces`
  const result = await apiGet('manager', endpoint)
  console.log(result)
  return result
}

apim.createSpaces = async (org, catalog, amount, prefix, limit) => {
  assertRequired({org, catalog, amount})
  const spaceTitleGenerator = titleGenerator(prefix, 'Space')
  const argsResolver = () => {
    const title = spaceTitleGenerator.next().value
    const endpoint = `/api/catalogs/${org}/${catalog}/spaces`
    const space = {title, name: slugify(title)}
    return [endpoint, 'POST', space]
  }
  const result = await concurrent(sendManager, argsResolver, amount, limit)
  console.log(result)
  return result
}

/**
 * Get OAuthProviders
 * @param {String} org name or id of provider organization
 */
apim.getOAuthProviders = async (org, catalog) => {
  const endpoint = catalog
    ? `/api/catalogs/${org}/${catalog}/configured-oauth-providers`
    : `/api/orgs/${org}/oauth-providers`
  const result = await apiGet('manager', endpoint)
  console.log(result)
  return result
}

/**
 * Enable all of configured OAuth Providers for catalog or space (if provided)
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {String} [space] name or id of space
 * @param {String} [filterCallback] refer to callback syntax for Array.filter
 */
apim.configureOAuthProviders = async (org, catalog, space, filterCallback) => {
  assertRequired({org, catalog})
  let providers = await apim.getOAuthProviders(org)
  if (filterCallback) providers = providers.filter(filterCallback)
  const endpoint = space
    ? `/api/spaces/${org}/${catalog}/${space}/configured-oauth-providers`
    : `/api/catalogs/${org}/${catalog}/configured-oauth-providers`
  const argResolver = (i) => {
    return [endpoint, 'POST', {oauth_provider_url: providers[i - 1].url}]
  }
  return concurrent(sendManager, argResolver, providers.length)
}

/**
 *
 * @param {String} org name or id of provider organization
 * @param {String} [prefix] prefix for oauth security definition name
 * @param {Number} [min]
 * @param {Number} [max]
 */
apim.addOAuthProvidersToAPIs = async (org, prefix = '', min = 0, max = 10) => {
  assertTypes({org}, 'string')
  if (min) assertTypes({min}, 'number')
  if (max) assertTypes({max}, 'number')

  const oAuth = await apim.getOAuthProviders(org, 'sandbox')
  const draftAPIs = await apim.getAPIs(org, true)
  if (!oAuth || !Array.isArray(oAuth) || oAuth.length === 0)
    return log.error('No oAuth configured in sandbox catalog')
  if (!draftAPIs || !Array.isArray(draftAPIs) || draftAPIs.length === 0)
    return log.error('No draft apis are added')

  const argResolver = (i) => {
    if (randNum(0, 3) === 3) return // skip adding oauth to this api
    const draftAPI = draftAPIs[i - 1]
    const patchEndpoint = url.getAPIEndpoint(draftAPI.url)
    const {draft_api} = draftAPI
    const numberOfOAuth = randNum(min, max)
    const oAuthIndexes = randNum(0, oAuth.length - 1, numberOfOAuth)
    const securityDefinitions = draft_api.securityDefinitions || {}
    let count = 1
    for (const oAuthIndex of oAuthIndexes) {
      const oauthKey = slugify(`${prefix ? `${prefix} ` : ''}OAuth ${count}`)
      const {name} = oAuth[oAuthIndex]
      if (securityDefinitions[oauthKey]) continue
      securityDefinitions[oauthKey] = {
        type: 'oauth2',
        flow: 'accessCode',
        'x-ibm-oauth-provider': name,
        authorizationUrl: `https://$(catalog.url)/${name}/oauth2/authorize`,
        tokenUrl: `https://$(catalog.url)/${name}/oauth2/token`,
        scopes: {sample_scope_1: 'Sample scope description 1'},
      }
      count++
    }
    return [patchEndpoint, 'PATCH', {draft_api}]
  }

  return concurrent(sendManager, argResolver, draftAPIs.length)
}

apim.enableConfiguredGateways = async (org, catalog, space) => {
  assertRequired({org, catalog})
  const {results} = await sendManager(`/api/orgs/${org}/gateway-services`)
  const endpoint = space
    ? `/api/spaces/${org}/${catalog}/${space}/configured-gateway-services`
    : `/api/catalogs/${org}/${catalog}/configured-gateway-services`
  const argsResolver = (i) => {
    const gatewayInfo = {gateway_service_url: results[i - 1].url}
    return [endpoint, 'POST', gatewayInfo]
  }
  const result = await concurrent(sendManager, argsResolver, results.length, 1)
  console.log(result)
  return result
}

apim.addPortalService = async (org, catalog) => {
  assertRequired({org, catalog})
  const portal = await apiGet('manager', `/api/orgs/${org}/portal-services`)
  if (!portal || portal.length === 0)
    return console.error('No portal is configured in Admin app')
  const [{web_endpoint_base, url}] = portal
  const data = {
    portal: {
      endpoint: `${web_endpoint_base}/${org}/${catalog}`,
      portal_service_url: url,
      type: 'drupal',
    },
    application_lifecycle: {},
  }
  return sendManager(`/api/catalogs/${org}/${catalog}/settings`, 'PUT', data)
}

apim.getConsumerOrgs = async (org, catalog, space) => {
  assertRequired({org, catalog})
  const endpoint = space
    ? `/api/spaces/${org}/${catalog}/${space}/consumer-orgs`
    : `/api/catalogs/${org}/${catalog}/consumer-orgs`
  const result = await apiGet('manager', endpoint)
  console.log(result)
  return result
}

apim.createConsumerOrgs = async (org, catalog, amount, prefix, limit) => {
  assertRequired({org, catalog, amount})
  const {results: userRegistries} = await sendManager(
    `/api/catalogs/${org}/${catalog}/configured-catalog-user-registries`
  )
  if (userRegistries.length !== 0) {
    const registryId = userRegistries[0].user_registry_url.split('/').pop()
    const {results: users} = await sendManager(
      `/api/user-registries/${org}/${registryId}/users`
    )
    let owner_url
    if (users.length === 0) {
      const newUserData = {
        username: 'testuser',
        email: 'testuser@test.ibm.com',
        first_name: 'Test',
        last_name: 'User',
        password: '7iron-hide',
      }
      const addedUser = await sendManager(
        `/api/user-registries/${org}/${registryId}/users`,
        'POST',
        newUserData
      )
      owner_url = addedUser.url
    } else {
      owner_url = users[0].url
    }
    const orgTitleGenerator = titleGenerator(prefix, 'Consumer Organization')
    const argsResolver = () => {
      const title = orgTitleGenerator.next().value
      const endpoint = `/api/catalogs/${org}/${catalog}/consumer-orgs`
      const consumerOrg = {title, name: slugify(title), owner_url}
      return [endpoint, 'POST', consumerOrg]
    }
    const result = await concurrent(sendManager, argsResolver, amount, limit)
    console.log(result)
    return result
  }
  console.log('No User registry configured')
  return null
}

apim.getConsumerGroups = async (org, catalog, space) => {
  assertRequired({org, catalog})
  const endpoint = space
    ? `/api/spaces/${org}/${catalog}/${space}/consumer-groups`
    : `/api/catalogs/${org}/${catalog}/consumer-groups`
  const result = await apiGet('manager', endpoint)
  console.log(result)
  return result
}

apim.createConsumerGroups = async (org, catalog, amount, prefix, limit) => {
  assertRequired({org, catalog, amount})
  const groupTitleGenerator = titleGenerator(prefix, 'Consumer Group')
  const argsResolver = () => {
    const title = groupTitleGenerator.next().value
    const endpoint = `/api/catalogs/${org}/${catalog}/consumer-groups`
    const consumerGroup = {title, name: slugify(title), org_urls: []}
    return [endpoint, 'POST', consumerGroup]
  }
  const result = await concurrent(sendManager, argsResolver, amount, limit)
  console.log(result)
  return result
}

apim.addConsumerOrgToGroup = async (org, group) => {
  assertRequired({org, group})
  const endpoint = `/api${group.url.split('/api')[1]}`
  const {org_urls = []} = await apiGet('manager', endpoint)

  return sendManager(endpoint, 'PATCH', {org_urls: [...org_urls, org.url]})
}

apim.addConsumerOrgsToGroups = async (orgs, groups, min, max) => {
  assertRequired({orgs, groups})
  const adjustedGroups = groups.filter((group, i) => {
    if (!group.url)
      console.warn(
        `omitted group ${i} as its missing the required property 'url'`
      )
    else return true
  })
  const adjustedOrgs = orgs.filter((org, i) => {
    if (!org.url)
      console.warn(
        `omitted org ${i} as its missing the required property 'url'`
      )
    else return true
  })
  const adjustedMin = Math.max(1, min)
  const adjustedMax = Math.min(max, adjustedOrgs.length)
  const argResolver = async (i) => {
    const {url: groupUrl} = adjustedGroups[i - 1]
    const endpoint = `/api${groupUrl.split('/api')[1]}`
    const {org_urls = []} = await apiGet('manager', endpoint)
    const numberOfOrgs = randNum(adjustedMin, adjustedMax)
    const orgIndexes = randNum(0, adjustedOrgs.length - 1, numberOfOrgs)
    const added_org_urls =
      orgIndexes.map((i) => {
        return adjustedOrgs[i].url
      }) || []
    return [endpoint, 'PATCH', {...org_urls, ...added_org_urls}]
  }

  return concurrent(sendManager, argResolver, adjustedGroups.length)
}

apim.getApps = async (org, catalog, space, consumerOrg) => {
  assertRequired({org, catalog})
  const spaceSegment = space ? `/${space}` : ''
  const consumerOrgSegment = consumerOrg ? `/${consumerOrg}` : ''
  let scope = 'catalogs'
  if (consumerOrg) scope = 'consumer-orgs'
  else if (space) scope = 'spaces'
  const endpoint =
    `/api/${scope}/${org}/${catalog}${spaceSegment}` +
    `${consumerOrgSegment}/apps`
  const results = await apiGet('manager', endpoint)
  console.log(results)
  return results
}

apim.createApps = async (
  org,
  catalog,
  consumerOrg,
  amount,
  space,
  prefix,
  limit
) => {
  assertRequired({org, consumerOrg, catalog, amount})
  const endpoint = space
    ? `/api/consumer-orgs/${org}/${catalog}/${space}/${consumerOrg}/apps`
    : `/api/consumer-orgs/${org}/${catalog}/${consumerOrg}/apps`
  const appTitleGenerator = titleGenerator(prefix, 'App')
  const argsResolver = () => {
    const title = appTitleGenerator.next().value
    const appInfo = {title, name: slugify(title), redirect_endpoints: []}
    return [endpoint, 'POST', appInfo]
  }
  const result = await concurrent(sendManager, argsResolver, amount, limit)
  console.log(result)
  return result
}

/**
 * Add credentials to an app
 * @param {Object} app
 * @param {String} app.url
 * @param {String} app.title
 * @param {Number} amount
 */
apim.addAppsCredentials = async (app, amount) => {
  assertRequired({app}, ['title', 'url'])
  assertTypes({amount}, 'number')
  const postEndpoint = `${url.getAPIEndpoint(app.url)}/credentials`
  const postBody = {title: `Credential for ${app.title}`}
  const method = async () => {
    const credential = await sendManager(postEndpoint, 'POST', postBody)
    const patchEndpoint = url.getAPIEndpoint(credential.url)
    return sendManager(patchEndpoint, 'PATCH', credential)
  }
  const argResolver = () => {
    return []
  }
  const result = await concurrent(method, argResolver, amount, 1)
  console.log(result)
  return result
}

apim.getSubscriptions = async (org, catalog, consumerOrg, app, space) => {
  assertTypes({org, catalog}, 'string')
  let endpoint
  if (consumerOrg && app) {
    endpoint = space
      ? `/api/apps/${org}/${catalog}/${space}/${consumerOrg}/${app}/subscriptions`
      : `/api/apps/${org}/${catalog}/${consumerOrg}/${app}/subscriptions`
  } else {
    endpoint = space
      ? `/api/spaces/${org}/${catalog}/${space}/subscriptions`
      : `/api/catalogs/${org}/${catalog}/subscriptions`
  }
  const results = await apiGet('manager', endpoint)
  console.log(results)
  return results
}

apim.subscribeProductsToApp = async (
  org,
  catalog,
  app,
  products,
  space,
  limit
) => {
  assertRequired({org, catalog, app, products})
  const {consumer_org_url, id} = app
  const consumerOrg = consumer_org_url.split('/').pop()
  const endpoint = space
    ? `/api/apps/${org}/${catalog}/${space}/${consumerOrg}/${id}/subscriptions`
    : `/api/apps/${org}/${catalog}/${consumerOrg}/${id}/subscriptions`
  const argsResolver = (i) => {
    const product = {product_url: products[i - 1].url, plan: 'default-plan'}
    return [endpoint, 'POST', product]
  }
  const result = await concurrent(
    sendManager,
    argsResolver,
    products.length,
    limit
  )
  console.log(result)
  return result
}

apim.inviteCatalogMember = async (org, catalog, email, roles = []) => {
  assertRequired({org, catalog, email})
  const endpoint = `/api/orgs/${org}/member-invitations`
  const roleEndpoint = `/api/catalogs/${org}/${catalog}/roles`
  const role_urls = await getRoleUrls('manager', roleEndpoint, roles)
  return sendManager(endpoint, 'POST', {email, role_urls})
}

apim.inviteCatalogOwner = async (org, email) => {
  assertRequired({org, email})
  const endpoint = `/api/orgs/${org}/catalog-invitations`
  return sendManager(endpoint, 'POST', {email})
}

apim.inviteProviderOrgMember = async (org, email, roles = []) => {
  assertRequired({org, email})
  const endpoint = `/api/orgs/${org}/member-invitations`
  const roleEndpoint = `/api/orgs/${org}/roles`
  const role_urls = await getRoleUrls('manager', roleEndpoint, roles)
  return sendManager(endpoint, 'POST', {email, role_urls})
}

apim.inviteConsumerOrgOwner = (org, catalog, email) => {
  assertRequired({org, catalog, email})
  const endpoint = `/api/catalogs/${org}/${catalog}/consumer-org-invitations`
  return sendManager(endpoint, 'POST', {email})
}

/**
 * Accept invitation for member
 * @param {Object} invitationData object returned from apim.invite... method
 * @param {String} invitationData.id
 * @param {String} invitationData.email
 * @param {String} invitationData.activation_link
 * @param {Object} memberData object containing new member's information
 * @param {String} memberData.username
 * @param {String} [memberData.first_name]
 * @param {String} [memberData.last_name]
 * @param {String} memberData.password
 */
apim.acceptMemberInvite = async (org, invitationData, memberData) => {
  assertRequired({org, invitationData, memberData})
  const {id, email, activation_link} = invitationData
  const {first_name, last_name, password, username} = memberData
  const {name: defaultIdp} = (await getDefaultIdProvider('manager')) || {}
  if (!defaultIdp)
    throw new Error('Failed to get default identity provider for manager')
  log.info(`Accepting invitation for user ${email}`)
  const activationToken = atob(url.getQuery(activation_link, 'activation'))
  if (!activationToken)
    return console.error('Query "activation" is missing in activation_link')

  const data = {
    username,
    email,
    first_name,
    last_name,
    password,
    realm: `provider/${defaultIdp}`,
    client_id,
    client_secret,
  }
  return sendManager(
    `/api/orgs/${org}/member-invitations/${id}/register`,
    'POST',
    data,
    {Authorization: `Bearer ${activationToken}`}
  )
}

apim.delete = async (items, limit) => {
  assertRequired({items})
  const itemArray = Array.isArray(items) ? items : [items]
  const argsResolver = (i) => {
    const {url} = itemArray[i - 1] || {}
    if (!url) return
    const {pathname} = new URL(url)
    return [pathname, 'DELETE']
  }
  const result = await concurrent(
    sendManager,
    argsResolver,
    items.length,
    limit
  )
  console.log(result)
  return result
}

/************************************************************
 *   Admin
 ************************************************************/

async function sendAdmin(endpoint, method, data, headers = {}) {
  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem('token:admin')}`,
  }
  const computedHeader = {...authHeader, ...headers}
  return http.sendJSON(endpoint, method, data, computedHeader)
}

const apic = {}

apic.signIn = (username, password) => {
  assertRequired({username, password})
  signIn('admin', username, password)
}

apic.setAuthToken = (token) => {
  assertRequired({token})
  localStorage.setItem('token:admin', token.replace(/Bearer\s+/, ''))
}

apic.debug = async (endpoint, method, data, header) => {
  assertRequired({endpoint})
  console.log(await sendAdmin(endpoint, method, data, header))
}

apic.getDefaultUserRegistry = async (app) => {
  assertRequired({app})
  const registries = await sendAdmin('/api/cloud/settings/user-registries')
  if (!registries) return console.error('Failed to get user registries')
  const scope = app === 'admin' ? app : 'provider'
  const registry = registries[`${scope}_user_registry_default_url`]
  if (!registry)
    throw new Error(`Default user registry cannot be found for ${app}.`)
  console.log(registry)
  return registry
}

apic.addMember = async (username, password, email, roles = []) => {
  assertRequired({username})
  log.info('Adding a member to Admin organization', {username, roles})
  const {id: org} = (await apic.getProviderOrg('admin')) || {}
  if (!org) throw new Error('Admin org cannot be found')
  const role_urls = await getRoleUrls('admin', `/api/orgs/${org}/roles`, roles)
  const memberData = {
    username: username,
    password: password,
    first_name: username,
    last_name: username,
  }
  const memberEmail = await apim.generateEmail(
    email,
    Math.floor(Math.random() * 100) + 1
  )

  const inviteProviderOrgMemberData = await apic.inviteAdminOrgMember(
    org,
    memberEmail,
    roles
  )
  const invitationData = {
    id: inviteProviderOrgMemberData.id,
    email: inviteProviderOrgMemberData.email,
    activation_link: inviteProviderOrgMemberData.activation_link,
  }
  log.info(`Invitation sent to user ${username}`)
  await apic.acceptMemberInvite( invitationData, memberData)
  log.info(`Invitation accepted for user ${username}`)
  const endpoint = `/api/orgs/${org}/member-invitations`
  return sendAdmin(endpoint, 'POST', {email, role_urls})
}

apic.addProviderMember = async (providerOrg, username,password, email, roles = []) => {
  assertRequired({username})
  log.debug('Adding a member to provider organization', {username, roles})
  const {id: org} = (await apic.getProviderOrgOfManager(providerOrg)) || {}
  log.debug('org', {org})
  if (!org) log.throw('Provider org cannot be found')
  const role_urls = await getRoleUrls(
    'manager',
    `/api/orgs/${org}/roles`,
    roles
  )
  const memberData = {
    username: username,
    password: password,
    first_name: username,
    last_name: username,
  }
  const memberEmail = await apim.generateEmail(
    email,
    Math.floor(Math.random() * 100) + 1
  )

  const inviteProviderOrgMemberData = await apic.inviteProviderOrgMember(
    org,
    memberEmail,
    roles
  )
  const invitationData = {
    id: inviteProviderOrgMemberData.id,
    email: inviteProviderOrgMemberData.email,
    activation_link: inviteProviderOrgMemberData.activation_link,
  }
  log.info(`Invitation sent to user ${username}`)
  await apic.acceptMemberInvite(org, invitationData, memberData)
  log.info(`Invitation accepted for user ${username}`)
  const endpoint = `/api/orgs/${org}/member-invitations`
  return sendManager(endpoint, 'POST', {email, role_urls})
}

apic.addUser = async (
  app,
  first_name,
  last_name,
  username,
  email,
  password
) => {
  assertRequired({app, first_name, last_name, username, email, password})
  log.info(`Getting the default user registry in ${app}`)
  const registry = await apic.getDefaultUserRegistry(app)
  if (!registry) return console.error('Failed to get default user registries')
  const registryPath = url.getPath(registry)
  const user = {username, email, password, first_name, last_name}
  log.info(`Adding new user to app ${app} with data:`, user)
  return sendAdmin(`${registryPath}/users`, 'POST', user)
}

apic.changePassword = async (currentPassword, newPassword) => {
  assertRequired({currentPassword, newPassword})
  log.info(`Changing password from ${currentPassword} to ${newPassword}`)
  return sendAdmin('/api/me/change-password', 'POST', {
    current_password: currentPassword,
    password: newPassword,
  })
}

apic.configureMailServer = async (mailServer) => {
  log.info('Configuring mail server')
  const {id: org} = (await apic.getProviderOrg('admin')) || {}
  if (!org) throw new Error('Admin org cannot be found')
  const mailServers = await apiGet('admin', `/api/orgs/${org}/mail-servers`)
  if (!mailServers || mailServers.length === 0) {
    console.error('No mail server has been added to Admin organization')
    return
  }
  const data = mailServer || {
    mail_server_url: mailServers[0].url,
    email_sender: {name: 'APIC Administrator', address: 'ibmapic@gmail.com'},
  }
  return sendAdmin('/api/cloud/settings', 'PUT', data)
}

apic.createMailServer = async (mailServer) => {
  const {id: org} = (await apic.getProviderOrg('admin')) || {}
  if (!org) throw new Error('Admin org cannot be found')
  const clientTLS = await apiFind(
    'admin',
    `/api/orgs/${org}/tls-client-profiles`,
    'title',
    'Default TLS'
  )
  if (!clientTLS || !clientTLS.url) {
    console.error('Default client TLS cannot be found')
    return
  }

  const data = mailServer || {
    title: 'ibmapic Gmail',
    name: 'ibmapic-gmail',
    host: 'smtp.gmail.com',
    port: 587,
    credentials: {username: 'ibmapic@gmail.com', password: 'ap1connect'},
    secure: true,
  }
  data.tls_client_profile_url = clientTLS.url

  return sendAdmin(`/api/orgs/${org}/mail-servers`, 'POST', data)
}

apic.createProviderOrg = async (title, owner) => {
  assertRequired({title, owner})
  log.info(`Checking if user "${owner}" is added to provider scope`)
  const {res, err} = await tryCatch(apic.getUser, 'manager', owner)
  const addUser = res && res.status === 404
  if (addUser) {
    log.info(`Adding user ${owner}`)
    const userAdded = await apic.addUser(
      'manager',
      owner,
      owner,
      owner,
      `${owner}+${owner}@test.ibm.com`,
      '7iron-hide'
    )
    if (!userAdded) throw new Error(`Failed to add user ${owner}`)
  } else if (err) throw new Error(err)
  log.info(`Creating provider org ${title}`)
  const ownerData = await apic.getUser('manager', owner)
  if (!ownerData) throw new Error(`Cannot find user with username ${owner}`)
  const org = {title, name: slugify(title), owner_url: ownerData.url}
  console.log(org)
  return sendAdmin('/api/cloud/orgs', 'POST', org)
}

apic.getProviderOrgs = async () => {
  const {results} = await sendAdmin('/api/cloud/orgs')
  console.log(results)
  return results
}

apic.getProviderOrg = async (name) => {
  assertRequired({name})
  log.info(`Finding provider organization with name ${name}`)
  const result = await sendAdmin(`/api/orgs/${name}`)
  console.log(result)
  return result
}

apic.getProviderOrgOfManager = async (name) => {
  assertRequired({name})
  log.info(`Finding provider organization with name ${name}`)
  const result = await sendManager(`/api/orgs/${name}`)
  console.log(result)
  return result
}

apic.getUser = async (app, username) => {
  assertRequired({app, username})
  const registry = await apic.getDefaultUserRegistry(app)
  if (!registry) return console.error('Failed to get default user registry')
  const registryPath = url.getPath(registry)
  const result = await sendAdmin(`${registryPath}/users/${username}`)
  console.log(result)
  return result
}

apic.registerGatewayService = async (type, endpointURL, baseURL) => {
  assertRequired({type})
  const endpoint = endpointURL || hosts.getGatewayEndpoint(type)
  if (!endpoint) return console.error('Failed to compute endpoint')
  const api_endpoint_base = baseURL || hosts.getGatewayEndpointBase(type)
  if (!api_endpoint_base)
    return console.error('Failed to compute base endpoint')
  const {id: org} = (await apic.getProviderOrg('admin')) || {}
  if (!org) throw new Error('Admin org cannot be found')
  const clientTLS = await apiFind(
    'admin',
    `/api/orgs/${org}/tls-client-profiles`,
    'title',
    'Default TLS'
  )
  if (!clientTLS) return console.error('Failed to get Default Client TLS')
  const serverTLS = await apiFind(
    'admin',
    `/api/orgs/${org}/tls-server-profiles`,
    'title',
    'Default TLS'
  )
  if (!serverTLS) return console.error('Failed to get Default Server TLS')
  const gateway_service_type = `datapower${type === 'v6' ? '-api' : ''}-gateway`
  const gwIntegration = await apiGet(
    'admin',
    `/api/cloud/integrations/gateway-service/${gateway_service_type}`
  )
  if (!gwIntegration) return console.error('Failed to get Gateway Integration')
  const gwData = {
    name: `${type}gw`,
    title: this.name,
    endpoint,
    api_endpoint_base,
    tls_client_profile_url: clientTLS.url,
    gateway_service_type,
    visibility: {type: 'public'},
    sni: [{host: '*', tls_server_profile_url: serverTLS.url}],
    integration_url: gwIntegration.url,
  }
  return sendAdmin(
    `/api/orgs/${org}/availability-zones/availability-zone-default/` +
      'gateway-services',
    'POST',
    gwData
  )
}

apic.registerPortalService = async (title, endpointURL, baseURL) => {
  const {id: org} = (await apic.getProviderOrg('admin')) || {}
  if (!org) throw new Error('Admin org cannot be found')
  const endpoint = endpointURL || hosts.getPortalEndpoint()
  if (!endpoint) return console.error('Failed to compute base endpoint')
  const web_endpoint_base = baseURL || hosts.getPortalEndpointBase()
  if (!web_endpoint_base)
    return console.error('Failed to compute base endpoint')
  const computedTitle = title || 'portal'
  const portalData = {
    title: computedTitle,
    name: slugify(computedTitle),
    endpoint,
    web_endpoint_base,
    visibility: {group_urls: null, org_urls: null, type: 'public'},
  }
  return sendAdmin(
    `/api/orgs/${org}/availability-zones/availability-zone-default/` +
      'portal-services',
    'POST',
    portalData
  )
}

apic.delete = async (items, limit) => {
  assertRequired({items})
  const itemArray = Array.isArray(items) ? items : [items]
  const argsResolver = (i) => {
    const {url} = itemArray[i - 1] || {}
    if (!url) return
    const {pathname} = new URL(url)
    return [pathname, 'DELETE']
  }
  const result = await concurrent(sendAdmin, argsResolver, items.length, limit)
  console.log(result)
  return result
}
