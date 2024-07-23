// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2022, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.
const slugify = require('./slugify')

function generateBasicAPI(type, title, version, gateway) {
  const operationSchema = {
    oai2: {
      responses: {
        200: {description: 'success', schema: {type: 'string'}},
      },
      consumes: [],
      produces: [],
    },
    oai3: {
      responses: {
        200: {
          description: 'success',
          content: {'application/json': {schema: {type: 'string'}}},
        },
      },
    },
  }
  const fixtures = {
    baseAPIs: {
      oai2: [
        {
          swagger: '2.0',
          'x-ibm-configuration': {
            cors: {enabled: true},
          },
          paths: {
            '/': {
              get: operationSchema.oai2,
              put: operationSchema.oai2,
              post: operationSchema.oai2,
              delete: operationSchema.oai2,
              options: operationSchema.oai2,
              head: operationSchema.oai2,
              patch: operationSchema.oai2,
            },
          },
          securityDefinitions: {
            clientID: {type: 'apiKey', in: 'header', name: 'X-IBM-Client-Id'},
          },
          security: [{clientID: []}],
        },
      ],
      oai3: [
        {
          openapi: '3.0.0',
          servers: [],
          'x-ibm-configuration': {
            properties: {
              'target-url': {
                description: 'URL of the proxy policy',
                encoded: false,
              },
            },
            cors: {enabled: true},
          },
          paths: {
            '/': {
              get: operationSchema.oai3,
              put: operationSchema.oai3,
              post: operationSchema.oai3,
              delete: operationSchema.oai3,
              options: operationSchema.oai3,
              head: operationSchema.oai3,
              patch: operationSchema.oai3,
            },
          },
          components: {
            securitySchemes: {
              clientID: {
                type: 'apiKey',
                in: 'header',
                name: 'X-IBM-Client-Id',
              },
            },
          },
          security: [{clientID: []}],
        },
      ],
    },
  }

  const name = slugify(title)
  const [baseAPI] = fixtures.baseAPIs[type]
  baseAPI['x-ibm-configuration'].gateway =
    gateway === 'v5' && type !== 'oai3'
      ? 'datapower-gateway'
      : 'datapower-api-gateway'
  if (type === 'oai2') {
    baseAPI.basePath = `/${name}`
    baseAPI.info = {title, 'x-ibm-name': `${name}`, version}
  } else {
    baseAPI.servers.push({url: `/${name}`})
    baseAPI.info = {title, 'x-ibm-name': `${name}`, version}
  }

  return baseAPI
}

module.exports = generateBasicAPI
