import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ParamEditor } from "./ParamEditor";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("root element missing");

createRoot(root).render(
	<StrictMode>
		<ParamEditor />
	</StrictMode>,
);
