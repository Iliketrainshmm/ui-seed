// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

module.exports = {
  swagger: '2.0',
  info: {title: 'New Api 1', 'x-ibm-name': 'new-api-1', version: '1.0.0'},
  'x-ibm-configuration': {
    cors: {enabled: true},
    gateway: 'datapower-api-gateway',
  },
  basePath: '/new-api-1',
  paths: {
    '/': {
      get: {
        responses: {
          200: {description: 'success', schema: {type: 'string'}},
        },
        consumes: [],
        produces: [],
      },
      put: {
        responses: {
          200: {description: 'success', schema: {type: 'string'}},
        },
        consumes: [],
        produces: [],
      },
      post: {
        responses: {
          200: {description: 'success', schema: {type: 'string'}},
        },
        consumes: [],
        produces: [],
      },
      delete: {
        responses: {
          200: {description: 'success', schema: {type: 'string'}},
        },
        consumes: [],
        produces: [],
      },
      options: {
        responses: {
          200: {description: 'success', schema: {type: 'string'}},
        },
        consumes: [],
        produces: [],
      },
      head: {
        responses: {
          200: {description: 'success', schema: {type: 'string'}},
        },
        consumes: [],
        produces: [],
      },
      patch: {
        responses: {
          200: {description: 'success', schema: {type: 'string'}},
        },
        consumes: [],
        produces: [],
      },
    },
  },
  securityDefinitions: {
    clientID: {type: 'apiKey', in: 'header', name: 'X-IBM-Client-Id'},
  },
  security: [{clientID: []}],
}
