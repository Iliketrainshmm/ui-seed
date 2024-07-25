// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const {
  log,
  storage: {set, remove},
  validate: {assertRequired, assertValues},
} = require('../../utils/')
const {
  client_id,
  client_secret,
  consumer_client_id,
  consumer_client_secret,
} = require('../../configs')
const {sendRequest} = require('./api-clients')

function isValidApp(app, namespace) {
  assertValues({app}, ['admin', 'manager', 'consumer'], namespace)
}

/**
 * Get list of identity providers available for target app
 * @param {String} app target app (admin or manager or consumer)
 * @param {String} providerOrg provider org name or id (for consumer only)
 * @param {String} catalog catalog name or id (for consumer only)
 */
async function getIdProviders(app, providerOrg, catalog) {
  assertRequired({app})
  isValidApp(app, 'authClient.getIdProviders')
  log.debug(`Getting list of identity providers available for ${app}`)
  const scope =
    app === 'manager' ? 'provider' : app === 'consumer' ? app : 'admin'
  const endpoint =
    app === 'consumer'
      ? `/consumer-api/${scope}/identity-providers`
      : `/api/cloud/${scope}/identity-providers`
  let options = {}

  if (app === 'consumer') {
    assertRequired({providerOrg, catalog})
    const headers = {
      'X-IBM-Consumer-Context': `${providerOrg}.${catalog}`,
    }
    options = {headers}
  }

  const {body} = await sendRequest(app, endpoint, options, {
    skipAuth: true,
  })
  return body && body.results
}

/**
 * Get the default identity provider for target app
 * @param {String} app target app (admin or manager or consumer)
 * @param {String} providerOrg provider org name or id (for consumer only)
 * @param {String} catalog catalog name or id (for consumer only)
 */
async function getDefaultIdProvider(app, providerOrg, catalog) {
  assertRequired({app})
  isValidApp(app, 'authClient.getIdProviders')
  log.debug(`Getting default identity provider for ${app}`)
  const idps = (await getIdProviders(app, providerOrg, catalog)) || []
  return idps.find((idp) => {
    return idp.default
  })
}

/**
 * Manually set auth token; can be used instead of signIn for OIDC users
 * @param {String} app target app (admin or manager)
 * @param {String} token from authorization header (i.e `Bearer ...`)
 */
function setAuthToken(app, token) {
  assertRequired({app, token})
  isValidApp(app)
  set(`token:${app}`, token)
}

/**
 * Sign into an app to enable sending subsequent api requests to respective app
 * @param {String} app target app (admin or manager or consumer)
 * @param {String} username username
 * @param {String} password password
 * @param {String} [idProvider] identity provider of user, default identify
 *  provider of the app is used if none provided
 * @param {String} [providerOrg] provider org name (if app == consumer)
 * @param {String} [catalog] catalog name (if app == consumer)
 */
async function signIn(
  app,
  username,
  password,
  idProvider,
  providerOrg,
  catalog,
  SaaS,
  apikey
) {
  assertRequired({app})
  if (SaaS == false) {
    assertRequired({username, password})
  }
  isValidApp(app, 'authClient.getIdProviders')
  log.debug(`Signing into ${app}`)
  const {name: defaultIdp} =
    (await getDefaultIdProvider(app, providerOrg, catalog)) || {}
  if (!idProvider && !defaultIdp)
    log.throw('Failed to get default identity provider')
  const idpScope =
    app === 'manager'
      ? 'provider'
      : app === 'consumer'
      ? `${app}:${providerOrg}:${catalog}`
      : 'admin'

  const clientId = app === 'consumer' ? consumer_client_id : client_id
  const clientSecret =
    app === 'consumer' ? consumer_client_secret : client_secret

  let data = {
    username,
    password,
    realm: `${idpScope}/${idProvider || defaultIdp}`,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'password',
  }

  if (SaaS == true) {
    delete data.username
    delete data.password
    data.apikey = apikey
  }

  const endpoint = app === 'consumer' ? '/consumer-api/token' : '/api/token'
  const headers =
    app === 'consumer'
      ? {
          'X-IBM-Consumer-Context': `${providerOrg}.${catalog}`,
        }
      : {}

  log.info(`Signing into ${app} as user: ${username}`)
  const res = await sendRequest(
    app,
    endpoint,
    {method: 'POST', body: data, headers},
    {skipAuth: true}
  )
  const {access_token} = res.body || {}
  if (!access_token) {
    log.error('Sign in failed!')
    return
  }
  log.success(`Signed into ${app} successfully!`)
  set(`token:${app}`, access_token)
  return res
}

/**
 * Sign out of an app
 * @param {String} app target app (admin or manager or consumer)
 */
async function signOut(app) {
  assertRequired({app})
  isValidApp(app, 'authClient.getIdProviders')
  const endpoint =
    app === 'consumer' ? '/consumer-api/me/sign-out' : '/api/me/sign-out'
  const {status} = await sendRequest(app, endpoint, {
    method: 'POST',
  })
  if (status === 204) {
    log.success(`Signed out of ${app} successfully!`)
    remove(`token:${app}`)
  } else log.error(`Sign out of ${app} failed!`)
}

module.exports = {
  getDefaultIdProvider,
  setAuthToken,
  signIn,
  signOut,
}
