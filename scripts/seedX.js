// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

const assert = require('assert')
const {resolve} = require('path')
const axios = require('axios')
const moment = require('moment')
moment().format()
var Chance = require('chance')
const chance = new Chance()

const {
  storage: {get},
} = require('../src/utils')

const {
  apim,
  apic,
  utils: {concurrent, options, log, randNum, tryCatch, slugify, validate},
} = require('../src')
const names = require('./assets/names')
const setupAdmin = require('./assets/setupAdmin')
const userAgents = require('./assets/useragents')

const configPath = options.get('config')
assert(configPath, 'CLI option "config" is required for seedX script')
assert(
  configPath.endsWith('js') || configPath.endsWith('json'),
  'config file must be a JS or JSON file'
)
const configs = require(resolve(configPath))

const getHost = require('../src/clients/helpers/get-host')

const {
  providerOrg,
  prefix,
  fastMode = true,
  skipAdmin,
  cleanOrg,
  gatewayType = 'mixed',
  excludeSandbox,
  numberOfDraftAPIs,
  numberOfDraftProducts,
  numberOfCatalogs,
  numberOfSpaces,
  numberOfPublishedProducts,
  numberOfConsumerOrgs,
  numberOfApps,
  numberOfSubscriptions,
  numberOfOAuthProviders,
  credentials,
  adminEmail,
  userRegistry,
  populationType = 'simple',
  mailServer,
  addEventsIterations,
  daysToGenerateEvents,
  proportionOfAICalls = 0.5,
  seedPattern = [],
  customEndpointPortal = false,
} = configs

module.exports = async () => {
  validateConfigs()

  const {admin, defaultAdminPassword, manager, consumer} = credentials
  const orgTitle = options.get('org') || providerOrg
  const orgName = slugify(orgTitle)
  const apisToPopulate = []
  const adminUsername = `${admin.username}`

  const [, , , cluster, namespace] = process.argv

  if (cluster == "SaaS") {
    SaaS = true
    region = namespace
  }
  else {
    SaaS = false
  }

  if (SaaS == false) {
    if (!skipAdmin)
      await setupAdmin(
        admin.username,
        admin.password,
        defaultAdminPassword,
        adminEmail,
        mailServer,
        gatewayType
      )
    options.set('strict')
    log.info(`Signing into admin with ${admin.username}:${admin.password}`)
    await apic.signIn(admin.username, admin.password)
    if (cleanOrg) {
      log.info(`Deleting provider org ${orgName} if exists`)
      await tryCatch(async () => {
        const org = await apic.getProviderOrg(orgName)
        await apic.delete([org])
      })
    }

    log.info(`Ensuring provider org ${orgTitle} does not already exist`)
    const orgRes = await tryCatch(apic.getProviderOrg, orgName)
    const addOrg = orgRes.err && orgRes.err.toString().includes('"status":404')
    const user_name = `${manager.username}`

    if (addOrg) {
      log.info(`Checking if user "${user_name}" exists in provider scope`)
      const user = await tryCatch(apic.getUser, 'manager', user_name)
      const addUser = user.err && user.err.toString().includes('"status":404')
      if (addUser) {
        log.info(`Adding user ${user_name}`)
        let managerEmail = `${user_name}+${user_name}@apic.ibm.com`
        if (manager.email && manager.email !== '') {
          managerEmail = manager.email
        }
        const userAdded = await apic.addUser(
          'manager',
          user_name,
          user_name,
          user_name,
          managerEmail,
          manager.password
        )
        if (!userAdded) log.throw(`Failed to add user ${user_name}`)
      } else if (user.err) log.throw(user)
      log.info(`Creating provider org ${orgTitle}`)
      const addedOrg = await apic.createProviderOrg(orgTitle, user_name)
      if (!addedOrg) log.throw(`Failed to create provider org ${orgTitle}`)
    } else if (orgRes.err) log.throw(orgRes)

    options.set('strict', false)
    const oAuthPrefix = prefix || orgTitle
    await concurrent(
      apic.createOAuthProvider, // shared - admin scope (todo: move to manager scope)
      (i) => {
        if (randNum(0, 1) === 0)
          return [
            `${oAuthPrefix} Third-Party OAuth Provider ${i}`,
            'third-party',
          ]
        return [`${oAuthPrefix} Native OAuth Provider ${i}`]
      },
      numberOfOAuthProviders
    )
    if (!skipAdmin) {
      log.info('Adding admin users')
      const numberOfAdmins = manager.numberOfAdmins || 1
      for (let i = 1; i <= numberOfAdmins; i++) {
        await apic.addMember(
          'admin',
          `${adminUsername}${i}`,
          `${admin.password}`,
          `${adminEmail}`,
          ['administrator']
        )
      }
    }

    await apic.signOut()
  }

  log.info(`Signing into manager with ${user_name}:${manager.password}`)
  await apim.signIn(user_name, manager.password, '', SaaS, manager.apikey)

  log.info('Consenting to cloud analytics')
  await apim.consentCloudAnalytics(orgName)

  log.info('Adding users')
  const numberOfProviders = manager.numberOfProviders || 1
  for (let i = 1; i <= numberOfProviders; i++) {
    await apic.addProviderMember(
      orgName,
      `${user_name}${i}`,
      manager.password,
      manager.email,
      ['developer']
    )
  }

  log.info(`Creating APIs of type: ${populationType}`)
  let draftAPIsAmountOne = Math.ceil(numberOfDraftAPIs / 2)
  if (draftAPIsAmountOne < 1) {
    draftAPIsAmountOne = 1
  }
  let draftAPIsAmountTwo = numberOfDraftAPIs - draftAPIsAmountOne
  if (draftAPIsAmountTwo < 1) {
    draftAPIsAmountTwo = 1
  }
  const gatewayOne = gatewayType !== 'mixed' && gatewayType
  const gatewayTwo = gatewayType !== 'mixed' ? gatewayType : 'v5'
  const apisOne = filterResults(
    await apim.createAPIs(
      orgName,
      draftAPIsAmountOne,
      names,
      gatewayOne,
      25,
      1,
      populationType
    )
  )
  const apisTwo = filterResults(
    await apim.createAPIs(
      orgName,
      draftAPIsAmountTwo,
      names,
      gatewayTwo,
      25,
      1,
      populationType
    )
  )
  log.info(`Creating products of type: ${populationType}`)
  const draftProductsAmountOne = Math.ceil(numberOfDraftProducts / 2)
  const draftProductsAmountTwo = numberOfDraftProducts - draftProductsAmountOne
  const productsOne = await apim.createProducts(
    orgName,
    fastMode
      ? Math.min(draftProductsAmountOne, apisOne.length)
      : draftProductsAmountOne,
    apisOne,
    prefix,
    gatewayOne,
    fastMode,
    100,
    25,
    1,
    populationType
  )
  const productsTwo = filterResults(
    await apim.createProducts(
      orgName,
      fastMode
        ? Math.min(draftProductsAmountTwo, apisTwo.length)
        : draftProductsAmountTwo,
      apisTwo,
      prefix,
      gatewayTwo,
      fastMode,
      100,
      25,
      1,
      populationType
    )
  )
  const products = [...productsOne, ...productsTwo]
  const catalogStart = excludeSandbox ? 1 : 0

  let registry
  if (userRegistry && userRegistry.type === 'oidc') {
    log.info('Creating OIDC user registry')
    registry = await apim.createOidcUserRegistry(userRegistry.config, orgTitle)
  }
  let customPortal = customEndpointPortal
  for (let i = catalogStart; i <= numberOfCatalogs; i++) {
    // const catalogName = `catalog-${i}`
    // const products = await apim.getProducts(orgName)
    // const publishedProducts = await apim.getProducts(orgName, catalogName)
    // const consumerOrgs = await apim.getConsumerOrgs(orgName, catalogName)
    // const apps = await apim.getApps(orgName, catalogName)

    let catalogName
    let catalogTitle
    if (i === 0) {
      catalogTitle = 'Sandbox'
      catalogName = 'sandbox'
    } else {
      log.info(`Creating catalog ${i}`)
      catalogTitle = `${prefix ? `${prefix} ` : ''}Catalog ${i}`
      const catalog = await apim.createCatalog(orgName, catalogTitle)
      catalogName = catalog.name
    }
    if (registry) {
      log.info('Adding user registry to catalog')
      await apim.addUserRegistryToCatalog(orgName, catalogName, registry.url)
    }
    if (customPortal && i == numberOfCatalogs) {
      log.info('Adding custom endpoint portal')
      await apim.addPortalService(orgName, catalogName, await getHost('customPortalEndpointBase'))
      customPortal = false
    } else {
      log.info('Adding portal')
      await apim.addPortalService(orgName, catalogName)
    }

    log.info('Creating consumer orgs')
    const consumerOrgs = filterResults(
      await apim.createConsumerOrgs(
        orgName,
        catalogName,
        numberOfConsumerOrgs,
        prefix,
        consumer
      )
    )
    log.info('Creating apps')
    const apps = filterResults(
      await concurrent(
        apim.createApp,
        (i) => {
          const {name} = consumerOrgs[randNum(0, consumerOrgs.length - 1)]
          const appTitle = `${prefix ? `${prefix} ` : ''}App ${i}`
          return [orgName, catalogName, name, appTitle]
        },
        numberOfApps
      )
    )
    const spaceNames = []
    if (i !== 0 && numberOfSpaces) {
      log.info(`Enabling space for ${catalogTitle}`)
      await apim.enableSpace(orgName, catalogName)
      for (let j = 1; j <= Math.max(1, numberOfSpaces); j++) {
        let spaceName
        let spaceTitle
        if (numberOfSpaces) {
          if (numberOfSpaces > 1 && j > 1) {
            log.info(`Creating space ${j}`)
            spaceTitle = `${prefix ? `${prefix} ` : ''}Space ${j}`
            const space = await apim.createSpace(
              orgName,
              catalogName,
              spaceTitle
            )
            spaceName = space.name
          } else {
            spaceName = catalogName
          }
          spaceNames.push(spaceName)
          await seedCatalogOrSpace({
            catalogTitle,
            catalogName,
            spaceTitle,
            spaceName,
          })
        }
      }
    } else {
      await seedCatalogOrSpace({catalogTitle, catalogName})
    }
    log.info('Publishing products')
    const productIndexes = randNum(
      0,
      products.length - 1,
      numberOfPublishedProducts
    )
    const publishProductArgsResolver = (i) => {
      let selectedSpaceName
      if (numberOfSpaces) {
        const selectedSpaceIndex = randNum(0, spaceNames.length - 1)
        selectedSpaceName = spaceNames[selectedSpaceIndex]
      }
      const productIndex = productIndexes[i - 1]
      return [orgName, products[productIndex], catalogName, selectedSpaceName]
    }
    const publishedProducts = filterResults(
      await concurrent(
        apim.publishProduct,
        publishProductArgsResolver,
        productIndexes.length,
        fastMode ? null : 1
      )
    )
    log.info('Creating subscription')
    let subscriptionCreated = 0
    const adjustedSubscriptionAmount = Math.min(
      apps.length * publishedProducts.length,
      numberOfSubscriptions
    )
    const shuffledApps = randNum(0, apps.length - 1, apps.length).map((i) => {
      return apps[i]
    })
    for (const element of shuffledApps) {
      const minSubscriptions = Math.ceil(numberOfSubscriptions / numberOfApps)
      const maxSubscriptions = Math.max(
        minSubscriptions,
        Math.min(25, numberOfSubscriptions / 5)
      )
      const numberOfProductsToSubscribe = randNum(
        minSubscriptions,
        maxSubscriptions
      )
      const productsPlans = randNum(
        0,
        publishedProducts.length - 1,
        numberOfProductsToSubscribe
      ).map((j) => {
        return publishedProducts[j]
      })
      const subscription = await apim.subscribeProductsToApp(
        orgName,
        catalogName,
        element,
        productsPlans
      )
      if (addEventsIterations > 0) {
        const app = await apim.callByURL(subscription[0].app_url)
        const creds = await apim.callByURL(app.app_credential_urls[0])
        const product = await apim.callByURL(subscription[0].product_url)
        const api = await apim.callByURL(
          `${product.api_urls[0]}?fields=add(catalog_api)`
        )
        let type = 'v6'
        if (api.gateway_type === 'datapower-gateway') {
          type = 'v5'
        }
        const host = await getHost(`${type}GatewayEndpointBase`)
        let {basePath} = api
        if (api.base_paths && api.base_paths[0]) {
          [basePath] = api.base_paths
        }
        let url = `${host}/${orgName}/${catalogName}${basePath}/`
        if (Object.keys(api.catalog_api.paths)[0] !== '/') {
          url = `${url}stores`
        }
        const appName = app.name
        const productName = product.name
        const clientId = creds.client_id
        apisToPopulate.push({
          url,
          clientId,
          appName,
          productName,
        })
      }
      subscriptionCreated += productsPlans.length
      if (subscriptionCreated >= adjustedSubscriptionAmount) break
    }

    if (addEventsIterations > 0) {
      const codeStrings = [
        '200 OK',
        '201 Created',
        '204 No Content',
        '400 Bad Request',
        '401 Unauthorized',
        '403 Forbidden',
        '404 Not Found',
        '429 Too Many Requests',
        '500 Internal Server Error',
        '501 Not Implemented',
      ]

      // Constants
      const dateTime = new Date()
      dateTime.setDate(dateTime.getDate() - daysToGenerateEvents)
      let addedIterations = addEventsIterations

      const dayNum = 3
      let DOS1 = 0
      let DOS2 = 0

      let OKLoop = 7
      let maximum = 6
      let minimum = 4
      let errMaximum = 1
      let errMinimum = 1

      const ipPool = []
      // generates a random number between 150 and 300
      // then generates a pool of that many IP addresses
      const numOfIPs = Math.floor(Math.random() * (300 - 150 + 1)) + 150
      for (let loopIndex = 0; loopIndex < numOfIPs; loopIndex++) {
        ipPool.push(chance.ip())
      }

      // Day loop
      for (let day = 0; day < daysToGenerateEvents; day++) {
        const codes = []

        // DDOS Attack
        if (seedPattern.includes('DDOS') && dayNum === day) {
          addedIterations += 140
          DOS1 += 9500
          DOS2 += 120
          OKLoop = 0
          maximum = 0
          minimum = 0
          errMaximum = 10
          errMinimum = 2
        } else if (seedPattern.includes('DDOS') && day === 5) {
          addedIterations -= 140
          DOS1 = 0
          DOS2 = 0
          OKLoop = 7
          maximum = 4
          minimum = 2
          errMaximum = 2
          errMinimum = 1
        }

        for (const code of codeStrings) {
          switch (code) {
            case '200 OK':
              for (let k = 0; k <= OKLoop; k++) {
                codes.push(code)
              }
              break
            case '201 Created':
            case '204 No Content':
              for (
                let c = 0;
                c <=
                Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
                c++
              ) {
                codes.push(code)
              }
              break
            default:
              for (
                let c = 0;
                c <=
                Math.floor(Math.random() * (errMaximum - errMinimum + 1)) +
                  errMinimum;
                c++
              ) {
                codes.push(code)
              }
          }
        }

        var loopDate = moment(dateTime)
        const weekend = loopDate.day()

        // Up
        if (seedPattern.includes('up')) {
          addedIterations += addedIterations * 0.1
        }

        // Weekends
        if (
          (weekend === 5 || weekend === 6) &&
          seedPattern.includes('weekends')
        ) {
          addedIterations = addedIterations * 0.75
        }

        // API loop
        for (const api of apisToPopulate) {
          log.debug(`Populating api: ${api.url}`)

          //NBR EVENTS Loop
          for (let event = 0; event < addedIterations; event++) {
            const varNum1 = 10000
            const varNum2 = 10000

            let bytesSent = Math.floor(Math.random() * varNum1 - DOS1)
            let bytesRecieved = Math.floor(
              Math.random() * varNum2 + DOS2
            )
            const statusCode = codes[(codes.length * Math.random()) | 0]

            switch (true) {
              case bytesSent >= 0:
                break
              case bytesSent < 0:
                bytesSent = 0
                break
              default:
            }

            switch (bytesRecieved) {
              case bytesRecieved >= 0:
                break
              case bytesRecieved < 0:
                bytesRecieved = 0
                break
              default:
            }

            const startDate = new Date(dateTime.getTime())
            const endDate = new Date(dateTime.getTime())
            endDate.setDate(endDate.getDate() + 1)
            const timeDiff = endDate.getTime() - startDate.getTime()
            const randomTime = Math.random() * timeDiff
            const randomDate = new Date(startDate.getTime() + randomTime)
            const randomIP = ipPool[(Math.floor(Math.random() * ipPool.length))]
            const userAgent = userAgents[(Math.floor(Math.random() * userAgents.length))]

            let faker =
              `${
                `bytes_sent=${bytesSent}| ` +
                `bytes_received=${bytesRecieved}| ` +
                `status_code=${statusCode}| ` +
                `time_to_serve_request=${Math.floor(Math.random() * 1500)}| ` +
                `datetime=${randomDate.toISOString()}| ` 
              }`

            const modelIDs = [
              'google/flan-ul2',
              'granite-7b-lab',
              'granite-13b-chat',
              'granite-13b-instruct',
              'llama-3-8b-instruct',
              'llama-2-13b-chat',
              'codellama-34b-instruct',
              'mixtral-8x7b-instruct',
              'merlinite-7b',
              'flan-t6-xl-3b',
              'starcoder-15.5b',
            ]
            
            if(Math.random() < proportionOfAICalls){
              const ai_request_tokens = Math.floor(Math.random() * 1000)
              const ai_response_tokens = Math.floor(Math.random() * 2000)
              const cache_hit = (Math.random() < 0.3)
              const ai_model = modelIDs[(modelIDs.length * Math.random()) | 0]

              faker += `ai_cache_hit=${cache_hit}| ` +
              `ai_model=${ai_model}| ` +
              `ai_response_tokens=${ai_response_tokens}| `+
              `ai_request_tokens=${ai_request_tokens}| `+
              `ai_total_tokens=${ai_request_tokens + ai_response_tokens}| `+
              `response_body=${JSON.stringify({
                'model_id': ai_model,
                'created_at': '2023-07-21T16:52:32.190Z',
                'results': [
                  {
                    'generated_text': `Text generated by ${api.appName} using ${ai_model}`,
                    'generated_token_count': ai_response_tokens,
                    'input_token_count': ai_request_tokens,
                    'stop_reason': 'eos_token',
                  },
                ],
              })}`
            }

            const {url} = api
            let {clientId} = api
            // if we want an invalid response then lets actually trigger one
            if (statusCode === '401 Unauthorized') {
              clientId = 'invalid'
            }
            const options = {
              headers: {'X-IBM-FAKER': faker, 'X-IBM-Client-Id': clientId, 'User-Agent': userAgent, 'X-Forwarded-For': randomIP},
            }
            log.debug(`Sending request to URL: ${url}`)
            log.debug(`Sending request with faker: ${faker}`)
            axios
            .get(url, options)
            .catch((error) => {
              log.debug(error)
            })

            // sleep
            await new Promise((resolve) => {
              setTimeout(() => {
                resolve()
              }, 50)
            })
          }
        }

        dateTime.setDate(dateTime.getDate() + 1)
      }
    }
  }

  await apim.signOut()

  async function seedCatalogOrSpace({
    catalogTitle,
    catalogName,
    spaceTitle,
    spaceName,
  }) {
    const filterCallback = (provider) => {
      return provider.title.startsWith(oAuthPrefix)
    }
    log.info(`Enabling gateways for ${spaceTitle || catalogTitle}`)
    await apim.enableConfiguredGateways(orgName, catalogName, spaceName)
    log.info(`Configuring OAuth providers for ${spaceTitle || catalogTitle}`)
    await apim.configureOAuthProviders(
      orgName,
      catalogName,
      spaceName,
      filterCallback
    )
  }

  function filterResults(results) {
    return results.filter((result) => {
      return result.id && result.url
    })
  }

  function validateConfigs() {
    const {assertCondition, assertTypes, assertValues, isDefined} = validate
    const configsPropTypes = {
      providerOrg: 'string',
      prefix: 'string',
      fastMode: 'boolean',
      skipAdmin: 'boolean',
      cleanOrg: 'boolean',
      gatewayType: 'string',
      numberOfDraftAPIs: 'number',
      numberOfDraftProducts: 'number',
      numberOfCatalogs: 'number',
      numberOfSpaces: 'number',
      numberOfPublishedProducts: 'number',
      numberOfConsumerOrgs: 'number',
      numberOfApps: 'number',
      numberOfSubscriptions: 'number',
      numberOfOAuthProviders: 'number',
      credentials: 'object',
      addEventsIterations: 'number',
    }
    const credentialsPropTypes = {
      username: 'string',
      password: 'string',
    }
    const optionalProps = [
      'prefix',
      'fastMode',
      'skipAdmin',
      'cleanOrg',
      'numberOfSpaces',
      'gatewayType',
      'populationType',
    ]

    for (const prop in configsPropTypes) {
      if (optionalProps.includes(prop) && !isDefined(configs[prop]))
        delete configsPropTypes[prop]
    }

    assertTypes({configs}, 'object', configsPropTypes)
    assertTypes(
      {'config.credentials.admin': credentials.admin},
      'object',
      credentialsPropTypes
    )
    assertTypes(
      {'config.credentials.manager': credentials.manager},
      'object',
      credentialsPropTypes
    )

    assertCondition(
      'numberOfDraftProducts >= numberOfPublishedProducts',
      numberOfDraftProducts >= numberOfPublishedProducts
    )
    assertCondition(
      'numberOfApps * numberOfPublishedProducts >= numberOfSubscriptions',
      numberOfApps * numberOfPublishedProducts >= numberOfSubscriptions
    )
    assertCondition(
      '!fastMode || numberOfDraftAPIs >= numberOfDraftProducts',
      !fastMode || numberOfDraftAPIs >= numberOfDraftProducts
    )
    for (const prop in configs) {
      if (prop.startsWith('numberOf'))
        assertCondition(`${prop} >= 0`, configs[prop] >= 0)
    }

    assertValues({gatewayType}, ['mixed', 'v5', 'v6'])

    assertValues({populationType}, ['simple', 'complex'])
  }
}
