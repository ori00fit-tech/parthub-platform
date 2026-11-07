// /voiture/:make/:model/:category — a category for a car model
// (e.g. /voiture/dacia/logan/filters).
import { landingResponse } from "../../../_lib/landing.js";

export const onRequestGet = (context) =>
  landingResponse(context, {
    make: String(context.params.make || ""),
    model: String(context.params.model || ""),
    category: String(context.params.category || ""),
  });
