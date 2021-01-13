const AWS = require('aws-sdk');
const sinon = require('sinon');

function stubDocDBQuery(fn) {
  return sinon.stub(AWS.DynamoDB, 'DocumentClient')
    .returns({
      get: () => ({
        promise: async () => fn(),
      }),
    });
}

const getRequest = () => ({
  uri: '/site/testOwner/testRepo/index.html',
  method: 'GET',
  clientIp: '2001:cdba::3257:9652',
  headers: {
    host: [
      {
        key: 'Host',
        value: 'o-owner-r-repo.sites-test.federalist.18f.gov',
      },
    ],
    'user-agent': [
      {
        key: 'User-Agent',
        value: 'Test Agent',
      },
    ],
    'user-name': [
      {
        key: 'User-Name',
        value: 'aws-cloudfront',
      },
    ],
  },
});

const getRequestEvent = () => ({
  Records: [
    {
      cf: {
        config: {
          distributionId: 'EXAMPLE',
        },
        request: getRequest(),
      },
    },
  ],
});

const getResponseEvent = () => ({
  Records: [
    {
      cf: {
        request: getRequest(),
        response: {
          headers: {},
          status: '200',
          statusDescription: 'OK',
        },
      },
    },
  ],
});

const getContext = eventType => ({ functionName: `us-east-1.federalist-proxy-test-${eventType}` });

module.exports = {
  stubDocDBQuery, getContext, getRequestEvent, getResponseEvent,
};
