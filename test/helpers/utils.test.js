const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');
const { getRequestEvent } = require('../support');
const { getHost, httpsGet } = require('../../lambdas/helpers/utils');

chai.use(chaiAsPromised);
const { expect } = chai;

describe  ('utils', () => {
  let event;

  beforeEach(() => {
    event =  getRequestEvent();
  })
  afterEach(() => {
    nock.cleanAll();
  });
  context('getHost', () => {
    it('fetches host from request', () => {
      const { request } = getRequestEvent().Records[0].cf;
      expect(getHost(request)).to.equal('o-owner-r-repo.sites-test.federalist.18f.gov');
    });
  });

  context('httpsGet', () => {
    it('promisify https.get - resolve', async () => {
      const endpoint = 'https://example.gov/index.html';
      const url = new URL(endpoint);
      nock(`${url.protocol}//${url.hostname}`)
        .get(url.pathname)
        .reply(200, 'Hello World', { 'test-header': 'testHeader' });
      expect(httpsGet(url)).to.eventually.deep.equal({
        status: 200, body: 'Hello World', headers: { 'test-header': 'testHeader' },
      });
    });

    it('promisify https.get - reject', async () => {
      const endpoint = 'https://example.gov/index.html';
      const url = new URL(endpoint);
      nock(`${url.protocol}//${url.hostname}`)
        .get(url.pathname)
        .replyWithError('didn\'t work sorry!');
      return expect(httpsGet(url)).to.eventually.be.rejected;
    });
  });
});