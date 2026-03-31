export type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  APP_ENV?: string;
  JWT_EXPIRES_IN?: string;
  JWT_SECRET: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_VERIFY_TOKEN?: string;
};

export type UserRole = "buyer" | "seller" | "admin";

export type HonoVariables = {
  request_id: string;
  user_id: number;
  user_role: UserRole;
  seller_id: number | null;
};
