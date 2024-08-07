module.exports = {
  swagger: "2.0",
  info: {
    title: "mc_ibm_apim_smart",
    description:
      "API resources related to the retail industry.\n\nYou may download the swagger.json definition to use in your API Management demos.\n\nOptionally, you can obtain the [source code](https://hub.jazz.net/git/bakert/apim-smart) and run it locally.",
    version: "1.0.0",
    "x-ibm-name": "mc-ibm-apim-smart",
  },
  basePath: "/smart/v1",
  schemes: ["https"],
  consumes: ["application/json"],
  produces: ["application/json"],
  paths: {
    "/stores/{id}/inventory/{fk}": {
      get: {
        tags: ["store"],
        summary: "Find a related item by id for inventory.",
        operationId: "store.prototype.__findById__inventory",
        parameters: [
          {
            name: "fk",
            in: "path",
            description: "Foreign key for inventory",
            required: true,
            type: "string",
            format: "JSON",
          },
          {
            name: "id",
            in: "path",
            description: "PersistedModel id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {$ref: "#/definitions/inventory"},
          },
        },
        deprecated: false,
      },
      delete: {
        tags: ["store"],
        summary: "Delete a related item by id for inventory.",
        operationId: "store.prototype.__destroyById__inventory",
        parameters: [
          {
            name: "fk",
            in: "path",
            description: "Foreign key for inventory",
            required: true,
            type: "string",
            format: "JSON",
          },
          {
            name: "id",
            in: "path",
            description: "PersistedModel id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {204: {description: "Request was successful"}},
        deprecated: false,
      },
      put: {
        tags: ["store"],
        summary: "Update a related item by id for inventory.",
        operationId: "store.prototype.__updateById__inventory",
        parameters: [
          {
            name: "fk",
            in: "path",
            description: "Foreign key for inventory",
            required: true,
            type: "string",
            format: "JSON",
          },
          {
            name: "data",
            in: "body",
            required: false,
            schema: {$ref: "#/definitions/inventory"},
          },
          {
            name: "id",
            in: "path",
            description: "PersistedModel id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {$ref: "#/definitions/inventory"},
          },
        },
        deprecated: false,
      },
    },
    "/stores/{id}/inventory": {
      get: {
        tags: ["store"],
        summary: "Queries inventory of store.",
        operationId: "store.prototype.__get__inventory",
        parameters: [
          {
            name: "filter",
            in: "query",
            required: false,
            type: "string",
            format: "JSON",
          },
          {
            name: "id",
            in: "path",
            description: "PersistedModel id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {
              type: "array",
              items: {$ref: "#/definitions/inventory"},
            },
          },
        },
        deprecated: false,
      },
      post: {
        tags: ["store"],
        summary: "Creates a new instance in inventory of this model.",
        operationId: "store.prototype.__create__inventory",
        parameters: [
          {
            name: "data",
            in: "body",
            required: false,
            schema: {$ref: "#/definitions/inventory"},
          },
          {
            name: "id",
            in: "path",
            description: "PersistedModel id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {$ref: "#/definitions/inventory"},
          },
        },
        deprecated: false,
      },
    },
    "/stores/{id}/inventory/count": {
      get: {
        tags: ["store"],
        summary: "Counts inventory of store.",
        operationId: "store.prototype.__count__inventory",
        parameters: [
          {
            name: "where",
            in: "query",
            description: "Criteria to match model instances",
            required: false,
            type: "string",
            format: "JSON",
          },
          {
            name: "id",
            in: "path",
            description: "PersistedModel id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {type: "object"},
          },
        },
        deprecated: false,
      },
    },
    "/stores": {
      post: {
        tags: ["store"],
        summary:
          "Create a new instance of the model and persist it into the data source.",
        operationId: "store.create",
        parameters: [
          {
            name: "data",
            in: "body",
            description: "Model instance data",
            required: false,
            schema: {$ref: "#/definitions/store"},
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {$ref: "#/definitions/store"},
          },
        },
        deprecated: false,
      },
      put: {
        tags: ["store"],
        summary:
          "Update an existing model instance or insert a new one into the data source.",
        operationId: "store.upsert",
        parameters: [
          {
            name: "data",
            in: "body",
            description: "Model instance data",
            required: false,
            schema: {$ref: "#/definitions/store"},
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {$ref: "#/definitions/store"},
          },
        },
        deprecated: false,
      },
      get: {
        tags: ["store"],
        summary:
          "Find all instances of the model matched by filter from the data source.",
        operationId: "store.find",
        parameters: [
          {
            name: "filter",
            in: "query",
            description:
              "Filter defining fields, where, include, order, offset, and limit",
            required: false,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {type: "array", items: {$ref: "#/definitions/store"}},
          },
        },
        deprecated: false,
      },
    },
    "/stores/{id}/exists": {
      get: {
        tags: ["store"],
        summary: "Check whether a model instance exists in the data source.",
        operationId: "store.exists",
        parameters: [
          {
            name: "id",
            in: "path",
            description: "Model id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {type: "object"},
          },
        },
        deprecated: false,
      },
    },
    "/stores/{id}": {
      head: {
        tags: ["store"],
        summary: "Check whether a model instance exists in the data source.",
        operationId: "store2.exists",
        parameters: [
          {
            name: "id",
            in: "path",
            description: "Model id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {type: "object"},
          },
        },
        deprecated: false,
      },
      get: {
        tags: ["store"],
        summary: "Find a model instance by id from the data source.",
        operationId: "store.findById",
        parameters: [
          {
            name: "id",
            in: "path",
            description: "Model id",
            required: true,
            type: "string",
            format: "JSON",
          },
          {
            name: "filter",
            in: "query",
            description: "Filter defining fields and include",
            required: false,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {$ref: "#/definitions/store"},
          },
        },
        deprecated: false,
      },
      delete: {
        tags: ["store"],
        summary: "Delete a model instance by id from the data source.",
        operationId: "store.deleteById",
        parameters: [
          {
            name: "id",
            in: "path",
            description: "Model id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {204: {description: "Request was successful"}},
        deprecated: false,
      },
      put: {
        tags: ["store"],
        summary:
          "Update attributes for a model instance and persist it into the data source.",
        operationId: "store.prototype.updateAttributes",
        parameters: [
          {
            name: "data",
            in: "body",
            description: "An object of model property name/value pairs",
            required: false,
            schema: {$ref: "#/definitions/store"},
          },
          {
            name: "id",
            in: "path",
            description: "PersistedModel id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {$ref: "#/definitions/store"},
          },
        },
        deprecated: false,
      },
    },
    "/stores/count": {
      get: {
        tags: ["store"],
        summary:
          "Count instances of the model matched by where from the data source.",
        operationId: "store.count",
        parameters: [
          {
            name: "where",
            in: "query",
            description: "Criteria to match model instances",
            required: false,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {type: "object"},
          },
        },
        deprecated: false,
      },
    },
    "/products/{id}/reviews/{fk}": {
      get: {
        tags: ["product"],
        summary: "Find a related item by id for reviews.",
        operationId: "product.prototype.__findById__reviews",
        parameters: [
          {
            name: "fk",
            in: "path",
            description: "Foreign key for reviews",
            required: true,
            type: "string",
            format: "JSON",
          },
          {
            name: "id",
            in: "path",
            description: "PersistedModel id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {$ref: "#/definitions/review"},
          },
        },
        deprecated: false,
      },
      put: {
        tags: ["product"],
        summary: "Update a related item by id for reviews.",
        operationId: "product.prototype.__updateById__reviews",
        parameters: [
          {
            name: "fk",
            in: "path",
            description: "Foreign key for reviews",
            required: true,
            type: "string",
            format: "JSON",
          },
          {
            name: "data",
            in: "body",
            required: false,
            schema: {$ref: "#/definitions/review"},
          },
          {
            name: "id",
            in: "path",
            description: "PersistedModel id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {$ref: "#/definitions/review"},
          },
        },
        deprecated: false,
      },
    },
    "/products/{id}/reviews": {
      get: {
        tags: ["product"],
        summary: "Queries reviews of product.",
        operationId: "product.prototype.__get__reviews",
        parameters: [
          {
            name: "filter",
            in: "query",
            required: false,
            type: "string",
            format: "JSON",
          },
          {
            name: "id",
            in: "path",
            description: "PersistedModel id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {type: "array", items: {$ref: "#/definitions/review"}},
          },
        },
        deprecated: false,
      },
      post: {
        tags: ["product"],
        summary: "Creates a new instance in reviews of this model.",
        operationId: "product.prototype.__create__reviews",
        parameters: [
          {
            name: "data",
            in: "body",
            required: false,
            schema: {$ref: "#/definitions/review"},
          },
          {
            name: "id",
            in: "path",
            description: "PersistedModel id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {$ref: "#/definitions/review"},
          },
        },
        deprecated: false,
      },
    },
    "/products/{id}/reviews/count": {
      get: {
        tags: ["product"],
        summary: "Counts reviews of product.",
        operationId: "product.prototype.__count__reviews",
        parameters: [
          {
            name: "where",
            in: "query",
            description: "Criteria to match model instances",
            required: false,
            type: "string",
            format: "JSON",
          },
          {
            name: "id",
            in: "path",
            description: "PersistedModel id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {type: "object"},
          },
        },
        deprecated: false,
      },
    },
    "/products": {
      post: {
        tags: ["product"],
        summary:
          "Create a new instance of the model and persist it into the data source.",
        operationId: "product.create",
        parameters: [
          {
            name: "data",
            in: "body",
            description: "Model instance data",
            required: false,
            schema: {$ref: "#/definitions/product"},
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {$ref: "#/definitions/product"},
          },
        },
        deprecated: false,
      },
      put: {
        tags: ["product"],
        summary:
          "Update an existing model instance or insert a new one into the data source.",
        operationId: "product.upsert",
        parameters: [
          {
            name: "data",
            in: "body",
            description: "Model instance data",
            required: false,
            schema: {$ref: "#/definitions/product"},
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {$ref: "#/definitions/product"},
          },
        },
        deprecated: false,
      },
      get: {
        tags: ["product"],
        summary:
          "Find all instances of the model matched by filter from the data source.",
        operationId: "product.find",
        parameters: [
          {
            name: "filter",
            in: "query",
            description:
              "Filter defining fields, where, include, order, offset, and limit",
            required: false,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {type: "array", items: {$ref: "#/definitions/product"}},
          },
        },
        deprecated: false,
      },
    },
    "/products/{id}/exists": {
      get: {
        tags: ["product"],
        summary: "Check whether a model instance exists in the data source.",
        operationId: "product.exists",
        parameters: [
          {
            name: "id",
            in: "path",
            description: "Model id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {type: "object"},
          },
        },
        deprecated: false,
      },
    },
    "/products/{id}": {
      head: {
        tags: ["product"],
        summary: "Check whether a model instance exists in the data source.",
        operationId: "product2.exists",
        parameters: [
          {
            name: "id",
            in: "path",
            description: "Model id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {type: "object"},
          },
        },
        deprecated: false,
      },
      get: {
        tags: ["product"],
        summary: "Find a model instance by id from the data source.",
        operationId: "product.findById",
        parameters: [
          {
            name: "id",
            in: "path",
            description: "Model id",
            required: true,
            type: "string",
            format: "JSON",
          },
          {
            name: "filter",
            in: "query",
            description: "Filter defining fields and include",
            required: false,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {$ref: "#/definitions/product"},
          },
        },
        deprecated: false,
      },
      delete: {
        tags: ["product"],
        summary: "Delete a model instance by id from the data source.",
        operationId: "product.deleteById",
        parameters: [
          {
            name: "id",
            in: "path",
            description: "Model id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {204: {description: "Request was successful"}},
        deprecated: false,
      },
      put: {
        tags: ["product"],
        summary:
          "Update attributes for a model instance and persist it into the data source.",
        operationId: "product.prototype.updateAttributes",
        parameters: [
          {
            name: "data",
            in: "body",
            description: "An object of model property name/value pairs",
            required: false,
            schema: {$ref: "#/definitions/product"},
          },
          {
            name: "id",
            in: "path",
            description: "PersistedModel id",
            required: true,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {$ref: "#/definitions/product"},
          },
        },
        deprecated: false,
      },
    },
    "/products/count": {
      get: {
        tags: ["product"],
        summary:
          "Count instances of the model matched by where from the data source.",
        operationId: "product.count",
        parameters: [
          {
            name: "where",
            in: "query",
            description: "Criteria to match model instances",
            required: false,
            type: "string",
            format: "JSON",
          },
        ],
        responses: {
          200: {
            description: "Request was successful",
            schema: {type: "object"},
          },
        },
        deprecated: false,
      },
    },
  },
  definitions: {
    address: {
      properties: {
        street1: {type: "string"},
        street2: {type: "string"},
        city: {type: "string"},
        state: {type: "string"},
        zip_code: {type: "string"},
      },
      additionalProperties: false,
    },
    inventory: {
      properties: {
        inventory_id: {type: "string"},
        product_id: {type: "string"},
        quantity: {type: "number", format: "double"},
        store_id: {type: "string"},
      },
      required: ["inventory_id"],
      additionalProperties: false,
    },
    review: {
      properties: {
        review_id: {type: "string"},
        date: {type: "string", format: "date"},
        reviewer_name: {type: "string"},
        reviewer_email: {type: "string"},
        rating: {type: "number", format: "double"},
        comment: {type: "string"},
        product_id: {type: "string"},
      },
      required: ["review_id"],
      additionalProperties: false,
    },
    store: {
      description: "store information",
      properties: {
        store_id: {type: "string"},
        address: {$ref: "#/definitions/address"},
        phone: {type: "string"},
        hours: {type: "string"},
      },
      required: ["store_id"],
      additionalProperties: false,
    },
    product: {
      description: "product catalog and reviews",
      properties: {
        product_id: {type: "string"},
        name: {type: "string"},
        description: {type: "string"},
        image: {type: "string"},
        price: {type: "number", format: "double"},
        rating: {type: "number", format: "double"},
      },
      required: ["product_id"],
      additionalProperties: false,
    },
  },
  tags: [
    {name: "store", description: "store information"},
    {name: "product", description: "product catalog and reviews"},
  ],
  "x-ibm-configuration": {
    enforced: true,
    testable: true,
    phase: "realized",
    cors: {enabled: true},
    assembly: {
      execute: [
        {
          "operation-switch": {
            title: "operation-switch",
            case: [
              {
                operations: ["store.create"],
                execute: [
                  {
                    invoke: {
                      title: "invoke",
                      timeout: 60,
                      verb: "POST",
                      "cache-response": "protocol",
                      "cache-ttl": 900,
                      "target-url":
                        "https://apim-smart.mybluemix.net/smart/v1/stores",
                    },
                  },
                ],
              },
              {
                operations: ["store.find"],
                execute: [
                  {
                    invoke: {
                      title: "invoke",
                      timeout: 60,
                      verb: "GET",
                      "cache-response": "protocol",
                      "cache-ttl": 900,
                      "target-url":
                        "https://apim-smart.mybluemix.net/smart/v1/stores",
                    },
                  },
                ],
              },
              {
                operations: ["store.count"],
                execute: [
                  {
                    invoke: {
                      title: "invoke",
                      timeout: 60,
                      verb: "GET",
                      "cache-response": "protocol",
                      "cache-ttl": 900,
                      "target-url":
                        "https://apim-smart.mybluemix.net/smart/v1/stores/count",
                    },
                  },
                ],
              },
              {
                operations: ["store.upsert"],
                execute: [
                  {
                    invoke: {
                      title: "invoke",
                      timeout: 60,
                      verb: "PUT",
                      "cache-response": "protocol",
                      "cache-ttl": 900,
                      "target-url":
                        "https://apim-smart.mybluemix.net/smart/v1/stores",
                    },
                  },
                ],
              },
              {
                operations: ["store.exists"],
                execute: [
                  {
                    invoke: {
                      title: "invoke",
                      timeout: 60,
                      verb: "GET",
                      "cache-response": "protocol",
                      "cache-ttl": 900,
                      "target-url":
                        "https://apim-smart.mybluemix.net/smart/v1/stores",
                    },
                  },
                ],
              },
              {
                operations: ["store2.exists"],
                execute: [
                  {
                    invoke: {
                      title: "invoke",
                      timeout: 60,
                      verb: "GET",
                      "cache-response": "protocol",
                      "cache-ttl": 900,
                      "target-url":
                        "https://apim-smart.mybluemix.net/smart/v1/stores",
                    },
                  },
                ],
              },
              {
                operations: ["store.findById"],
                execute: [
                  {
                    invoke: {
                      title: "invoke",
                      timeout: 60,
                      verb: "GET",
                      "cache-response": "protocol",
                      "cache-ttl": 900,
                      "target-url":
                        "https://apim-smart.mybluemix.net/smart/v1/stores/{id}",
                    },
                  },
                ],
              },
              {
                operations: ["store.deleteById"],
                execute: [
                  {
                    invoke: {
                      title: "invoke",
                      timeout: 60,
                      verb: "DELETE",
                      "cache-response": "protocol",
                      "cache-ttl": 900,
                      "target-url":
                        "https://apim-smart.mybluemix.net/smart/v1/stores/{id}",
                    },
                  },
                ],
              },
              {
                operations: ["product.create"],
                execute: [
                  {
                    invoke: {
                      title: "invoke",
                      timeout: 60,
                      verb: "POST",
                      "cache-response": "protocol",
                      "cache-ttl": 900,
                      "target-url":
                        "https://apim-smart.mybluemix.net/smart/v1/products",
                    },
                  },
                ],
              },
              {
                operations: ["product.count"],
                execute: [
                  {
                    invoke: {
                      title: "invoke",
                      timeout: 60,
                      verb: "GET",
                      "cache-response": "protocol",
                      "cache-ttl": 900,
                      "target-url":
                        "https://apim-smart.mybluemix.net/smart/v1/products/count",
                    },
                  },
                ],
              },
              {
                operations: ["product.upsert"],
                execute: [
                  {
                    invoke: {
                      title: "invoke",
                      timeout: 60,
                      verb: "PUT",
                      "cache-response": "protocol",
                      "cache-ttl": 900,
                      "target-url":
                        "https://apim-smart.mybluemix.net/smart/v1/products",
                    },
                  },
                ],
              },
              {
                operations: ["product.find"],
                execute: [
                  {
                    invoke: {
                      title: "invoke",
                      timeout: 60,
                      verb: "GET",
                      "cache-response": "protocol",
                      "cache-ttl": 900,
                      "target-url":
                        "https://apim-smart.mybluemix.net/smart/v1/products",
                    },
                  },
                ],
              },
              {
                operations: ["product.exists"],
                execute: [
                  {
                    invoke: {
                      title: "invoke",
                      timeout: 60,
                      verb: "GET",
                      "cache-response": "protocol",
                      "cache-ttl": 900,
                      "target-url":
                        "https://apim-smart.mybluemix.net/smart/v1/products",
                    },
                  },
                ],
              },
              {
                operations: ["product2.exists"],
                execute: [
                  {
                    invoke: {
                      title: "invoke",
                      timeout: 60,
                      verb: "GET",
                      "cache-response": "protocol",
                      "cache-ttl": 900,
                      "target-url":
                        "https://apim-smart.mybluemix.net/smart/v1/products",
                    },
                  },
                ],
              },
              {
                operations: ["product.findById"],
                execute: [
                  {
                    invoke: {
                      title: "invoke",
                      timeout: 60,
                      verb: "GET",
                      "cache-response": "protocol",
                      "cache-ttl": 900,
                      "target-url":
                        "https://apim-smart.mybluemix.net/smart/v1/products/{id}",
                    },
                  },
                ],
              },
              {
                operations: ["product.deleteById"],
                execute: [
                  {
                    invoke: {
                      title: "invoke",
                      timeout: 60,
                      verb: "DELETE",
                      "cache-response": "protocol",
                      "cache-ttl": 900,
                      "target-url":
                        "https://apim-smart.mybluemix.net/smart/v1/products/{id}",
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    gateway: "datapower-gateway",
  },
  securityDefinitions: {
    "api-key-1": {
      type: "apiKey",
      description: "",
      in: "header",
      name: "X-IBM-Client-Id",
      "x-key-type": "client_id"
    },
  },
  security: [{"api-key-1": []}],
}
