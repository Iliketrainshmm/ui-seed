// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const {
  concurrent,
  log,
  slugify,
  url: {getPath},
  validate: {assertRequired, assertValues},
} = require('../utils')
const {apiFind, apiGet, getRoleUrls} = require('./common')
const {setAuthToken, signIn, signOut} = require('./helpers/auth-client')
const {sendAdmin} = require('./helpers/api-clients')
const {sendManager} = require('./helpers/api-clients')
const getHost = require('./helpers/get-host')
const {
  inviteProviderOrgMember,
  inviteAdminOrgMember,
  acceptAdminMemberInvite,
  acceptMemberInvite,
  generateEmail,
} = require('./apim')
const {
  nativeOAuthProvider,
  thirdPartyOAuthProvider,
} = require('../assets/samples/oauth-provider')

function validateApp(app, namespace) {
  assertValues({app}, ['admin', 'manager', 'provider'], namespace)
}

/**
 * Get the url for the default user registry of an app
 * @param {String} app target app (`admin` or `manager`)
 */
async function getDefaultUserRegistry(app) {
  validateApp(app, 'apic.getDefaultUserRegistry')
  const registries = await sendAdmin('/api/cloud/settings/user-registries')
  if (!registries) return log.error('Failed to get user registries')
  const scope = app === 'admin' ? app : 'provider'
  const registry = registries[`${scope}_user_registry_default_url`]
  if (!registry) log.throw(`Default user registry cannot be found for ${app}.`)
  return registry
}

/**
 * Add a user as a member of the Admin organization
 * @param {String} username username of the user
 * @param {Array<String>} [roles]  any of:
 *  - administrator
 *  - api-administrator
 *  - community-manager
 *  - developer
 *  - member
 *  - owner
 *  - viewer
 */
async function addMember(adminOrg, username, password, email, roles = []) {
  assertRequired({username})
  log.debug('Adding a member to Admin organization', {username, roles})
  const {id: org} = (await getProviderOrg(adminOrg)) || {}
  if (!org) log.throw('Admin org cannot be found')
  const role_urls = await getRoleUrls(
    adminOrg,
    `/api/orgs/${org}/roles`,
    roles
  )
  const adminMemberData = {
    username: username,
    password: password,
    first_name: username,
    last_name: username,
  }
  const adminMemberEmail = await generateEmail(
    email,
    Math.floor(Math.random() * 100) + 1
  )
  const inviteProviderOrgMemberData = await inviteAdminOrgMember(
    org,
    adminMemberEmail,
    roles
  )
  const invitationData = {
    id: inviteProviderOrgMemberData.id,
    email: inviteProviderOrgMemberData.email,
    activation_link: inviteProviderOrgMemberData.activation_link,
  }
  log.info(`Invitation sent to admin user ${username}`)
  await acceptAdminMemberInvite(org, invitationData, adminMemberData)
  log.info(`Invitation accepted for admin user ${username}`)
  const endpoint = `/api/orgs/${org}/member-invitations`
  return sendAdmin(endpoint, 'POST', {email, role_urls})
}

/**
 * Add a user as a member of the Admin organization
 * @param {String} username username of the user
 * @param {String} email email for the new user
 * @param {Array<String>} [roles]  any of:
 *  - administrator
 *  - api-administrator
 *  - community-manager
 *  - developer
 *  - member
 *  - owner
 *  - viewer
 *  @param {String} providerOrg provider org name or id
 */

async function addProviderMember(
  providerOrg,
  username,
  password,
  email,
  roles = []
) {
  assertRequired({username})
  log.debug('Adding a member to provider organization', {username, roles})
  const {id: org} = (await getProviderOrgOfManager(providerOrg)) || {}
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
  const memberEmail = await generateEmail(
    email,
    Math.floor(Math.random() * 100) + 1
  )
  const inviteProviderOrgMemberData = await inviteProviderOrgMember(
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
  await acceptMemberInvite(org, invitationData, memberData)
  log.info(`Invitation accepted for user ${username}`)
  const endpoint = `/api/orgs/${org}/member-invitations`
  return sendManager(endpoint, 'POST', {email, role_urls})
}

/**
 * Add a new user to the default user registry of provided app
 * @param {String} app target app for the new user (`admin` or `manager`)
 * @param {String} first_name first name of the new user
 * @param {String} last_name last name of the new user
 * @param {String} username username for the new user
 * @param {String} email email for the new user
 * @param {String} password password for the new user
 */
async function addUser(app, first_name, last_name, username, email, password) {
  assertRequired({app, first_name, last_name, username, email, password})
  validateApp(app, 'apic.addUser')
  log.debug(`Getting the default user registry in ${app}`)
  const registry = await getDefaultUserRegistry(app)
  if (!registry) return log.error('Failed to get default user registries')
  const registryPath = getPath(registry)
  const user = {username, email, password, first_name, last_name}
  log.debug(`Adding new user to app ${app} with data:`, user)
  return sendAdmin(`${registryPath}/users`, 'POST', user)
}

/**
 * Change password for the user signed in
 * @param {String} currentPassword current password user signed in
 * @param {String} newPassword new password to set for user signed in
 */
async function changePassword(currentPassword, newPassword) {
  log.debug(`Changing password from ${currentPassword} to ${newPassword}`)
  return sendAdmin('/api/me/change-password', 'POST', {
    current_password: currentPassword,
    password: newPassword,
  })
}

/**
 * Configure the first mail server added to Admin org. If `mailServer` arg is
 *  not provided,  one of mail servers created will be configured with
 *  pre-defined data
 * @param {Object} [mailServer]
 * @param {String} mailServer.mail_server_url
 * @param {Object} mailServer.email_sender
 * @param {String} mailServer.email_sender.name
 * @param {String} mailServer.email_sender.address
 */
async function configureMailServer(mailServer, adminEmail) {
  log.debug('Configuring mail server')
  const {id: org} = (await getProviderOrg('admin')) || {}
  if (!org) log.throw('Admin org cannot be found')
  const mailServers = await apiGet('admin', `/api/orgs/${org}/mail-servers`)
  if (!mailServers || mailServers.length === 0) {
    log.error('No mail server has been added to Admin organization')
    return
  }
  const useEmail = adminEmail || 'ibmapic@gmail.com'
  const data = mailServer || {
    mail_server_url: mailServers[0].url,
    email_sender: {name: 'APIC Administrator', address: useEmail},
  }
  return sendAdmin('/api/cloud/settings', 'PUT', data)
}

/**
 * Add a mail server to Admin org. If `mailServer` arg is not provided,
 *  a mail server with pre-defined data will be created
 * @param {Object} [mailServer]
 * @param {String} mailServer.title
 * @param {String} mailServer.name
 * @param {String} mailServer.host
 * @param {String} mailServer.port
 * @param {Object} mailServer.credentials
 * @param {String} mailServer.credentials.username
 * @param {String} mailServer.credentials.password
 * @param {Boolean} mailServer.secure
 */
async function createMailServer(mailServer) {
  const {id: org} = (await getProviderOrg('admin')) || {}
  if (!org) log.throw('Admin org cannot be found')
  const clientTLS = await apiFind(
    'admin',
    `/api/orgs/${org}/tls-client-profiles`,
    'title',
    'Default TLS'
  )
  if (!clientTLS || !clientTLS.url) {
    log.error('Default client TLS cannot be found')
    return
  }

  const data = mailServer || {
    title: 'shikari smtp',
    name: 'smtp',
    host: 'shikari1.fyre.ibm.com',
    port: 587,
    credentials: {
      username: 'steve@apiconnect.ibm.com',
      password: '7iron-hide',
    },
    secure: true,
  }
  data.tls_client_profile_url = clientTLS.url

  return sendAdmin(`/api/orgs/${org}/mail-servers`, 'POST', data)
}

/**
 * Create an OAuth Provider
 * @param {String} title title for the OAuth Provider
 * @param {String} [type] `native` or `third-party` (default: `native`)
 */
async function createOAuthProvider(title, type) {
  assertRequired({title})
  const targetProvider =
    type === 'third-party' ? thirdPartyOAuthProvider : nativeOAuthProvider
  // const gatewayType = `datapower-${gateway === 'v5c' ? '' : 'api-'}gateway`
  const {id: org} = (await getProviderOrg('admin')) || {}
  if (!org) log.throw('Admin org cannot be found')
  const body = {...targetProvider, title, name: slugify(title)}
  // body.native_provider.api['x-ibm-configuration'].gateway = gatewayType
  return sendAdmin(`/api/orgs/${org}/oauth-providers`, 'POST', body)
}

/**
 * Create a provider organization
 * @param {String} title title for new provider organization
 * @param {String} owner username of a user to use as the owner of
 *  new provider organization
 */
async function createProviderOrg(title, owner) {
  log.debug(`Creating provider organization: ${title}`)
  assertRequired({title, owner})
  const ownerData = await getUser('manager', owner)
  if (!owner) return log.error(`Cannot find user with username ${owner}`)
  const org = {title, name: slugify(title), owner_url: ownerData.url}
  return sendAdmin('/api/cloud/orgs', 'POST', org)
}

/**
 * Get provider organization's data by it's name or id
 * @param {String} name name of id of provider organization
 */
async function getProviderOrg(name) {
  log.debug(`Finding provider organization with name ${name}`)
  assertRequired({name})
  return sendAdmin(`/api/orgs/${name}`)
}

async function getProviderOrgOfManager(name) {
  log.debug(`Finding provider organization with name ${name}`)
  assertRequired({name})
  return sendManager(`/api/orgs/${name}`)
}

/**
 * Get the user with username provided in default user registry of app provided
 * @param {String} app app of the user: admin or manager
 * @param {String} username username for the user
 */
async function getUser(app, username) {
  assertRequired({app, username})
  validateApp(app, 'apic.getUser')
  const registry = await getDefaultUserRegistry(app)
  if (!registry) return log.error('Failed to get default user registry')
  const registryPath = getPath(registry)
  return sendAdmin(`${registryPath}/users/${username}`)
}

/**
 * Register a gateway service
 * @param {String} type gateway type to register (`v5` or `v6`)
 * @param {String} [endpointURL] endpoint URL for gateway service
 *  (default: endpoint on GOA)
 * @param {String} [baseURL] endpoint base URL for gateway service
 *  (default: base endpoint on GOA)
 */
async function registerGatewayService(type, endpointURL, baseURL) {
  assertRequired({type})
  assertValues({type}, ['v5', 'v6'])
  const endpoint = endpointURL || (await getHost(`${type}GatewayEndpoint`))
  if (!endpoint) return log.error('Failed to compute endpoint')
  const api_endpoint_base =
    baseURL || (await getHost(`${type}GatewayEndpointBase`))
  if (!api_endpoint_base) return log.error('Failed to compute base endpoint')
  const {id: org} = (await getProviderOrg('admin')) || {}
  if (!org) log.throw('Admin org cannot be found')
  const clientTLS = await apiFind(
    'admin',
    `/api/orgs/${org}/tls-client-profiles`,
    'title',
    'Default TLS'
  )
  if (!clientTLS) return log.error('Failed to get Default Client TLS')
  const serverTLS = await apiFind(
    'admin',
    `/api/orgs/${org}/tls-server-profiles`,
    'title',
    'Default TLS'
  )
  if (!serverTLS) return log.error('Failed to get Default Server TLS')
  const gateway_service_type = `datapower${
    type === 'v6' ? '-api' : ''
  }-gateway`
  const {body: gwIntegration} = await apiGet(
    'admin',
    `/api/cloud/integrations/gateway-service/${gateway_service_type}`
  )
  if (!gwIntegration || !gwIntegration.url)
    return log.error('Failed to get Gateway Integration')
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

/**
 * Register a portal service
 * @param {String} [title] title to use for the portal service
 *  (default: `portal`)
 * @param {String} [endpointURL] endpoint URL for portal service
 *  (default: endpoint on GOA)
 * @param {String} [baseURL] endpoint base URL for portal service
 *  (default: base endpoint on GOA)
 */
async function registerPortalService(title, endpointURL, baseURL) {
  const {id: org} = (await getProviderOrg('admin')) || {}
  if (!org) log.throw('Admin org cannot be found')
  const endpoint = endpointURL || (await getHost('portalEndpoint'))
  if (!endpoint) return log.error('Failed to compute base endpoint')
  const web_endpoint_base = baseURL || (await getHost('portalEndpointBase'))
  if (!web_endpoint_base) return log.error('Failed to compute base endpoint')
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

/**
 * Register an analytics service
 * @param {String} [title] title to use for the analytics service
 *  (default: `analytics`)
 * @param {String} [endpointURL] endpoint URL for analytics service
 *  (default: endpoint on GOA)
 */
async function registerAnalyticsService(title, endpointURL) {
  const {id: org} = (await getProviderOrg('admin')) || {}
  if (!org) log.throw('Admin org cannot be found')
  const endpoint = endpointURL || (await getHost('analyticsEndpoint'))
  if (!endpoint) return log.error('Failed to compute analytics endpoint')
  const ingestionTLS = await apiFind(
    'admin',
    `/api/orgs/${org}/tls-client-profiles`,
    'name',
    'analytics-ingestion-default'
  )
  if (!ingestionTLS) return log.error('Failed to get Ingestion Client TLS')
  const computedTitle = title || 'analytics'
  const analyticsData = {
    title: computedTitle,
    name: slugify(computedTitle),
    endpoint,
    client_endpoint_tls_client_profile_url: ingestionTLS.url,
  }
  return sendAdmin(
    `/api/orgs/${org}/availability-zones/availability-zone-default/` +
      'analytics-services',
    'POST',
    analyticsData
  )
}

/**
 * Associate an analytics service with gateways
 * @param {String} [title] title to use for the analytics service
 *  (default: `analytics`)
 */
async function associateAnalytics(title) {
  const {id: org} = (await getProviderOrg('admin')) || {}
  if (!org) log.throw('Admin org cannot be found')
  const computedTitle = title || 'analytics'
  const {body: a7sService} = await apiGet(
    'admin',
    `/api/orgs/${org}/availability-zones/availability-zone-default/analytics-services/${computedTitle}`
  )
  if (!a7sService) return log.error('Failed to get Analytics service')

  const gwServices = await apiGet(
    'admin',
    `/api/orgs/${org}/availability-zones/availability-zone-default/gateway-services`
  )
  if (!gwServices || gwServices.length === 0) {
    log.error('No gateway services have been registered')
    return
  }
  const payload = {analytics_service_url: a7sService.url}
  return Promise.all(
    gwServices.map(async (gws) => {
      sendAdmin(
        `/api/orgs/${org}/availability-zones/availability-zone-default/gateway-services/${gws.id}`,
        'PATCH',
        payload
      )
    })
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
    const {url} = itemsArray[i - 1] || {}
    const endpoint = getPath(url)
    return [endpoint, 'DELETE']
  }
  return concurrent(sendAdmin, argResolver, itemsArray.length, limit)
}

/**
 * Manually set auth token; can be useful for OIDC users
 * @param {String} token from authorization header (i.e `Bearer ...`)
 */
async function adminSetAuthToken(token) {
  setAuthToken('manager', token)
}

/**
 * sign into admin app to enable sending subsequent api requests
 * @param {String} username username
 * @param {String} password password
 * @param {String} [idProvider] identity provider of user, default identify
 *  provider of the app is used if none provided
 */
async function adminSignIn(username, password, idProvider) {
  return signIn('admin', username, password, idProvider)
}

/**
 * sign out of API Connect admin app
 */
async function adminSignOut() {
  return signOut('admin')
}

module.exports = {
  addMember,
  addProviderMember,
  addUser,
  associateAnalytics,
  changePassword,
  configureMailServer,
  createMailServer,
  createOAuthProvider,
  createProviderOrg,
  inviteProviderOrgMember,
  delete: remove,
  getProviderOrg,
  getProviderOrgOfManager,
  getUser,
  registerAnalyticsService,
  registerGatewayService,
  registerPortalService,
  setAuthToken: adminSetAuthToken,
  signIn: adminSignIn,
  signOut: adminSignOut,
}
