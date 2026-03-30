export type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  APP_ENV?: string;
  JWT_EXPIRES_IN?: string;
};

export type HonoVariables = {
  requestId?: string;
  user?: {
    id: number;
    email?: string;
    role?: string;
  };
};
