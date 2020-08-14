const { expect } = require('chai');
const sinon = require('sinon');
const nock = require('nock');
const { getResponseEvent, getContext, stubDocDBQuery } = require('../support');

const { originResponse } = require('../../lambdas/app');

const context = getContext('origin-response');

const checkReqHeaders = (response) => {
  const strictTransportSecurity = [{ key: 'Strict-Transport-Security', value: 'max-age=31536001; preload' }];
  const xFrameOptions = [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }];
  const xServer = [{ key: 'X-Server', value: 'Federalist' }];
  expect(response.headers['strict-transport-security']).to.deep.equal(strictTransportSecurity);
  expect(response.headers['X-Frame-Options']).to.deep.equal(xFrameOptions);
  expect(response.headers['X-Server']).to.deep.equal(xServer);
};

describe('originResponse', () => {
  afterEach(() => {
    sinon.restore();
    nock.cleanAll();
  });
  it('returns the message', async () => {
    const queryResults = {
      Count: 1,
      Items: [{ Id: 'testId', Settings: {}, BucketName: 'testBucket' }],
    };

    stubDocDBQuery(() => queryResults);
    const response = await originResponse(getResponseEvent(), context);
    checkReqHeaders(response);
  });

  it('returns status 404 w/o errorDOc', async () => {
    const queryResults = {
      Count: 1,
      Items: [{ Id: 'testId', Settings: {}, BucketName: 'testBucket' }],
    };

    stubDocDBQuery(() => queryResults);
    const event = getResponseEvent();
    event.Records[0].cf.response.status = '404';
    const response = await originResponse(event, context);
    checkReqHeaders(response);
  });

  it('returns status 404 w/ errorDOc', async () => {
    const queryResults = {
      Count: 1,
      Items: [{ Id: 'testId', Settings: { ErrorDocument: '/404.html' }, BucketName: 'testBucket' }],
    };

    stubDocDBQuery(() => queryResults);
    const event = getResponseEvent();
    event.Records[0].cf.response.status = '404';
    const { origin } = event.Records[0].cf.request;
    nock(`https://${origin.custom.domainName}`)
      .get('/404.html')
      .reply(200, 'helloworld', { 'X-test': 'testHeader' });
    const response = await originResponse(event, context);
    expect(Object.keys(response.headers).length).to.equal(4);
    checkReqHeaders(response);
    expect(response.headers['x-test']).to.deep.equal({ key: 'x-test', value: 'testHeader'});
  });

  it('returns status 403 w/ errorDOc', async () => {
    const queryResults = {
      Count: 1,
      Items: [{ Id: 'testId', Settings: { ErrorDocument: '/404.html' }, BucketName: 'testBucket' }],
    };

    stubDocDBQuery(() => queryResults);
    const event = getResponseEvent();
    event.Records[0].cf.response.status = '403';
    const { origin } = event.Records[0].cf.request;
    nock(`https://${origin.custom.domainName}`)
      .get('/404.html')
      .reply(200, 'helloworld', { 'X-test': 'testHeader' });
    const response = await originResponse(event, context);
    expect(Object.keys(response.headers).length).to.equal(4);
    checkReqHeaders(response);
    expect(response.headers['x-test']).to.deep.equal({ key: 'x-test', value: 'testHeader'});
  });

  it('returns the message with custom response headers', async () => {
    const queryResults = {
      Count: 1,
      Items: [{ Id: 'testId', Settings: { ResponseHeaders: { header1: 'Header1', header2: 'Header2' } }, BucketName: 'testBucket' }],
    };

    stubDocDBQuery(() => queryResults);
    const response = await originResponse(getResponseEvent(), context);
    checkReqHeaders(response);
    expect(Object.keys(response.headers).length).to.equal(5);
    expect(response.headers['header1']).to.deep.equal({ key: 'header1', value: 'Header1' });
    expect(response.headers['header2']).to.deep.equal({ key: 'header2', value: 'Header2' });
  });
});
