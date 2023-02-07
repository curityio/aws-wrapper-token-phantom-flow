/*
 *  Copyright 2023 Curity AB
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

const jose = require('jose');
const axios = require('axios');

const generatePolicy = (principalId, effect, resource, jwt) => {
  const authResponse = {};
  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: effect,
          Resource: resource,
          Action: 'execute-api:Invoke'
        }
      ]
    };
    authResponse.policyDocument = policyDocument;
  }
  authResponse.context = {
    token: jwt
  };
  console.debug(JSON.stringify(authResponse));
  return authResponse;
};

const verifyScopes = (requiredScopes, jwt) => {
  let result = true;

  if (!requiredScopes) {
    return result;
  }

  const jwtPayload = jose.decodeJwt(jwt);
  console.log(`jwtPayload : ${JSON.stringify(jwtPayload)}`);
  console.log(`required scopes: ${requiredScopes}`);

  const tokenScopes = jwtPayload.scope.split(' ');

  for (const scope of requiredScopes) {
    if (!tokenScopes.includes(scope)) {
      result = false;
      break;
    }
  }

  return result;
};

exports.handler = async (event, context, callback) => {
  console.debug('Authorizer: Handler function invoked ');
  console.debug(`Authorizer: Event : ${JSON.stringify(event)}`);

  const issuerWhiteList = process.env.TRUSTED_ISSUERS.trim().split(',');
  let requiredScopes = false;

  if (process.env.REQUIRED_SCOPES) {
    requiredScopes = process.env.REQUIRED_SCOPES.trim().split(',');
  }

  console.debug(`Authorizer: Issuers whitelist: ${issuerWhiteList}`);
  console.debug(`Authorizer: Required scopes: ${requiredScopes}`);

  const authorizationHeader = event.authorizationToken || {};
  let wrapperAccessToken = '';

  if (authorizationHeader && (authorizationHeader.startsWith('Bearer ') || authorizationHeader.startsWith('bearer'))) {
    // Get Wrapper token from the authorization header
    wrapperAccessToken = authorizationHeader.substring(7).trim();
  }
  console.debug(`Authorizer: wrapperAccessToken : ${wrapperAccessToken}`);

  try {
    // Extract issuer
    const unVerifiedJWT = jose.decodeJwt(wrapperAccessToken);
    const issuer = unVerifiedJWT.iss;
    console.debug(`Authorizer: Issuer fetched from the token : ${issuer}`);

    // Verify whether the issuer is trusted
    if (!issuerWhiteList.includes(issuer)) {
      console.debug('Authorizer: Issuer is not trusted, discarding the token');
      context.fail('Unauthorized');
    }

    // response should be cached in order to avoid unnecessary round trips
    const response = await axios.get(`${issuer}/.well-known/openid-configuration`);
    console.debug(`Authorizer: JWKS URI : ${response.data.jwks_uri}`);
    console.debug(`Authorizer: Token Introspection endpoint : ${response.data.introspection_endpoint}`);

    // Verify Wrapper token jwt
    const JWKS = jose.createRemoteJWKSet(new URL(response.data.jwks_uri));
    await jose.jwtVerify(wrapperAccessToken, JWKS, {});
    console.debug('Authorizer: Wrapper token validation is successful');

    //Base64 encode client_id and client_secret to authenticate to token introspection endpoint
    const basicAuthHeader = Buffer.from(`${process.env.CLIENT_ID.trim()}:${process.env.CLIENT_SECRET.trim()}`, 'utf-8').toString('base64');

    const requestData = {
      token: wrapperAccessToken
    };

    const options = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/jwt',
        Authorization: `Basic ${basicAuthHeader}`
      }
    };

    // Introspect wrapper token to get a JWT access token
    const introspectionResponse = await axios.post(response.data.introspection_endpoint, requestData, options);
    console.debug(`Authorizer: JWT : ${introspectionResponse.data}`);

    // verify scopes
    if (!verifyScopes(requiredScopes, introspectionResponse.data)) {
      console.debug('Authorizer: Insufficient scopes');
      context.fail('Unauthorized');
      return;
    }

    // Return the Policy object
    callback(null, generatePolicy('userId', 'Allow', event.methodArn, introspectionResponse.data));
    console.debug('Authorizer: handler function completed');
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(error.response.data);
      console.error(error.response.status);
    } else if (error.request) {
      // The request was made but no response was received
      console.error(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Authorizer: Error : ', error.message);
    }
    console.error(error.config);
    context.fail('Unauthorized');
  }
};
