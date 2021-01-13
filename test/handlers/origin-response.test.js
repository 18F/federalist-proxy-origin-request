const { expect } = require('chai');
const sinon = require('sinon');
const nock = require('nock');
const { getResponseEvent, getContext, stubDocDBQuery } = require('../support');
const { originResponse } = require('../../lambdas/app');
const Utils = require('../../lambdas/helpers/utils');

describe('originResponse', () => {
  let results;
  beforeEach(() => {
    stubDocDBQuery(() => results);
  });

  afterEach(() => {
    sinon.restore();
    nock.cleanAll();
  });

  context('non-SPA', () => {
    beforeEach(() => {
      results = { Item: { Settings: {} } };
    });
    it('returns the message', async () => {
      const strictTransportSecurity = [{ key: 'Strict-Transport-Security', value: 'max-age=31536001; preload' }];
      const xFrameOptions = [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }];
      const xContentTypeOptions = [{ key: 'X-Content-Type-Options', value: 'nosniff' }];
      const xServer = [{ key: 'X-Server', value: 'Federalist' }];

      const response = await originResponse(getResponseEvent(), getContext('origin-response'));

      expect(Object.keys(response.headers).length).to.equal(4);
      expect(response.headers['strict-transport-security']).to.deep.equal(strictTransportSecurity);
      expect(response.headers['x-frame-options']).to.deep.equal(xFrameOptions);
      expect(response.headers['x-content-type-options']).to.deep.equal(xContentTypeOptions);
      expect(response.headers['x-server']).to.deep.equal(xServer);
    });

    it('returns a 404', async () => {
      const strictTransportSecurity = [{ key: 'Strict-Transport-Security', value: 'max-age=31536001; preload' }];
      const xFrameOptions = [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }];
      const xContentTypeOptions = [{ key: 'X-Content-Type-Options', value: 'nosniff' }];
      const xServer = [{ key: 'X-Server', value: 'Federalist' }];

      const originResponseIn = getResponseEvent();
      originResponseIn.Records[0].cf.response.status = '404';
      const response = await originResponse(originResponseIn, getContext('origin-response'));
      expect(Object.keys(response.headers).length).to.equal(4);
      expect(response.headers['strict-transport-security']).to.deep.equal(strictTransportSecurity);
      expect(response.headers['x-frame-options']).to.deep.equal(xFrameOptions);
      expect(response.headers['x-content-type-options']).to.deep.equal(xContentTypeOptions);
      expect(response.headers['x-server']).to.deep.equal(xServer);
    });
  });

  context('spa routing', () => {
    beforeEach(() => {
      sinon.stub(Utils, 'httpsGet').resolves({ status: 200, body: 'Hello World', headers: { 'test-header': 'testHeader' } });
      results = { Item: { Settings: { spa: true } } };
    });
    it('returns a 404', async () => {
      const strictTransportSecurity = [{ key: 'Strict-Transport-Security', value: 'max-age=31536001; preload' }];
      const xFrameOptions = [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }];
      const xContentTypeOptions = [{ key: 'X-Content-Type-Options', value: 'nosniff' }];
      const xServer = [{ key: 'X-Server', value: 'Federalist' }];
      const testHeader = [{ key: 'test-header', value: 'testHeader' }];

      const originResponseIn = getResponseEvent();
      originResponseIn.Records[0].cf.response.status = '404';
      const response = await originResponse(originResponseIn, getContext('origin-response'));

      expect(Object.keys(response.headers).length).to.equal(5);
      expect(response.headers['strict-transport-security']).to.deep.equal(strictTransportSecurity);
      expect(response.headers['x-frame-options']).to.deep.equal(xFrameOptions);
      expect(response.headers['x-content-type-options']).to.deep.equal(xContentTypeOptions);
      expect(response.headers['x-server']).to.deep.equal(xServer);
      expect(response.headers['test-header']).to.deep.equal(testHeader);
      expect(response.body).to.equal('Hello World');
    });

    it('returns a 403', async () => {
      const strictTransportSecurity = [{ key: 'Strict-Transport-Security', value: 'max-age=31536001; preload' }];
      const xFrameOptions = [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }];
      const xContentTypeOptions = [{ key: 'X-Content-Type-Options', value: 'nosniff' }];
      const xServer = [{ key: 'X-Server', value: 'Federalist' }];
      const testHeader = [{ key: 'test-header', value: 'testHeader' }];

      const originResponseIn = getResponseEvent();
      originResponseIn.Records[0].cf.response.status = '404';
      const response = await originResponse(originResponseIn, getContext('origin-response'));

      expect(Object.keys(response.headers).length).to.equal(5);
      expect(response.headers['strict-transport-security']).to.deep.equal(strictTransportSecurity);
      expect(response.headers['x-frame-options']).to.deep.equal(xFrameOptions);
      expect(response.headers['x-content-type-options']).to.deep.equal(xContentTypeOptions);
      expect(response.headers['x-server']).to.deep.equal(xServer);
      expect(response.headers['test-header']).to.deep.equal(testHeader);
      expect(response.body).to.equal('Hello World');
    });
  });
});
