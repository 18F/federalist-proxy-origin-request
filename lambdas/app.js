const handlerLogWrapper = require('./helpers/handlerLogWrapper');
const {
  getSiteItem, parseURI, getSiteQueryParams, getBuildQueryParams, getSitePath
} = require('./helpers/dynamoDBHelper');

const Utils = require('./helpers/utils');

const originRequest = async (event, context) => {
  const { request } = event.Records[0].cf;

  /**
    * Reads query string to check if S3 origin should be used, and
    * if true, sets S3 origin properties.
    */
  const params = getSiteQueryParams(Utils.getHost(request), context.functionName);
  const site = await getSiteItem(params);
    
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
};

const originResponse = async (event, context) => {
  const { request, response } = event.Records[0].cf; 
  if (['404', '403'].includes(response.status)) {
    const host = Utils.getHost(request);
    const sitePath = getSitePath(request);
    const params = getBuildQueryParams(host, sitePath, context.functionName);
    const build = await getSiteItem(params);
    const { Settings: { spa } } = build;
    if ([true, 'true', 'True'].includes(spa)) {
      const errorDocPath = [sitePath, 'index.html'].join('/');
      const errorDocResponse = await Utils.httpsGet({ hostname: host, errorDocPath });
      response.body = errorDocResponse.body;
      response.status = errorDocResponse.status;
      response.headers = { ...response.headers, ...Utils.formatHeaders(errorDocResponse.headers) } ;
    }
  }

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

  const params = getSiteQueryParams(Utils.getHost(request), context.functionName);
  return getSiteItem(params)
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
