// /voiture/:make — parts for a car make (e.g. /voiture/dacia).
import { landingResponse } from "../_lib/landing.js";

export const onRequestGet = (context) => landingResponse(context, { make: String(context.params.make || "") });
