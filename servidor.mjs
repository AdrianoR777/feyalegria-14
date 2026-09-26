// Servidor local para probar la web con el login de Google (no funciona abriendo el archivo con doble clic).
// Uso: node servidor.mjs   y abre http://localhost:8080
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".csv": "text/csv" };
// La carpeta herramientas (con la clave de servicio) nunca se sirve
const PROHIBIDO = /^[\\/]?(herramientas|\.impeccable|\.git)([\\/]|$)/i;

http.createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const rel = path.normalize(ruta === "/" ? "index.html" : ruta).replace(/^([\\/])+/, "");
  const archivo = path.join(RAIZ, rel);
  if (!archivo.startsWith(RAIZ + path.sep) || PROHIBIDO.test(rel)) { res.writeHead(403); return res.end("Prohibido"); }
  fs.readFile(archivo, (err, datos) => {
    if (err) { res.writeHead(404); return res.end("No encontrado"); }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo)] || "application/octet-stream" });
    res.end(datos);
  });
}).listen(8080, "127.0.0.1", () => console.log("Abre http://localhost:8080"));
