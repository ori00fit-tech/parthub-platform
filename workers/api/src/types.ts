export type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  MEDIA_BACKUP?: R2Bucket; // optional second bucket: every photo is written to both (utils/media.ts storeMedia)
  APP_ENV?: string;
  JWT_EXPIRES_IN?: string;
  JWT_SECRET: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_VERIFY_TOKEN?: string;
  WHATSAPP_APP_SECRET?: string; // Meta app secret: signs the webhook calls
  WHATSAPP_TEMPLATE_LANG?: string;
  ORDER_MAX_OPEN?: string; // orders waiting for confirmation per buyer (utils/order-guard.ts), default 5
  WHATSAPP_BUSINESS_ACCOUNT_ID?: string; // WhatsApp Business account: read / submit templates (Admin › WhatsApp › Templates)
  STOREFRONT_URL?: string;
  SELLER_PORTAL_URL?: string;
  ADMIN_URL?: string;
  SHIPPING_FEE_CENTIMES?: string;
};

export type UserRole = "buyer" | "seller" | "admin";

export type HonoVariables = {
  request_id: string;
  user_id: number;
  user_role: UserRole;
  seller_id: number | null;
  session_id: string | null; // the device's session, when the token has one
};
