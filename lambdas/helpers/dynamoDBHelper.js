// eslint-disable-next-line import/no-extraneous-dependencies
const AWS = require('aws-sdk');
const log = require('./logger');

const appConfig = {
  test: {
    domain: 'sites-test.federalist.18f.gov',
    tableName: 'federalist-proxy-test',
    tableKey: 'Id',
  },
  staging: {
    domain: 'sites-staging.federalist.18f.gov',
    tableName: 'federalist-proxy-staging',
    tableKey: 'Id',
  },
  prod: {
    domain: 'sites-prod.federalist.18f.gov',
    tableName: 'federalist-proxy-prod',
    tableKey: 'Id',
  },
};

const getSiteItem = async (params) => {
  const docClient = new AWS.DynamoDB.DocumentClient({
    httpOptions: { connectTimeout: 120000, timeout: 120000 },
  });
  return docClient.get(params)
    .promise()
    .catch((err) => {
      throw new Error(`Unable to query. Error: ${JSON.stringify(err, null, 2)}`);
    })
    .then(({ Item }) => {
      if (Item) {
        log(`\nQuery succeeded: item found @id:${JSON.stringify(Item.Id)}\n`);
        return Item;
      }
      log('\nQuery succeeded: no results found!!\n');
      return undefined;
    });
};

const functionNameRE = /^us-east-1.federalist-proxy-(prod|staging|test)-(viewer|origin)-(request|response)$/;

const getAppConfig = (functionName) => {
  const match = functionNameRE.exec(functionName);
  if (!match) {
    throw new Error(`Unable to find appConfig for @function: ${functionName}`);
  }
  return appConfig[match[1]];
};

const stripSiteIdFromHost = (host, appDomain) => {
  if (host.endsWith(appDomain)) {
    return host.replace(new RegExp(`.${appDomain}$`), '');
  }
  throw new Error(`Unable to strip siteId from @host: ${host}`);
};

const getQueryParams = (tableName, tableKey, tableKeyValue) => ({
  TableName: tableName,
  Key: {
    [tableKey]: tableKeyValue,
  },
});

const getSiteQueryParams = (host, functionName) => {
  const { tableName, tableKey, domain } = getAppConfig(functionName);
  const siteKeyValue = stripSiteIdFromHost(host, domain);
  return getQueryParams(tableName, tableKey, siteKeyValue);
};

const getBuildQueryParams = (host, path, functionName) => {
  const { tableName, tableKey } = getAppConfig(functionName);
  const buildKeyValue = [host, path].join('');
  return getQueryParams(tableName, tableKey, buildKeyValue);
};

const parseURI = (request) => {
  const [, siteType, owner, repository, branch] = request.uri.split('/');
  return {
    owner,
    repository,
    siteType,
    branch: siteType === 'preview' ? branch : null,
  };
};

const getSitePath = (request) => {
  const {
    branch, owner, repository, siteType,
  } = parseURI(request);
  let sitePath = [siteType, owner, repository].join('/');
  if (siteType === 'preview') {
    sitePath = [siteType, owner, repository, branch].join('/');
  }
  return `/${sitePath}`;
};

module.exports = {
  getSiteItem,
  parseURI,
  getSiteQueryParams,
  getBuildQueryParams,
  stripSiteIdFromHost,
  getAppConfig,
  functionNameRE,
  getSitePath,
};
