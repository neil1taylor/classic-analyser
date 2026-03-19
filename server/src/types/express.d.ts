declare namespace Express {
  interface Request {
    apiKey?: string;
    iamToken?: string;
    authMode?: 'apikey' | 'iam';
  }
}
