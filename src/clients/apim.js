// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const fs = require('fs')
const qs = require('querystring')
const path = require('path')
const {get} = require('lodash')
const {name} = require('faker')
const {
  base64: {decode},
  concurrent,
  log,
  randNum,
  slugify,
  titleGenerator,
  url: {getAPIEndpoint, getPath, getQuery, sanitize},
  validate: {assertRequired, assertTypes, assertCondition},
  string: {getGatewayNameByType},
  generateBasicAPI,
} = require('../utils')
const {
  getDefaultIdProvider,
  setAuthToken,
  signIn,
  signOut,
} = require('./helpers/auth-client')
const {
  sendManager,
  sendRequest,
  sendConsumer,
  sendRequestToURL,
  sendAdmin,
} = require('./helpers/api-clients')
const getHost = require('./helpers/get-host')
const {
  client_id,
  client_secret,
  consumer_client_id,
  consumer_client_secret,
} = require('../configs')
const {apiGet, getRoleUrls, apiFind} = require('./common')
const simpleAPI = require('../assets/apis/simple-api')
const simpleProduct = require('../assets/products/simple-product')
const complexAPIv6 = require('../assets/apis/complex-api-v6')
const complexAPIv5 = require('../assets/apis/complex-api-v5')
const complexProduct = require('../assets/products/complex-product')

const assetsDir = path.resolve(__dirname, '../assets')

/**
 * Gets provider organization data (name, id, url, etc.)
 * @param {String} org name or id of provider organization
 */
async function getOrg(org) {
  assertRequired({org})
  return sendManager(`/api/orgs/${org}`)
}

/**
 * Gets draft APIs in provider organization provided
 * @param {String} org name or id of provider organization
 * @param {Boolean} [fullAPI] include draft_api field in result
 */
async function getAPIs(org, fullAPI) {
  assertTypes({org}, 'string')
  let endpoint = `/api/orgs/${org}/drafts/draft-apis`
  if (fullAPI) endpoint += '?fields=add(draft_api)'
  return apiGet('manager', endpoint)
}

/**
 * create a draft APIs in provider organization provided
 * @param {String} org name or id of provider organization
 * @param {String} title title to use for API
 * @param {Number} [versions] number of version to create for the api
 * @param {String} [gateway] gateway type for the product [v6 or v5]
 *  (default: v6)
 * @param {Number} [limit] number of concurrent create API requests to send
 */
async function createAPI(
  org,
  title,
  versions = 1,
  gateway,
  limit,
  type = 'simple'
) {
  assertRequired({org, title})
  let api = simpleAPI
  if (type === 'complex') {
    if (gateway === 'v5') api = complexAPIv5
    if (gateway === 'v6') api = complexAPIv6
  }

  api['x-ibm-configuration'].gateway = getGatewayNameByType(gateway)
  const name = slugify(title)
  const argResolver = (i) => {
    const body = {
      draft_api: {
        ...api,
        basePath: `/${name}`,
        info: {title, 'x-ibm-name': `${name}`, version: `${i}.0.0`},
      },
    }
    return [`/api/orgs/${org}/drafts/draft-apis`, 'POST', body]
  }
  return concurrent(sendManager, argResolver, versions, limit)
}

/**
 * create a draft API (OAI2 or OAI3) in provider organization provided
 * @param {String} org name or id of provider organization
 * @param {String} title title to use for API
 * @param {Number} [versions] number of version to create for the api
 * @param {String} [type] type of draft API (oai2 or oai3) [default: oai3]
 * @param {String} [gateway] gateway type for the product [v6 or v5]
 *  (default: v6)
 * @param {Number} [limit] number of concurrent create API requests to send
 * @returns {object} object with metadata for newly added draft API
 */
async function createOpenAPI(
  org,
  title,
  versions = 1,
  type = 'oai3',
  gateway,
  limit
) {
  assertRequired({org, title})
  const endpoint = `/api/orgs/${org}/drafts/draft-apis`
  const argsResolver = (i) => {
    const body = {
      draft_api: generateBasicAPI(type, title, `${i}.0.0`, gateway),
    }
    return [endpoint, 'POST', body]
  }
  const result = await concurrent(sendManager, argsResolver, versions, limit)
  return result
}

/**
 * create draft APIs (OAI2 and OAI3) in provider organization provided
 * @param {String} org name or id of provider organization
 * @param {number} amount number of assorted APIs to generate
 * @param {string} prefix API title prefix
 * @param {string} gateway gateway type for the product [v6 or v5]
 * @param {Number} [limit] number of concurrent create API requests to send
 * @returns {Array<object>} array of object containing metadata for added draft
 *  APIs
 */
async function createOpenAPIs(org, amount, prefix, gateway, limit) {
  assertRequired({org, amount})
  let amountRemaining = amount
  const apiTitleGenerator = titleGenerator(prefix, 'API')
  const results = []
  while (amountRemaining > 0) {
    let apiSet = []
    const title = apiTitleGenerator.next().value
    const maxVersions = Math.min(Math.floor(amount / 5), 25)
    const apiType = randNum(0, 1) ? 'oai2' : 'oai3'
    let versions = Math.min(randNum(1, maxVersions), amountRemaining)
    versions = randNum(0, 9) < 7 ? 1 : versions
    apiSet = await createOpenAPI(org, title, versions, apiType, gateway, limit)
    amountRemaining -= versions
    results.push(...(apiSet || []))
  }
  return results
}

/**
 * Create a wsdl api with multiple versions
 * @param {String} org name or id of provider organization
 * @param {String} title title of the new API
 * @param {Number} [versions] number of version to create for the api
 * @param {String} [gateway] gateway type for the product [v6 or v5]
 *  (default: v6)
 * @param {Number} [limit] number of concurrent create API requests to send
 */
async function createWsdlAPI(
  org,
  title,
  versions = 1,
  gateway,
  limit,
  type = 'simple'
) {
  assertRequired({org, title})
  const gatewayName = getGatewayNameByType(gateway)
  const name = slugify(title)
  const query = {
    wsdl_service: name,
    api_type: 'wsdl',
    gateway_type: gatewayName,
  }
  let wsdl =
    type === 'simple'
      ? fs.readFileSync(`${assetsDir}/apis/wsdl.xml`, 'UTF-8')
      : fs.readFileSync(`${assetsDir}/apis/complex-wsdl.xml`, 'UTF-8')
  let openapi = fs.readFileSync(`${assetsDir}/apis/wsdl.json`, 'UTF-8')
  wsdl = wsdl.replace(/_NameSpace_/gi, name)
  openapi = openapi
    .replace(/_NameSpace_/gi, name)
    .replace('datapower-api-gateway', gatewayName)
  const argResolver = (i) => {
    openapi = openapi.replace(/\d+\.0\.0/, `${i}.0.0`)
    const formData = {
      wsdl: {
        value: Buffer.from(wsdl, 'utf8'),
        options: {
          filename: `${name}.wsdl`,
          contentType: 'application/wsdl',
        },
      },
      openapi: {
        value: Buffer.from(openapi, 'utf8'),
        options: {
          filename: name,
          contentType: 'application/json',
        },
      },
    }
    return [
      'manager',
      `/api/orgs/${org}/drafts/draft-apis?${qs.stringify(query)}`,
      {formData, method: 'POST'},
    ]
  }
  const res = await concurrent(sendRequest, argResolver, versions, limit)
  return res.map((api) => {
    return api.body
  })
}

/**
 * Create assorted APIs
 * @param {String} org name or id of provider organization
 * @param {Number} amount number of assorted APIs to generate
 * @param {String|Array<String>} [title] prefix for default title or array of
 *  titles to use for APIs (default: `[Generated Name] API`)
 * @param {String} [gateway] gateway type for the product [v6 or v5]
 *  (default: v6)
 * @param {Number} [max] maximum versions to create for an API (default: 25)
 * @param {Number} [min] minimum versions to create for an API (default: 1)
 */
async function createAPIs(
  org,
  amount,
  title,
  gateway,
  max = 25,
  min = 1,
  type = 'simple'
) {
  assertRequired({org, amount})
  assertCondition('min <= max && min <= amount', min <= max && min <= amount)
  let amountRemaining = amount
  const apiTitleGenerator = titleGenerator(title, 'API')
  const results = []
  while (amountRemaining > 0) {
    const apiTitle = apiTitleGenerator.next().value
    let apiSet = []
    // todo: figure out how to exclude proxy assembly for v5 gateways
    const apiMethod =
      randNum(0, 9) > 7 && gateway !== 'v5' ? createWsdlAPI : createAPI
    if (randNum(0, 9) < 7) {
      apiSet = await apiMethod(org, apiTitle, 1, gateway, null, type)
      amountRemaining--
    } else {
      const maxVersions = Math.min(Math.floor(amount / 5), 25)
      const numOfVersions = Math.min(
        randNum(min, maxVersions),
        amountRemaining
      )
      apiSet = await apiMethod(
        org,
        apiTitle,
        numOfVersions,
        gateway,
        null,
        type
      )
      amountRemaining -= numOfVersions
    }
    results.push(...(apiSet || []))
  }
  return results
}

/**
 * Gets draft product in org, or published products in catalog if catalog is
 *  provided, or published products in space if both catalog and space
 *  provided.
 * @param {String} org name or id of provider organization
 * @param {String} [catalog] name or id of catalog
 * @param {String} [space] name or id of space
 *
 */
async function getProducts(org, catalog, space) {
  assertRequired({org})
  const prop = catalog || space ? 'results' : 'draft_products'
  let endpoint = `/api/orgs/${org}/drafts`
  if (catalog && space) {
    endpoint = `/api/spaces/${org}/${catalog}/${space}/products`
  } else if (catalog) {
    endpoint = `/api/catalogs/${org}/${catalog}/products`
  }
  return apiGet('manager', endpoint, prop)
}

/**
 * Format API(s) (which can be an object or an array of API objects; or, a
 *  function which returns an API object or array of API objects for ith
 *  version) to an API object format required for adding API(s) to a product
 * @param {Function|Object<string,any>|Array<Object<string,any>>} apis an API
 *  object or an array of API objects or a function with signature
 *  `apis(i: number): Object|Array<Object>`
 * @param {Number} i ith version of new product added
 */
function formatAPIs(apis, i) {
  const apiObject = {}
  if (!apis || apis.length === 0) return apiObject
  const computedAPIs = typeof apis === 'function' ? apis(i) : apis
  const arrayOfAPIs = Array.isArray(computedAPIs)
    ? computedAPIs
    : [computedAPIs]
  arrayOfAPIs.forEach((api) => {
    const {name, version} = api || {}
    if (!name || !version)
      return log.warn('Found an invalid api (excluded)', api)
    apiObject[`${name}${version}`] = {name: `${name}:${version}`}
  })
  return apiObject
}

/**
 * create a draft products in provider organization provided
 * @param {String} org name or id of provider organization
 * @param {String} title title to use for product
 * @param {Function|Object<string,any>|Array<Object<string,any>>} apis an API
 *  object or an array of API objects; or, a function which returns an API
 *  object or array of API objects for ith version. Function signature:
 *  `apis(i: number): Object|Array<Object>`
 * @param {Number} [versions] number of version to create for each product
 * @param {String} [gateway] gateway type for the product [v6 or v5]
 *  (default: v6)
 * @param {Number} [limit] number of concurrent create product requests to send
 */
async function createProduct(
  org,
  title,
  apis,
  versions = 1,
  gateway,
  limit,
  type = 'simple'
) {
  assertRequired({org, title, apis})
  let product = simpleProduct
  if (type === 'complex') product = complexProduct

  product.gateways = [getGatewayNameByType(gateway)]
  const name = slugify(title)
  const argResolver = (i) => {
    const body = {
      draft_product: {
        ...product,
        apis: formatAPIs(apis, i),
        info: {name, title, version: `${i}.0.0`},
      },
    }
    return [`/api/orgs/${org}/drafts/draft-products`, 'POST', body]
  }
  return concurrent(sendManager, argResolver, versions, limit)
}

/**
 * Generate assorted products
 * @param {String} org name or id of provider organization
 * @param {Number} amount number of assorted products to generate
 * @param {Array<Object<string,any>>} apis array of apis to use for product
 * @param {String|Array<String>} [title] prefix for default title or array of
 *  titles to use for APIs (default: `[Generated Name] Product`)
 * @param {String} [gateway] gateway type for the product [v6 or v5]
 *  (default: v6)
 * @param {Boolean} [distribute] distribute APIs amongst new product evenly
 *  (No shared API)
 *  - Note: number of APIs must be greater than or equal to number of new
 *  products to create
 * @param {Number} [maxAPIs] maximum APIs to add to a new product (default: 100)
 * @param {Number} [max] maximum versions to create for an API (default: 25)
 * @param {Number} [min] minimum versions to create for an API (default: 1)
 */
async function createProducts(
  org,
  amount,
  apis,
  title,
  gateway,
  distribute,
  maxAPIs = 100,
  max = 25,
  min = 1,
  type = 'simple'
) {
  let amountRemaining = amount
  const results = []
  const apiLen = (apis && apis.length) || 0
  const distributeAPIs = distribute && apis.length >= amount
  const apiDistributor = (i) => {
    return apis[results.length + i - 1]
  }
  const productTitleGenerator = titleGenerator(title, 'Product')
  while (amountRemaining > 0) {
    const productTitle = productTitleGenerator.next().value
    let productAPIs = []
    let productSet = []
    if (apiLen > 0) {
      const apiLow = randNum(0, apiLen - 2)
      let apiHigh = randNum(apiLow + 1, apiLen - 1)
      if (apiHigh - apiLow > maxAPIs) {
        apiHigh = apiLow + maxAPIs
      }
      productAPIs = apis.slice(apiLow, apiHigh)
    }
    if (distributeAPIs) productAPIs = apiDistributor
    if (randNum(0, 9) < 7) {
      productSet = await createProduct(
        org,
        productTitle,
        productAPIs,
        1,
        gateway,
        null,
        type
      )
      amountRemaining--
    } else {
      const maxVersions = Math.min(Math.floor(amount / 5), max)
      const numOfVersions = Math.min(
        randNum(min, maxVersions),
        amountRemaining
      )
      productSet = await createProduct(
        org,
        productTitle,
        productAPIs,
        numOfVersions,
        gateway,
        null,
        type
      )
      amountRemaining -= numOfVersions
    }
    results.push(...(productSet || []))
  }
  return results
}

/**
 * publish a draft product to a catalog or space (if provided)
 * @param {String} org name or id of provider organization
 * @param {Object} product draft product object
 * @param {String} product.url url of the draft product
 * @param {String} catalog name or id of catalog
 * @param {String} [space] name or id of space
 */
async function publishProduct(org, product, catalog, space) {
  assertRequired({org, catalog})
  assertRequired({product}, ['url'])
  const endpoint = space
    ? `/api/spaces/${org}/${catalog}/${space}/publish-draft-product`
    : `/api/catalogs/${org}/${catalog}/publish-draft-product`
  const body = {draft_product_url: product.url}
  return sendManager(endpoint, 'POST', body)
}

/**
 * publish draft products to a catalog or space (if provided)
 * @param {Object|Array.<Objects>} products an object (must have url property
 *  of a draft product) or array of Objects
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {String} [space] name or id of space
 * @param {Number} [limit] number of concurrent create product requests to send
 */
async function publishProducts(org, products, catalog, space, limit) {
  assertRequired({org, products, catalog})
  // v6gw OR ?gateway_services=v5gw OR ?gateway_services=
  const productArray = Array.isArray(products) ? products : [products]
  const endpoint = space
    ? `/api/spaces/${org}/${catalog}/${space}/publish-draft-product`
    : `/api/catalogs/${org}/${catalog}/publish-draft-product`
  const argResolver = (i) => {
    const body = {draft_product_url: productArray[i - 1].url}
    return [endpoint, 'POST', body, {}, 3]
  }
  return concurrent(sendManager, argResolver, productArray.length, limit)
}

/**
 * consent to cloud level analytics
 * @param {String} org name or id of provider organization
 */
async function consentCloudAnalytics(org) {
  assertRequired({org})
  const body = {runtime_api_opt_in_datagather_enabled: true}
  return sendManager(`/api/orgs/${org}/settings`, 'PUT', body)
}

/**
 * Get catalog in provider organizations provided
 * @param {String} org name or id of provider organization
 */
async function getCatalogs(org) {
  assertRequired({org})
  const endpoint = org ? `/api/orgs/${org}/catalogs` : '/api/catalogs'
  return apiGet('manager', endpoint)
}

/**
 * create a catalog
 * @param {String} org name or id of provider organization
 * @param {String} title title for the catalog
 */
async function createCatalog(org, title) {
  assertRequired({org, title})
  const body = {title, name: slugify(title)}
  return sendManager(`/api/orgs/${org}/catalogs`, 'POST', body)
}

/**
 * create catalogs
 * @param {String} org name or id of provider organization
 * @param {Number} amount number of catalogs to create (each with unique name)
 * @param {Number} [limit] number of concurrent create catalog requests to send
 * @param {String|Array<String>} [title] prefix for default title or array of
 *  titles to use for APIs (default: `[Generated Name] Catalog`)
 */
async function createCatalogs(org, amount, limit, title) {
  assertRequired({org, amount})
  const catalogTitleGenerator = titleGenerator(title, 'Catalog')
  const argResolver = () => {
    const catalogTitle = catalogTitleGenerator.next().value
    const body = {title: catalogTitle, name: slugify(catalogTitle)}
    return [`/api/orgs/${org}/catalogs`, 'POST', body]
  }
  return concurrent(sendManager, argResolver, amount, limit)
}

/**
 * Enable spaces for a catalog
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 */
async function enableSpace(org, catalog) {
  assertRequired({org, catalog})
  const endpoint = `/api/catalogs/${org}/${catalog}/settings`
  const data = {spaces_enabled: true, application_lifecycle: {}}
  return sendManager(endpoint, 'PUT', data)
}

/**
 * Get spaces added in a catalog
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 */
async function getSpaces(org, catalog) {
  assertRequired({org, catalog})
  const endpoint = `/api/catalogs/${org}/${catalog}/spaces`
  return apiGet('manager', endpoint)
}

/**
 * create a space
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {String} title title of the space
 */
async function createSpace(org, catalog, title) {
  assertRequired({org, catalog, title})
  const body = {title, name: slugify(title)}
  return sendManager(`/api/catalogs/${org}/${catalog}/spaces`, 'POST', body)
}

/**
 * create spaces
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {Number} amount number of spaces to create (each with unique name)
 * @param {Number} [limit] number of concurrent create space requests to send
 * @param {String|Array<String>} [title] prefix for default title or array of
 *  titles to use for APIs (default: `[Generated Name] Space`)
 */
async function createSpaces(org, catalog, amount, limit, title) {
  assertRequired({org, catalog, amount})
  const spaceTitleGenerator = titleGenerator(title, 'Space')
  const argResolver = () => {
    const spaceTitle = spaceTitleGenerator.next().value
    const body = {title: spaceTitle, name: slugify(spaceTitle)}
    return [`/api/catalogs/${org}/${catalog}/spaces`, 'POST', body]
  }
  return concurrent(sendManager, argResolver, amount, limit)
}

/**
 * Get OAuthProviders
 * @param {String} org name or id of provider organization
 */
async function getOAuthProviders(org, catalog) {
  const endpoint = catalog
    ? `/api/catalogs/${org}/${catalog}/configured-oauth-providers`
    : `/api/orgs/${org}/oauth-providers`
  return apiGet('manager', endpoint)
}

/**
 * Enable all of configured OAuth Providers for catalog or space (if provided)
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {String} [space] name or id of space
 * @param {String} [filterCallback] refer to callback syntax for Array.filter
 */
async function configureOAuthProviders(org, catalog, space, filterCallback) {
  assertRequired({org, catalog})
  let providers = await getOAuthProviders(org)
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
async function addOAuthProvidersToAPIs(org, prefix = '', min = 0, max = 10) {
  assertTypes({org}, 'string')
  if (min) assertTypes({min}, 'number')
  if (max) assertTypes({max}, 'number')

  const oAuth = await getOAuthProviders(org, 'sandbox')
  const draftAPIs = await getAPIs(org, true)
  if (!oAuth || !Array.isArray(oAuth) || oAuth.length === 0)
    return log.error('No oAuth configured in sandbox catalog')
  if (!draftAPIs || !Array.isArray(draftAPIs) || draftAPIs.length === 0)
    return log.error('No draft apis are added')

  const argResolver = (i) => {
    if (randNum(0, 3) === 3) return // skip adding oauth to this api
    const draftAPI = draftAPIs[i - 1]
    const patchEndpoint = getAPIEndpoint(draftAPI.url)
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

/**
 * Enable all of configured gateways of catalog or space (if provided)
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {String} [space] name or id of space
 */
async function enableConfiguredGateways(org, catalog, space) {
  assertRequired({org, catalog})
  const gateways = await apiGet('manager', `/api/orgs/${org}/gateway-services`)
  if (!gateways || gateways.length === 0)
    return log.info(`No configured gateways found in ${catalog}, ${space}`)
  const endpoint = space
    ? `/api/spaces/${org}/${catalog}/${space}/configured-gateway-services`
    : `/api/catalogs/${org}/${catalog}/configured-gateway-services`
  const argResolver = (i) => {
    const body = {gateway_service_url: gateways[i - 1].url}
    return [endpoint, 'POST', body]
  }
  return concurrent(sendManager, argResolver, gateways.length)
}

/**
 * Add the first portal service of configured portal services to a catalog
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {String} [endpointBase] portal endpoint
 * @param {String} [serviceURL] portal service URL
 */
async function addPortalService(org, catalog, endpointBase, serviceURL) {
  const portal = await apiGet('manager', `/api/orgs/${org}/portal-services`)
  if (!portal || portal.length === 0)
    return log.error('No portal is configured in Admin app')
  const fetchedServiceURL = sanitize(get(portal, '0.url'))
  const derivedEndpointBase = await getHost('portalEndpointBase')
  const derivedEndpointBaseWithPath = `${derivedEndpointBase}/${org}/${catalog}`
  const computedEndpointBase = endpointBase || derivedEndpointBaseWithPath
  const data = {
    portal: {
      endpoint: `${computedEndpointBase}`,
      portal_service_url: serviceURL || fetchedServiceURL,
      type: 'drupal',
    },
    application_lifecycle: {},
  }
  return sendManager(`/api/catalogs/${org}/${catalog}/settings`, 'PUT', data)
}

/**
 * Get all of consumer organization in a catalog or space (if provided)
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {String} [space] name or id of space
 */
async function getConsumerOrgs(org, catalog, space) {
  assertRequired({org, catalog})
  const endpoint = space
    ? `/api/spaces/${org}/${catalog}/${space}/consumer-orgs`
    : `/api/catalogs/${org}/${catalog}/consumer-orgs`
  return apiGet('manager', endpoint)
}

/**
 * create a consumer organization
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {String} title title for the new consumer organization
 */
async function createConsumerOrg(org, catalog, title, consumer) {
  assertRequired({org, catalog, title})
  const registriesEndpoint =
    `/api/catalogs/${org}/${catalog}` + '/configured-catalog-user-registries'
  const registries = await apiGet('manager', registriesEndpoint)
  if (!registries || registries.length === 0)
    log.throw('No catalog user registry is configured')
  const registryId = registries[0].user_registry_url.split('/').pop()
  const usersEndpoint = `/api/user-registries/${org}/${registryId}/users`
  const users = await apiGet('manager', usersEndpoint)
  let owner_url
  if (users.length === 0) {
    const cOrgUsername = consumer.username || 'testUser'
    const cOrgEmail = consumer.email || 'testuser@test.ibm.com'
    const cOrgPasword = consumer.password || '7iron-hide'
    log.info(`Creating consumer org ${cOrgUsername}:${cOrgPasword}`)
    const newUserData = {
      username: cOrgUsername,
      email: cOrgEmail,
      first_name: 'Test',
      last_name: 'User',
      password: cOrgPasword,
    }
    const newUser = await sendManager(usersEndpoint, 'POST', newUserData)
    if (!newUser.url) log.throw('Failed to add consumer organization user')
    owner_url = newUser.url
  } else {
    owner_url = users[0].url
  }
  const consumerOrgEndpoint = `/api/catalogs/${org}/${catalog}/consumer-orgs`
  const body = {title, name: slugify(title), owner_url}
  return sendManager(consumerOrgEndpoint, 'POST', body)
}

/**
 * create consumer organizations and optionally consumer org members inside them
 * @param {String} providerOrg name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {Number} amount number of consumer organizations to create
 *  (each with unique name)
 * @param {String|Array<String>} [title] prefix for default title or array of
 *  titles to use for APIs (default: `[Generated Name] Consumer Organization`)
 * @param {Object} [consumer] consumer object
 * @param {String} [consumer.username] consumer org owner/member username
 * @param {String} [consumer.password] consumer org owner/member password
 * @param {String} [consumer.email] consumer org owner/member email
 * @param {Number} [consumer.numberofConsumers] number of consumer org members to generate
 * @param {Array<String>} [consumer.consumerRoles] number of consumer org members to generate
 * @param {Number} [limit] number of concurrent create consumer organization
 *  requests to send
 */
async function createConsumerOrgs(
  providerOrg,
  catalog,
  amount,
  title,
  consumer,
  limit
) {
  assertRequired({providerOrg, catalog, amount})
  const registriesEndpoint =
    `/api/catalogs/${providerOrg}/${catalog}` +
    '/configured-catalog-user-registries'
  const registries = await apiGet('manager', registriesEndpoint)
  if (!registries || registries.length === 0)
    log.throw('No user registry is configured')

  const registryId = registries[0].user_registry_url.split('/').pop()
  const usersEndpoint = `/api/user-registries/${providerOrg}/${registryId}/users`
  const users = await apiGet('manager', usersEndpoint)
  const cOrgUsername = consumer.username || 'testUser'
  const cOrgEmail = consumer.email || 'testuser@test.ibm.com'
  const cOrgPasword = consumer.password || '7iron-hide'
  let owner_url

  // create a consumer org with a member if no cOrg members exist, or create memeber if user is sandox test-user
  if (
    users.length === 0 ||
    (users.length === 1 && users[0].username == 'test-user')
  ) {
    log.info(`Creating consumer org ${cOrgUsername}:${cOrgPasword}`)
    const newUserData = {
      username: cOrgUsername,
      email: cOrgEmail,
      first_name: name.firstName(),
      last_name: name.lastName(),
      password: cOrgPasword,
    }
    const newUser = await sendManager(usersEndpoint, 'POST', newUserData)
    owner_url = newUser.url
  } else {
    // otherwise use the first user we can find as the owner
    log.debug(`Using user ${users[0].username} as consumer org owner.`)
    owner_url = users[0].url
  }

  const cOrgTitleGenerator = titleGenerator(title, 'Consumer Organization')
  const cOrgEndpoint = `/api/catalogs/${providerOrg}/${catalog}/consumer-orgs`
  const argResolver = () => {
    const cOrgTitle = cOrgTitleGenerator.next().value
    const body = {title: cOrgTitle, name: slugify(cOrgTitle), owner_url}
    return [cOrgEndpoint, 'POST', body]
  }

  // concurrently create all consumer orgs
  const results = await concurrent(sendManager, argResolver, amount, limit)
  if (amount === 0) return

  // populate consumer orgs with members
  await consumerSignIn(
    cOrgUsername,
    cOrgPasword,
    `${catalog}-idp`,
    providerOrg,
    catalog
  )
  const numberofConsumers = consumer.numberofConsumers || 1
  for (const consumerOrg of results) {
    await addAllConsumerMembers(
      consumerOrg,
      cOrgEmail,
      providerOrg,
      catalog,
      numberofConsumers,
      consumer.consumerRoles
    )
  }

  return results
}

/**
 * Concurrently add a specified amount of consumer members into a consumer org
 * @param {Object} consumerOrg consumer org object
 * @param {String} consumerOrg.name
 * @param {String} consumerOrgEmail consumer org email (will be used to generate new emails for each member)
 * @param {String} providerOrg name or id of provider org
 * @param {String} catalog name or id of catalog
 * @param {Number} numberofConsumers number of consumers to add into the consumer org
 * @param {Array<String>} consumerRoles consumer roles to randomly choose from
 */
async function addAllConsumerMembers(
  consumerOrg,
  consumerOrgEmail,
  providerOrg,
  catalog,
  numberofConsumers,
  consumerRoles
) {
  assertRequired({consumerOrg}, ['name'])
  assertRequired({consumerOrgEmail, providerOrg, catalog, numberofConsumers})
  assertTypes({numberofConsumers}, 'number')

  const argResolver = (i) => {
    return [
      consumerOrg,
      i,
      consumerOrgEmail,
      providerOrg,
      catalog,
      consumerRoles,
    ]
  }

  log.info(
    `Populating consumer org: ${
      consumerOrg.name
    } with ${numberofConsumers} user${numberofConsumers > 1 ? 's' : ''}`
  )
  return await concurrent(addConsumerMember, argResolver, numberofConsumers, 2)
}

/**
 * Add a consumer member into a consumer org
 * @param {Object} consumerOrg consumer org object
 * @param {String} consumerOrg.name
 * @param {Object} index an index used to make this consumer member unique
 * @param {String} consumerOrgEmail consumer org email (will be used to generate new emails for each member)
 * @param {String} providerOrg name or id of provider org
 * @param {String} catalog name or id of catalog
 * @param {Array<String>} consumerRoles consumer roles to randomly choose from
 */
async function addConsumerMember(
  consumerOrg,
  index,
  consumerOrgEmail,
  providerOrg,
  catalog,
  consumerRoles
) {
  const roles = consumerRoles
    ? consumerRoles
    : ['viewer', 'developer', 'administrator']
  const role = roles[Math.floor(Math.random() * roles.length)]
  const memberEmail = await generateEmail(consumerOrgEmail, index)
  const memberInvitation = await inviteConsumerOrgMember(
    consumerOrg.name,
    providerOrg,
    catalog,
    memberEmail,
    [role]
  )
  const user = `portal${index}`
  const memberData = {
    username: user,
    password: '7iron-hide',
    first_name: name.firstName(),
    last_name: `${name.lastName()} (${role})`,
    email: memberEmail,
  }
  if (await consumerOrgMemberExists(user, providerOrg, `${catalog}-catalog`)) {
    return await acceptConsumerOrgMember(
      providerOrg,
      consumerOrg.name,
      catalog,
      memberInvitation,
      memberData
    )
  } else {
    return await registerConsumerOrgMember(
      providerOrg,
      consumerOrg.name,
      catalog,
      memberInvitation,
      memberData
    )
  }
}

/**
 * Injects an ID into the provided email using the + annotation
 * @param {String} email email you want to manipulate
 * @param {String} id id to inject into the email
 */
async function generateEmail(email, id) {
  const emailParts = email.split('@')
  return `${emailParts[0]}+${id}@${emailParts[1]}`
}

/**
 * Get all of consumer groups in a catalog or space (if provided)
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {String} [space] name or id of space
 */
async function getConsumerGroups(org, catalog, space) {
  assertRequired({org, catalog})
  const endpoint = space
    ? `/api/spaces/${org}/${catalog}/${space}/consumer-groups`
    : `/api/catalogs/${org}/${catalog}/consumer-groups`
  return apiGet('manager', endpoint)
}

/**
 * create a consumer group
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {String} title title of the consumer group
 */
async function createConsumerGroup(org, catalog, title) {
  assertRequired({org, catalog, title})
  return sendManager(
    `/api/catalogs/${org}/${catalog}/consumer-groups`,
    'POST',
    {title, name: slugify(title), org_urls: []}
  )
}

/**
 * create consumer groups
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {Number} amount number of consumer groups to create
 *  (each with unique name)
 * @param {Number} [limit] number of concurrent create consumer groups requests
 *  to send
 * @param {String|Array<String>} [title] prefix for default title or array of
 *  titles to use for APIs (default: `[Generated Name] Consumer Group`)
 */
async function createConsumerGroups(org, catalog, amount, limit, title) {
  assertRequired({org, catalog, amount})
  const groupTitleGenerator = titleGenerator(title, 'Consumer Group')
  const argResolver = () => {
    const groupTitle = groupTitleGenerator.next().value
    const body = {title: groupTitle, name: slugify(groupTitle), org_urls: []}
    return [`/api/catalogs/${org}/${catalog}/consumer-groups`, 'POST', body]
  }
  return concurrent(sendManager, argResolver, amount, limit)
}

/**
 * Associate a consumer organization to a consumer group
 * @param {Object} org consumer org object with the required property: url
 * @param {Object} group consumer group object with the required property: url
 */
async function addConsumerOrgToGroup(org, group) {
  assertRequired({org, group}, ['url'])

  const endpoint = `/api${group.url.split('/api')[1]}`
  const {org_urls = []} = await apiGet('manager', endpoint)

  return sendManager(endpoint, 'PATCH', {org_urls: [...org_urls, org.url]})
}

/**
 * Randomly associate consumer organizations to consumer groups
 * @param {Array<Object>} orgs array of consumer org objects with the required
 *  property: url
 * @param {Array<Object>} groups array of consumer group objects with the
 *  required property: url
 * @param {Number} min minimum number of consumer orgs to associate to a group
 *  (default: 1)
 * @param {Number} max maximum number of consumer orgs to associate to a group
 *  (default: orgs.length)
 */
async function addConsumerOrgsToGroups(orgs, groups, min, max) {
  assertTypes({orgs, groups}, 'array')
  assertTypes({min, max}, 'number')
  assertCondition('min <= max', min <= max)
  assertCondition('min <= max', min <= max)
  assertCondition('orgs.length > 0', orgs.length > 0)
  assertCondition('groups.length > 0', groups.length > 0)

  const adjustedGroups = groups.filter((group, i) => {
    if (!group.url)
      log.warn(`omitted group ${i} as its missing the required property 'url'`)
    else return true
  })
  const adjustedOrgs = orgs.filter((org, i) => {
    if (!org.url)
      log.warn(`omitted org ${i} as its missing the required property 'url'`)
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

async function callByURL(url) {
  const response = await sendRequestToURL(url, 'GET', 'manager')
  return response.body
}

/**
 * Get apps of a consumer organization in a catalog or space (if provided)
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {String} [space] name or id of space
 * @param {String} [consumerOrg] name or id of consumer organization
 */
async function getApps(org, catalog, space, consumerOrg) {
  assertRequired({org, catalog})
  const spaceSegment = space ? `/${space}` : ''
  const consumerOrgSegment = consumerOrg ? `/${consumerOrg}` : ''
  let scope = 'catalogs'
  if (consumerOrg) scope = 'consumer-orgs'
  else if (space) scope = 'spaces'
  const endpoint =
    `/api/${scope}/${org}/${catalog}${spaceSegment}` +
    `${consumerOrgSegment}/apps`
  return apiGet('manager', endpoint)
}

/**
 * create apps
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {String} consumerOrg name or id of consumer organization
 * @param {String} title title of the app
 * @param {String} [space] name or id of space
 */
async function createApp(org, catalog, consumerOrg, title, space) {
  assertRequired({org, catalog, consumerOrg, title})
  const endpoint = space
    ? `/api/consumer-orgs/${org}/${catalog}/${space}/${consumerOrg}/apps`
    : `/api/consumer-orgs/${org}/${catalog}/${consumerOrg}/apps`
  const body = {title, name: slugify(title), redirect_endpoints: []}
  return sendManager(endpoint, 'POST', body)
}

/**
 * create apps
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {String} [space] name or id of space
 * @param {String} consumerOrg name or id of consumer organization
 * @param {Number} amount number of apps to create (each with unique name)
 * @param {Number} [limit] number of concurrent create apps requests to send
 * @param {String|Array<String>} [title] prefix for default title or array of
 *  titles to use for APIs (default: `[Generated Name] App`)
 */
async function createApps(
  org,
  catalog,
  space,
  consumerOrg,
  amount,
  limit,
  title
) {
  assertRequired({org, catalog, consumerOrg, amount})
  const endpoint = space
    ? `/api/consumer-orgs/${org}/${catalog}/${space}/${consumerOrg}/apps`
    : `/api/consumer-orgs/${org}/${catalog}/${consumerOrg}/apps`
  const appTitleGenerator = titleGenerator(title, 'App')
  const argResolver = () => {
    const appTitle = appTitleGenerator.next().value
    const body = {
      title: appTitle,
      name: slugify(appTitle),
      redirect_endpoints: [],
    }
    return [endpoint, 'POST', body]
  }
  return concurrent(sendManager, argResolver, amount, limit)
}

/**
 * Add credentials to an app
 * @param {Object} app
 * @param {String} app.url
 * @param {String} app.title
 * @param {Number} amount
 */
async function addAppsCredentials(app, amount) {
  assertRequired({app}, ['title', 'url'])
  assertTypes({amount}, 'number')
  const {title, url} = app
  const postEndpoint = `${getAPIEndpoint(url)}/credentials`
  const postBody = {title: `Credential for ${title}`}
  const method = async () => {
    const credential = await sendManager(postEndpoint, 'POST', postBody)
    const patchEndpoint = getAPIEndpoint(credential.url)
    return sendManager(patchEndpoint, 'PATCH', credential)
  }
  const argResolver = () => {
    return []
  }
  return concurrent(method, argResolver, amount, 1)
}

/**
 * Get all of products subscribed to an application
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {String} [space] name or id of space
 * @param {String} consumerOrg name or id of consumer organization
 * @param {String} app name or id of an app
 */
async function getSubscriptions(org, catalog, space, consumerOrg, app) {
  assertRequired({org, catalog, consumerOrg, app})
  const endpoint = space
    ? `/api/apps/${org}/${catalog}/${space}/${consumerOrg}/${app}/subscriptions`
    : `/api/apps/${org}/${catalog}/${consumerOrg}/${app}/subscriptions`
  return apiGet('manager', endpoint)
}

/**
 * Subscribe products to an application
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {Object.<string, any>} app object with app properties
 *  (i.e. id, consumer_org_url, etc.)
 * @param {Object} productAndPlan object with properties url and plan of a
 *  published product to subscribe to the app
 * @param {String} productAndPlan.url url of a published product
 * @param {String} [productAndPlan.plan] plan of the product (default:
 *  default-plan`)
 * @param {String} [space] name or id of space
 */
async function subscribeProductToApp(org, catalog, app, productAndPlan, space) {
  assertRequired({org, catalog, app})
  assertRequired({productAndPlan}, ['url'])
  const consumerOrg = app.consumer_org_url.split('/').pop()
  const {id} = app
  const endpoint = space
    ? `/api/apps/${org}/${catalog}/${space}/${consumerOrg}/${id}/subscriptions`
    : `/api/apps/${org}/${catalog}/${consumerOrg}/${id}/subscriptions`
  const {url: product_url, plan = 'default-plan'} = productAndPlan
  return sendManager(endpoint, 'POST', {product_url, plan})
}

/**
 * Subscribe a product to an application
 * @param {String} org name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {Object.<string, any>} app object with app properties
 *  (i.e. id, consumer_org_url, etc.)
 * @param {Array.<Object<string,any>>} productsAndPlan array of published
 *  product objects with property `url` [required] and `plan` (if no plan is
 *  provided, `default-plan` will be used)
 * @param {Number} [limit] number of concurrent subscribe requests to send
 */
async function subscribeProductsToApp(org, catalog, app, products, limit) {
  assertRequired({org, catalog, app, products})
  const consumerOrg = app.consumer_org_url.split('/').pop()
  const {id} = app
  const endpoint = `/api/apps/${org}/${catalog}/${consumerOrg}/${id}/subscriptions`
  const argResolver = (i) => {
    const {url: product_url, plan = 'default-plan'} = products[i - 1]
    return [endpoint, 'POST', {product_url, plan}]
  }
  return concurrent(sendManager, argResolver, products.length, limit)
}

/**
 * @param {String} org org name or id
 * @param {String} catalog catalog name or id
 * @param {String} email invitee's email
 * @param {Array.<String>} [roles] any of:
 *  - administrator
 *  - api-administrator
 *  - community-manager
 *  - developer
 *  - member
 *  - owner
 *  - viewer
 */
async function inviteCatalogMember(org, catalog, email, roles = []) {
  assertRequired({org, catalog, email})
  const endpoint = `/api/orgs/${org}/member-invitations`
  const roleEndpoint = `/api/catalogs/${org}/${catalog}/roles`
  const role_urls = await getRoleUrls('manager', roleEndpoint, roles)
  return sendManager(endpoint, 'POST', {email, role_urls})
}

/**
 * @param {String} org org name or id
 * @param {String} email invitee's email
 */
async function inviteCatalogOwner(org, email) {
  assertRequired({org, email})
  const endpoint = `/api/orgs/${org}/catalog-invitations`
  return sendManager(endpoint, 'POST', {email})
}

/**
 * Invite a provider organization member
 * @param {String} org org name or id
 * @param {String} email invitee's email
 * @param {Array.<String>} [roles] any of:
 *  - administrator
 *  - api-administrator
 *  - community-manager
 *  - developer
 *  - member
 *  - owner
 *  - viewer
 */
async function inviteProviderOrgMember(org, email, roles = []) {
  assertRequired({org, email})
  const endpoint = `/api/orgs/${org}/member-invitations`
  const roleEndpoint = `/api/orgs/${org}/roles`
  const role_urls = await getRoleUrls('manager', roleEndpoint, roles)
  return sendManager(endpoint, 'POST', {email, role_urls}, null, null, false)
}

/**
 * Invite a admin organization member
 * @param {String} org org name or id
 * @param {String} email invitee's email
 * @param {Array.<String>} [roles] any of:
 *  - administrator
 *  - api-administrator
 *  - community-manager
 *  - developer
 *  - member
 *  - owner
 *  - viewer
 */
async function inviteAdminOrgMember(org, email, roles = []) {
  assertRequired({org, email})
  const endpoint = `/api/orgs/${org}/member-invitations`
  const roleEndpoint = `/api/orgs/${org}/roles`
  const role_urls = await getRoleUrls('admin', roleEndpoint, roles)
  return sendAdmin(endpoint, 'POST', {email, role_urls})
}

/**
 * @param {String} org org name or id
 * @param {String} catalog catalog name or id
 * @param {String} email invitee's email
 */
async function inviteConsumerOrgOwner(org, catalog, email) {
  assertRequired({org, catalog, email})
  const endpoint = `/api/catalogs/${org}/${catalog}/consumer-org-invitations`
  return sendManager(endpoint, 'POST', {email})
}

/**
 * Invite a consumer org member (Returns a member invitation object from APIM)
 * @param {String} user member username to search for
 * @param {String} providerOrg provider org name or id
 * @param {String} catalogRegistryName catalog registry name (typically is '${catalog}-idp')
 */
async function consumerOrgMemberExists(user, providerOrg, catalogRegistryName) {
  assertRequired({user, providerOrg, catalogRegistryName})
  const endpoint = `/api/user-registries/${providerOrg}/${catalogRegistryName}/search`
  const data = {
    username: user,
    remote: true,
  }
  const res = await sendManager(endpoint, 'POST', data)
  return res.total_results > 0
}

/**
 * Invite a consumer org member (Returns a member invitation object from APIM)
 * @param {String} org consumer org name or id
 * @param {String} providerOrg provider org name or id
 * @param {String} catalog catalog name or id
 * @param {String} email invitee's email
 * @param {Array.<String>} [roles] any of:
 *  - administrator
 *  - developer
 *  - viewer
 */
async function inviteConsumerOrgMember(
  consumerOrg,
  providerOrg,
  catalog,
  email,
  roles = []
) {
  assertRequired({consumerOrg, email})
  const endpoint = `/consumer-api/orgs/${consumerOrg}/member-invitations`
  const roleEndpoint = `/consumer-api/orgs/${consumerOrg}/roles`
  const role_urls = await getRoleUrls(
    'consumer',
    roleEndpoint,
    roles,
    providerOrg,
    catalog
  )
  return sendConsumer(endpoint, 'POST', providerOrg, catalog, {
    email,
    role_urls,
  })
}

/**
 * Register invitation for consumer org member
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
async function registerConsumerOrgMember(
  providerOrg,
  consumerOrg,
  catalog,
  invitationData,
  memberData
) {
  assertRequired({consumerOrg})
  assertRequired({invitationData}, ['id', 'email', 'activation_link'])
  assertRequired({memberData}, ['password', 'username'])
  const {id, email, activation_link} = invitationData
  const {first_name, last_name, password, username} = memberData
  const {name: defaultIdp} =
    (await getDefaultIdProvider('consumer', providerOrg, catalog)) || {}
  if (!defaultIdp)
    log.throw('Failed to get default identity provider for consumer')
  log.debug(`Accepting invitation for user ${email}`)
  const activationToken = decode(getQuery(activation_link, 'activation'))
  if (!activationToken)
    return log.error('Query "activation" is missing in activation_link')

  const data = {
    username,
    email,
    first_name,
    last_name,
    password,
    realm: `consumer:${providerOrg}:${catalog}/${catalog}-idp`,
    client_id: consumer_client_id,
    client_secret: consumer_client_secret,
  }

  log.debug(`registering user ${username} under org ${consumerOrg}`)
  return sendConsumer(
    `/consumer-api/orgs/${consumerOrg}/member-invitations/${id}/register`,
    'POST',
    providerOrg,
    catalog,
    data,
    {Authorization: `Bearer ${activationToken}`}
  )
}

/**
 * Accept invitation for consumer org member
 * @param {Object} invitationData object returned from apim.invite... method
 * @param {String} invitationData.id
 * @param {String} invitationData.email
 * @param {String} invitationData.activation_link
 * @param {Object} memberData object containing new member's information
 * @param {String} memberData.username
 * @param {String} memberData.password
 */
async function acceptConsumerOrgMember(
  providerOrg,
  consumerOrg,
  catalog,
  invitationData,
  memberData
) {
  assertRequired({consumerOrg})
  assertRequired({invitationData}, ['id', 'email', 'activation_link'])
  assertRequired({memberData}, ['password', 'username'])
  const {id, email, activation_link} = invitationData
  const {password, username} = memberData
  const {name: defaultIdp} =
    (await getDefaultIdProvider('consumer', providerOrg, catalog)) || {}
  if (!defaultIdp)
    log.throw('Failed to get default identity provider for consumer')
  log.debug(`Accepting invitation for user ${email}`)
  const activationToken = decode(getQuery(activation_link, 'activation'))
  if (!activationToken)
    return log.error('Query "activation" is missing in activation_link')

  const data = {
    username,
    password,
    realm: `consumer:${providerOrg}:${catalog}/${catalog}-idp`,
    client_id: consumer_client_id,
    client_secret: consumer_client_secret,
  }

  log.debug(`accepting user ${username} under org ${consumerOrg}`)
  return sendConsumer(
    `/consumer-api/orgs/${consumerOrg}/member-invitations/${id}/accept`,
    'POST',
    providerOrg,
    catalog,
    data,
    {Authorization: `Bearer ${activationToken}`}
  )
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
async function acceptMemberInvite(org, invitationData, memberData) {
  assertRequired({org})
  assertRequired({invitationData}, ['id', 'email', 'activation_link'])
  assertRequired({memberData}, ['password', 'username'])
  const {id, email, activation_link} = invitationData
  const {first_name, last_name, password, username} = memberData
  const {name: defaultIdp} = (await getDefaultIdProvider('manager')) || {}
  if (!defaultIdp)
    log.throw('Failed to get default identity provider for manager')
  log.debug(`Accepting invitation for user ${email}`)
  const activationToken = decode(getQuery(activation_link, 'activation'))
  if (!activationToken)
    return log.error('Query "activation" is missing in activation_link')

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
    {Authorization: `Bearer ${activationToken}`},
    null,
    false
  )
}

async function acceptAdminMemberInvite(org, invitationData, memberData) {
  assertRequired({invitationData}, ['id', 'email', 'activation_link'])
  assertRequired({memberData}, ['password', 'username'])
  const {id, email, activation_link} = invitationData
  const {first_name, last_name, password, username} = memberData
  const {name: defaultIdp} = (await getDefaultIdProvider('admin')) || {}
  if (!defaultIdp)
    log.throw('Failed to get default identity provider for admin')
  log.debug(`Accepting invitation for user ${email}`)
  const activationToken = decode(getQuery(activation_link, 'activation'))
  if (!activationToken)
    return log.error('Query "activation" is missing in activation_link')

  const data = {
    username,
    email,
    first_name,
    last_name,
    password,
    realm: `admin/${defaultIdp}`,
    client_id,
    client_secret,
  }
  return sendAdmin(
    `/api/orgs/${org}/member-invitations/${id}/register`,
    'POST',
    data,
    {Authorization: `Bearer ${activationToken}`}
  )
}

/**
 * Remove an item using their URL
 * @param {Object<string,any>|Array.<Object<string,any>>} items Object or an
 *  array of objects with the required property `url`
 * @param {Number} [limit] number of concurrent DELETE requests to send
 */
async function remove(items, limit) {
  assertRequired({items})
  const itemsArray = Array.isArray(items) ? items : [items]
  const argResolver = (i) => {
    const {url: uri} = itemsArray[i - 1] || {}
    const endpoint = getPath(uri)
    return [endpoint, 'DELETE']
  }
  return concurrent(sendManager, argResolver, itemsArray.length, limit)
}

/**
 * Manually set auth token; can be useful for OIDC users
 * @param {String} token from authorization header (i.e `Bearer ...`)
 */
async function managerSetAuthToken(token) {
  setAuthToken('manager', token)
}

/**
 * sign into manager app to enable sending subsequent api requests
 * @param {String} username username
 * @param {String} password password
 * @param {String} [idProvider] identity provider of user, default identify
 *  provider of the app is used if none provided
 * @param {String} [SaaS] SaaS mode (if SaaS === true)
 * @param {String} [apikey] apikey (if SaaS === true)
 */
async function managerSignIn(username, password, idProvider, SaaS, apikey) {
  return signIn('manager', username, password, idProvider, '', '', '', SaaS, apikey)
}

/**
 * sign out of API Connect manager app
 */
async function managerSignOut() {
  return signOut('manager')
}

/**
 * sign into consumer app to enable sending subsequent consumer api requests
 * @param {String} username username
 * @param {String} password password
 * @param {String} [idProvider] identity provider of user, default identify
 *  provider of the app is used if none provided
 * @param {String} providerOrg provider org name
 * @param {String} catalog catalog name
 */
async function consumerSignIn(
  username,
  password,
  idProvider,
  providerOrg,
  catalog
) {
  return signIn(
    'consumer',
    username,
    password,
    idProvider,
    providerOrg,
    catalog
  )
}

/**
 * create an oidc user registry
 * @param {Object} config OIDC configuration object
 * @param {String} providerOrg provider org name or id
 */
async function createOidcUserRegistry(config, providerOrg) {
  const integration = await sendManager(
    '/api/cloud/integrations/user-registry/oidc',
    'GET'
  )
  log.debug('Received integration object', integration)
  const oidcRegistry = JSON.parse(integration.metadata[config.type])
  const clientTLS = await apiFind(
    'manager',
    `/api/orgs/${slugify(providerOrg)}/tls-client-profiles`,
    'title',
    'Default TLS client profile'
  )
  log.debug('Found Client TLS Profile integration object', clientTLS)
  const title = config.title || `${config.type} OIDC`
  const requestBody = {
    case_sensitive: false,
    configuration: {
      authorization_endpoint: oidcRegistry.authorization_endpoint,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      credential_location: oidcRegistry.credential_location,
      features: [],
      field_mapping: oidcRegistry.field_mapping,
      jwks_uri: {
        endpoint: oidcRegistry.jwks_endpoint,
        tls_client_profile_url: clientTLS.url,
      },
      provider_type: config.type,
      response_type: oidcRegistry.response_type,
      scope: oidcRegistry.scope,
      token_endpoint: {
        endpoint: oidcRegistry.token_endpoint,
        tls_client_profile_url: clientTLS.url,
      },
      userinfo_endpoint: {
        endpoint: oidcRegistry.userinfo_endpoint,
        tls_client_profile_url: clientTLS.url,
      },
    },
    email_required: false,
    email_unique_if_exist: true,
    integration_url: integration.url,
    name: slugify(title),
    registry_type: 'oidc',
    title: title,
  }
  log.debug('Creating OIDC user registry', requestBody)
  return sendManager(
    `/api/orgs/${slugify(providerOrg)}/user-registries`,
    'POST',
    requestBody
  )
}

/**
 * Get all of consumer organization in a catalog or space (if provided)
 * @param {String} providerOrg name or id of provider organization
 * @param {String} catalog name or id of catalog
 * @param {String} userRegistryUrl the url of the user regsitry to be added
 */
async function addUserRegistryToCatalog(providerOrg, catalog, userRegistryUrl) {
  return sendManager(
    `/api/catalogs/${providerOrg}/${catalog}/configured-catalog-user-registries`,
    'POST',
    {user_registry_url: userRegistryUrl}
  )
}

module.exports = {
  acceptAdminMemberInvite,
  acceptMemberInvite,
  addAppsCredentials,
  addConsumerOrgsToGroups,
  addConsumerOrgToGroup,
  addOAuthProvidersToAPIs,
  addPortalService,
  addUserRegistryToCatalog,
  configureOAuthProviders,
  consentCloudAnalytics,
  createAPI,
  createAPIs,
  createApp,
  createApps,
  createCatalog,
  createCatalogs,
  createConsumerGroup,
  createConsumerGroups,
  createConsumerOrg,
  createConsumerOrgs,
  createOidcUserRegistry,
  createOpenAPI,
  createOpenAPIs,
  createProduct,
  createProducts,
  createSpace,
  createSpaces,
  createWsdlAPI,
  delete: remove,
  enableConfiguredGateways,
  enableSpace,
  getAPIs,
  callByURL,
  generateEmail,
  getApps,
  getCatalogs,
  getConsumerGroups,
  getConsumerOrgs,
  getOAuthProviders,
  getOrg,
  getProducts,
  getSpaces,
  getSubscriptions,
  inviteAdminOrgMember,
  inviteCatalogMember,
  inviteCatalogOwner,
  inviteConsumerOrgOwner,
  inviteProviderOrgMember,
  publishProduct,
  publishProducts,
  setAuthToken: managerSetAuthToken,
  signIn: managerSignIn,
  signOut: managerSignOut,
  subscribeProductsToApp,
  subscribeProductToApp,
}
