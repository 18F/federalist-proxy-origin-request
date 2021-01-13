const { expect } = require('chai');
const sinon = require('sinon');
const { stubDocDBQuery, getRequestEvent, getContext } = require('../support');
const { originRequest } = require('../../lambdas/app');

const context = getContext('origin-request');

describe('originRequest', () => {
  let event;

  beforeEach(() => {
    event = getRequestEvent();
  });
  afterEach(() => {
    sinon.restore();
  });

  it('returns a message', async () => {
    const results = {
      Item: { BucketName: 'testBucket' },
    };

    stubDocDBQuery(() => results);
    const response = await originRequest(event, context);
    expect(response.origin.custom.domainName.split('.')[0]).to.equal('testBucket');
    expect(response.headers.host[0].key).to.equal('host');
    expect(response.headers.host[0].value.split('.')[0]).to.equal('testBucket');
  });
});
