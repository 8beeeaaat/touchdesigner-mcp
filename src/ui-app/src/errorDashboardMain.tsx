import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorDashboard } from "./ErrorDashboard";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("root element missing");

createRoot(root).render(
	<StrictMode>
		<ErrorDashboard />
	</StrictMode>,
);
