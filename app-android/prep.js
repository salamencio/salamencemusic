// Copia la app web (carpeta de arriba) a app-android/www, que es lo que empaqueta Capacitor.
const fs = require("fs"), path = require("path");
const src = path.join(__dirname, "..");
const out = path.join(__dirname, "www");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ["index.html", "app.js", "styles.css", "manifest.webmanifest"]) fs.copyFileSync(path.join(src, f), path.join(out, f));
fs.cpSync(path.join(src, "assets"), path.join(out, "assets"), { recursive: true });
console.log("www listo:", fs.readdirSync(out).join(", "));
