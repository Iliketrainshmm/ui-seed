module.exports = {
  product: "1.0.0",
  info: {
    name: "complex-product-1",
    title: "Complex Product 1",
    version: "1.0.0",
  },
  visibility: {
    view: {enabled: true, type: "public", tags: [], orgs: []},
    subscribe: {enabled: true, type: "authenticated", tags: [], orgs: []},
  },
  apis: {},
  plans: {
    'default-plan': {
      title: "Default Plan",
      description: "Default Plan",
      approval: false,
      "rate-limit": {"hard-limit": false, value: "100/hour"},
    },
    "200Per5minHardLimit": {
      title: "200Per5minHardLimit",
      apis: {},
      description: "200Per5minHardLimit",
      "rate-limits": {
        "rate-limit-1": {value: "200/5minute", "hard-limit": true},
      },
      "burst-limits": {"burst-limit-1": {value: "50/1minute"}},
    },
    "100Per5Min": {
      title: "100Per5Min",
      description: "100Per5Min",
      apis: {},
      "rate-limits": {
        "rate-limit-1": {"hard-limit": false, value: "100/5minute"},
      },
    },
    "1000PerHour": {
      title: "1000PerHour",
      apis: {},
      description: "1000PerHour",
      approval: false,
      "rate-limits": {
        "rate-limit-1": {value: "1000/1hour", "hard-limit": false},
      },
    },
    "1000000PerHr": {
      title: "1000000PerHr",
      apis: {},
      description: "1000000PerHr",
      approval: false,
      "rate-limits": {
        "rate-limit-1": {value: "1000000/1hour", "hard-limit": true},
      },
    },
  },
  gateways: ["datapower-api-gateway"],
}
