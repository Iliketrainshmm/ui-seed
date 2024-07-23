// Licensed Materials - Property of IBM
// (C) Copyright IBM Corporation 2020, 2024
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

module.exports = {
  info: {version: '1.0.0', title: 'New Product 1', name: 'new-product-1'},
  gateways: ['datapower-api-gateway'],
  plans: {
    'default-plan': {
      'rate-limits': {default: {value: '100/1hour'}},
      title: 'Default Plan',
      description: 'Default Plan',
      approval: false,
    },
  },
  apis: {},
  visibility: {
    view: {type: 'public', orgs: [], tags: [], enabled: true},
    subscribe: {type: 'authenticated', orgs: [], tags: [], enabled: true},
  },
  product: '1.0.0',
}
