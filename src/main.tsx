import {StrictMode} from "react";
import {createRoot} from "react-dom/client";

import {App} from "./App";
import {registerServiceWorker} from "./sw/register";
import "@fontsource/ruslan-display/cyrillic-400.css";
import "@fontsource/ruslan-display/latin-400.css";
import "@fontsource/old-standard-tt/cyrillic-400.css";
import "@fontsource/old-standard-tt/cyrillic-400-italic.css";
import "@fontsource/old-standard-tt/cyrillic-700.css";
import "@fontsource/old-standard-tt/latin-400.css";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

registerServiceWorker();
