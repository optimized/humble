/* eslint-disable */

import pulumi from '@pulumi/pulumi';
import aws from '@pulumi/aws';
import awsx from '@pulumi/awsx';
import random from '@pulumi/random';
import {
  isNil,
  pick,
} from 'lodash';
import p from 'path';
import cp from 'child_process';
import AWS from 'aws-sdk';
import uuid from 'uuid/v4';
import camelKeys from './camelKeys';
import upperKeys from './upperKeys';

function identifyCredentials(pulumiCredentials) {
  const creds = {
    ...pulumiCredentials,
  };
  if (creds.profile) {
    const processCreds = new AWS.SharedIniFileCredentials({
      profile: creds.profile,
    });
    creds.accessKeyId = processCreds.accessKeyId;
    creds.secretAccessKey = processCreds.secretAccessKey;
  }
  return creds;
}

const AWS_PROPS = [
  'Name',
  'ApiKeySelectionExpression',
  'CorsConfiguration',
  'CredentialsArn',
  'Description',
  'DisableSchemaValidation',
  'RouteKey',
  'Tags',
  'Target',
  'Version',
];

class WebsocketApiProvider extends pulumi.dynamic.Resource {
  constructor(name, props = {}, ops) {
    super({
      async create(inputs) {
        const creds = identifyCredentials(props._credentials);
        const gateway = new AWS.ApiGatewayV2(creds);

        const api = await gateway.createApi({
          ...pick(upperKeys(inputs), AWS_PROPS),
          ProtocolType: 'WEBSOCKET',
          RouteSelectionExpression: '$request.body.action',
        }).promise();

        return { id: api.ApiId, outs: camelKeys(api) };
      },
      async delete(id, inputs) {
        const creds = identifyCredentials(props._credentials);
        const gateway = new AWS.ApiGatewayV2(creds);

        await gateway.deleteApi({
          ApiId: id,
        }).promise().catch(console.log);
      },
      async update(id, olds, news) {
        const creds = identifyCredentials(props._credentials);
        const gateway = new AWS.ApiGatewayV2(creds);

        await gateway.updateApi({
          ...pick(upperKeys(news), AWS_PROPS),
          ApiId: id,
          RouteSelectionExpression: '$request.body.action',
        }).promise().catch(console.log);
      },
    }, name, props, ops);
  }
}

export default class WebsocketApi extends pulumi.ComponentResource {
  constructor(name, props = {}, ops) {
    super('umble:websocket:WebsocketApi', name, props, ops);

    const _credentials = {
      profile: aws.config.profile,
      accessKeyId: aws.config.accessKey,
      secretAccessKey: aws.config.secretKey,
      region: aws.config.region,
    };

    new WebsocketApiProvider(name, { name, ...props, _credentials }, { parent: this });
  }
}
