// /api/orgs/5ed22d4a-736b-42e5-9618-279cf13486d7/oauth-providers
module.exports = {
  nativeOAuthProvider: {
    name: 'native-oauth-provider-1',
    title: 'Native OAuth Provider 1',
    provider_type: 'native',
    grants: ['access_code'],
    gateway_version: '6000',
    native_provider: {
      clients: ['confidential'],
      authorize_path: '/oauth2/authorize',
      token_path: '/oauth2/token',
      api: {
        info: {description: ''},
        'x-ibm-configuration': {
          gateway: 'datapower-api-gateway',
          assembly: {
            execute: [
              {
                oauth: {
                  title: 'oauth-auto-generated-1',
                  version: '2.0.0',
                  description:
                    'This oauth policy performs all OAuth/OpenID Connect protocol steps that are needed for OAuth Validation by default. The inputs and outputs of each of the steps are driven by documented context variables. Add or remove the Supported OAuth Components as required.',
                  'oauth-provider-settings-ref': {
                    default: 'native-oauth-provider-1',
                  },
                  'supported-oauth-components': ['OAuthValidateRequest'],
                },
              },
              {
                switch: {
                  version: '2.0.0',
                  title: 'oauth-auto-generated-switch',
                  case: [
                    {
                      condition: "($operationPath() = '/oauth2/token')",
                      execute: [
                        {
                          oauth: {
                            title: 'oauth-auto-generated-3',
                            version: '2.0.0',
                            description:
                              'This oauth policy performs all OAuth/OpenID Connect protocol steps that are needed for token path by default. The inputs and outputs of each of the steps are driven by documented context variables. Add or remove the Supported OAuth Components as required.',
                            'oauth-provider-settings-ref': {
                              default: 'native-oauth-provider-1',
                            },
                            'supported-oauth-components': [
                              'OAuthGenerateAccessToken',
                              'OAuthVerifyAZCode',
                              'OAuthVerifyRefreshToken',
                              'OAuthCollectMetadata',
                            ],
                          },
                        },
                      ],
                    },
                    {
                      condition: "($operationPath() = '/oauth2/authorize')",
                      execute: [
                        {
                          'user-security': {
                            title: 'user-security-auto-generated',
                            version: '2.1.0',
                            description:
                              'This user security policy performs EI(basic) and AU(auth url) check for oauth assembly. Change the security check method as required',
                            'factor-id': 'default',
                            'extract-identity-method': 'basic',
                            'ei-stop-on-error': true,
                            'user-auth-method': 'disabled',
                            'au-stop-on-error': true,
                            'user-az-method': 'authenticated',
                            'az-stop-on-error': true,
                          },
                        },
                        {
                          oauth: {
                            title: 'oauth-auto-generated-2',
                            version: '2.0.0',
                            description:
                              'This oauth policy performs all OAuth/OpenID Connect protocol steps that are needed for az code path by default. The inputs and outputs of each of the steps are driven by documented context variables. Add or remove the Supported OAuth Components as required.',
                            'oauth-provider-settings-ref': {
                              default: 'native-oauth-provider-1',
                            },
                            'supported-oauth-components': [
                              'OAuthGenerateAZCode',
                              'OAuthGenerateAccessToken',
                              'OAuthVerifyAZCode',
                              'OAuthCollectMetadata',
                            ],
                          },
                        },
                      ],
                    },
                    {
                      otherwise: [
                        {
                          oauth: {
                            title: 'oauth-auto-generated-4',
                            version: '2.0.0',
                            description:
                              'This oauth policy performs all OAuth/OpenID Connect protocol steps that are needed for all other paths by default. The inputs and outputs of each of the steps are driven by documented context variables. Add or remove the Supported OAuth Components as required.',
                            'oauth-provider-settings-ref': {
                              default: 'native-oauth-provider-1',
                            },
                            'supported-oauth-components': [
                              'OAuthIntrospectToken',
                              'OAuthRevokeToken',
                            ],
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        },
      },
      pkce: {enabled: true, required: false, allow_plain: false},
      native_provider_5000: {},
    },
    scopes: {sample_scope_1: 'Sample scope description 1'},
  },
  thirdPartyOAuthProvider: {
    name: 'third-party',
    title: 'Third Party',
    provider_type: 'third_party',
    grants: ['access_code'],
    gateway_version: '5000',
    third_party_config: {
      introspection_endpoint: {
        endpoint: 'https://example.com/oauth2/introspect',
        tls_client_profile_url: null,
      },
      authorize_endpoint: 'https://example.com/oauth2/authorize',
      token_endpoint: 'https://example.com/oauth2/token',
      security: ['basic-auth'],
      basic_auth: {
        request_headername: 'x-introspect-basic-authorization-header',
      },
    },
    scopes: {sample_scope_1: 'Sample scope description 1'},
  },
}
