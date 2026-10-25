"use strict";
// Servidor de sincronización de Salamence music (solo app de escritorio).
// El móvil se conecta por la red que crea "Compartir conexión por USB" (o por Wi-Fi) y, con un PIN,
// descarga las listas y canciones del PC o le envía las suyas. Los datos viven en la ventana de la app,
// así que el servidor los pide con la función `ask(tipo, parámetros)`.
const http = require("http");
const os = require("os");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const VERSION = "1.2.0";
const CHUNK = 4 * 1024 * 1024;
const ZIP_LIMIT = Number(process.env.SALAMENCE_ZIP_LIMIT) || 0xffffffff; // solo se cambia en pruebas

const MIME = { mp3: "audio/mpeg", flac: "audio/flac", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", wma: "audio/x-ms-wma", weba: "audio/webm" };
const mimeOf = (name) => MIME[String(name).split(".").pop().toLowerCase()] || "application/octet-stream";

/* ---------- direcciones de este PC ---------- */
function networkAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const i of list || []) {
      if ((i.family !== "IPv4" && i.family !== 4) || i.internal) continue;
      let hint = "red local (Wi-Fi o cable)";
      if (/^192\.168\.42\./.test(i.address) || /rndis|usb|remote ndis/i.test(name)) hint = "cable USB (compartir conexión por USB)";
      else if (/^192\.168\.43\./.test(i.address)) hint = "punto de acceso Wi-Fi del móvil";
      out.push({ name, address: i.address, hint });
    }
  }
  return out.sort((a, b) => (b.hint.startsWith("cable") ? 1 : 0) - (a.hint.startsWith("cable") ? 1 : 0));
}

/* ---------- ZIP en streaming (sin comprimir, con descriptores de datos y ZIP64 si hace falta) ---------- */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(prev, buf) { let c = prev ^ 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function dosStamp(d = new Date()) { return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() }; }
function zipLocalHeader(nameBuf, dt) {
  const b = Buffer.alloc(30 + nameBuf.length);
  b.writeUInt32LE(0x04034b50, 0); b.writeUInt16LE(20, 4); b.writeUInt16LE(0x0808, 6); b.writeUInt16LE(0, 8);
  b.writeUInt16LE(dt.time, 10); b.writeUInt16LE(dt.date, 12); b.writeUInt16LE(nameBuf.length, 26); nameBuf.copy(b, 30);
  return b;
}
function zipDescriptor(crc, size) { const b = Buffer.alloc(16); b.writeUInt32LE(0x08074b50, 0); b.writeUInt32LE(crc, 4); b.writeUInt32LE(size, 8); b.writeUInt32LE(size, 12); return b; }
function zipCentralEntry(nameBuf, dt, crc, size, offset) {
  const z64 = offset >= ZIP_LIMIT, extra = Buffer.alloc(z64 ? 12 : 0);
  if (z64) { extra.writeUInt16LE(1, 0); extra.writeUInt16LE(8, 2); extra.writeBigUInt64LE(BigInt(offset), 4); }
  const b = Buffer.alloc(46 + nameBuf.length + extra.length);
  b.writeUInt32LE(0x02014b50, 0); b.writeUInt16LE(z64 ? 45 : 20, 4); b.writeUInt16LE(z64 ? 45 : 20, 6); b.writeUInt16LE(0x0808, 8);
  b.writeUInt16LE(dt.time, 12); b.writeUInt16LE(dt.date, 14); b.writeUInt32LE(crc, 16); b.writeUInt32LE(size, 20); b.writeUInt32LE(size, 24);
  b.writeUInt16LE(nameBuf.length, 28); b.writeUInt16LE(extra.length, 30); b.writeUInt32LE(z64 ? 0xffffffff : offset, 42);
  nameBuf.copy(b, 46); extra.copy(b, 46 + nameBuf.length);
  return b;
}
function zipEnd(count, cdSize, cdOffset) {
  const z64 = count >= 0xffff || cdOffset >= ZIP_LIMIT || cdSize >= ZIP_LIMIT, parts = [];
  if (z64) {
    const rec = Buffer.alloc(56);
    rec.writeUInt32LE(0x06064b50, 0); rec.writeBigUInt64LE(44n, 4); rec.writeUInt16LE(45, 12); rec.writeUInt16LE(45, 14);
    rec.writeBigUInt64LE(BigInt(count), 24); rec.writeBigUInt64LE(BigInt(count), 32); rec.writeBigUInt64LE(BigInt(cdSize), 40); rec.writeBigUInt64LE(BigInt(cdOffset), 48);
    const loc = Buffer.alloc(20);
    loc.writeUInt32LE(0x07064b50, 0); loc.writeBigUInt64LE(BigInt(cdOffset + cdSize), 8); loc.writeUInt32LE(1, 16);
    parts.push(rec, loc);
  }
  const e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(z64 ? 0xffff : count, 8); e.writeUInt16LE(z64 ? 0xffff : count, 10);
  e.writeUInt32LE(z64 ? 0xffffffff : cdSize, 12); e.writeUInt32LE(z64 ? 0xffffffff : cdOffset, 16);
  parts.push(e);
  return Buffer.concat(parts);
}

/* ---------- página para el móvil ---------- */
const PAGE = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0d1116"><title>Salamence music · Sincronizar</title>
<style>
*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;background:#0d1116;color:#f3f6fa;font:16px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:560px;margin:0 auto;padding:22px 18px 60px}h1{margin:0;font-size:26px}.sub{color:#9aa4b2;margin:2px 0 22px}
section{background:#161c24;border:1px solid #28313d;border-radius:14px;padding:16px;margin:0 0 16px}h2{margin:0 0 6px;font-size:18px}p{margin:6px 0;color:#c0c9d3}
.btn,button{display:block;width:100%;text-align:center;background:#3bb8ea;color:#04141c;font:700 16px system-ui;border:0;border-radius:24px;padding:13px 16px;margin:10px 0 0;text-decoration:none;cursor:pointer}
.btn.alt,button.alt{background:transparent;color:#f3f6fa;border:1px solid #3a4452}input[type=text],input[type=tel]{width:100%;font:700 28px monospace;letter-spacing:8px;text-align:center;background:#0d1116;color:#fff;border:1px solid #3a4452;border-radius:12px;padding:12px}
.err{color:#ff8497;min-height:1.4em}small{color:#8a94a3}details a{display:block;padding:9px 4px;color:#7fd3f5;border-bottom:1px solid #222a35;overflow-wrap:anywhere;text-decoration:none}summary{cursor:pointer;color:#9aa4b2;margin-top:12px}
progress{width:100%;margin-top:10px}ol{padding-left:20px;color:#c0c9d3}
</style></head><body><main>
<h1>Salamence music</h1><p class="sub">Sincronizar con tu PC</p>
<section id="login"><h2>Código PIN</h2><p>Escribe el PIN de 6 cifras que aparece en la app del PC.</p><input id="pin" type="tel" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="······"><button id="go">Conectar</button><p id="err" class="err"></p></section>
<div id="main" hidden>
<section><h2>Del PC al móvil</h2><p id="summary"></p>
<a id="dl-lists" class="btn" download>Descargar mis listas y favoritos</a><small>Archivo pequeño (.salamence). Impórtalo en la app del móvil.</small>
<a id="dl-zip" class="btn alt" download>Descargar todas las canciones (ZIP)</a><small>Descomprímelo en el móvil (app Archivos) y añade las canciones a la app.</small>
<details id="songs"><summary>Descargar canciones una a una</summary><div id="songlist"><small>Cargando…</small></div></details></section>
<section><h2>Del móvil al PC</h2><p>Elige canciones o una copia (.salamence) creada en la app del móvil.</p>
<input id="files" type="file" multiple style="display:none"><button id="pick" class="alt">Elegir archivos…</button><button id="send" hidden>Enviar al PC</button><progress id="prog" value="0" max="1" hidden></progress><p id="status"></p></section>
<section><h2>Cómo terminar en el móvil</h2><ol><li>Abre Salamence music.</li><li>Pulsa el icono de copia de seguridad &gt; Importar y elige el archivo .salamence descargado.</li><li>Pulsa «Añadir música» y elige las canciones descargadas: se enlazan solas a tus listas.</li></ol></section>
</div>
<script>
var $=function(i){return document.getElementById(i)},pin=sessionStorage.getItem("pin")||"";
function q(p){return p+(p.indexOf("?")>=0?"&":"?")+"pin="+encodeURIComponent(pin)}
function fmt(b){return b>=1e9?(b/1e9).toFixed(1)+" GB":b>=1e6?Math.round(b/1e6)+" MB":Math.max(1,Math.round(b/1e3))+" KB"}
function api(p){return fetch(p,{headers:{"x-pin":pin}}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){if(!r.ok)throw new Error(j.error||("Error "+r.status));return j})})}
function connect(){api("/api/info").then(function(i){sessionStorage.setItem("pin",pin);$("login").hidden=true;$("main").hidden=false;
$("summary").textContent="Tu PC tiene "+i.tracks+(i.tracks==1?" canción (":" canciones (")+fmt(i.bytes)+"), "+i.playlists+(i.playlists==1?" lista":" listas")+" y "+i.liked+(i.liked==1?" favorito":" favoritos")+".";
$("dl-lists").href=q("/dl/lists");$("dl-zip").href=q("/dl/songs.zip");$("dl-zip").textContent="Descargar todas las canciones (ZIP, "+fmt(i.bytes)+")";
}).catch(function(e){$("login").hidden=false;$("main").hidden=true;$("err").textContent=e.message})}
$("go").onclick=function(){pin=$("pin").value.trim();$("err").textContent="";connect()};
$("pin").onkeydown=function(e){if(e.key==="Enter")$("go").click()};
$("songs").addEventListener("toggle",function(){if(!$("songs").open||$("songs").dataset.done)return;$("songs").dataset.done="1";
api("/api/tracks").then(function(list){var box=$("songlist");box.textContent="";list.forEach(function(t){var a=document.createElement("a");a.href=q("/dl/song?key="+encodeURIComponent(t.key));a.setAttribute("download",t.name);a.textContent=(t.title||t.name)+(t.artist?" — "+t.artist:"")+" ("+fmt(t.size)+")";box.appendChild(a)});if(!list.length)box.textContent="No hay canciones."}).catch(function(e){$("songlist").textContent=e.message})});
$("pick").onclick=function(){$("files").click()};
$("files").onchange=function(){var n=$("files").files.length;$("send").hidden=!n;$("status").textContent=n?n+" archivo(s) listos para enviar.":""};
$("send").onclick=function(){var list=[].slice.call($("files").files),i=0,ok=0;$("send").disabled=true;$("prog").hidden=false;
function next(){if(i>=list.length){$("status").textContent="Enviados "+ok+" de "+list.length+". Ya están en tu PC.";$("send").disabled=false;$("prog").hidden=true;$("files").value="";$("send").hidden=true;return}
var f=list[i++],x=new XMLHttpRequest();x.open("PUT",q("/api/upload?name="+encodeURIComponent(f.name)));$("status").textContent="Enviando "+i+" de "+list.length+": "+f.name;
x.upload.onprogress=function(e){if(e.lengthComputable){$("prog").max=e.total;$("prog").value=e.loaded}};
x.onload=function(){if(x.status===200)ok++;else{try{$("status").textContent=JSON.parse(x.responseText).error}catch(e){}}next()};
x.onerror=function(){$("status").textContent="Se perdió la conexión con el PC.";$("send").disabled=false};x.send(f)}
next()};
if(pin){$("pin").value=pin;connect()}
</script></body></html>`;

/* ---------- servidor ---------- */
function createSyncServer({ ask, tempDir, onEvent = () => {} }) {
  let server = null, pin = "", port = 0, trackCache = new Map();
  const fails = new Map(), uploads = new Map(), seen = new Set();

  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "x-pin, content-type, range", "Access-Control-Allow-Methods": "GET, PUT, OPTIONS", "Access-Control-Expose-Headers": "content-length, content-range" };
  const json = (res, code, obj) => { const b = Buffer.from(JSON.stringify(obj)); res.writeHead(code, { ...cors, "Content-Type": "application/json; charset=utf-8", "Content-Length": b.length }); res.end(b); };
  const attach = (name) => `attachment; filename="${String(name).replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`;
  const stamp = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

  function authorized(req, url, res) {
    const ip = req.socket.remoteAddress || "?", f = fails.get(ip) || { n: 0, until: 0 };
    if (Date.now() < f.until) { json(res, 429, { error: "Demasiados intentos. Espera un minuto e inténtalo de nuevo." }); return false; }
    const a = Buffer.from(String(req.headers["x-pin"] || url.searchParams.get("pin") || "")), b = Buffer.from(pin);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      fails.delete(ip);
      if (!seen.has(ip)) { seen.add(ip); onEvent({ type: "connected", ip }); }
      return true;
    }
    f.n++; if (f.n >= 5) { f.n = 0; f.until = Date.now() + 60000; } fails.set(ip, f);
    json(res, 401, { error: "PIN incorrecto" });
    return false;
  }
  async function refreshTracks() { const list = await ask("tracks", {}); trackCache = new Map(list.map((t) => [t.key, t])); return list; }
  async function getTrack(key) { if (!trackCache.has(key)) await refreshTracks(); return trackCache.get(key); }
  const write = (res, buf) => (res.write(buf) ? null : new Promise((r) => res.once("drain", r)));

  async function sendSong(req, res, url) {
    const t = await getTrack(url.searchParams.get("key") || "");
    if (!t) return json(res, 404, { error: "Esa canción ya no está en el PC" });
    const size = t.size, m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    let start = 0, end = size - 1, code = 200;
    if (m && (m[1] !== "" || m[2] !== "")) {
      if (m[1] !== "") { start = +m[1]; if (m[2] !== "") end = Math.min(+m[2], size - 1); } else { start = Math.max(0, size - +m[2]); }
      if (start > end || start >= size) { res.writeHead(416, { ...cors, "Content-Range": `bytes */${size}` }); return res.end(); }
      code = 206;
    }
    const headers = { ...cors, "Content-Type": mimeOf(t.name), "Accept-Ranges": "bytes", "Content-Length": end - start + 1, "Content-Disposition": attach(t.name) };
    if (code === 206) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    res.writeHead(code, headers);
    for (let off = start; off <= end && !res.destroyed; off += CHUNK) {
      const buf = Buffer.from(await ask("file", { key: t.key, start: off, end: Math.min(off + CHUNK, end + 1) }));
      const w = write(res, buf); if (w) await w;
    }
    res.end();
  }

  async function sendZip(req, res) {
    const list = await refreshTracks(), used = new Set(), entries = [], dt = dosStamp();
    for (const t of list) {
      let name = t.name, n = 2; const dot = name.lastIndexOf(".");
      while (used.has(name.toLowerCase())) { name = dot > 0 ? `${t.name.slice(0, dot)} (${n++})${t.name.slice(dot)}` : `${t.name} (${n++})`; }
      used.add(name.toLowerCase());
      entries.push({ key: t.key, size: t.size, nameBuf: Buffer.from(name, "utf8") });
    }
    let offset = 0;
    for (const e of entries) { e.offset = offset; offset += 30 + e.nameBuf.length + e.size + 16; }
    const cdSize = entries.reduce((a, e) => a + 46 + e.nameBuf.length + (e.offset >= ZIP_LIMIT ? 12 : 0), 0);
    const end = zipEnd(entries.length, cdSize, offset), total = offset + cdSize + end.length;
    res.writeHead(200, { ...cors, "Content-Type": "application/zip", "Content-Length": total, "Content-Disposition": attach(`salamence-music-canciones-${stamp()}.zip`) });
    const central = [];
    for (const e of entries) {
      let w = write(res, zipLocalHeader(e.nameBuf, dt)); if (w) await w;
      let crc = 0, sent = 0;
      for (let off = 0; off < e.size; off += CHUNK) {
        if (res.destroyed) return;
        const buf = Buffer.from(await ask("file", { key: e.key, start: off, end: Math.min(off + CHUNK, e.size) }));
        crc = crc32(crc, buf); sent += buf.length;
        w = write(res, buf); if (w) await w;
      }
      if (sent !== e.size) { res.destroy(); return; }         // la canción cambió mientras se descargaba: se corta para no entregar un ZIP corrupto
      w = write(res, zipDescriptor(crc, e.size)); if (w) await w;
      central.push(zipCentralEntry(e.nameBuf, dt, crc, e.size, e.offset));
    }
    res.write(Buffer.concat(central)); res.end(end);
  }

  async function receive(req, res, url) {
    const id = crypto.randomBytes(8).toString("hex");
    const name = path.basename(url.searchParams.get("name") || "archivo").replace(/[\\/:*?"<>|]/g, "_") || "archivo";
    fs.mkdirSync(tempDir, { recursive: true });
    const tmp = path.join(tempDir, id + ".part"), ws = fs.createWriteStream(tmp);
    let size = 0;
    try {
      await new Promise((ok, ko) => {
        req.on("data", (c) => { size += c.length; });
        req.on("aborted", () => ko(new Error("Subida cancelada")));
        req.on("error", ko); ws.on("error", ko); ws.on("finish", ok);
        req.pipe(ws);
      });
      uploads.set(id, tmp);
      await ask("incoming", { id, name, size });
      onEvent({ type: "received", name, size });
      json(res, 200, { ok: true, name, size });
    } catch (err) { json(res, 500, { error: String((err && err.message) || err) }); }
    finally { uploads.delete(id); ws.destroy(); fs.unlink(tmp, () => {}); }
  }

  async function handler(req, res) {
    try {
      const url = new URL(req.url, "http://x"), p = url.pathname;
      if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
      if (req.method === "GET" && p === "/") { const b = Buffer.from(PAGE); res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": b.length, "Cache-Control": "no-store" }); return res.end(b); }
      if (req.method === "GET" && p === "/api/ping") return json(res, 200, { app: "salamence-sync", version: VERSION });
      if (!authorized(req, url, res)) return;
      if (req.method === "GET" && p === "/api/info") return json(res, 200, await ask("info", {}));
      if (req.method === "GET" && p === "/api/tracks") return json(res, 200, await refreshTracks());
      if (req.method === "GET" && p === "/dl/lists") {
        const buf = Buffer.from(await ask("backup", {}));
        res.writeHead(200, { ...cors, "Content-Type": "application/octet-stream", "Content-Length": buf.length, "Content-Disposition": attach(`salamence-music-listas-${stamp()}.salamence`) });
        return res.end(buf);
      }
      if (req.method === "GET" && p === "/dl/song") return await sendSong(req, res, url);
      if (req.method === "GET" && p === "/dl/songs.zip") return await sendZip(req, res);
      if (req.method === "PUT" && p === "/api/upload") return await receive(req, res, url);
      json(res, 404, { error: "No encontrado" });
    } catch (err) {
      if (!res.headersSent) json(res, 500, { error: String((err && err.message) || err) }); else res.destroy();
    }
  }

  return {
    start({ port: want = 8787, pin: p }) {
      pin = String(p);
      return new Promise((resolve, reject) => {
        let tries = 0;
        const attempt = (pt) => {
          server = http.createServer(handler);
          server.requestTimeout = 0; server.headersTimeout = 60000;
          server.once("error", (e) => { if (e.code === "EADDRINUSE" && tries++ < 10) attempt(pt + 1); else reject(e); });
          server.listen(pt, "0.0.0.0", () => { port = pt; resolve({ port }); });
        };
        attempt(want);
      });
    },
    stop() { return new Promise((r) => { if (!server) return r(); try { server.closeAllConnections(); } catch { /* versiones antiguas */ } server.close(() => r()); server = null; seen.clear(); }); },
    isRunning: () => !!server,
    info: () => ({ running: !!server, port, pin }),
    async readTemp(id, start, len) {
      const file = uploads.get(id); if (!file) throw new Error("Archivo temporal no encontrado");
      const fh = await fs.promises.open(file, "r");
      try { const buf = Buffer.alloc(len); const { bytesRead } = await fh.read(buf, 0, len, start); return buf.subarray(0, bytesRead); } finally { await fh.close(); }
    }
  };
}

module.exports = { createSyncServer, networkAddresses, VERSION };
