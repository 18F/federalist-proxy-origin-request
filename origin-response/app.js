exports.lambdaHandler = async (event, context) => {
	console.log(`\nevent:\t${JSON.stringify(event)}`);

    const response = event.Records[0].cf.response;
    const headers = response.headers;

    headers['strict-transport-security'] = [{key: 'Strict-Transport-Security', value: 'max-age=31536001; preload'}];
    headers['X-Frame-Options'] = [{key: 'X-Frame-Options', value: 'SAMEORIGIN'}];

    return response;
};
// custom error handling
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-examples.html#lambda-examples-custom-error-new-site