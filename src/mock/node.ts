import { setupServer } from "msw/node";
import { getTouchDesignerAPIMock } from "../gen/endpoints/touchDesignerAPI.msw.js";

export const node = setupServer(...getTouchDesignerAPIMock());
