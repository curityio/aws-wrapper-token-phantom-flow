# AWS Phantom Token Lambda Authorizer

[![Quality](https://img.shields.io/badge/quality-experiment-red)](https://curity.io/resources/code-examples/status/)
[![Availability](https://img.shields.io/badge/availability-source-blue)](https://curity.io/resources/code-examples/status/)

An AWS Lambda Authorizer implementing the [Phantom Token Pattern](https://curity.io/resources/learn/phantom-token-pattern/) for a wrapper token. This Lambda Authorizer function enables a secure API solution using the AWS API Gateway.

## Overview

The AWS API Gateway does not have built-in capabilities for introspecting opaque access tokens. It is however possible to extend the capabilities of the gateway with [Lambda Authorizer functions](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html).

The AWS Phantom Token Lambda Authorizer for wrapper token implements the Phantom Token Pattern. An wrapper token JWT is passed in the Authorize header to the API. The gateway intercepts the request and invokes the lambda authorizer that will introspect the token using the `application/jwt` header in order to receive a JWT in the response. The lambda authorizer inspect the wrapper token’s issuer in order to decide which introspection service to use.

The authorizer can also be configured to accept tokens only from a set of trusted issuers and also verify that a set of required scopes are present in the `scope` claim in the access token or otherwise deny access to the requested API.

The AWS API Gateway will then forward the access token JWT from the introspection response to the upstream API enabling a Zero Trust approach. The API in itself could also be leverage a Zero Trust design where the JWT holds the public key details for self-contained JWT verification as exemplified in this [Serverless API](https://github.com/curityio/serverless-zero-trust-api).


## Configuring the Lambda Authorizer

1. Clone this repository `git clone git@github.com:curityio/aws-wrapper-token-phantom-flow.git`.
2. Update the `serverless.yml` file as defined below :

    Parameter | Description |
    --------- | ----------- |
    TRUSTED_ISSUERS | Comma separated list of FQDN of the trusted issuers.
    REQUIRED_SCOPES | Comma separated list of required scopes for API access.
    CLIENT_ID       | The client_id of a client with the `introspection` capability.
    CLIENT_SECRET   | The secret of the client with the `introspection` capability.


## Deploying the Lambda Authorizer

After configuring the lambda authorizer, deploy it to the AWS using [Serverless](https://www.serverless.com/).

```
❯ sls deploy

Deploying wrapper-token-phantom-lambda to stage dev (eu-west-1)

✔ Service deployed to stack wrapper-token-phantom-lambda-dev (121s)

endpoint: POST - https://mn28fg11q7.execute-api.eu-west-1.amazonaws.com/dev/example-api
functions:
  authorizer: wrapper-token-authorizer (919 kB)
  exampleAPI: example-api (919 kB)

```

## Calling the API

Client application calls the API by passing the wrapper token in `Authorization` header using `bearer` scheme

```bash
curl --location --request POST 'https://mn28fg11q7.execute-api.eu-west-1.amazonaws.com/dev/example-api' \
--header 'Authorization: Bearer eyJraWQiOiIxMjEyMDY2MDYyIiwieDV0IjoiaVpmaUNvazdHRGpwRnRmc0xEYW5tcUJpY3JVIiwiYWxnIjoiUlMyNTYifQ.eyJhdWQiOiJjbGllbnQtYnJhbmQxIiwiYXpwIjoiY2xpZW50LWJyYW5kMSIsImlzcyI6Imh0dHBzOi8vNTNhNC0yNDA1LTIwMS01YzBlLTM4MzktMTQ4Mi0xZDE1LWVlM2ItODY0Mi5pbi5uZ3Jvay5pby9icmFuZDEvb2F1dGgtYW5vbnltb3VzIiwiZXhwIjoxNjczODg1NDgxLCJpYXQiOjE2NzM4NDk0ODEsImp0aSI6IlAkZjA3YjBlODYtOGMzYS00ZTUwLWJjYmItNTg0ZmFkNThlNTNmIn0.qkzIzj_GU-UIeG0f11BeVyczz0tcxJujMz75QpEmNQTYCQ4zDLCcz4S5RFZr2-51AsQH26VrUjQixI3Li_1323sN5GFEuvgg5TzzirpFE9Ai1ABnMjUfQ96KOTaz5Jph8SHhnCR7UG3PmAu9onUIDOZ-ohrxJW425Uh3UPc9ERj56Gp4LchR8jTKw-nNFNnxXALpF7ZyLzrrNBN6CM9g-kC3MWZce5qldmECZ9YGXmMk_BazLbJLWzDh4VgtnExwzyzkvY0vZcf6F0ud15GJ2861NQhMxLx-hKTIGIOjIn80jZa5G7paR133kYMoZ9268IczHuYesdcFOMWnwjbDGg'
```

API Response :

API echoes back the received access token. Note that the JWT token received by the API is not the same wrapper token sent by the client but rather an JWT access token introspected the by the API gateway and forwarded to the API.

```json
{"IntrospectedJWT":"eyJraWQiOiIxMjEyMDY2MDYyIiwieDV0IjoiaVpmaUNvazdHRGpwRnRmc0xEYW5tcUJpY3JVIiwiYWxnIjoiUlMyNTYifQ.eyJqdGkiOiIwZjlmZmY4Yy1iNmM3LTRmM2QtOGU5YS0zMjc2OTA1ZWQ5OWMiLCJkZWxlZ2F0aW9uSWQiOiJkMDg0Njc5ZC0zOGI0LTRiNjYtOThmYy0zMGVhMzk5NGQ1YTQiLCJleHAiOjE2NzM4ODU0ODEsIm5iZiI6MTY3Mzg0OTQ4MSwic2NvcGUiOiJvcGVuaWQiLCJpc3MiOiJodHRwczovLzUzYTQtMjQwNS0yMDEtNWMwZS0zODM5LTE0ODItMWQxNS1lZTNiLTg2NDIuaW4ubmdyb2suaW8vYnJhbmQxL29hdXRoLWFub255bW91cyIsInN1YiI6InN1cmVuIiwiYXVkIjoiY2xpZW50LWJyYW5kMSIsImlhdCI6MTY3Mzg0OTQ4MSwicHVycG9zZSI6ImFjY2Vzc190b2tlbiJ9.wG0q0XcCYKr_-A_fNjb1kqdLhxE03niCoFE8EFy3whuGlce_f3B6OK1JxXhIiO4Jls-hK8hjrj0v7YwPaBX8GVhLPDJXr3dROyTGlDEkfSR0fxjwkEdTChVP4Cu8X_D7KP5EPjj_DhQkQ6ZopQeKkC2PW4d9A3tvdKH1QhUvo6YJdwgQpeyJSKTzBNT3VDwHVR2PZAreOeYXUjgWAvXQttLmypGwo2ZAhIWeQAiss-F9eLR88yxYpK7ZBoMbYWTJbF348i03czhIpa9e4DPPa5qPK1WKEPpQk3b6dXbcp_qipRC2pWWTNE0Rxd65mX29CivTqEOLVLEtAP9I9Hksiw"}
```

## Remove deployment 

```bash

❯ sls remove
Removing wrapper-token-phantom-lambda from stage dev (eu-west-1)

✔ Service wrapper-token-phantom-lambda has been successfully removed (48s)

```

## More Information

* Please visit [curity.io](https://curity.io/) for more information about the Curity Identity Server.
* [Use API Gateway Lambda authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html)

Copyright (C) 2023 Curity AB.