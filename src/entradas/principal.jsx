import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/app.css";
import { Aplicativo } from "../app/Aplicativo.jsx";

// A única entrada: os quatro documentos HTML montam o mesmo app.
createRoot(document.getElementById("raiz")).render(<StrictMode><Aplicativo /></StrictMode>);
