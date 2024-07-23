// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2022, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.
const options = require('../../utils/options')
const getHost = require('./get-host')

jest.mock('commander', () => {
  const {program} = jest.requireActual('commander')
  program.parse = () => {}

  return {program}
})

let resolvePrefixed = true

const mockedSend = (options) => {
  const isURLPrefixed =
    options.url.includes('admin.') ||
    options.url.includes('manager.') ||
    options.url.includes('consumer.')
  if (!resolvePrefixed && isURLPrefixed) return
  return {status: 401}
}

jest.mock('../../utils', () => {
  const utils = jest.requireActual('../../utils')
  return {
    ...utils,
    http: {
      send: (options) => {
        return mockedSend(options)
      },
    },
  }
})

describe('get-host tests', () => {
  async function resolveAndAssertHosts(namespace, overrideExpectedHosts = {}) {
    const admin = await getHost('admin')
    const manager = await getHost('manager')
    const consumer = await getHost('consumer')
    const analyticsEndpoint = await getHost('analyticsEndpoint')
    const portalEndpoint = await getHost('portalEndpoint')
    const portalEndpointBase = await getHost('portalEndpointBase')
    const v5GatewayEndpoint = await getHost('v5GatewayEndpoint')
    const v5GatewayEndpointBase = await getHost('v5GatewayEndpointBase')
    const v6GatewayEndpoint = await getHost('v6GatewayEndpoint')
    const v6GatewayEndpointBase = await getHost('v6GatewayEndpointBase')
    const hosts = await getHost('all')
    const expectedHosts = {
      admin: `https://admin.${namespace}.cluster.dev.ciondemand.com`,
      manager: `https://manager.${namespace}.cluster.dev.ciondemand.com`,
      consumer: `https://consumer.${namespace}.cluster.dev.ciondemand.com`,
      analyticsEndpoint: `https://ai.${namespace}.cluster.dev.ciondemand.com`,
      portalEndpoint: `https://api.portal.${namespace}.cluster.dev.ciondemand.com`,
      portalEndpointBase: `https://portal.${namespace}.cluster.dev.ciondemand.com`,
      v5GatewayEndpoint: `https://${namespace}-gwd.cluster.dev.ciondemand.com`,
      v5GatewayEndpointBase: `https://${namespace}-gw.cluster.dev.ciondemand.com`,
      v6GatewayEndpoint: `https://${namespace}-rgwd.cluster.dev.ciondemand.com`,
      v6GatewayEndpointBase: `https://${namespace}-rgw.cluster.dev.ciondemand.com`,
      ...overrideExpectedHosts,
    }
    expect(hosts).toEqual(expectedHosts)
    expect(admin).toEqual(expectedHosts.admin)
    expect(manager).toEqual(expectedHosts.manager)
    expect(consumer).toEqual(expectedHosts.consumer)
    expect(analyticsEndpoint).toEqual(expectedHosts.analyticsEndpoint)
    expect(portalEndpoint).toEqual(expectedHosts.portalEndpoint)
    expect(portalEndpointBase).toEqual(expectedHosts.portalEndpointBase)
    expect(v5GatewayEndpoint).toEqual(expectedHosts.v5GatewayEndpoint)
    expect(v5GatewayEndpointBase).toEqual(expectedHosts.v5GatewayEndpointBase)
    expect(v6GatewayEndpoint).toEqual(expectedHosts.v6GatewayEndpoint)
    expect(v6GatewayEndpointBase).toEqual(expectedHosts.v6GatewayEndpointBase)
  }

  it('resolves prefixed hosts using manager prefixed host in API_HOST environment variable', async () => {
    process.env.API_HOST =
      'https://manager.namespace1.cluster.dev.ciondemand.com'
    await resolveAndAssertHosts('namespace1')
  })

  it('resolves prefixed hosts using admin prefixed host in API_HOST environment variable', async () => {
    process.env.API_HOST =
      'https://admin.namespace2.cluster.dev.ciondemand.com'
    await resolveAndAssertHosts('namespace2')
  })

  it('resolves prefixed hosts using non-prefixed host in API_HOST environment variable', async () => {
    process.env.API_HOST = 'https://namespace3.cluster.dev.ciondemand.com'
    await resolveAndAssertHosts('namespace3')
  })

  it('resolves prefixed hosts using consumer prefixed host in API_HOST environment variable', async () => {
    process.env.API_HOST =
      'https://consumer.namespace8.cluster.dev.ciondemand.com'
    await resolveAndAssertHosts('namespace8')
  })

  it('resolves non-prefixed hosts using non-prefixed host in API_HOST environment variable', async () => {
    process.env.API_HOST = 'https://namespace4.cluster.dev.ciondemand.com'
    resolvePrefixed = false
    await resolveAndAssertHosts('namespace4', {
      admin: 'https://namespace4.cluster.dev.ciondemand.com',
      manager: 'https://namespace4.cluster.dev.ciondemand.com',
      consumer: 'https://namespace4.cluster.dev.ciondemand.com',
    })
    resolvePrefixed = true
  })

  it('resolves hosts using prefixed fyre host in API_HOST environment variable', async () => {
    process.env.API_HOST = 'https://manager.my-stack.fyre.ibm.com'
    await resolveAndAssertHosts(false, {
      admin: 'https://admin.my-stack.fyre.ibm.com',
      manager: 'https://manager.my-stack.fyre.ibm.com',
      consumer: 'https://consumer.my-stack.fyre.ibm.com',
      analyticsEndpoint: 'https://ai.my-stack.fyre.ibm.com',
      portalEndpoint: 'https://api.portal.my-stack.fyre.ibm.com',
      portalEndpointBase: 'https://portal.my-stack.fyre.ibm.com',
      v5GatewayEndpoint: 'https://gwd.my-stack.fyre.ibm.com',
      v5GatewayEndpointBase: 'https://gw.my-stack.fyre.ibm.com',
      v6GatewayEndpoint: 'https://rgwd.my-stack.fyre.ibm.com',
      v6GatewayEndpointBase: 'https://rgw.my-stack.fyre.ibm.com',
    })
  })

  it('resolves prefixed hosts using baseHost in conjunction with useHostOptions option', async () => {
    options.set('useHostOptions')
    options.set('baseHost', 'https://namespace5.cluster.dev.ciondemand.com')
    await resolveAndAssertHosts('namespace5')
  })

  it('uses hosts provided as options over auto-resolved hosts', async () => {
    options.set('useHostOptions')
    options.set('baseHost', 'https://namespace6.cluster.dev.ciondemand.com')
    options.set('v5GatewayEndpoint', 'https://my-gateway.com')
    await resolveAndAssertHosts('namespace6', {
      v5GatewayEndpoint: 'https://my-gateway.com',
    })
  })

  it('can resolve independent host provided as option', async () => {
    const actualAdminHost = 'https://namespace7.cluster.dev.ciondemand.com'
    options.set('useHostOptions')
    options.set('admin', actualAdminHost)
    const adminHost = await getHost('admin', actualAdminHost)
    expect(adminHost).toEqual(actualAdminHost)
  })

  it('only throws error when its unable to determine host', async () => {
    const actualAdminHost = 'https://namespace8.cluster.dev.ciondemand.com'
    options.set('useHostOptions')
    options.set('admin', actualAdminHost)
    const adminHost = await getHost('admin', true)
    expect(adminHost).toEqual(actualAdminHost)
    options.set('baseHost', false)
    await expect(getHost('manager', true)).rejects.toThrow(
      'You must provide all required hosts (admin, manager, consumer, analyticsEndpoint, portalEndpoint,' +
        ' portalEndpointBase, v5GatewayEndpoint, v5GatewayEndpointBase,' +
        ' v6GatewayEndpoint, v6GatewayEndpointBase) in options or provide' +
        ' the option baseHost to have hosts auto computed.'
    )
  })
})
