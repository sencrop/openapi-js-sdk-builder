import { generateSDKFromOpenAPI } from './index';

describe('generateSDKFromOpenAPI', () => {
  test('should work', async () => {
    expect(
      await generateSDKFromOpenAPI(
        JSON.stringify({
          openapi: '3.0.2',
          info: {
            version: '3.1.3',
            title: '@whook/example',
            description: 'A basic Whook server',
          },
          servers: [{ url: 'http://192.168.10.149:8000/v3' }],
          components: {
            securitySchemes: {
              bearerAuth: {
                description: 'Bearer authentication with a user API token',
                type: 'http',
                scheme: 'bearer',
              },
              fakeAuth: {
                description: 'A fake authentication for development purpose.',
                type: 'apiKey',
                in: 'header',
                name: 'Authorization',
              },
            },
          },
          paths: {
            '/openAPI': {
              get: {
                operationId: 'getOpenAPI',
                summary: 'Get API documentation.',
                tags: ['system'],
                responses: {
                  '200': {
                    description: 'Provides the private Open API documentation',
                    content: {
                      'application/json': { schema: { type: 'object' } },
                    },
                  },
                },
                security: [
                  {},
                  { bearerAuth: ['admin'] },
                  { fakeAuth: ['admin'] },
                ],
                parameters: [],
              },
            },
            '/ping': {
              get: {
                operationId: 'getPing',
                summary: "Checks API's availability.",
                tags: ['system'],
                responses: {
                  '200': {
                    description: 'Pong',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          additionalProperties: false,
                          properties: {
                            pong: { type: 'string', enum: ['pong'] },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '/delay': {
              get: {
                operationId: 'getDelay',
                summary: 'Answer after a given delay.',
                tags: ['system'],
                parameters: [
                  {
                    in: 'query',
                    name: 'duration',
                    required: true,
                    description: 'Duration in milliseconds',
                    schema: { type: 'number' },
                  },
                ],
                responses: { '204': { description: 'Delay expired' } },
              },
            },
            '/diag': {
              get: {
                operationId: 'getDiagnostic',
                summary: "Returns current API's transactions.",
                security: [{ bearerAuth: ['admin'] }, { fakeAuth: ['admin'] }],
                tags: ['system'],
                parameters: [],
                responses: {
                  '200': {
                    description: 'Diagnostic',
                    content: {
                      'application/json': {
                        schema: { type: 'object', additionalProperties: true },
                      },
                    },
                  },
                },
              },
            },
            '/time': {
              get: {
                operationId: 'getTime',
                summary: 'Get API internal clock date.',
                tags: ['system'],
                responses: {
                  '200': {
                    description: 'Server current date',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          additionalProperties: false,
                          properties: {
                            currentDate: {
                              type: 'string',
                              format: 'date-time',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '/echo': {
              put: {
                operationId: 'putEcho',
                summary: 'Echoes what it takes.',
                tags: ['system'],
                requestBody: {
                  description: 'The input sentence',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        required: ['echo'],
                        additionalProperties: false,
                        properties: { echo: { type: 'string' } },
                      },
                      example: { echo: 'Repeat this!' },
                    },
                  },
                },
                responses: {
                  '200': {
                    description: 'The actual echo',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          required: ['echo'],
                          additionalProperties: false,
                          properties: { echo: { type: 'string' } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          tags: [],
        }),
      ),
    ).toMatchSnapshot();
  });
});
