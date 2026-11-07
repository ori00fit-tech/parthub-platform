// /pieces/:category — a part category (e.g. /pieces/filters).
import { landingResponse } from "../_lib/landing.js";

export const onRequestGet = (context) => landingResponse(context, { category: String(context.params.category || "") });
