/* Architecture Note #1: Generating the SDK

Most SDK from API generator are very opinionated on how the
 users will use it. We wanted to have a very simple API to
 be able to customize it at will.

This file simply eats an OpenAPI file and generate
 the SDK to avoid boilerplate code.

A small article about why and how to do that:
https://insertafter.com/en/blog/considerations_for_generating_api_clients.html
*/

/**
 * @module openapi-js-sdk-builder
 */

import camelCase from 'camel-case';
import {
  flattenOpenAPI,
  getOpenAPIOperations,
} from '@whook/http-router/dist/utils';

export default function(source) {
  const callback = this.async();
  generateSDKFromOpenAPI(source)
    .then(data => callback(null, data))
    .catch(callback);
}

/**
 * Build a JS SDK from an OpenAPI file
 *
 * @async
 * @method generateSDKFromOpenAPI
 * @param {String} openAPIContent
 * @param {String} sdkVersion
 * @return {Promise<string>} The SDK JS code
 */
export async function generateSDKFromOpenAPI(openAPIContent, sdkVersion) {
  const API = await flattenOpenAPI(JSON.parse(openAPIContent));
  const operations = getOpenAPIOperations(API);
  const content = `
// WARNING: This file is automatically generated
// do not change it in place it would be overridden
// by the next build
'use strict';

const querystring = require('querystring');
const axios = require('axios');

/**
 * ${API.info.description}
 * @module API
 * @version ${API.info.version}
 */
const API = {
  ${operations.map(({ operationId }) => operationId).join(',\n  ')},
};

${operations
  .map(operation => {
    const { path, method, operationId, parameters, requestBody } = operation;

    return `
/**
 * ${operation.summary}
 * @param {Object} parameters
 * The parameters to provide (destructured)${
   requestBody
     ? `
  @param body The request body
`
     : ''
 }${(parameters || [])
      .filter(
        p =>
          !['X-API-Version', 'X-SDK-Version', 'X-APP-Version'].includes(p.name),
      )
      .map(
        parameter => `
 * @param {${
   parameter.schema
     ? parameter.schema.oneOf
       ? [...new Set(parameter.schema.oneOf.map(s => s.type))].join('|')
       : parameter.schema.type
     : parameter.type
 }} ${parameter.required ? `` : `[`}parameters.${camelCase(parameter.name)}${
          parameter.required ? `` : `]`
        }
 * ${parameter.description}`,
      )}
 * @param {Object} options
 * Options to override Axios request configuration
 * @return {Object}
 * The HTTP response
 */
function ${operationId}(${
      requestBody || (parameters && parameters.length)
        ? `{${
            requestBody
              ? `
      body,`
              : ''
          }${(parameters || [])
            .filter(p => !['X-API-Version', 'X-SDK-Version'].includes(p.name))
            .map(parameter => {
              const variableName = camelCase(parameter.name);

              return `\n  ${variableName},`;
            })
            .join('')}} = {}`
        : '_'
    }, options) {

${(parameters || [])
  .map(parameter => {
    if (parameter.required) {
      return `
  if( ${camelCase(parameter.name)} == null) {
    throw new Error('Missing required parameter : ${camelCase(
      parameter.name,
    )}. Value : ' +  ${camelCase(parameter.name)});
  }
`;
    }
  })
  .join('')}

  const method = '${method}';
  let urlParts = [${path
    .split('/')
    .filter(identity => identity)
    .map(part => {
      const result = /^{([a-z0-9]+)}$/gi.exec(part);

      if (result) {
        return `
    ${camelCase(result[1])},`;
      }
      return `
    '${part}',`;
    })
    .join('')}
  ];
  let headers = Object.assign(((options || {}).headers || {}), {
    'X-API-Version': '${API.info.version}',${
      sdkVersion
        ? `
    'X-SDK-Version': '${sdkVersion}',`
        : ''
    }${(parameters || [])
      .filter(p => 'header' === p.in)
      .filter(p => !['X-API-Version', 'X-SDK-Version'].includes(p.name))
      .map(
        parameter => `
    '${parameter.name}': ${camelCase(parameter.name)},`,
      )
      .join('')}
  });
  let qs = cleanQuery({${(parameters || [])
    .filter(p => 'query' === p.in)
    .map(
      parameter => `
    ${parameter.name}: ${camelCase(parameter.name)}${
        parameter.ordered ? '.sort(sortMultipleQuery)' : ''
      },`,
    )
    .join('')}
  });
  let data = ${requestBody ? 'body' : '{}.undef'};

  return axios(Object.assign({
    baseURL: '${API.servers[0]}',
    paramsSerializer: querystring.stringify.bind(querystring),
    validateStatus: status => 200 <= status && 300 > status,
    method: method,
    url: urlParts.join('/'),
    headers: cleanHeaders(headers),
    params: qs,
    data,
  }, options || {}));
}`;
  })
  .join('\n')}

function cleanQuery(query) {
    return Object.keys(query)
    .filter(key => "undefined" !== typeof query[key])
    .filter(key => !(query[key] instanceof Array) || 0 !== query[key].length)
    .reduce((newQuery, key) => {
        newQuery[key] = query[key];
        return newQuery;
    }, {});
}

function cleanHeaders(headers) {
    return Object.keys(headers)
    .filter(key => "undefined" !== typeof headers[key])
    .reduce((newHeaders, key) => {
        newHeaders[key] = headers[key];
        return newHeaders;
    }, {});
}

// eslint-disable-next-line no-unused-vars
function sortMultipleQuery(a, b) {
    return a > b ? 1 : -1;
}

module.exports = API;
`;

  return content;
}
