const chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
const nock = require('nock');
const { getRequestEvent } = require('../support');
const { getHost, httpsGet } = require('../../lambdas/helpers/utils');

chai.use(chaiAsPromised);
const { expect } = chai;

afterEach(() => {
  nock.cleanAll();
});
describe('getHost', () => {
  it('fetches host from request', () => {
    const { request } = getRequestEvent().Records[0].cf;
    expect(getHost(request)).to.equal('o-owner-r-repo.sites-test.federalist.18f.gov');
  });
});

describe('httpsGet', () => {
  it('promisify https.get - resolve', async () => {
    const endpoint = 'https://example.gov/index.html';
    const url = new URL(endpoint);
    const testHeader = 'testHeader';
    nock(url.protocol + '//' + url.hostname)
      .get(url.pathname)
      .reply(200, 'Hello World', { 'test-header': 'testHeader' });
    expect(httpsGet(url)).to.eventually.deep.equal({
      status: 200, body: 'Hello World', headers: { 'test-header': 'testHeader' }
    });
  });

  it('promisify https.get - reject', () => {
    const endpoint = 'https://example.gov/index.html';
    const url = new URL(endpoint);
    const testHeader = 'testHeader';
    nock(url.protocol + '//' + url.hostname)
      .get(url.pathname)
      .replyWithError('didn\'t work sorry!');
    expect(httpsGet(url)).to.eventually.be.rejected;
  });
});
