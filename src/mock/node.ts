import { setupServer } from "msw/node";
import { getTouchDesignerAPIMock } from "../gen/endpoints/TouchDesignerAPI.js";

export const node = setupServer(...getTouchDesignerAPIMock());
