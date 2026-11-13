// For tests that place the same order many times on purpose: forgets the
// duplicate-order guard and its counters before each order
// (utils/order-guard.ts is tested on its own in order-guard.test.mjs).
export function guardOff(app, sql, env) {
  env.ORDER_MAX_OPEN = "100000";
  const request = app.request.bind(app);
  app.request = (input, init, ...rest) => {
    if (String(input).includes("/api/v1/commerce/orders") && init?.method === "POST" && !String(input).includes("/issues") && !String(input).includes("/received")) {
      sql.exec("update orders set cart_hash = null");
      sql.exec("delete from auth_attempts where key like 'order:%'");
    }
    return request(input, init, ...rest);
  };
}
