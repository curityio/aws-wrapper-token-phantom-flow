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

exports.handler = async (event, context, callback) => {
  console.debug('API: Handler function invoked ');
  const jwtAccessToken = event.requestContext.authorizer.token;
  console.debug(jwtAccessToken);

  /* API shouldn't echo back the access token but since this is just an example API to show that the
   API received a JWT instead of the wrapper token sent by the client, it's returning the introspected JWT token for easy verification */
  const data = {
    IntrospectedJWT: jwtAccessToken
  };

  return {
    headers: {
      'Content-Type': 'application/json'
    },
    statusCode: 200,
    body: JSON.stringify(data)
  };
};
