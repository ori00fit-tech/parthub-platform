// /voiture/:make/:model — parts for a car model (e.g. /voiture/dacia/logan).
import { landingResponse } from "../../_lib/landing.js";

export const onRequestGet = (context) =>
  landingResponse(context, { make: String(context.params.make || ""), model: String(context.params.model || "") });
