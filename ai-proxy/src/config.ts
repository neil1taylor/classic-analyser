export interface Config {
  WATSONX_API_KEY: string;
  WATSONX_PROJECT_ID: string;
  WATSONX_URL: string;
  AI_PROXY_SECRET: string;
  PORT: number;
}

export const config: Config = {
  WATSONX_API_KEY: process.env.WATSONX_API_KEY || '',
  WATSONX_PROJECT_ID: process.env.WATSONX_PROJECT_ID || '',
  WATSONX_URL: process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com',
  AI_PROXY_SECRET: process.env.AI_PROXY_SECRET || '',
  PORT: parseInt(process.env.PORT || '8080', 10),
};
