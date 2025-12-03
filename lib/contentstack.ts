import Contentstack from 'contentstack';

// Initialize Contentstack SDK
const Stack = Contentstack.Stack({
  api_key: process.env.CONTENTSTACK_API_KEY || 'blt458f96b1d51470e8',
  delivery_token: process.env.CONTENTSTACK_DELIVERY_TOKEN || 'cs481b1820d8f02692d6d06fe6',
  environment: process.env.CONTENTSTACK_ENVIRONMENT || 'production',
  region: Contentstack.Region.US,
});

export default Stack;

