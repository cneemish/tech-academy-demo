import Contentstack from 'contentstack';

// Validate required environment variables
const apiKey = process.env.CONTENTSTACK_API_KEY;
const deliveryToken = process.env.CONTENTSTACK_DELIVERY_TOKEN;
const environment = process.env.CONTENTSTACK_ENVIRONMENT || 'prod';

if (!apiKey) {
  throw new Error('CONTENTSTACK_API_KEY environment variable is required');
}

if (!deliveryToken) {
  throw new Error('CONTENTSTACK_DELIVERY_TOKEN environment variable is required');
}

// Initialize Contentstack SDK
const Stack = Contentstack.Stack({
  api_key: apiKey,
  delivery_token: deliveryToken,
  environment: environment,
  region: Contentstack.Region.US,
});

export default Stack;
