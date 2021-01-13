const https = require('https');

const getHost = request => request.headers.host[0].value;

const httpsGet = params => new Promise((resolve, reject) => {
  let body = '';
  https.get(params, (res) => {
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      resolve({ status: res.statusCode, body, headers: res.headers });
    });
  }).on('error', (e) => {
    reject(e);
  });
});

const formatHeaders = (headers) => {
  const formattedHeaders = {};
  /* eslint-disable no-return-assign */
  Object.keys(headers)
    .forEach(key => formattedHeaders[key] = [{ key, value: headers[key] }]);
  /* eslint-enable no-return-assign */
  return formattedHeaders;
};

module.exports = { getHost, httpsGet, formatHeaders };
