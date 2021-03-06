const handlerLogWrapper = require('./helpers/handlerLogWrapper');
const {
  getSite, parseURI, getSiteQueryParams,
} = require('./helpers/dynamoDBHelper');

const { getHost } = require('./helpers/utils');

const originRequest = async (event, context) => {
  const { request } = event.Records[0].cf;

  /**
    * Reads query string to check if S3 origin should be used, and
    * if true, sets S3 origin properties.
    */
  const host = getHost(request);
  const params = getSiteQueryParams(host, context.functionName);
  return getSite(params)
    .then((site) => {
      const { BucketName: bucket } = site;

      if (bucket) {
        const s3DomainName = `${bucket}.app.cloud.gov`;

        request.origin = {
          custom: {
            domainName: s3DomainName,
            port: 443,
            protocol: 'https',
            sslProtocols: ['TLSv1', 'TLSv1.1'],
            readTimeout: 5,
            keepaliveTimeout: 5,
            customHeaders: {},
          },
        };
        request.headers.host = [{ key: 'host', value: s3DomainName }];
      }
      return request;
    });
};

const originResponse = async (event) => {
  const { response } = event.Records[0].cf;
  response.headers['strict-transport-security'] = [
    { key: 'Strict-Transport-Security', value: 'max-age=31536001; preload' },
  ];
  response.headers['x-frame-options'] = [
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  ];
  response.headers['x-content-type-options'] = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
  ];
  response.headers['x-server'] = [
    { key: 'X-Server', value: 'Federalist' },
  ];
  return response;
};
// custom error handling
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-examples.html#lambda-examples-custom-error-new-site
// https://stackoverflow.com/questions/28449363/why-is-this-http-request-not-working-on-aws-lambda


const viewerRequest = async (event, context) => {
  const { request } = event.Records[0].cf;

  if (parseURI(request).siteType !== 'preview') {
    return request;
  }

  const host = getHost(request);
  const params = getSiteQueryParams(host, context.functionName);
  return getSite(params)
    .then((site) => {
      const { Settings: { BasicAuth: credentials } } = site;

      if (!credentials) {
        return request;
      }

      request.headers['x-forwarded-host'] = [
        { key: 'X-Forwarded-Host', value: request.headers.host[0].value },
      ];

      const { Username: username, Password: password } = credentials;

      // Build a Basic Authentication string
      const authString = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

      // Challenge for auth if auth credentials are absent or incorrect
      const { authorization } = request.headers;
      if (authorization && authorization.length && authorization[0].value === authString) {
        return request;
      }

      return {
        status: '401',
        statusDescription: 'Unauthorized',
        body: 'Unauthorized',
        headers: {
          'www-authenticate': [{ key: 'WWW-Authenticate', value: 'Basic' }],
        },
      };
    });
};

module.exports = {
  originRequest: handlerLogWrapper('originRequest', originRequest),
  viewerRequest: handlerLogWrapper('viewerRequest', viewerRequest),
  originResponse: handlerLogWrapper('originResponse', originResponse),
};
