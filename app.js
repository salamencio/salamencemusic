(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const audio = $("audio");
  const content = $("content");
  const LOGO = "assets/salamence.png";
  const APP_VERSION = "1.1.1";
  const AUDIO_RE = /\.(mp3|flac|wav|m4a|aac|ogg|oga|opus|wma|weba)$/i;

  /* ---------- utilidades ---------- */
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => { if (!Number.isFinite(n) || n < 0) return "0:00"; n = Math.floor(n); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`; };
  const fmtTotal = (s) => { if (s < 60) return `${Math.round(s)} s`; const m = Math.round(s / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const titleFromFile = (name) => name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim();
  const fmtSize = (b) => b >= 1e9 ? (b / 1e9).toFixed(1) + " GB" : b >= 1e6 ? Math.round(b / 1e6) + " MB" : Math.max(1, Math.round(b / 1e3)) + " KB";
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin espacio */ } }
  };

  /* ---------- portadas de Pokémon (generaciones 1 a 3 = n.º 1-386) ---------- */
  const POKE_MAX = 386;
  const pokeRemote = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  const pokeUrls = new Map();
  const pokeSrc = (id) => pokeUrls.get(id) || pokeRemote(id);
  const randPoke = () => 1 + Math.floor(Math.random() * POKE_MAX);
  const hashPoke = (s) => { let h = 7; for (const c of norm(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 1 + (h % POKE_MAX); };

  /* ---------- iconos SVG (centrados con CSS, sin glifos de texto) ---------- */
  const ICONS = {
    home: ["s", "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"],
    search: ["s", "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5"],
    library: ["f", "M4 4h2.4v16H4zM9.2 4h2.4v16H9.2zM14.2 5.6l2.3-.6 4.2 14.6-2.3.6z"],
    heart: ["s", "M12 20.5s-8-4.9-9.5-10A5 5 0 0 1 12 6.8a5 5 0 0 1 9.5 3.7c-1.5 5.1-9.5 10-9.5 10z"],
    plus: ["s", "M12 5v14M5 12h14"],
    play: ["f", "M8 5v14l11-7z"],
    pause: ["f", "M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"],
    prev: ["f", "M6 5h2v14H6zM20 5v14L9 12z"],
    next: ["f", "M16 5h2v14h-2zM4 5l11 7L4 19z"],
    shuffle: ["s", "M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"],
    repeat: ["s", "M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3"],
    repeat1: ["s", "M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3M11.5 10.5l1.5-1v6"],
    vol: ["s", "M11 5 6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"],
    mute: ["s", "M11 5 6 9H2v6h4l5 4V5zM22 9l-6 6M16 9l6 6"],
    note: ["s", "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"],
    trash: ["s", "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6"],
    edit: ["s", "M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4"],
    x: ["s", "M6 6l12 12M18 6 6 18"],
    check: ["s", "M5 12.5l4.5 4.5L19 7.5"],
    dots: ["d", "M5 12h.01M12 12h.01M19 12h.01"],
    folder: ["s", "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
    chevL: ["s", "M15 18l-6-6 6-6"],
    chevR: ["s", "M9 18l6-6-6-6"],
    queue: ["s", "M3 6h13M3 12h9M3 18h6M15 13v7l6-3.5z"],
    disc: ["s", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"],
    sort: ["s", "M7 3v18M3 7l4-4 4 4M17 21V3M13 17l4 4 4-4"],
    up: ["s", "M12 19V5M5 12l7-7 7 7"],
    down: ["s", "M12 5v14M19 12l-7 7-7-7"],
    database: ["s", "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"],
    chevDown: ["s", "M6 9l6 6 6-6"],
    upload: ["s", "M12 15V3M7 8l5-5 5 5M5 21h14"],
    download: ["s", "M12 3v12M7 10l5 5 5-5M5 21h14"],
    copy: ["s", "M9 9h11v11H9zM5 15V5a1 1 0 0 1 1-1h10"],
    clock: ["s", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2"],
    list: ["s", "M4 6h12M4 11h12M4 16h7M17 14v6M14 17h6"]
  };
  function icon(name, size = 18, filled = false) {
    const [type, d] = ICONS[name];
    const a = type === "f" ? 'fill="currentColor"' : type === "d" ? 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"'
      : `fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" ${a} aria-hidden="true"><path d="${d}"/></svg>`;
  }
  document.querySelectorAll("[data-icon]").forEach((el) => { el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 18); });

  /* ---------- almacenamiento: IndexedDB para canciones, localStorage para listas ---------- */
  const DB = (() => {
    let db;
    const open = () => new Promise((res, rej) => {
      const r = indexedDB.open("salamence-music", 3);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains("tracks")) d.createObjectStore("tracks", { keyPath: "id" });
        if (!d.objectStoreNames.contains("pokes")) d.createObjectStore("pokes", { keyPath: "id" });
        if (!d.objectStoreNames.contains("plcovers")) d.createObjectStore("plcovers", { keyPath: "id" });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const run = async (store, mode, fn) => {
      db = db || await open();
      return new Promise((res, rej) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        t.oncomplete = () => res(req && req.result);
        t.onerror = () => rej(t.error);
        t.onabort = () => rej(t.error);
      });
    };
    return {
      all: () => run("tracks", "readonly", (s) => s.getAll()),
      put: (r) => run("tracks", "readwrite", (s) => s.put(r)),
      del: (id) => run("tracks", "readwrite", (s) => s.delete(id)),
      allPokes: () => run("pokes", "readonly", (s) => s.getAll()),
      putPoke: (r) => run("pokes", "readwrite", (s) => s.put(r)),
      allPlCovers: () => run("plcovers", "readonly", (s) => s.getAll()),
      putPlCover: (r) => run("plcovers", "readwrite", (s) => s.put(r)),
      delPlCover: (id) => run("plcovers", "readwrite", (s) => s.delete(id))
    };
  })();

  /* ---------- estado ---------- */
  let tracks = [];
  const tmap = new Map();
  const plCovers = new Map(); // id de lista -> { blob, url }
  let playlists = LS.get("salamence-playlists", LS.get("sonora-playlists", []));
  let liked = new Set(LS.get("salamence-liked", LS.get("sonora-liked", [])));
  const settings = Object.assign({ volume: 0.8, shuffle: false, repeat: "off", sort: "added" }, LS.get("salamence-settings", {}));
  let view = { name: "home", id: null };
  let navStack = [view], navPos = 0;
  let query = "";
  let ctx = [], order = [], ctxPos = -1, userQueue = LS.get("salamence-queue", []);
  let curId = null, history = [], curUrl = null, shownQueue = [];
  let selected = new Set(), anchorId = null;
  const saveQueue = () => LS.set("salamence-queue", userQueue);
  let importing = false;

  const saveSettings = () => LS.set("salamence-settings", settings);
  const savePlaylists = () => LS.set("salamence-playlists", playlists);
  const saveLiked = () => LS.set("salamence-liked", [...liked]);
  const getPlaylist = (id) => playlists.find((p) => p.id === id);
  const playlistTracks = (p) => p.ids.map((id) => tmap.get(id)).filter(Boolean);
  const addTrack = (r) => { const t = { ...r, coverUrl: r.cover ? URL.createObjectURL(r.cover) : null }; tracks.push(t); tmap.set(t.id, t); return t; };
  const sorted = (list) => {
    const l = [...list], c = (a, b) => String(a).localeCompare(String(b), "es", { sensitivity: "base" });
    if (settings.sort === "title") l.sort((a, b) => c(a.title, b.title));
    else if (settings.sort === "artist") l.sort((a, b) => c(a.artist, b.artist) || c(a.title, b.title));
    else if (settings.sort === "duration") l.sort((a, b) => b.duration - a.duration);
    else l.sort((a, b) => b.added - a.added);
    return l;
  };

  const recOf = (t) => ({ id: t.id, name: t.name, size: t.size, title: t.title, artist: t.artist, album: t.album, track: t.track || 0, duration: t.duration, added: t.added, file: t.file, cover: t.cover || null, pokeId: t.pokeId || 0, customCover: !!t.customCover });
  const persist = (t) => DB.put(recOf(t)).catch((e) => console.error(e));
  const albumKey = (n) => norm(n).trim();
  function coverOf(t) {
    if (t && t.coverUrl) return { src: t.coverUrl, real: true };
    if (t && t.pokeId) return { src: pokeSrc(t.pokeId), real: false };
    return { src: LOGO, real: false };
  }
  function coverImg(t, cls) {
    const c = coverOf(t);
    return `<img class="${cls}${c.real ? "" : " poke"}" src="${c.src}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${LOGO}'">`;
  }
  function applyCover(t, c) {
    if (c && c.file) { if (t.coverUrl) URL.revokeObjectURL(t.coverUrl); t.cover = c.file; t.coverUrl = URL.createObjectURL(c.file); t.customCover = true; }
    else if (c && c.poke) { if (t.coverUrl) URL.revokeObjectURL(t.coverUrl); t.cover = null; t.coverUrl = null; t.pokeId = c.poke; t.customCover = false; }
  }
  function getAlbums() {
    const m = new Map();
    for (const t of tracks) {
      const k = albumKey(t.album); if (!k) continue;
      let a = m.get(k); if (!a) { a = { key: k, name: t.album.trim(), tracks: [] }; m.set(k, a); }
      a.tracks.push(t);
    }
    const out = [...m.values()];
    for (const a of out) {
      a.tracks.sort((x, y) => (x.track || 9999) - (y.track || 9999) || x.added - y.added);
      const artists = [...new Set(a.tracks.map((t) => t.artist).filter(Boolean))];
      a.artist = artists.length > 1 ? "Varios artistas" : (artists[0] || "");
      a.cover = a.tracks.find((t) => t.coverUrl) || a.tracks[0];
      a.duration = a.tracks.reduce((sum, t) => sum + t.duration, 0);
    }
    return out.sort((x, y) => x.name.localeCompare(y.name, "es", { sensitivity: "base" }));
  }
  // Guarda en el equipo los Pokémon que se usan de portada, para verlos también sin conexión
  let caching = false;
  async function cachePokes() {
    if (caching) return; caching = true;
    try {
      const ids = [...new Set(tracks.filter((t) => !t.coverUrl && t.pokeId).map((t) => t.pokeId))].filter((id) => !pokeUrls.has(id));
      for (const id of ids) {
        const r = await fetch(pokeRemote(id)); if (!r.ok) continue;
        const blob = await r.blob();
        await DB.putPoke({ id, blob }); pokeUrls.set(id, URL.createObjectURL(blob));
      }
    } catch { /* sin conexión: se reintenta en la próxima sesión */ }
    finally { caching = false; }
  }

  /* ---------- avisos, diálogos y menús ---------- */
  let toastTimer;
  function toast(msg, ms = 3200) {
    const el = $("toast");
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer);
    if (ms) toastTimer = setTimeout(() => { el.hidden = true; }, ms);
  }

  function dialog({ title, message = "", input = null, confirm = "Aceptar", danger = false }) {
    return new Promise((res) => {
      const m = $("modal"), f = $("modal-form"), inp = $("modal-input"), ok = $("modal-ok");
      $("modal-title").textContent = title;
      $("modal-msg").textContent = message; $("modal-msg").hidden = !message;
      inp.hidden = input === null;
      if (input !== null) { inp.value = input.value || ""; inp.placeholder = input.placeholder || ""; }
      ok.textContent = confirm; ok.classList.toggle("danger", danger);
      m.hidden = false;
      if (input !== null) { inp.focus(); inp.select(); } else ok.focus();
      const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(null); } };
      const close = (v) => {
        m.hidden = true; f.onsubmit = null; $("modal-cancel").onclick = null; m.onclick = null;
        document.removeEventListener("keydown", onKey, true); res(v);
      };
      document.addEventListener("keydown", onKey, true);
      f.onsubmit = (e) => { e.preventDefault(); const v = input !== null ? inp.value.trim() : true; if (input !== null && !v) return; close(v); };
      $("modal-cancel").onclick = () => close(null);
      m.onclick = (e) => { if (e.target === m) close(null); };
    });
  }

  let menuCleanup = null;
  function closeMenu() {
    const m = $("menu"); m.hidden = true; m.innerHTML = ""; $("menu-back").hidden = true;
    if (menuCleanup) menuCleanup(); menuCleanup = null;
  }
  function showMenu(items, anchor) {
    closeMenu();
    const m = $("menu");
    m.innerHTML = items.map((it, i) => it.sep ? '<div class="menu-sep"></div>'
      : it.heading ? `<div class="menu-head">${esc(it.heading)}</div>`
      : `<button class="menu-item${it.danger ? " danger" : ""}" role="menuitem" data-i="${i}">${it.icon ? `<span class="ic">${icon(it.icon, 16, it.fill)}</span>` : '<span class="sp"></span>'}<span class="ml">${esc(it.label)}</span>${it.checked ? `<span class="ic">${icon("check", 16)}</span>` : ""}</button>`).join("");
    const touch = matchMedia("(hover: none)").matches || matchMedia("(max-width: 760px)").matches;
    m.classList.toggle("sheet", touch); $("menu-back").hidden = !touch;
    m.hidden = false;
    if (touch) { m.style.left = ""; m.style.top = ""; }
    else {
      const isEl = anchor instanceof Element;
      const r = isEl ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y };
      const w = m.offsetWidth, h = m.offsetHeight;
      let x = isEl ? r.right - w : r.left, y = r.bottom + 4;
      x = Math.max(8, Math.min(x, innerWidth - w - 8));
      if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 4);
      m.style.left = x + "px"; m.style.top = y + "px";
    }
    m.onclick = (e) => { const b = e.target.closest("[data-i]"); if (!b) return; const it = items[b.dataset.i]; closeMenu(); if (it.fn) it.fn(); };
    const away = (e) => { if (!m.contains(e.target)) closeMenu(); };
    const onEsc = (e) => { if (e.key === "Escape") closeMenu(); };
    document.addEventListener("keydown", onEsc);
    if (touch) $("menu-back").onclick = closeMenu;   // en el móvil se cierra tocando fuera; no por redimensionar ni por desplazarse
    else {
      setTimeout(() => document.addEventListener("pointerdown", away, true), 0);
      window.addEventListener("resize", closeMenu);
      $("main").addEventListener("scroll", closeMenu, { once: true });
    }
    menuCleanup = () => { document.removeEventListener("pointerdown", away, true); document.removeEventListener("keydown", onEsc); window.removeEventListener("resize", closeMenu); };
  }

  /* ---------- etiquetas ID3 / FLAC (título, artista, álbum, carátula) ---------- */
  const u32be = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  const u32le = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  const synch = (b, o) => ((b[o] & 0x7f) << 21) | ((b[o + 1] & 0x7f) << 14) | ((b[o + 2] & 0x7f) << 7) | (b[o + 3] & 0x7f);
  const ascii = (b) => { let s = ""; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return s; };
  function decodeText(b, enc) {
    if (!b.length) return "";
    let label = "utf-8", bytes = b;
    if (enc === 0) label = "windows-1252";
    else if (enc === 1) {
      if (b[0] === 0xff && b[1] === 0xfe) { label = "utf-16le"; bytes = b.subarray(2); }
      else if (b[0] === 0xfe && b[1] === 0xff) { label = "utf-16be"; bytes = b.subarray(2); }
      else label = "utf-16le";
    } else if (enc === 2) label = "utf-16be";
    return new TextDecoder(label).decode(bytes).replace(/\0+$/, "").replace(/\0/g, " / ").trim();
  }
  function findTerm(b, start, enc) {
    if (enc === 1 || enc === 2) { for (let i = start; i + 1 < b.length; i += 2) if (b[i] === 0 && b[i + 1] === 0) return i; return -1; }
    for (let i = start; i < b.length; i++) if (b[i] === 0) return i;
    return -1;
  }
  function sniffMime(d, m) { if (m && m.startsWith("image/")) return m; return d[0] === 0x89 ? "image/png" : "image/jpeg"; }
  function parseID3(b) {
    const out = {}, ver = b[3];
    if (ver < 2 || ver > 4) return out;
    let pos = 10;
    const end = Math.min(b.length, 10 + synch(b, 6));
    if (ver > 2 && (b[5] & 0x40)) pos += ver === 4 ? synch(b, 10) : u32be(b, 10) + 4;
    const idLen = ver === 2 ? 3 : 4, hdr = ver === 2 ? 6 : 10;
    while (pos + hdr <= end) {
      const id = ascii(b.subarray(pos, pos + idLen));
      if (!/^[A-Z0-9]+$/.test(id)) break;
      const size = ver === 2 ? (b[pos + 3] << 16) | (b[pos + 4] << 8) | b[pos + 5] : ver === 4 ? synch(b, pos + 4) : u32be(b, pos + 4);
      const start = pos + hdr;
      if (size <= 0 || start + size > b.length) break;
      const body = b.subarray(start, start + size);
      const key = { TT2: "TIT2", TP1: "TPE1", TAL: "TALB", TRK: "TRCK", PIC: "APIC" }[id] || id;
      if (key === "TIT2" || key === "TPE1" || key === "TALB" || key === "TRCK") out[key] = decodeText(body.subarray(1), body[0]);
      else if (key === "APIC" && !out.cover) {
        const enc = body[0]; let p, mime;
        if (ver === 2) { mime = "image/" + ascii(body.subarray(1, 4)).toLowerCase().replace("jpg", "jpeg"); p = 4; }
        else { const z = body.indexOf(0, 1); mime = z > 0 ? ascii(body.subarray(1, z)) : ""; p = z + 1; }
        p += 1;
        const d = findTerm(body, p, enc);
        if (d >= 0) { p = d + (enc === 1 || enc === 2 ? 2 : 1); const data = body.subarray(p); if (data.length > 100) out.cover = new Blob([data], { type: sniffMime(data, mime) }); }
      }
      pos = start + size;
    }
    return out;
  }
  async function readFlac(file) {
    const out = {}; let off = 4;
    while (off + 4 <= file.size) {
      const h = new Uint8Array(await file.slice(off, off + 4).arrayBuffer());
      const last = h[0] & 0x80, type = h[0] & 0x7f, len = (h[1] << 16) | (h[2] << 8) | h[3];
      if (type === 4 && len < 4e6) {
        const b = new Uint8Array(await file.slice(off + 4, off + 4 + len).arrayBuffer());
        let p = 4 + u32le(b, 0); const n = u32le(b, p); p += 4;
        const dec = new TextDecoder();
        for (let i = 0; i < n && p + 4 <= b.length; i++) {
          const l = u32le(b, p); p += 4;
          const s = dec.decode(b.subarray(p, p + l)); p += l;
          const eq = s.indexOf("="); if (eq < 0) continue;
          const k = s.slice(0, eq).toUpperCase(), v = s.slice(eq + 1);
          if (k === "TITLE") out.title = v; else if (k === "ARTIST" && !out.artist) out.artist = v; else if (k === "ALBUM") out.album = v; else if (k === "TRACKNUMBER") out.track = parseInt(v, 10) || 0;
        }
      } else if (type === 6 && !out.cover && len < 30e6) {
        const b = new Uint8Array(await file.slice(off + 4, off + 4 + len).arrayBuffer());
        let p = 4; const ml = u32be(b, p); p += 4;
        const mime = ascii(b.subarray(p, p + ml)); p += ml;
        p += 4 + u32be(b, p) + 16;
        const pl = u32be(b, p); p += 4;
        if (pl > 100) out.cover = new Blob([b.subarray(p, p + pl)], { type: mime || "image/jpeg" });
      }
      off += 4 + len; if (last) break;
    }
    return out;
  }
  async function readTags(file) {
    const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
      const size = synch(head, 6) + 10;
      const buf = new Uint8Array(await file.slice(0, Math.min(size, 30e6)).arrayBuffer());
      const t = parseID3(buf);
      return { title: t.TIT2, artist: t.TPE1, album: t.TALB, track: parseInt(t.TRCK, 10) || 0, cover: t.cover };
    }
    if (ascii(head.subarray(0, 4)) === "fLaC") return readFlac(file);
    return {};
  }
  function probeDuration(file) {
    return new Promise((res) => {
      const a = new Audio(), u = URL.createObjectURL(file); let done = false;
      const fin = (d) => { if (done) return; done = true; URL.revokeObjectURL(u); a.removeAttribute("src"); res(Number.isFinite(d) ? d : 0); };
      a.preload = "metadata"; a.onloadedmetadata = () => fin(a.duration); a.onerror = () => fin(0);
      setTimeout(() => fin(0), 5000); a.src = u;
    });
  }

  /* ---------- importar música ---------- */
  async function importFiles(fileList, over = {}) {
    const files = [...fileList].filter((f) => f.type.startsWith("audio/") || AUDIO_RE.test(f.name));
    if (!files.length && [...fileList].length && [...fileList].every((f) => f.type.startsWith("image/"))) { toast("Eso es una imagen, no música. Para cambiar una portada usa «Editar detalles».", 4500); return []; }
    if (!files.length) { toast(`No hay archivos de audio entre los ${fileList.length} recibidos (mp3, flac, wav, m4a, ogg, opus…). Si vienen de un ZIP, extráelos primero.`, 5500); return []; }
    if (importing) { toast("Ya hay una importación en curso"); return []; }
    importing = true;
    const known = new Map(tracks.map((t) => [t.name + "|" + t.size, t.id])), allIds = [];
    let added = 0, dup = 0, failed = 0, linked = 0; const newIds = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      toast(`Importando ${i + 1} de ${files.length}…`, 0);
      if (known.has(f.name + "|" + f.size)) { dup++; allIds.push(known.get(f.name + "|" + f.size)); continue; }
      try {
        const tags = await readTags(f).catch(() => ({}));
        const duration = await probeDuration(f);
        const album = over.album !== undefined ? over.album : (tags.album || "");
        const cover = over.cover || tags.cover || null;
        const pokeId = cover ? 0 : (over.pokeId || (album ? hashPoke(album) : randPoke()));
        const rec = { id: uid(), name: f.name, size: f.size, title: tags.title || titleFromFile(f.name), artist: over.artist || tags.artist || "", album, track: tags.track || 0, duration, added: Date.now() + i, file: f, cover, pokeId };
        await DB.put(rec);
        const nt = addTrack(rec); if (resolvePendingFor(nt)) linked++; known.set(f.name + "|" + f.size, rec.id); added++; newIds.push(rec.id); allIds.push(rec.id);
      } catch (err) { failed++; console.error(err); }
    }
    importing = false;
    const pl = over.playlistId ? getPlaylist(over.playlistId) : null; let inList = 0;
    if (pl) { for (const id of allIds) if (!pl.ids.includes(id)) { pl.ids.push(id); inList++; } savePlaylists(); renderSidebar(); }
    render(); cachePokes();
    toast([added ? `Añadidas ${plural(added, "canción", "canciones")}` : (inList ? "" : "No se añadió ninguna canción"), inList ? `${plural(inList, "canción", "canciones")} en «${pl.name}»` : "", dup ? `${dup} ya estaban en la biblioteca` : "", failed ? `${failed} con error de almacenamiento` : "", linked ? `${linked} enlazadas a tus listas` : ""].filter(Boolean).join(" · "), 4500);
    return allIds;
  }
  async function filesFromDrop(dt) {
    const entries = [...dt.items].map((i) => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null)).filter(Boolean);
    if (!entries.length) return [...dt.files];
    const out = [];
    const walk = async (en) => {
      if (en.isFile) out.push(await new Promise((r, j) => en.file(r, j)));
      else if (en.isDirectory) {
        const rd = en.createReader(); let batch;
        do { batch = await new Promise((r, j) => rd.readEntries(r, j)); for (const c of batch) await walk(c); } while (batch.length);
      }
    };
    for (const en of entries) await walk(en);
    return out;
  }

  /* ---------- listas y favoritos ---------- */
  const PL_SORTS = [["custom", "Mi orden"], ["title", "Título (A–Z)"], ["artist", "Artista"], ["album", "Álbum"], ["duration", "Duración"], ["recent", "Últimas añadidas primero"]];
  function sortPl(list, mode) {
    const c = (a, b) => String(a).localeCompare(String(b), "es", { sensitivity: "base" }), l = [...list];
    if (mode === "title") l.sort((a, b) => c(a.title, b.title));
    else if (mode === "artist") l.sort((a, b) => c(a.artist, b.artist) || c(a.title, b.title));
    else if (mode === "album") l.sort((a, b) => c(a.album, b.album) || (a.track || 9999) - (b.track || 9999) || c(a.title, b.title));
    else if (mode === "duration") l.sort((a, b) => b.duration - a.duration);
    else if (mode === "recent") l.reverse();
    return l;
  }
  function reorderPlaylist(pid, moving, targetId, after) {
    const p = getPlaylist(pid); if (!p) return;
    const mv = p.ids.filter((x) => moving.includes(x));
    if (!mv.length || mv.includes(targetId)) return;
    const rest = p.ids.filter((x) => !mv.includes(x));
    let i = rest.indexOf(targetId); i = i < 0 ? rest.length : (after ? i + 1 : i);
    rest.splice(i, 0, ...mv); p.ids = rest; savePlaylists(); render();
  }
  function movePlaylistTracks(pid, ids, how) {
    const p = getPlaylist(pid); if (!p) return;
    const mv = p.ids.filter((x) => ids.includes(x)); if (!mv.length) return;
    let arr = [...p.ids];
    if (how === "top" || how === "bottom") { const rest = arr.filter((x) => !mv.includes(x)); arr = how === "top" ? [...mv, ...rest] : [...rest, ...mv]; }
    else if (how === "up") { for (let i = 1; i < arr.length; i++) if (mv.includes(arr[i]) && !mv.includes(arr[i - 1])) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; }
    else if (how === "down") { for (let i = arr.length - 2; i >= 0; i--) if (mv.includes(arr[i]) && !mv.includes(arr[i + 1])) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; }
    p.ids = arr; savePlaylists(); render();
  }
  const isCustomPl = () => { const p = view.name === "playlist" ? getPlaylist(view.id) : null; return !!p && (p.sort || "custom") === "custom"; };
  const moveItems = (ids) => isCustomPl() ? [
    { sep: true }, { heading: "Mover en la lista" },
    { label: "Subir una posición", icon: "up", fn: () => movePlaylistTracks(view.id, ids, "up") },
    { label: "Bajar una posición", icon: "down", fn: () => movePlaylistTracks(view.id, ids, "down") },
    { label: "Mover al principio", icon: "up", fn: () => movePlaylistTracks(view.id, ids, "top") },
    { label: "Mover al final", icon: "down", fn: () => movePlaylistTracks(view.id, ids, "bottom") }
  ] : [];

  // Orden de las listas en la barra lateral
  function movePlaylist(id, targetId, after) {
    const p = getPlaylist(id); if (!p || id === targetId) return;
    const rest = playlists.filter((x) => x.id !== id);
    let i = rest.findIndex((x) => x.id === targetId); i = i < 0 ? rest.length : (after ? i + 1 : i);
    rest.splice(i, 0, p); playlists = rest; savePlaylists(); renderSidebar(); if (view.name === "home") render();
  }
  function shiftPlaylist(id, how) {
    const i = playlists.findIndex((x) => x.id === id); if (i < 0) return;
    const [p] = playlists.splice(i, 1);
    const j = how === "up" ? Math.max(0, i - 1) : how === "down" ? Math.min(playlists.length, i + 1) : how === "top" ? 0 : playlists.length;
    playlists.splice(j, 0, p); savePlaylists(); renderSidebar(); if (view.name === "home") render();
  }
  function sortPlaylists(how) {
    const c = (a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    if (how === "az") playlists.sort(c); else if (how === "za") playlists.sort((a, b) => c(b, a));
    else if (how === "size") playlists.sort((a, b) => b.ids.length - a.ids.length || c(a, b));
    else if (how === "reverse") playlists.reverse();
    savePlaylists(); renderSidebar(); if (view.name === "home") render(); toast("Listas reordenadas");
  }
  function deletePlaylistFlow(p) {
    dialog({ title: "Eliminar lista", message: `Se eliminará «${p.name}». Las canciones seguirán en tu biblioteca.`, confirm: "Eliminar", danger: true }).then((ok) => {
      if (!ok) return;
      playlists = playlists.filter((x) => x.id !== p.id); savePlaylists(); clearPlCover(p.id);
      if (view.name === "playlist" && view.id === p.id) navigate({ name: "library", id: null }, false); else render();
      toast("Lista eliminada");
    });
  }
  const refreshLists = () => { if (view.name === "playlists" || view.name === "home") render(); };
  // Menú para elegir a qué lista se añade un conjunto de canciones (una lista, un álbum…)
  function pickTargetPlaylist(ids, anchor, { excludeId = null, title = "Añadir a la lista" } = {}) {
    ids = ids.filter((x) => tmap.has(x));
    if (!ids.length) { toast("No hay canciones que añadir"); return; }
    const items = [{ heading: title }];
    playlists.filter((p) => p.id !== excludeId).forEach((p) => items.push({ label: p.name, icon: "list", fn: () => { addManyToPlaylist(p.id, ids); refreshLists(); } }));
    items.push({ label: "Nueva lista…", icon: "plus", fn: async () => {
      const name = await dialog({ title: "Nueva lista", input: { placeholder: "Nombre de la lista" }, confirm: "Crear" });
      if (!name) return;
      const np = createPlaylist(name); addManyToPlaylist(np.id, ids); refreshLists();
    } });
    showMenu(items, anchor);
  }
  async function duplicatePlaylist(p) {
    const name = await dialog({ title: "Duplicar lista", message: "Se crea una copia con las mismas canciones. Podrás cambiarla sin tocar la original.", input: { value: `${p.name} (copia)` }, confirm: "Duplicar" });
    if (!name) return;
    const np = { id: uid(), name, ids: [...p.ids], sort: p.sort || "custom" };
    playlists.splice(playlists.indexOf(p) + 1, 0, np); savePlaylists();
    const ph = plCovers.get(p.id); if (ph) await setPlCover(np.id, ph.blob);
    renderSidebar(); navigate({ name: "playlist", id: np.id }); toast(`Lista «${name}» creada`);
  }
  function openPlaylistMenu(id, anchor) {
    const p = getPlaylist(id); if (!p) return;
    const i = playlists.indexOf(p);
    showMenu([
      { label: "Abrir", icon: "list", fn: () => navigate({ name: "playlist", id }) },
      { label: "Editar nombre y foto", icon: "edit", fn: () => editPlaylist(p) },
      { label: "Duplicar lista", icon: "copy", fn: () => duplicatePlaylist(p) },
      { label: "Añadir sus canciones a otra lista…", icon: "list", fn: () => setTimeout(() => pickTargetPlaylist(sortPl(playlistTracks(p), p.sort || "custom").map((t) => t.id), anchor, { excludeId: id, title: `Añadir «${p.name}» a…` }), 0) },
      { sep: true }, { heading: "Orden de las listas" },
      ...(i > 0 ? [{ label: "Subir", icon: "up", fn: () => shiftPlaylist(id, "up") }, { label: "Al principio", icon: "up", fn: () => shiftPlaylist(id, "top") }] : []),
      ...(i < playlists.length - 1 ? [{ label: "Bajar", icon: "down", fn: () => shiftPlaylist(id, "down") }, { label: "Al final", icon: "down", fn: () => shiftPlaylist(id, "bottom") }] : []),
      { sep: true },
      { label: "Eliminar lista", icon: "trash", danger: true, fn: () => deletePlaylistFlow(p) }
    ], anchor);
  }

  function createPlaylist(name) {
    const p = { id: uid(), name, ids: [] };
    playlists.push(p); savePlaylists(); renderSidebar();
    return p;
  }
  function togglePlaylistTrack(pid, tid) {
    const p = getPlaylist(pid); if (!p) return;
    const has = p.ids.includes(tid);
    p.ids = has ? p.ids.filter((x) => x !== tid) : [...p.ids, tid];
    savePlaylists();
    toast(has ? `Quitada de «${p.name}»` : `Añadida a «${p.name}»`);
    renderSidebar();
    if (view.name === "playlist" && view.id === pid) render();
  }
  function toggleLike(id) {
    liked.has(id) ? liked.delete(id) : liked.add(id);
    saveLiked();
    document.querySelectorAll(`[data-act="like"][data-id="${id}"]`).forEach((b) => { b.classList.toggle("on", liked.has(id)); b.innerHTML = icon("heart", 18, liked.has(id)); });
    if (id === curId) updateLikeCurrent();
    if (view.name === "liked") render();
  }
  async function deleteTracks(ids) {
    ids = ids.filter((id) => tmap.has(id)); if (!ids.length) return;
    const one = ids.length === 1 ? tmap.get(ids[0]) : null;
    const ok = await dialog({
      title: one ? "Eliminar de la biblioteca" : `Eliminar ${ids.length} canciones`,
      message: one ? `«${one.title}» se quitará de Salamence music y de todas tus listas. El archivo original de tu disco no se toca.` : `Se quitarán ${ids.length} canciones de Salamence music y de todas tus listas. Los archivos originales de tu disco no se tocan.`,
      confirm: "Eliminar", danger: true
    });
    if (!ok) return;
    const rm = new Set(ids);
    if (rm.has(curId)) { audio.pause(); audio.removeAttribute("src"); curId = null; if (curUrl) URL.revokeObjectURL(curUrl); curUrl = null; updateProgress(); }
    for (const id of ids) {
      const t = tmap.get(id);
      await DB.del(id).catch(() => {});
      if (t.coverUrl) URL.revokeObjectURL(t.coverUrl);
      tmap.delete(id);
    }
    tracks = tracks.filter((x) => !rm.has(x.id));
    const kept = order.map((x, i) => [x, i]).filter(([x]) => !rm.has(x));
    ctxPos = kept.filter(([, i]) => i <= ctxPos).length - 1;
    order = kept.map(([x]) => x); ctx = ctx.filter((x) => !rm.has(x));
    userQueue = userQueue.filter((x) => !rm.has(x)); saveQueue();
    history = history.filter((x) => !rm.has(x));
    playlists.forEach((p) => { p.ids = p.ids.filter((x) => !rm.has(x)); });
    ids.forEach((id) => liked.delete(id));
    selected = new Set([...selected].filter((id) => !rm.has(id)));
    savePlaylists(); saveLiked(); setCurrentUI(); render();
    toast(ids.length === 1 ? "Canción eliminada" : `${ids.length} canciones eliminadas`);
  }
  const deleteTrack = (id) => deleteTracks([id]);
  async function newPlaylistFlow(trackId) {
    const name = await dialog({ title: "Nueva lista", input: { placeholder: "Nombre de la lista" }, confirm: "Crear" });
    if (!name) return null;
    const p = createPlaylist(name);
    if (trackId) togglePlaylistTrack(p.id, trackId); else toast(`Lista «${name}» creada`);
    return p;
  }
  function openTrackMenu(id, anchor) {
    const items = [
      { label: "Reproducir", icon: "play", fill: true, fn: () => playTrack(id, shownQueue) },
      { label: "Añadir a la cola", icon: "queue", fn: () => enqueue([id]) },
      { label: "Reproducir a continuación", icon: "next", fn: () => enqueue([id], { next: true }) },
      { label: liked.has(id) ? "Quitar de favoritos" : "Añadir a favoritos", icon: "heart", fill: liked.has(id), fn: () => toggleLike(id) },
      { label: "Editar detalles (portada, álbum, artista)", icon: "edit", fn: () => editTrack(id) }
    ];
    if (matchMedia("(hover: none)").matches) items.push({ label: "Seleccionar varias", icon: "check", fn: () => { selectMode = true; selected.add(id); anchorId = id; syncSelection(); } });
    const tr = tmap.get(id);
    if (tr && tr.album) items.push({ label: "Ir al álbum", icon: "disc", fn: () => navigate({ name: "album", id: albumKey(tr.album) }) });
    items.push({ sep: true }, { heading: "Añadir a una lista" });
    playlists.forEach((p) => items.push({ label: p.name, icon: "list", checked: p.ids.includes(id), fn: () => togglePlaylistTrack(p.id, id) }));
    items.push({ label: "Nueva lista…", icon: "plus", fn: () => newPlaylistFlow(id) }, { sep: true });
    if (view.name === "playlist") items.push(...moveItems([id]), { sep: true }, { label: "Quitar de esta lista", icon: "x", fn: () => togglePlaylistTrack(view.id, id) });
    items.push({ label: "Eliminar de la biblioteca", icon: "trash", danger: true, fn: () => deleteTrack(id) });
    showMenu(items, anchor);
  }

  /* ---------- editar detalles y álbumes ---------- */
  function sheet({ title, confirm = "Guardar", mount }) {
    return new Promise((res) => {
      const ov = document.createElement("div");
      ov.className = "modal";
      ov.innerHTML = `<form class="modal-card sheet"><h3></h3><div class="sheet-body"></div><div class="modal-actions"><button type="button" class="ghost-button" data-x>Cancelar</button><button type="submit" class="primary-button">${esc(confirm)}</button></div></form>`;
      ov.querySelector("h3").textContent = title;
      document.body.appendChild(ov);
      const body = ov.querySelector(".sheet-body");
      const get = mount(body);
      const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(null); } };
      const close = (v) => { document.removeEventListener("keydown", onKey, true); ov.remove(); res(v); };
      document.addEventListener("keydown", onKey, true);
      ov.querySelector("form").onsubmit = (e) => { e.preventDefault(); const v = get(); if (v) close(v); };
      ov.querySelector("[data-x]").onclick = () => close(null);
      ov.addEventListener("mousedown", (e) => { if (e.target === ov) close(null); });
      const first = body.querySelector("input[type=text]"); if (first) first.focus();
    });
  }
  async function shrinkImage(file, max = 640) {
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
      if (k === 1 && file.size < 400000) { if (bmp.close) bmp.close(); return file; }
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      if (bmp.close) bmp.close();
      const blob = await new Promise((r) => c.toBlob(r, "image/webp", 0.9));
      return blob && blob.size ? blob : file;
    } catch { return file; }
  }
  const plPhotoUrl = (p) => (plCovers.get(p.id) || {}).url || null;
  async function setPlCover(id, blob) {
    const old = plCovers.get(id); if (old) URL.revokeObjectURL(old.url);
    plCovers.set(id, { blob, url: URL.createObjectURL(blob) });
    await DB.putPlCover({ id, blob }).catch((e) => { console.error(e); toast("No se pudo guardar la foto de la lista"); });
  }
  async function clearPlCover(id) {
    const old = plCovers.get(id); if (old) URL.revokeObjectURL(old.url);
    plCovers.delete(id); await DB.delPlCover(id).catch(() => {});
  }
  async function editPlaylist(p) {
    const r = await sheet({
      title: "Editar lista",
      mount(body) {
        const st = { file: null, remove: false };
        const fallback = () => { const f = playlistTracks(p).find((t) => t.coverUrl); return f ? { src: f.coverUrl, real: true } : { src: LOGO, real: false }; };
        body.innerHTML = `<div class="field"><label for="f-plname">Nombre</label><input id="f-plname" type="text" maxlength="80" value="${esc(p.name)}"></div>
          <div class="field"><label>Foto de la lista</label><div class="cover-edit"><img class="cover-prev" alt=""><div class="cover-side"><div class="cover-btns"><button type="button" class="ghost-button" data-pick>Elegir imagen…</button><button type="button" class="ghost-button" data-clear>Quitar foto</button></div><small class="cover-note"></small><input type="file" accept="image/*" hidden></div></div></div>`;
        const img = body.querySelector(".cover-prev"), note = body.querySelector(".cover-note"), inp = body.querySelector("input[type=file]");
        const show = (src, real, msg) => { img.onerror = () => { img.onerror = null; img.src = LOGO; }; img.src = src; img.classList.toggle("poke", !real); note.textContent = msg; };
        const own = plPhotoUrl(p);
        if (own) show(own, true, "Foto propia"); else { const f = fallback(); show(f.src, f.real, "Sin foto: se usa la portada de una canción o el logo"); }
        body.querySelector("[data-pick]").onclick = () => inp.click();
        inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const b = await shrinkImage(f); st.file = b; st.remove = false; show(URL.createObjectURL(b), true, "Foto nueva: " + f.name); inp.value = ""; };
        body.querySelector("[data-clear]").onclick = () => { st.file = null; st.remove = true; const f = fallback(); show(f.src, f.real, "Se quitará la foto al guardar"); };
        return () => {
          const name = body.querySelector("#f-plname").value.trim();
          if (!name) { toast("La lista necesita un nombre"); return false; }
          return { name, file: st.file, remove: st.remove };
        };
      }
    });
    if (!r) return;
    p.name = r.name; savePlaylists();
    if (r.file) await setPlCover(p.id, r.file); else if (r.remove) await clearPlCover(p.id);
    render(); toast("Lista actualizada");
  }

  function coverChooser(box, t) {
    const st = { file: null, poke: null };
    const c0 = t ? coverOf(t) : { src: pokeSrc(randPoke()), real: false };
    box.innerHTML = `<div class="cover-edit"><img class="cover-prev" alt=""><div class="cover-side"><div class="cover-btns"><button type="button" class="ghost-button" data-pick>Elegir imagen…</button><button type="button" class="ghost-button" data-poke>Pokémon al azar</button></div><small class="cover-note"></small><input type="file" accept="image/*" hidden></div></div>`;
    const img = box.querySelector(".cover-prev"), note = box.querySelector(".cover-note"), inp = box.querySelector("input");
    const show = (src, real, msg) => { img.onerror = () => { img.onerror = null; img.src = LOGO; }; img.src = src; img.classList.toggle("poke", !real); note.textContent = msg; };
    show(c0.src, c0.real, c0.real ? "Portada propia" : "Sin portada propia: se usa un Pokémon al azar");
    box.querySelector("[data-pick]").onclick = () => inp.click();
    inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const b = await shrinkImage(f); st.file = b; st.poke = null; show(URL.createObjectURL(b), true, "Portada nueva: " + f.name); inp.value = ""; };
    box.querySelector("[data-poke]").onclick = () => { const id = randPoke(); st.poke = id; st.file = null; show(pokeSrc(id), false, `Pokémon n.º ${id} (se aplica al guardar)`); };
    return () => ({ file: st.file, poke: st.poke });
  }
  async function editTrack(id) {
    const t = tmap.get(id); if (!t) return;
    const albums = getAlbums();
    const r = await sheet({
      title: "Editar detalles",
      mount(body) {
        body.innerHTML = `<div class="field"><label for="f-title">Título</label><input id="f-title" type="text" maxlength="150" value="${esc(t.title)}"></div>
          <div class="field"><label for="f-artist">Artista</label><input id="f-artist" type="text" maxlength="150" value="${esc(t.artist)}"></div>
          <div class="field"><label for="f-album">Álbum</label><input id="f-album" type="text" maxlength="150" list="album-names" value="${esc(t.album)}"><datalist id="album-names">${albums.map((a) => `<option value="${esc(a.name)}"></option>`).join("")}</datalist></div>
          <div class="field"><label>Portada</label><div id="f-cover"></div></div>`;
        const cov = coverChooser(body.querySelector("#f-cover"), t);
        return () => {
          const title = body.querySelector("#f-title").value.trim();
          if (!title) { toast("El título no puede estar vacío"); return false; }
          return { title, artist: body.querySelector("#f-artist").value.trim(), album: body.querySelector("#f-album").value.trim(), cover: cov() };
        };
      }
    });
    if (!r) return;
    const other = albumKey(r.album) ? albums.find((a) => a.key === albumKey(r.album)) : null;
    t.title = r.title; t.artist = r.artist; t.album = other ? other.name : r.album;
    applyCover(t, r.cover);
    if (!t.coverUrl) {
      const mate = other && other.tracks.find((x) => x !== t && x.pokeId && !x.coverUrl);
      t.pokeId = mate ? mate.pokeId : (t.pokeId || (t.album ? hashPoke(t.album) : randPoke()));
    }
    await persist(t);
    render(); if (id === curId) setCurrentUI();
    toast("Detalles guardados"); cachePokes();
  }
  async function albumSheet(album) {
    const isNew = !album, pending = [];
    const r = await sheet({
      title: isNew ? "Nuevo álbum" : "Editar álbum", confirm: isNew ? "Crear álbum" : "Guardar",
      mount(body) {
        const inAlbum = new Set(album ? album.tracks.map((t) => t.id) : []);
        const list = [...tracks].sort((a, b) => (inAlbum.has(b.id) - inAlbum.has(a.id)) || a.title.localeCompare(b.title, "es", { sensitivity: "base" }));
        const rows = list.length ? list.map((t) => `<label class="pick-row" data-text="${esc(norm(t.title + " " + t.artist))}"><input type="checkbox" value="${t.id}"${inAlbum.has(t.id) ? " checked" : ""}><span class="pk-t"><b>${esc(t.title)}</b><small>${esc(t.artist || "Artista desconocido")}${t.album && !inAlbum.has(t.id) ? ` · ahora en «${esc(t.album)}»` : ""}</small></span></label>`).join("")
          : '<div class="pick-empty">Tu biblioteca está vacía. Importa archivos con el botón de abajo.</div>';
        body.innerHTML = `<div class="field"><label for="f-name">Nombre del álbum</label><input id="f-name" type="text" maxlength="150" value="${esc(album ? album.name : "")}"></div>
          <div class="field"><label for="f-aartist">Artista del álbum</label><input id="f-aartist" type="text" maxlength="150" value="${esc(album && album.artist !== "Varios artistas" ? album.artist : "")}"></div>
          <div class="field"><label>Portada</label><div id="f-cover"></div></div>
          <div class="field"><label>Canciones</label><input id="f-filter" type="text" placeholder="Filtrar canciones de tu biblioteca…"><div class="pick-list" id="f-list">${rows}</div>
          <div class="import-row"><button type="button" class="ghost-button" id="f-imp">Importar archivos nuevos…</button><small id="f-impn"></small><input type="file" id="f-impf" accept="audio/*,.flac,.opus,.m4a,.wma" multiple hidden></div></div>`;
        const cov = coverChooser(body.querySelector("#f-cover"), album ? album.cover : null);
        body.querySelector("#f-filter").oninput = (e) => { const q = norm(e.target.value.trim()); body.querySelectorAll(".pick-row").forEach((row) => { row.hidden = !!q && !row.dataset.text.includes(q); }); };
        body.querySelector("#f-imp").onclick = () => body.querySelector("#f-impf").click();
        body.querySelector("#f-impf").onchange = (e) => { pending.push(...[...e.target.files].filter((f) => f.type.startsWith("audio/") || AUDIO_RE.test(f.name))); e.target.value = ""; body.querySelector("#f-impn").textContent = pending.length ? `${plural(pending.length, "archivo", "archivos")} para importar` : ""; };
        return () => {
          const name = body.querySelector("#f-name").value.trim();
          if (!name) { toast("Ponle un nombre al álbum"); return false; }
          const ids = [...body.querySelectorAll("#f-list input:checked")].map((i) => i.value);
          if (!ids.length && !pending.length) { toast("Elige al menos una canción o importa archivos"); return false; }
          return { name, artist: body.querySelector("#f-aartist").value.trim(), ids, files: pending, cover: cov() };
        };
      }
    });
    if (!r) return;
    const key = albumKey(r.name);
    const clash = getAlbums().find((a) => a.key === key && (!album || a.key !== album.key));
    const name = clash ? clash.name : r.name;
    const prevArtist = album && album.artist !== "Varios artistas" ? album.artist : "";
    const poke = r.cover.poke || (album && album.cover && album.cover.pokeId) || hashPoke(name);
    const touched = new Set();
    if (album) for (const t of album.tracks) if (!r.ids.includes(t.id)) { t.album = ""; if (!t.coverUrl && !t.pokeId) t.pokeId = randPoke(); touched.add(t); }
    for (const id of r.ids) {
      const t = tmap.get(id); if (!t) continue;
      t.album = name;
      if (r.artist && r.artist !== prevArtist) t.artist = r.artist;
      applyCover(t, r.cover);
      if (!t.coverUrl) t.pokeId = poke;
      touched.add(t);
    }
    await Promise.all([...touched].map(persist));
    if (r.files.length) await importFiles(r.files, { album: name, artist: r.artist, cover: r.cover.file, pokeId: poke });
    const nv = { name: "album", id: key };
    if (isNew) navigate(nv); else { navStack[navPos] = nv; navigate(nv, false); }
    toast(isNew ? `Álbum «${name}» creado` : "Álbum guardado"); cachePokes();
  }

  /* ---------- selección múltiple ---------- */
  const rowIds = () => [...document.querySelectorAll("#content tr[data-id]")].map((r) => r.dataset.id);
  const selIds = () => rowIds().filter((id) => selected.has(id));
  function syncSelection() {
    const vis = new Set(rowIds());
    selected = new Set([...selected].filter((id) => vis.has(id)));
    document.querySelectorAll("#content tr[data-id]").forEach((r) => r.classList.toggle("selected", selected.has(r.dataset.id)));
    $("selbar").hidden = selectMode ? selected.size < 1 : selected.size < 2;
    $("sel-count").textContent = plural(selected.size, "canción seleccionada", "canciones seleccionadas");
  }
  function selectRow(id, e) {
    const ids = rowIds();
    if (e.shiftKey && anchorId && ids.includes(anchorId)) {
      const a = ids.indexOf(anchorId), b = ids.indexOf(id), [lo, hi] = a < b ? [a, b] : [b, a];
      const range = ids.slice(lo, hi + 1);
      selected = (e.ctrlKey || e.metaKey) ? new Set([...selected, ...range]) : new Set(range);
    } else if (e.ctrlKey || e.metaKey) {
      selected.has(id) ? selected.delete(id) : selected.add(id); anchorId = id;
    } else { selected = new Set([id]); anchorId = id; }
    syncSelection();
  }
  let selectMode = false;
  function clearSelection() { selected.clear(); anchorId = null; selectMode = false; syncSelection(); }
  function addManyToPlaylist(pid, ids) {
    const p = getPlaylist(pid); if (!p) return;
    let n = 0; for (const id of ids) if (!p.ids.includes(id)) { p.ids.push(id); n++; }
    savePlaylists(); renderSidebar();
    toast(n ? `${plural(n, "canción añadida", "canciones añadidas")} a «${p.name}»` : `Ya estaban en «${p.name}»`);
    if (view.name === "playlist" && view.id === pid) render();
  }
  async function newPlaylistWith(ids) {
    const name = await dialog({ title: "Nueva lista", input: { placeholder: "Nombre de la lista" }, confirm: "Crear" });
    if (!name) return;
    const p = createPlaylist(name); addManyToPlaylist(p.id, ids);
  }
  function removeFromPlaylist(pid, ids) {
    const p = getPlaylist(pid); if (!p) return;
    p.ids = p.ids.filter((x) => !ids.includes(x)); savePlaylists(); render();
    toast(`${plural(ids.length, "canción quitada", "canciones quitadas")} de la lista`);
  }
  function likeMany(ids) {
    const all = ids.every((id) => liked.has(id));
    ids.forEach((id) => (all ? liked.delete(id) : liked.add(id)));
    saveLiked(); updateLikeCurrent(); render();
    toast(all ? "Quitadas de favoritos" : "Añadidas a favoritos");
  }
  async function setAlbumFor(ids) {
    const albums = getAlbums();
    const r = await sheet({
      title: `Poner álbum a ${plural(ids.length, "canción", "canciones")}`, confirm: "Aplicar",
      mount(body) {
        body.innerHTML = `<div class="field"><label for="f-album">Álbum</label><input id="f-album" type="text" maxlength="150" list="album-names" placeholder="Nombre del álbum"><datalist id="album-names">${albums.map((a) => `<option value="${esc(a.name)}"></option>`).join("")}</datalist></div>
          <div class="field"><label for="f-artist">Artista (opcional, se aplica a todas)</label><input id="f-artist" type="text" maxlength="150"></div>`;
        return () => {
          const album = body.querySelector("#f-album").value.trim();
          if (!album) { toast("Escribe el nombre del álbum"); return false; }
          return { album, artist: body.querySelector("#f-artist").value.trim() };
        };
      }
    });
    if (!r) return;
    const other = albums.find((a) => a.key === albumKey(r.album));
    const name = other ? other.name : r.album;
    const poke = (other && other.cover && other.cover.pokeId) || hashPoke(name);
    for (const id of ids) {
      const t = tmap.get(id); if (!t) continue;
      t.album = name; if (r.artist) t.artist = r.artist; if (!t.coverUrl) t.pokeId = poke;
      await persist(t);
    }
    render(); toast(`Álbum «${name}» aplicado`); cachePokes();
  }
  function openSelectionMenu(anchor, ids) {
    const items = [
      { heading: plural(ids.length, "canción seleccionada", "canciones seleccionadas") },
      { label: "Reproducir", icon: "play", fill: true, fn: () => playList(ids, false) },
      { label: "Añadir a la cola", icon: "queue", fn: () => enqueue(ids) },
      { label: "Reproducir a continuación", icon: "next", fn: () => enqueue(ids, { next: true }) },
      { label: "Favoritos (poner o quitar)", icon: "heart", fn: () => likeMany(ids) },
      { label: "Poner álbum…", icon: "disc", fn: () => setAlbumFor(ids) },
      { sep: true }, { heading: "Añadir a una lista" }
    ];
    playlists.forEach((p) => items.push({ label: p.name, icon: "list", fn: () => addManyToPlaylist(p.id, ids) }));
    items.push({ label: "Nueva lista…", icon: "plus", fn: () => newPlaylistWith(ids) }, { sep: true });
    if (view.name === "playlist") items.push(...moveItems(ids), { sep: true }, { label: "Quitar de esta lista", icon: "x", fn: () => removeFromPlaylist(view.id, ids) });
    items.push({ label: "Eliminar de la biblioteca", icon: "trash", danger: true, fn: () => deleteTracks(ids) });
    showMenu(items, anchor);
  }
  function menuFor(id, anchor) {
    if (selected.has(id) && selected.size > 1) openSelectionMenu(anchor, selIds());
    else openTrackMenu(id, anchor);
  }
  $("selbar").onclick = (e) => {
    const b = e.target.closest("[data-sel]"); if (!b) return;
    const ids = selIds();
    if (b.dataset.sel === "play") playList(ids, false);
    else if (b.dataset.sel === "queue") enqueue(ids);
    else if (b.dataset.sel === "more") openSelectionMenu(b, ids);
    else if (b.dataset.sel === "clear") clearSelection();
  };

  /* ---------- reproducción y cola ---------- */
  const shuffled = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  // Orden de reproducción del contexto actual. Con aleatorio es una mezcla real (Fisher-Yates):
  // cada canción suena una vez por vuelta y la cola enseña exactamente lo que viene.
  function buildOrder(startId) {
    const has = !!startId && ctx.includes(startId);
    if (settings.shuffle) {
      const rest = shuffled(ctx.filter((x) => x !== startId));
      order = has ? [startId, ...rest] : rest;
      ctxPos = has ? 0 : -1;
    } else {
      order = [...ctx];
      ctxPos = has ? order.indexOf(startId) : -1;
    }
  }
  function playTrack(id, newCtx, opts = {}) {
    const t = tmap.get(id); if (!t) return;
    if (newCtx) { ctx = newCtx.filter((x) => tmap.has(x)); if (!ctx.includes(id)) ctx = [id, ...ctx]; buildOrder(id); }
    else if (!opts.fromQueue && order.includes(id)) ctxPos = order.indexOf(id);
    if (curId && curId !== id && !opts.noHistory) { history.push(curId); if (history.length > 200) history.shift(); }
    curId = id;
    if (curUrl) URL.revokeObjectURL(curUrl);
    curUrl = URL.createObjectURL(t.file);
    audio.src = curUrl;
    audio.play().catch((err) => { if (err.name !== "AbortError") toast(`No se puede reproducir «${t.title}» en este equipo`); });
    setCurrentUI();
  }
  function playList(ids, forceShuffle) {
    if (!ids.length) return;
    if (forceShuffle && !settings.shuffle) { settings.shuffle = true; saveSettings(); updateModes(); }
    playTrack(settings.shuffle ? ids[Math.floor(Math.random() * ids.length)] : ids[0], ids);
  }
  function enqueue(ids, { next = false } = {}) {
    ids = ids.filter((x) => tmap.has(x)); if (!ids.length) return;
    userQueue = next ? [...ids, ...userQueue] : [...userQueue, ...ids];
    saveQueue(); renderQueue();
    const one = ids.length === 1 ? tmap.get(ids[0]).title : "";
    toast(next ? (one ? `«${one}» sonará a continuación` : `${ids.length} canciones sonarán a continuación`) : (one ? `«${one}» añadida a la cola` : `${ids.length} canciones añadidas a la cola`));
  }
  function next(auto = false) {
    if (auto && settings.repeat === "one") { audio.currentTime = 0; audio.play().catch(() => {}); return; }
    if (userQueue.length) { const id = userQueue.shift(); saveQueue(); playTrack(id, null, { fromQueue: true }); return; }
    if (!order.length && tracks.length) { ctx = sorted(tracks).map((t) => t.id); buildOrder(curId); }
    if (!order.length) return;
    let i = ctxPos + 1;
    if (i >= order.length) {
      if (settings.repeat === "all" || !auto) {
        if (settings.shuffle) {
          const o = shuffled(ctx);
          if (o.length > 1 && o[0] === curId) { const j = 1 + Math.floor(Math.random() * (o.length - 1)); [o[0], o[j]] = [o[j], o[0]]; }
          order = o;
        }
        i = 0;
      } else { audio.pause(); audio.currentTime = 0; renderQueue(); return; }
    }
    ctxPos = i;
    playTrack(order[i], null);
  }
  function prev() {
    if (!curId) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    if (history.length) { playTrack(history.pop(), null, { noHistory: true }); return; }
    if (order.length) playTrack(order[(ctxPos - 1 + order.length) % order.length], null, { noHistory: true });
  }
  function togglePlay() {
    if (!curId) { if (tracks.length) playList(sorted(tracks).map((t) => t.id), false); else toast("Añade música para empezar"); return; }
    audio.paused ? audio.play().catch(() => {}) : audio.pause();
  }

  /* ---------- panel de la cola ---------- */
  function toggleQueue(force) {
    const p = $("queue-panel"), open = typeof force === "boolean" ? force : p.hidden;
    p.hidden = !open;
    document.querySelector(".app").classList.toggle("queue-open", open);
    $("queue-btn").classList.toggle("active", open);
    if (open) renderQueue();
  }
  function renderQueue() {
    const p = $("queue-panel"); if (p.hidden) return;
    const item = (id, i, kind) => {
      const t = tmap.get(id); if (!t) return "";
      return `<div class="q-item${kind === "now" ? " now" : ""}" data-kind="${kind}" data-i="${i}" data-id="${id}"${kind === "user" ? ' draggable="true"' : ""}>${coverImg(t, "q-thumb")}<div class="q-meta"><b>${esc(t.title)}</b><small>${esc(t.artist || "Artista desconocido")}</small></div>${kind === "user" ? `<button class="icon-btn sm" data-q="remove" data-i="${i}" title="Quitar de la cola" aria-label="Quitar de la cola">${icon("x", 16)}</button>` : ""}</div>`;
    };
    const upcoming = order.slice(ctxPos + 1).filter((id) => tmap.has(id));
    const shown = upcoming.slice(0, 150);
    p.innerHTML = `<div class="q-head"><h2>Cola</h2><div class="q-head-btns"><button class="ghost-button sm" data-q="add"><span class="ic">${icon("plus", 16)}</span>Añadir</button><button class="icon-btn sm" data-q="close" title="Cerrar" aria-label="Cerrar">${icon("x", 18)}</button></div></div>
      <div class="q-body"><h3>Reproduciendo ahora</h3>${curId ? item(curId, 0, "now") : '<p class="q-empty">No hay nada sonando.</p>'}
      <h3>Siguiente en la cola${userQueue.length ? '<button data-q="clear">Vaciar</button>' : ""}</h3>${userQueue.length ? userQueue.map((id, i) => item(id, i, "user")).join("") : '<p class="q-empty">Vacía. Usa «Añadir a la cola» en cualquier canción, o el botón Añadir. Puedes arrastrar para reordenar.</p>'}
      <h3>${settings.shuffle ? "A continuación (aleatorio)" : "A continuación"}</h3>${shown.length ? shown.map((id, i) => item(id, i, "order")).join("") + (upcoming.length > shown.length ? `<p class="q-empty">…y ${upcoming.length - shown.length} más</p>` : "") : `<p class="q-empty">${settings.repeat === "all" ? "Al terminar vuelve a empezar." : "No quedan canciones después de esta."}</p>`}</div>`;
  }
  async function pickTracks(title, confirm) {
    const r = await sheet({
      title, confirm,
      mount(body) {
        const list = sorted(tracks);
        body.innerHTML = `<div class="field"><input id="f-filter" type="text" placeholder="Filtrar canciones…"><div class="pick-list tall" id="f-list">${list.length ? list.map((t) => `<label class="pick-row" data-text="${esc(norm(t.title + " " + t.artist + " " + t.album))}"><input type="checkbox" value="${t.id}"><span class="pk-t"><b>${esc(t.title)}</b><small>${esc(t.artist || "Artista desconocido")}</small></span></label>`).join("") : '<div class="pick-empty">Tu biblioteca está vacía.</div>'}</div></div>`;
        body.querySelector("#f-filter").oninput = (e) => { const q = norm(e.target.value.trim()); body.querySelectorAll(".pick-row").forEach((row) => { row.hidden = !!q && !row.dataset.text.includes(q); }); };
        return () => {
          const ids = [...body.querySelectorAll("#f-list input:checked")].map((i) => i.value);
          if (!ids.length) { toast("Marca al menos una canción"); return false; }
          return { ids };
        };
      }
    });
    return r ? r.ids : null;
  }
  let qDrag = null;
  $("queue-panel").onclick = async (e) => {
    const q = e.target.closest("[data-q]");
    if (q) {
      const act = q.dataset.q;
      if (act === "close") toggleQueue(false);
      else if (act === "clear") { userQueue = []; saveQueue(); renderQueue(); }
      else if (act === "remove") { userQueue.splice(Number(q.dataset.i), 1); saveQueue(); renderQueue(); }
      else if (act === "add") { const ids = await pickTracks("Añadir a la cola", "Añadir"); if (ids) enqueue(ids); }
      return;
    }
    const it = e.target.closest(".q-item"); if (!it) return;
    if (it.dataset.kind === "now") togglePlay();
    else if (it.dataset.kind === "user") { const [id] = userQueue.splice(Number(it.dataset.i), 1); saveQueue(); playTrack(id, null, { fromQueue: true }); }
    else playTrack(it.dataset.id, null);
  };
  $("queue-panel").addEventListener("dragstart", (e) => { const it = e.target.closest('.q-item[data-kind="user"]'); if (!it) return; qDrag = Number(it.dataset.i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", "cola"); });
  $("queue-panel").addEventListener("dragover", (e) => {
    if (qDrag === null) return;
    const it = e.target.closest('.q-item[data-kind="user"]'); if (!it) return;
    e.preventDefault(); document.querySelectorAll(".q-item.over").forEach((x) => x.classList.remove("over")); it.classList.add("over");
  });
  $("queue-panel").addEventListener("drop", (e) => {
    if (qDrag === null) return;
    const it = e.target.closest('.q-item[data-kind="user"]');
    if (it) { e.preventDefault(); const to = Number(it.dataset.i); const [m] = userQueue.splice(qDrag, 1); userQueue.splice(to, 0, m); saveQueue(); }
    qDrag = null; renderQueue();
  });
  $("queue-panel").addEventListener("dragend", () => { qDrag = null; renderQueue(); });
  $("queue-btn").onclick = () => toggleQueue();

  /* ---------- interfaz del reproductor ---------- */
  function updateLikeCurrent() {
    const on = !!curId && liked.has(curId), b = $("like-current");
    b.classList.toggle("on", on); b.innerHTML = icon("heart", 20, on);
    syncFull();
  }
  function markPlaying() { document.querySelectorAll("tr[data-id]").forEach((r) => r.classList.toggle("playing", r.dataset.id === curId)); }
  function setCurrentUI() {
    const t = tmap.get(curId);
    $("current-title").textContent = t ? t.title : "Elige una canción";
    $("current-artist").textContent = t ? (t.artist || "Artista desconocido") : "Tu biblioteca te espera";
    const cv = t ? coverOf(t) : { src: LOGO, real: false };
    $("current-art").src = cv.src; $("current-art").classList.toggle("poke", !cv.real);
    document.title = t ? `${t.title} · Salamence music` : "Salamence music";
    updateLikeCurrent(); markPlaying(); updatePlayState(); renderQueue(); syncFullProgress();
    if (t && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist || "Artista desconocido", album: t.album || "", artwork: [{ src: new URL(coverOf(t).src, location.href).href, sizes: "512x512" }] });
      } catch { /* no soportado */ }
    }
  }
  function updatePlayState() {
    $("play-pause").innerHTML = icon(audio.paused ? "play" : "pause", 18, true);
    $("play-pause").title = audio.paused ? "Reproducir (Espacio)" : "Pausar (Espacio)";
    document.body.classList.toggle("is-playing", !audio.paused);
    syncFull();
  }
  function updateProgress() {
    const t = tmap.get(curId);
    const d = Number.isFinite(audio.duration) && audio.duration ? audio.duration : (t ? t.duration : 0);
    $("elapsed").textContent = fmt(audio.currentTime || 0);
    $("duration").textContent = fmt(d);
    const p = d ? Math.min(1000, (audio.currentTime / d) * 1000) : 0;
    $("seek").value = p; $("seek").style.setProperty("--p", p / 10 + "%");
    syncFullProgress();
  }
  function updateModes() {
    $("shuffle").classList.toggle("active", settings.shuffle);
    $("repeat").classList.toggle("active", settings.repeat !== "off");
    $("repeat").innerHTML = icon(settings.repeat === "one" ? "repeat1" : "repeat", 18);
    $("repeat").title = { off: "Repetir: desactivado", all: "Repetir: toda la cola", one: "Repetir: esta canción" }[settings.repeat];
    syncFull();
  }
  function updateVolume() {
    const v = audio.muted ? 0 : audio.volume;
    $("volume").value = v; $("volume").style.setProperty("--p", v * 100 + "%");
    $("mute").innerHTML = icon(v === 0 ? "mute" : "vol", 20);
  }
  $("shuffle").innerHTML = icon("shuffle", 18);
  $("previous").innerHTML = icon("prev", 18, true);
  $("next").innerHTML = icon("next", 18, true);

  $("play-pause").onclick = togglePlay;
  $("next").onclick = () => next(false);
  $("previous").onclick = prev;
  $("shuffle").onclick = () => {
    settings.shuffle = !settings.shuffle; saveSettings(); updateModes();
    if (ctx.length) { buildOrder(ctx.includes(curId) ? curId : null); renderQueue(); }
  };
  $("repeat").onclick = () => { settings.repeat = { off: "all", all: "one", one: "off" }[settings.repeat]; saveSettings(); updateModes(); renderQueue(); };
  $("seek").oninput = () => { if (audio.duration) audio.currentTime = (Number($("seek").value) / 1000) * audio.duration; $("seek").style.setProperty("--p", Number($("seek").value) / 10 + "%"); };
  $("volume").oninput = () => { audio.muted = false; audio.volume = Number($("volume").value); settings.volume = audio.volume; saveSettings(); updateVolume(); };
  $("mute").onclick = () => { audio.muted = !audio.muted; updateVolume(); };
  $("like-current").onclick = () => { if (curId) toggleLike(curId); };
  let lastSave = 0;
  audio.ontimeupdate = () => { updateProgress(); const n = Date.now(); if (curId && n - lastSave > 4000) { lastSave = n; LS.set("salamence-last", { id: curId, time: audio.currentTime }); } };
  audio.onloadedmetadata = updateProgress;
  audio.onplay = updatePlayState;
  audio.onpause = updatePlayState;
  audio.onended = () => next(true);
  audio.onerror = () => { if (curId) toast("No se puede reproducir este archivo. Puede que el formato no sea compatible."); };
  window.addEventListener("beforeunload", () => { if (curId) LS.set("salamence-last", { id: curId, time: audio.currentTime }); });

  if ("mediaSession" in navigator) {
    const h = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch { /* no soportado */ } };
    h("play", () => audio.play()); h("pause", () => audio.pause());
    h("seekto", (d) => { if (d.seekTime != null) audio.currentTime = d.seekTime; }); h("seekbackward", () => { audio.currentTime = Math.max(0, audio.currentTime - 10); }); h("seekforward", () => { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); });
    h("previoustrack", prev); h("nexttrack", () => next(false));
  }

  /* ---------- navegación ---------- */
  function navigate(v, push = true) {
    closeMenu(); selected.clear(); anchorId = null;
    if (push) { navStack = navStack.slice(0, navPos + 1); navStack.push(v); navPos = navStack.length - 1; if (isMobile()) window.history.pushState({ v: 1 }, ""); }
    view = v; render(); $("main").scrollTop = 0;
  }
  function go(step) { const p = navPos + step; if (p < 0 || p >= navStack.length) return; navPos = p; navigate(navStack[p], false); }
  $("back").onclick = () => { if (isMobile() && navPos > 0) window.history.back(); else go(-1); };
  $("forward").onclick = () => go(1);
  document.querySelectorAll(".nav-item").forEach((b) => { b.onclick = () => navigate({ name: b.dataset.view, id: null }); });
  $("new-playlist").onclick = () => newPlaylistFlow(null);
  let importTarget = null;
  $("add-music").onclick = () => { importTarget = null; $("file-picker").click(); };
  $("add-folder").onclick = () => $("folder-picker").click();
  $("file-picker").onchange = (e) => { const tg = importTarget; importTarget = null; importFiles(e.target.files, tg && getPlaylist(tg) ? { playlistId: tg } : {}); e.target.value = ""; };
  $("file-picker").addEventListener("cancel", () => { importTarget = null; });
  $("folder-picker").onchange = (e) => { importFiles(e.target.files); e.target.value = ""; };

  /* ---------- vistas ---------- */
  function renderSidebar() {
    $("playlist-list").innerHTML = playlists.map((p) => {
      const first = playlistTracks(p).find((t) => t.coverUrl); const own = plPhotoUrl(p);
      return `<button class="pl-link${view.name === "playlist" && view.id === p.id ? " active" : ""}" draggable="true" data-act="open-pl" data-id="${esc(p.id)}"><span class="pl-thumb">${own ? `<img src="${own}" alt="">` : first ? `<img src="${first.coverUrl}" alt="">` : icon("note", 18)}</span><span class="t"><b>${esc(p.name)}</b><small>${plural(p.ids.filter((i) => tmap.has(i)).length, "canción", "canciones")}</small></span></button>`;
    }).join("");
  }
  function updateNav() {
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === (view.name === "album" ? "albums" : view.name === "playlist" ? "playlists" : view.name)));
    $("back").disabled = navPos <= 0; $("forward").disabled = navPos >= navStack.length - 1;
  }
  function emptyBlock(msg) {
    return `<div class="empty"><strong>${esc(msg || "Aquí no hay canciones todavía")}</strong>${msg ? "" : "Añade archivos o una carpeta entera para llenar tu biblioteca."}${msg ? "" : `<br><button class="primary-button" data-act="import"><span class="ic">${icon("plus", 18)}</span>Añadir música</button><button class="ghost-button" data-act="backup">Importar copia de otro dispositivo</button>`}</div>`;
  }
  function rowsHtml(list, { queueIds, emptyMsg, reorder = false } = {}) {
    shownQueue = queueIds || list.map((t) => t.id);
    if (!list.length) return emptyBlock(emptyMsg);
    return `<table class="track-table"><thead><tr><th class="c-num">#</th><th>Título</th><th class="c-album">Álbum</th><th class="c-dur"><span class="ic">${icon("clock", 15)}</span></th><th class="c-act"></th></tr></thead><tbody>${list.map((t, i) => {
      const on = liked.has(t.id);
      return `<tr data-id="${t.id}"${reorder ? ' draggable="true" data-reorder="1"' : ""} class="${t.id === curId ? "playing" : ""}${selected.has(t.id) ? " selected" : ""}"><td class="c-num"><span class="n">${i + 1}</span><span class="p ic">${icon("play", 14, true)}</span><span class="eq"><i></i><i></i><i></i></span></td><td><div class="tcell">${coverImg(t, "thumb")}<div class="tmeta"><div class="song-name">${esc(t.title)}</div><div class="artist">${esc(t.artist || "Artista desconocido")}</div></div></div></td><td class="c-album">${t.album ? `<button class="album-link" data-act="open-album" data-id="${esc(albumKey(t.album))}">${esc(t.album)}</button>` : "—"}</td><td class="c-dur">${fmt(t.duration)}</td><td class="c-act"><div class="row-actions"><button class="icon-btn sm${on ? " on" : ""}" data-act="like" data-id="${t.id}" title="Favorito" aria-label="Favorito">${icon("heart", 18, on)}</button><button class="icon-btn sm" data-act="menu" data-id="${t.id}" title="Más opciones" aria-label="Más opciones">${icon("dots", 18)}</button></div></td></tr>`;
    }).join("")}</tbody></table>`;
  }
  const countText = (n) => plural(n, "canción", "canciones");
  const sortSelect = () => `<select id="sort" aria-label="Ordenar">${[["added", "Más recientes"], ["title", "Título"], ["artist", "Artista"], ["duration", "Duración"]].map(([v, l]) => `<option value="${v}"${settings.sort === v ? " selected" : ""}>${l}</option>`).join("")}</select>`;
  const playBar = (n) => n ? `<div class="action-bar"><button class="round-play" data-act="play-all" title="Reproducir" aria-label="Reproducir">${icon("play", 24, true)}</button><button class="icon-btn" data-act="shuffle-all" title="Reproducir en aleatorio" aria-label="Aleatorio">${icon("shuffle", 24)}</button></div>` : "";
  function greeting() { const h = new Date().getHours(); return h < 6 ? "Buenas noches" : h < 14 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches"; }

  function viewHome() {
    const all = sorted(tracks).map((t) => t.id);
    const recents = [...tracks].sort((a, b) => b.added - a.added).slice(0, 8);
    const total = tracks.reduce((s, t) => s + t.duration, 0);
    return `<h1 class="page-title" id="greeting">${greeting()}</h1>
      <div class="welcome"><div class="welcome-text"><h2>Tu música, sin cuentas ni anuncios</h2><p>${tracks.length ? `${countText(tracks.length)} · ${fmtTotal(total)} guardadas en este equipo. Tus listas y favoritos se conservan al cerrar.` : "Añade tus archivos de audio una vez y se quedan guardados aquí. También puedes arrastrarlos a la ventana."}</p>
      <div class="welcome-actions">${tracks.length ? `<button class="primary-button" data-act="play-all-lib"><span class="ic">${icon("play", 16, true)}</span>Reproducir todo</button><button class="ghost-button" data-act="shuffle-all-lib"><span class="ic">${icon("shuffle", 16)}</span>Aleatorio</button>` : `<button class="primary-button" data-act="import"><span class="ic">${icon("plus", 18)}</span>Añadir música</button>`}</div></div>
      <img class="hero-img" src="${LOGO}" alt=""></div>
      ${pendingBanner()}<div class="section-head"><h2>Acceso rápido</h2></div>
      <div class="quick-grid"><button class="quick-card" data-act="go" data-view="library"><span class="mini-art">${icon("library", 26)}</span><span>Toda la música</span></button><button class="quick-card" data-act="go" data-view="albums"><span class="mini-art">${icon("disc", 26)}</span><span>Álbumes</span></button><button class="quick-card" data-act="go" data-view="liked"><span class="mini-art fav">${icon("heart", 26, true)}</span><span>Tus favoritos</span></button>${playlists.slice(0, 6).map((p) => `<button class="quick-card" data-act="open-pl" data-id="${esc(p.id)}"><span class="mini-art">${plPhotoUrl(p) ? `<img src="${plPhotoUrl(p)}" alt="">` : icon("note", 26)}</span><span>${esc(p.name)}</span></button>`).join("")}</div>
      <div class="section-head"><h2>Añadidas recientemente</h2><small>${tracks.length ? "Doble clic para escuchar · Ctrl+clic para elegir varias" : ""}</small></div>${rowsHtml(recents, { queueIds: all })}`;
  }
  function searchResults() {
    const q = norm(query.trim());
    const res = q ? sorted(tracks).filter((t) => norm(`${t.title} ${t.artist} ${t.album} ${t.name}`).includes(q)) : sorted(tracks);
    return `<div class="section-head"><h2>${q ? "Resultados" : "Tu música"}</h2><small>${countText(res.length)}</small></div>${rowsHtml(res, { emptyMsg: q ? `Nada coincide con «${query}»` : "" })}`;
  }
  function viewSearch() {
    return `<h1 class="page-title">Buscar</h1><input class="search-input" id="search-box" type="search" placeholder="Título, artista o álbum" value="${esc(query)}" autocomplete="off"><div id="results">${searchResults()}</div>`;
  }
  function viewLibrary() {
    const list = sorted(tracks);
    return `<h1 class="page-title">Tu biblioteca</h1>${playBar(list.length)}<div class="section-head"><h2>Canciones</h2><span>${sortSelect()}</span></div>${rowsHtml(list)}`;
  }
  function viewAlbums() {
    const list = getAlbums();
    return `<h1 class="page-title">Álbumes</h1><div class="action-bar"><button class="primary-button" data-act="new-album"><span class="ic">${icon("plus", 18)}</span>Nuevo álbum</button></div>${list.length
      ? `<div class="album-grid">${list.map((a) => `<button class="album-card" data-act="open-album" data-id="${esc(a.key)}">${coverImg(a.cover, "album-art")}<b>${esc(a.name)}</b><small>${esc(a.artist || "Artista desconocido")} · ${countText(a.tracks.length)}</small></button>`).join("")}</div>`
      : `<div class="empty"><strong>Todavía no tienes álbumes</strong>Crea uno y elige qué canciones incluir, o pon álbum a una canción con «Editar detalles».<br><button class="primary-button" data-act="new-album"><span class="ic">${icon("plus", 18)}</span>Crear mi primer álbum</button></div>`}`;
  }
  function viewAlbum() {
    const a = getAlbums().find((x) => x.key === view.id);
    if (!a) { view = { name: "albums", id: null }; return viewAlbums(); }
    return `<div class="playlist-head"><div class="playlist-cover">${coverImg(a.cover, "cover-full")}</div><div><div class="eyebrow">Álbum</div><h1>${esc(a.name)}</h1><p>${esc(a.artist || "Artista desconocido")} · ${countText(a.tracks.length)} · ${fmtTotal(a.duration)}</p></div></div>
      <div class="action-bar"><button class="round-play" data-act="play-all" title="Reproducir" aria-label="Reproducir">${icon("play", 24, true)}</button><button class="icon-btn" data-act="shuffle-all" title="Aleatorio" aria-label="Aleatorio">${icon("shuffle", 24)}</button><button class="icon-btn" data-act="edit-album" title="Editar álbum" aria-label="Editar álbum">${icon("edit", 22)}</button><button class="icon-btn" data-act="delete-album" title="Quitar álbum" aria-label="Quitar álbum">${icon("trash", 22)}</button><button class="icon-btn lab" data-act="album-into" title="Añadir este álbum a una lista" aria-label="Añadir este álbum a una lista">${icon("list", 22)}<span class="lt">Añadir a una lista</span></button></div>
      ${rowsHtml(a.tracks)}`;
  }
  const pendingBanner = () => { const n = pendingCount(); return n ? `<div class="notice"><span>Faltan <b>${n}</b> ${n === 1 ? "canción" : "canciones"} de las listas que importaste. Añade esos archivos con «Añadir música» y se enlazarán solos a sus listas.</span><button class="ghost-button sm" data-act="pend-view">Ver cuáles</button><button class="ghost-button sm" data-act="pend-clear">Olvidar</button></div>` : ""; };
  function viewPlaylists() {
    const cards = playlists.map((p) => {
      const first = playlistTracks(p).find((t) => t.coverUrl), own = plPhotoUrl(p);
      const img = own ? `<img class="album-art" src="${own}" alt="">` : first ? `<img class="album-art" src="${first.coverUrl}" alt="">` : `<img class="album-art poke" src="${LOGO}" alt="">`;
      return `<div class="album-card pl-card" role="button" tabindex="0" data-act="open-pl" data-id="${esc(p.id)}">${img}<b>${esc(p.name)}</b><small>${countText(p.ids.filter((i) => tmap.has(i)).length)}</small><button class="icon-btn sm card-more" data-act="pl-menu" data-id="${esc(p.id)}" title="Más opciones de la lista" aria-label="Más opciones de la lista">${icon("dots", 18)}</button></div>`;
    }).join("");
    return `<h1 class="page-title">Tus listas</h1><div class="action-bar"><button class="primary-button" data-act="new-pl"><span class="ic">${icon("plus", 18)}</span>Nueva lista</button><button class="ghost-button" data-act="backup"><span class="ic">${icon("database", 18)}</span>Copia de seguridad</button></div>${pendingBanner()}${playlists.length ? `<div class="album-grid">${cards}</div>` : '<div class="empty"><strong>Aún no tienes listas</strong>Crea una, o importa una copia hecha en otro dispositivo.</div>'}`;
  }
  function viewLiked() {
    const list = sorted(tracks.filter((t) => liked.has(t.id)));
    return `<h1 class="page-title">Tus favoritos</h1>${playBar(list.length)}${rowsHtml(list, { emptyMsg: "Aún no tienes favoritos", })}${list.length ? "" : '<p class="eyebrow" style="text-align:center;margin-top:10px">Pulsa el corazón de cualquier canción para guardarla aquí.</p>'}`;
  }
  function viewPlaylist() {
    const p = getPlaylist(view.id);
    if (!p) { view = { name: "library", id: null }; return viewLibrary(); }
    const mode = p.sort || "custom", custom = mode === "custom";
    const list = sortPl(playlistTracks(p), mode);
    const cover = list.find((t) => t.coverUrl); const own = plPhotoUrl(p);
    const total = list.reduce((s, t) => s + t.duration, 0);
    return `<div class="playlist-head"><button class="playlist-cover pl-photo" data-act="pl-photo" title="Cambiar foto" aria-label="Cambiar foto de la lista">${own ? `<img src="${own}" alt="">` : cover ? `<img src="${cover.coverUrl}" alt="">` : `<img class="logo" src="${LOGO}" alt="">`}<span class="pl-photo-hint"><span class="ic">${icon("edit", 30)}</span><b>Cambiar foto</b></span></button><div><div class="eyebrow">Lista</div><h1>${esc(p.name)}</h1><p>${countText(list.length)}${list.length ? " · " + fmtTotal(total) : ""}</p></div></div>
      <div class="action-bar">${list.length ? `<button class="round-play" data-act="play-all" title="Reproducir" aria-label="Reproducir">${icon("play", 24, true)}</button><button class="icon-btn" data-act="shuffle-all" title="Aleatorio" aria-label="Aleatorio">${icon("shuffle", 24)}</button>` : ""}<button class="icon-btn" data-act="rename-pl" title="Editar nombre y foto" aria-label="Editar nombre y foto">${icon("edit", 22)}</button><button class="icon-btn" data-act="delete-pl" title="Eliminar lista" aria-label="Eliminar lista">${icon("trash", 22)}</button><button class="icon-btn lab" data-act="pl-dup" title="Duplicar lista" aria-label="Duplicar lista">${icon("copy", 22)}<span class="lt">Duplicar</span></button><button class="icon-btn lab" data-act="pl-into" title="Añadir esta lista a otra lista" aria-label="Añadir esta lista a otra lista">${icon("list", 22)}<span class="lt">Añadir a otra lista</span></button><button class="ghost-button sm" data-act="pl-add-files"><span class="ic">${icon("plus", 16)}</span>Añadir música</button></div>
      ${list.length > 1 ? `<div class="pl-tools"><label>Ordenar por <select id="pl-sort" aria-label="Ordenar la lista">${PL_SORTS.map(([v, l]) => `<option value="${v}"${mode === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>${custom ? '<small>Arrastra las canciones para ordenarlas a tu gusto, o usa «Mover…» en su menú ⋯.</small>' : '<button class="ghost-button sm" data-act="pl-keep-order">Guardar este orden como mío</button>'}</div>` : ""}
      ${rowsHtml(list, { emptyMsg: "Esta lista está vacía", reorder: custom && list.length > 1 })}${list.length ? "" : `<p class="eyebrow" style="text-align:center;margin-top:10px">Abre el menú ${"⋯"} de cualquier canción y elige «Añadir a una lista», o arrastra aquí archivos de música desde tu equipo.</p>`}`;
  }
  function render() {
    renderSidebar(); updateNav();
    const fn = { home: viewHome, search: viewSearch, library: viewLibrary, albums: viewAlbums, album: viewAlbum, liked: viewLiked, playlist: viewPlaylist, playlists: viewPlaylists }[view.name] || viewHome;
    content.innerHTML = fn();
    if (view.name === "search") {
      const sb = $("search-box");
      sb.oninput = () => { query = sb.value; $("results").innerHTML = searchResults(); markPlaying(); };
      if (!sb.value) sb.focus();
    }
    syncSelection();
    const sort = $("sort");
    if (sort) sort.onchange = () => { settings.sort = sort.value; saveSettings(); render(); };
    const ps = $("pl-sort");
    if (ps) ps.onchange = () => { const p = getPlaylist(view.id); if (p) { p.sort = ps.value; savePlaylists(); render(); } };
  }

  /* ---------- eventos globales (delegación) ---------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (el) {
      e.stopPropagation();
      const id = el.dataset.id;
      switch (el.dataset.act) {
        case "like": toggleLike(id); break;
        case "menu": menuFor(id, el); break;
        case "import": importTarget = null; $("file-picker").click(); break;
        case "pl-menu": openPlaylistMenu(id, el); break;
        case "pl-dup": { const p = getPlaylist(view.id); if (p) duplicatePlaylist(p); break; }
        case "pl-into": { const p = getPlaylist(view.id); if (p) pickTargetPlaylist(sortPl(playlistTracks(p), p.sort || "custom").map((t) => t.id), el, { excludeId: p.id, title: `Añadir «${p.name}» a…` }); break; }
        case "album-into": { const a = getAlbums().find((x) => x.key === view.id); if (a) pickTargetPlaylist(a.tracks.map((t) => t.id), el, { title: `Añadir «${a.name}» a…` }); break; }
        case "pl-add-files": importTarget = view.id; $("file-picker").click(); break;
        case "go": navigate({ name: el.dataset.view, id: null }); break;
        case "open-pl": navigate({ name: "playlist", id }); break;
        case "open-album": navigate({ name: "album", id }); break;
        case "new-album": albumSheet(null); break;
        case "edit-album": { const a = getAlbums().find((x) => x.key === view.id); if (a) albumSheet(a); break; }
        case "delete-album": {
          const a = getAlbums().find((x) => x.key === view.id); if (!a) break;
          dialog({ title: "Quitar álbum", message: `Se quitará el álbum «${a.name}». Las canciones siguen en tu biblioteca.`, confirm: "Quitar álbum", danger: true }).then((ok) => {
            if (!ok) return;
            a.tracks.forEach((t) => { t.album = ""; persist(t); });
            navigate({ name: "albums", id: null }, false); toast("Álbum quitado");
          });
          break;
        }
        case "play-all": playList(shownQueue, false); break;
        case "shuffle-all": playList(shownQueue, true); break;
        case "play-all-lib": playList(sorted(tracks).map((t) => t.id), false); break;
        case "shuffle-all-lib": playList(sorted(tracks).map((t) => t.id), true); break;
        case "backup": backupSheet(); break;
        case "new-pl": newPlaylistFlow(null).then(() => { if (view.name === "playlists") render(); }); break;
        case "pend-view": showMissing(); break;
        case "pend-clear": dialog({ title: "Olvidar canciones que faltan", message: "Se quitarán los avisos de canciones pendientes. Las listas que ya tienes no cambian.", confirm: "Olvidar" }).then((ok) => { if (ok) { savePending({ items: [], liked: [], meta: {}, order: {} }); render(); } }); break;
        case "pl-keep-order": {
          const p = getPlaylist(view.id); if (!p) break;
          const shown = sortPl(playlistTracks(p), p.sort || "custom").map((t) => t.id);
          p.ids = [...shown, ...p.ids.filter((x) => !shown.includes(x))]; p.sort = "custom"; savePlaylists(); render(); toast("Este orden es ahora el de tu lista");
          break;
        }
        case "rename-pl": case "pl-photo": { const p = getPlaylist(view.id); if (p) editPlaylist(p); break; }
        case "delete-pl": { const p = getPlaylist(view.id); if (p) deletePlaylistFlow(p); break; }
      }
      return;
    }
    const row = e.target.closest("#content tr[data-id]");
    if (row) {
      const id = row.dataset.id;
      // En pantallas táctiles, o al pulsar el número/▶, se reproduce directamente
      if (selectMode) { selected.has(id) ? selected.delete(id) : selected.add(id); anchorId = id; if (!selected.size) selectMode = false; syncSelection(); return; }
      if (e.target.closest(".c-num") || matchMedia("(hover: none)").matches) { playTrack(id, shownQueue); return; }
      selectRow(id, e);
      return;
    }
    if (selected.size && e.target.closest("#content") && !e.target.closest("button,a,input,select")) clearSelection();
  });
  content.addEventListener("dblclick", (e) => {
    const row = e.target.closest("tr[data-id]");
    if (!row || e.target.closest("button")) return;
    const sel = window.getSelection && window.getSelection(); if (sel) sel.removeAllRanges();
    playTrack(row.dataset.id, shownQueue);
  });
  content.addEventListener("contextmenu", (e) => {
    const row = e.target.closest("tr[data-id]");
    if (!row) return;
    e.preventDefault();
    const id = row.dataset.id;
    if (!selected.has(id)) { selected = new Set([id]); anchorId = id; syncSelection(); }
    menuFor(id, { x: e.clientX, y: e.clientY });
  });

  document.addEventListener("keydown", (e) => {
    if (document.querySelector(".modal:not([hidden])")) return;
    if (e.target.closest("input,textarea,select")) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && content.querySelector("tr[data-id]")) { e.preventDefault(); selected = new Set(rowIds()); syncSelection(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const onBtn = !!e.target.closest("button");
    if (e.key === "Escape" && selected.size && $("menu").hidden) clearSelection();
    else if (e.key === "Enter" && selected.size && !onBtn) playTrack(selIds()[0], shownQueue);
    else if (e.key.toLowerCase() === "q") toggleQueue();
    else if (e.code === "Space" && !onBtn) { e.preventDefault(); togglePlay(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); e.shiftKey ? next(false) : (audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5)); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); e.shiftKey ? prev() : (audio.currentTime = Math.max(0, audio.currentTime - 5)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); audio.muted = false; audio.volume = Math.min(1, audio.volume + 0.05); settings.volume = audio.volume; saveSettings(); updateVolume(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); audio.volume = Math.max(0, audio.volume - 0.05); settings.volume = audio.volume; saveSettings(); updateVolume(); }
    else if (e.key.toLowerCase() === "m") { audio.muted = !audio.muted; updateVolume(); }
    else if (e.key === "/") { e.preventDefault(); navigate({ name: "search", id: null }); setTimeout(() => $("search-box") && $("search-box").focus(), 0); }
  });

  const dragHasFiles = (e) => !!(e.dataTransfer && e.dataTransfer.types && [...e.dataTransfer.types].includes("Files"));
  let dropTimer;
  const hideDrop = () => { clearTimeout(dropTimer); $("drop").hidden = true; };
  // Arrastres que empiezan dentro de la app (portadas, filas, listas, cola) nunca son "importar música"
  let internalDrag = false;
  document.addEventListener("dragstart", () => { internalDrag = true; }, true);
  document.addEventListener("dragend", () => { internalDrag = false; }, true);
  document.addEventListener("drop", () => { setTimeout(() => { internalDrag = false; }, 0); }, true);
  document.addEventListener("pointerdown", () => { internalDrag = false; }, true);
  const onDragOver = (e) => {
    if (internalDrag || !dragHasFiles(e)) return;
    e.preventDefault();
    try { e.dataTransfer.dropEffect = "copy"; } catch { /* nada */ }
    const dpl = view.name === "playlist" ? getPlaylist(view.id) : null;
    const dmsg = dpl ? `Suelta para añadir a «${dpl.name}» (y a tu biblioteca)` : "Suelta aquí tus canciones o carpetas";
    if ($("drop-msg").textContent !== dmsg) $("drop-msg").textContent = dmsg;
    $("drop").hidden = false; clearTimeout(dropTimer); dropTimer = setTimeout(hideDrop, 250);
  };
  async function collectDropped(entries, files) {
    if (!entries.some((en) => en.isDirectory)) return files; // archivos sueltos: se usan directamente
    const out = [];
    const walk = async (en) => {
      if (en.isFile) out.push(await new Promise((r, j) => en.file(r, j)));
      else if (en.isDirectory) {
        const rd = en.createReader(); let batch;
        do { batch = await new Promise((r, j) => rd.readEntries(r, j)); for (const c of batch) await walk(c); } while (batch.length);
      }
    };
    try { for (const en of entries) await walk(en); } catch (err) { console.error(err); return files; }
    return out.length ? out : files;
  }
  document.addEventListener("dragenter", onDragOver, true);
  document.addEventListener("dragover", onDragOver, true);
  document.addEventListener("drop", (e) => {
    if (internalDrag) { if (dragHasFiles(e)) e.preventDefault(); return; }
    if (!dragHasFiles(e)) return;
    e.preventDefault(); e.stopPropagation(); hideDrop();
    const dt = e.dataTransfer;
    const files = [...dt.files];
    const entries = [...(dt.items || [])].map((i) => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null)).filter(Boolean);
    if (entries.some((en) => en.isDirectory)) toast("Leyendo la carpeta…", 0);
    collectDropped(entries, files).then((list) => {
      if (!list.length) { toast("No he podido leer lo que has soltado. Si lo arrastras desde un ZIP, extráelo primero.", 5000); return; }
      const pid = view.name === "playlist" && getPlaylist(view.id) ? view.id : null;
      importFiles(list, pid ? { playlistId: pid } : {});
    });
  }, true);

  /* ---------- copia de seguridad: exportar e importar ---------- */
  const MAGIC = "SALAMENCE1";
  const trackKey = (t) => t.name + "|" + t.size;
  const nameOfKey = (k) => k.slice(0, k.lastIndexOf("|"));
  const PENDING_KEY = "salamence-pending";
  const getPending = () => Object.assign({ items: [], liked: [], meta: {}, order: {} }, LS.get(PENDING_KEY, {}));
  const savePending = (p) => LS.set(PENDING_KEY, p);
  const pendingCount = () => { const p = getPending(); return new Set([...p.items.map((i) => i.key), ...p.liked]).size; };
  const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  // Cuando se añade una canción cuyo "hueco" estaba esperando en una lista importada, se enlaza sola
  function resolvePendingFor(t) {
    const p = getPending();
    if (!p.items.length && !p.liked.length) return false;
    const key = trackKey(t), same = (k) => k === key || nameOfKey(k) === t.name;
    let hit = false;
    const rest = [];
    for (const it of p.items) {
      if (!same(it.key)) { rest.push(it); continue; }
      const pl = getPlaylist(it.pid); hit = true;
      if (pl && !pl.ids.includes(t.id)) {
        const ord = p.order[it.pid] || [], me = ord.findIndex(same);
        let at = pl.ids.length;
        if (me >= 0) { at = 0; pl.ids.forEach((id, i) => { const o = tmap.get(id), q = o ? ord.findIndex((k) => k === trackKey(o) || nameOfKey(k) === o.name) : -1; if (q >= 0 && q < me) at = i + 1; }); }
        pl.ids.splice(at, 0, t.id);
      }
    }
    const restLiked = p.liked.filter((k) => { if (same(k)) { liked.add(t.id); hit = true; return false; } return true; });
    if (!hit) return false;
    for (const k of Object.keys(p.meta)) if (same(k)) { const mt = p.meta[k]; if (mt.apply) { t.title = mt.title || t.title; t.artist = mt.artist ?? t.artist; t.album = mt.album ?? t.album; if (mt.track) t.track = mt.track; } delete p.meta[k]; }
    p.items = rest; p.liked = restLiked;
    for (const pid of Object.keys(p.order)) if (!rest.some((i) => i.pid === pid)) delete p.order[pid];
    savePending(p); savePlaylists(); saveLiked(); persist(t);
    return true;
  }
  function showMissing() {
    const p = getPending();
    const keys = [...new Set([...p.items.map((i) => i.key), ...p.liked])];
    const names = keys.map((k) => { const m = p.meta[k]; return m && m.title ? (m.artist ? `${m.title} — ${m.artist}` : m.title) : nameOfKey(k); });
    if (!names.length) { toast("No falta ninguna canción"); return; }
    dialog({ title: `Faltan ${plural(names.length, "canción", "canciones")}`, message: names.slice(0, 40).map((n) => "• " + n).join("\n") + (names.length > 40 ? `\n… y ${names.length - 40} más` : "") + "\n\nCopia esos archivos a este dispositivo y añádelos con «Añadir música».", confirm: "Entendido" });
  }

  async function buildBackup(withAudio) {
    const parts = [], blobs = [], keyOf = new Map();
    const add = (kind, ref, blob, type) => { parts.push({ kind, ref, size: blob.size, type: type || blob.type || "" }); blobs.push(blob); };
    const m = { app: "salamence-music", format: 1, exportedAt: new Date().toISOString(), withAudio, tracks: [], playlists: [], liked: [], parts };
    for (const t of tracks) {
      const key = trackKey(t); keyOf.set(t.id, key);
      m.tracks.push({ key, name: t.name, size: t.size, mime: t.file.type || "", title: t.title, artist: t.artist, album: t.album, track: t.track || 0, duration: t.duration, added: t.added, pokeId: t.pokeId || 0, customCover: !!t.customCover });
      if (withAudio) add("audio", key, t.file, t.file.type);
      if (t.cover && (withAudio || t.customCover)) add("cover", key, t.cover);
    }
    playlists.forEach((p, i) => {
      m.playlists.push({ name: p.name, sort: p.sort || "custom", keys: p.ids.map((id) => keyOf.get(id)).filter(Boolean) });
      const ph = plCovers.get(p.id); if (ph) add("plcover", String(i), ph.blob);
    });
    m.liked = [...liked].map((id) => keyOf.get(id)).filter(Boolean);
    const head = new TextEncoder().encode(JSON.stringify(m));
    const pre = new Uint8Array(14); pre.set(new TextEncoder().encode(MAGIC), 0); new DataView(pre.buffer).setUint32(10, head.length, true);
    return new Blob([pre, head, ...blobs], { type: "application/octet-stream" });
  }
  function blobToBase64(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = () => rej(r.error); r.readAsDataURL(blob); }); }
  async function saveBlobAs(blob, name) {
    if (isNative()) {
      const { Filesystem, Share } = window.Capacitor.Plugins;
      await Filesystem.writeFile({ path: name, data: await blobToBase64(blob), directory: "CACHE" });
      const { uri } = await Filesystem.getUri({ path: name, directory: "CACHE" });
      await Share.share({ title: "Copia de Salamence music", files: [uri], dialogTitle: "Enviar la copia" });
      return "shared";
    }
    if (window.showSaveFilePicker) {
      try {
        const fh = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: "Copia de Salamence music", accept: { "application/octet-stream": [".salamence"] } }] });
        const w = await fh.createWritable(); await w.write(blob); await w.close();
        return "saved";
      } catch (err) { if (err && err.name === "AbortError") return "cancel"; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 120000);
    return "download";
  }
  async function exportBackup(withAudio) {
    if (!tracks.length && !playlists.length) { toast("Todavía no hay nada que exportar"); return; }
    toast("Preparando la copia…", 0);
    try {
      const blob = await buildBackup(withAudio);
      const d = new Date(), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const name = `salamence-music-${withAudio ? "completa" : "listas"}-${stamp}.salamence`;
      const r = await saveBlobAs(blob, name);
      if (r === "cancel") { toast("Exportación cancelada"); return; }
      toast(`Copia creada: ${name} (${fmtSize(blob.size)}). ${r === "shared" ? "" : "Pásala a tu otro dispositivo e impórtala allí."}`, 8000);
    } catch (err) { console.error(err); toast("No se pudo crear la copia. Si es muy grande, prueba con «Listas, favoritos y datos».", 7000); }
  }
  async function readBackupHeader(file) {
    const head = new Uint8Array(await file.slice(0, 14).arrayBuffer());
    if (ascii(head.subarray(0, 10)) !== MAGIC) throw new Error("formato");
    const len = new DataView(head.buffer).getUint32(10, true);
    if (len <= 0 || len > 200e6) throw new Error("cabecera");
    const m = JSON.parse(new TextDecoder().decode(new Uint8Array(await file.slice(14, 14 + len).arrayBuffer())));
    if (m.app !== "salamence-music" || !Array.isArray(m.tracks)) throw new Error("formato");
    m.parts = m.parts || []; m.playlists = m.playlists || []; m.liked = m.liked || [];
    let off = 14 + len; m.parts.forEach((p) => { p.offset = off; off += p.size; });
    if (off > file.size) throw new Error("incompleto");
    return m;
  }
  async function importBackup(file, { applyMeta = true } = {}) {
    if (importing) { toast("Ya hay una importación en curso"); return; }
    let m;
    try { m = await readBackupHeader(file); } catch { toast("Ese archivo no es una copia completa de Salamence music (.salamence).", 6000); return; }
    importing = true;
    try {
      const partMap = new Map(m.parts.map((p) => [p.kind + "|" + p.ref, p]));
      const slice = (p, type) => file.slice(p.offset, p.offset + p.size, type || p.type);
      const localByKey = new Map(tracks.map((t) => [trackKey(t), t]));
      const byName = new Map(); tracks.forEach((t) => { if (!byName.has(t.name)) byName.set(t.name, []); byName.get(t.name).push(t); });
      const findLocal = (key, name) => localByKey.get(key) || ((a) => (a && a.length === 1 ? a[0] : null))(byName.get(name));
      const keyToId = new Map(), changed = new Set(), meta = {};
      let created = 0, matched = 0;
      for (let i = 0; i < m.tracks.length; i++) {
        const e = m.tracks[i]; let t = findLocal(e.key, e.name);
        if (!t) {
          const ap = partMap.get("audio|" + e.key);
          if (ap) {
            toast(`Importando canciones ${i + 1} de ${m.tracks.length}…`, 0);
            const cp = partMap.get("cover|" + e.key);
            const rec = { id: uid(), name: e.name, size: e.size, title: e.title, artist: e.artist || "", album: e.album || "", track: e.track || 0, duration: e.duration || 0, added: Date.now() + i, file: new File([slice(ap)], e.name, { type: e.mime || "audio/mpeg" }), cover: cp ? slice(cp) : null, pokeId: cp ? 0 : (e.pokeId || randPoke()), customCover: !!e.customCover };
            try { await DB.put(rec); t = addTrack(rec); created++; localByKey.set(trackKey(t), t); } catch (err) { console.error(err); }
          }
        } else {
          matched++;
          if (applyMeta) { t.title = e.title || t.title; t.artist = e.artist ?? t.artist; t.album = e.album ?? t.album; if (e.track) t.track = e.track; if (e.pokeId && !t.coverUrl) t.pokeId = e.pokeId; changed.add(t); }
          const cp = e.customCover ? partMap.get("cover|" + e.key) : null;
          if (cp) { applyCover(t, { file: slice(cp) }); changed.add(t); }
        }
        if (t) keyToId.set(e.key, t.id);
        else meta[e.key] = { title: e.title, artist: e.artist, album: e.album, track: e.track || 0, apply: !!applyMeta };
      }
      const pend = getPending(); let plNew = 0, plMerged = 0, likedN = 0;
      for (let idx = 0; idx < m.playlists.length; idx++) {
        const pl = m.playlists[idx];
        let target = playlists.find((p) => norm(p.name) === norm(pl.name));
        if (!target) { target = createPlaylist(pl.name); target.sort = pl.sort || "custom"; plNew++; } else plMerged++;
        let waiting = false;
        for (const key of pl.keys) {
          const id = keyToId.get(key);
          if (id) { if (!target.ids.includes(id)) target.ids.push(id); }
          else { waiting = true; if (!pend.items.some((x) => x.pid === target.id && x.key === key)) pend.items.push({ pid: target.id, key }); if (meta[key]) pend.meta[key] = meta[key]; }
        }
        if (waiting) pend.order[target.id] = pl.keys;
        const php = partMap.get("plcover|" + idx);
        if (php && !plCovers.has(target.id)) await setPlCover(target.id, slice(php));
      }
      for (const key of m.liked) {
        const id = keyToId.get(key);
        if (id) { if (!liked.has(id)) likedN++; liked.add(id); } else { if (!pend.liked.includes(key)) pend.liked.push(key); if (meta[key]) pend.meta[key] = meta[key]; }
      }
      savePlaylists(); saveLiked(); savePending(pend);
      await Promise.all([...changed].map(persist));
      importing = false;
      render(); cachePokes();
      const missing = pendingCount();
      const lines = [`${plural(plNew, "lista nueva", "listas nuevas")}${plMerged ? ` y ${plural(plMerged, "lista combinada", "listas combinadas")}` : ""}.`, m.withAudio ? `${plural(created, "canción nueva", "canciones nuevas")} añadidas desde la copia.` : `${plural(matched, "canción reconocida", "canciones reconocidas")} en este dispositivo.`, likedN ? `${plural(likedN, "favorito", "favoritos")} recuperados.` : ""];
      if (missing) lines.push(`Faltan ${plural(missing, "canción", "canciones")} en este dispositivo: copia esos archivos y añádelos con «Añadir música»; se enlazarán solos a sus listas.`);
      toast("Copia importada", 3000);
      dialog({ title: "Copia importada", message: lines.filter(Boolean).join("\n"), confirm: "Vale" });
    } catch (err) {
      console.error(err); toast("No se pudo importar la copia: " + (err && err.message ? err.message : "error desconocido"), 7000);
    } finally { importing = false; }
  }
  async function backupSheet() {
    const audioSize = tracks.reduce((a, t) => a + t.size, 0), n = pendingCount();
    await sheet({
      title: "Copia de seguridad", confirm: "Cerrar",
      mount(body) {
        body.innerHTML = `<div class="bk-block"><h4>Exportar</h4><p>Crea un archivo para llevarte tus datos a otro dispositivo, por ejemplo del PC al móvil.</p>
          <label class="bk-opt"><input type="radio" name="bk-mode" value="lists" checked><span><b>Listas, favoritos y datos</b><small>Archivo pequeño. Copia las canciones por tu cuenta (cable, nube…); se enlazan solas a las listas al añadirlas.</small></span></label>
          <label class="bk-opt"><input type="radio" name="bk-mode" value="full"><span><b>Todo, con las canciones</b><small>Incluye los audios (unos ${fmtSize(audioSize)}). Puede tardar y ocupar mucho.</small></span></label>
          <button type="button" class="primary-button" id="bk-export"><span class="ic">${icon("upload", 18)}</span>Exportar</button></div>
          <div class="bk-block"><h4>Importar</h4><p>Elige un archivo .salamence creado con esta app. Se combina con lo que ya tienes y no se borra nada.</p>
          <label class="bk-check"><input type="checkbox" id="bk-meta" checked> Aplicar títulos, artistas y álbumes de la copia</label>
          <button type="button" class="ghost-button" id="bk-import"><span class="ic">${icon("download", 18)}</span>Elegir archivo…</button><input type="file" id="bk-file" hidden></div>
          ${n ? `<div class="bk-block"><p>Faltan ${plural(n, "canción", "canciones")} de listas importadas.</p><button type="button" class="ghost-button sm" id="bk-missing">Ver cuáles</button></div>` : ""}<p class="ver">Salamence music · versión ${APP_VERSION}</p>`;
        const close = () => body.closest(".modal").querySelector("[data-x]").click();
        body.querySelector("#bk-export").onclick = async (ev) => {
          const b = ev.currentTarget; b.disabled = true;
          try { await exportBackup(body.querySelector("input[name=bk-mode]:checked").value === "full"); } finally { b.disabled = false; }
        };
        body.querySelector("#bk-import").onclick = () => body.querySelector("#bk-file").click();
        body.querySelector("#bk-file").onchange = async (ev) => { const f = ev.target.files[0]; ev.target.value = ""; if (!f) return; const apply = body.querySelector("#bk-meta").checked; close(); await importBackup(f, { applyMeta: apply }); };
        const miss = body.querySelector("#bk-missing"); if (miss) miss.onclick = () => { close(); showMissing(); };
        return () => true;
      }
    });
  }
  $("backup-btn").onclick = backupSheet;

  /* ---------- reproductor a pantalla completa y navegación (móvil) ---------- */
  const fp = $("fullplayer");
  let fpOpen = false, skipPop = false;
  const isMobile = () => matchMedia("(max-width: 760px)").matches;
  function syncFull() {
    const t = tmap.get(curId), cv = t ? coverOf(t) : { src: LOGO, real: false };
    $("fp-title").textContent = t ? t.title : "Elige una canción";
    $("fp-artist").textContent = t ? (t.artist || "Artista desconocido") : "";
    if (!$("fp-art").src.endsWith(cv.src)) $("fp-art").src = cv.src;
    $("fp-art").classList.toggle("poke", !cv.real);
    const on = !!curId && liked.has(curId);
    $("fp-like").classList.toggle("on", on); $("fp-like").innerHTML = icon("heart", 26, on);
    $("fp-play").innerHTML = icon(audio.paused ? "play" : "pause", 28, true);
    $("fp-shuffle").classList.toggle("active", settings.shuffle);
    $("fp-repeat").classList.toggle("active", settings.repeat !== "off");
    $("fp-repeat").innerHTML = icon(settings.repeat === "one" ? "repeat1" : "repeat", 22);
  }
  function syncFullProgress() {
    const t = tmap.get(curId);
    const d = Number.isFinite(audio.duration) && audio.duration ? audio.duration : (t ? t.duration : 0);
    const p = d ? Math.min(1000, (audio.currentTime / d) * 1000) : 0;
    $("fp-elapsed").textContent = fmt(audio.currentTime || 0); $("fp-duration").textContent = fmt(d);
    $("fp-seek").value = p; $("fp-seek").style.setProperty("--p", p / 10 + "%");
    document.querySelector(".player").style.setProperty("--pp", p / 10 + "%");
    if ("mediaSession" in navigator && navigator.mediaSession.setPositionState && Number.isFinite(audio.duration) && audio.duration > 0) {
      try { navigator.mediaSession.setPositionState({ duration: audio.duration, position: Math.min(audio.currentTime, audio.duration), playbackRate: audio.playbackRate || 1 }); } catch { /* no soportado */ }
    }
  }
  function openFull() { if (fpOpen) return; fpOpen = true; fp.hidden = false; window.history.pushState({ fp: 1 }, ""); syncFull(); syncFullProgress(); }
  function closeFull(fromPop) { if (!fpOpen) return; fpOpen = false; fp.hidden = true; if (!fromPop) { skipPop = true; window.history.back(); } }
  window.addEventListener("popstate", () => {
    if (skipPop) { skipPop = false; return; }
    if (fpOpen) { closeFull(true); return; }
    if (isMobile() && navPos > 0) go(-1);
  });
  document.querySelector(".now-playing").addEventListener("click", (e) => { if (!isMobile() || !curId || e.target.closest("button")) return; openFull(); });
  $("fp-close").onclick = () => closeFull(false);
  $("fp-play").onclick = togglePlay; $("fp-prev").onclick = prev; $("fp-next").onclick = () => next(false);
  $("fp-shuffle").onclick = () => $("shuffle").click(); $("fp-repeat").onclick = () => $("repeat").click(); $("fp-like").onclick = () => $("like-current").click();
  $("fp-queue").onclick = () => { closeFull(false); setTimeout(() => $("queue-btn").click(), 50); };
  $("fp-seek").oninput = () => { if (audio.duration) audio.currentTime = (Number($("fp-seek").value) / 1000) * audio.duration; $("fp-seek").style.setProperty("--p", Number($("fp-seek").value) / 10 + "%"); };
  $("fp-prev").innerHTML = icon("prev", 24, true); $("fp-next").innerHTML = icon("next", 24, true); $("fp-shuffle").innerHTML = icon("shuffle", 22);
  let touchY = null;
  fp.addEventListener("touchstart", (e) => { touchY = e.target.closest("input") ? null : e.touches[0].clientY; }, { passive: true });
  fp.addEventListener("touchend", (e) => { if (touchY !== null && e.changedTouches[0].clientY - touchY > 90) closeFull(false); touchY = null; }, { passive: true });
  if (matchMedia("(hover: none)").matches) document.body.classList.add("touch");

  /* ---------- orden personalizado: arrastrar canciones y listas ---------- */
  let rowDrag = null, sideDrag = null;
  const dropSide = (e, el) => { const r = el.getBoundingClientRect(); return e.clientY > r.top + r.height / 2 ? "after" : "before"; };
  const clearMarks = () => document.querySelectorAll(".drop-before,.drop-after,.dragging").forEach((x) => x.classList.remove("drop-before", "drop-after", "dragging"));
  const mark = (el, side) => { document.querySelectorAll(".drop-before,.drop-after").forEach((x) => x.classList.remove("drop-before", "drop-after")); el.classList.add(side === "after" ? "drop-after" : "drop-before"); };
  content.addEventListener("dragstart", (e) => {
    const tr = e.target.closest && e.target.closest("tr[data-reorder]"); if (!tr) return;
    const id = tr.dataset.id; rowDrag = selected.has(id) && selected.size > 1 ? selIds() : [id];
    e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", "reorden");
    rowDrag.forEach((i) => { const r = content.querySelector(`tr[data-id="${i}"]`); if (r) r.classList.add("dragging"); });
  });
  content.addEventListener("dragover", (e) => {
    if (!rowDrag) return; const tr = e.target.closest("tr[data-reorder]"); if (!tr) return;
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; mark(tr, dropSide(e, tr));
  });
  content.addEventListener("drop", (e) => {
    if (!rowDrag) return; const tr = e.target.closest("tr[data-reorder]"); if (!tr) return;
    e.preventDefault(); const after = dropSide(e, tr) === "after", mv = rowDrag; rowDrag = null; clearMarks();
    reorderPlaylist(view.id, mv, tr.dataset.id, after);
  });
  content.addEventListener("dragend", () => { rowDrag = null; clearMarks(); });
  const pll = $("playlist-list");
  pll.addEventListener("dragstart", (e) => {
    const b = e.target.closest(".pl-link"); if (!b) return;
    sideDrag = b.dataset.id; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", "lista"); b.classList.add("dragging");
  });
  pll.addEventListener("dragover", (e) => {
    if (!sideDrag) return; const b = e.target.closest(".pl-link"); if (!b) return;
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; mark(b, dropSide(e, b));
  });
  pll.addEventListener("drop", (e) => {
    if (!sideDrag) return; const b = e.target.closest(".pl-link"); if (!b) return;
    e.preventDefault(); const after = dropSide(e, b) === "after", id = sideDrag; sideDrag = null; clearMarks();
    movePlaylist(id, b.dataset.id, after);
  });
  pll.addEventListener("dragend", () => { sideDrag = null; clearMarks(); });
  pll.addEventListener("contextmenu", (e) => { const b = e.target.closest(".pl-link"); if (!b) return; e.preventDefault(); openPlaylistMenu(b.dataset.id, { x: e.clientX, y: e.clientY }); });
  content.addEventListener("contextmenu", (e) => {
    const card = e.target.closest('.album-card[data-act="open-pl"]');
    if (card) { e.preventDefault(); openPlaylistMenu(card.dataset.id, { x: e.clientX, y: e.clientY }); }
  });
  $("sort-playlists").onclick = (e) => {
    if (playlists.length < 2) { toast("Necesitas al menos dos listas para ordenarlas"); return; }
    showMenu([
      { heading: "Ordenar mis listas" },
      { label: "Por nombre (A–Z)", icon: "sort", fn: () => sortPlaylists("az") },
      { label: "Por nombre (Z–A)", icon: "sort", fn: () => sortPlaylists("za") },
      { label: "Con más canciones primero", icon: "sort", fn: () => sortPlaylists("size") },
      { label: "Invertir el orden actual", icon: "sort", fn: () => sortPlaylists("reverse") },
      { sep: true }, { heading: "También puedes arrastrarlas, o clic derecho." }
    ], e.currentTarget);
  };

  /* ---------- arranque ---------- */
  async function init() {
    audio.volume = settings.volume; updateModes(); updateVolume(); updatePlayState(); updateProgress(); updateLikeCurrent();
    render();
    try {
      const rows = await DB.all();
      rows.sort((a, b) => a.added - b.added).forEach(addTrack);
      const pokes = await DB.allPokes().catch(() => []);
      pokes.forEach((p) => pokeUrls.set(p.id, URL.createObjectURL(p.blob)));
      const plc = await DB.allPlCovers().catch(() => []);
      plc.forEach((c) => { if (getPlaylist(c.id)) plCovers.set(c.id, { blob: c.blob, url: URL.createObjectURL(c.blob) }); });
      for (const t of tracks) if (!t.coverUrl && !t.pokeId) { t.pokeId = t.album ? hashPoke(t.album) : randPoke(); persist(t); }
      playlists.forEach((p) => { p.ids = p.ids.filter((id) => tmap.has(id)); });
      liked = new Set([...liked].filter((id) => tmap.has(id)));
      ctx = sorted(tracks).map((t) => t.id); buildOrder(null);
      userQueue = userQueue.filter((id) => tmap.has(id)); saveQueue();
      const last = LS.get("salamence-last", null);
      if (last && tmap.has(last.id)) {
        const t = tmap.get(last.id); curId = t.id; curUrl = URL.createObjectURL(t.file); audio.src = curUrl;
        audio.addEventListener("loadedmetadata", () => { if (last.time && last.time < audio.duration) audio.currentTime = last.time; }, { once: true });
        buildOrder(curId); setCurrentUI();
      }
      render(); cachePokes(); renderQueue();
    } catch (err) {
      console.error(err);
      toast("No se pudo abrir el almacenamiento de música. Si usas el navegador, evita el modo incógnito.", 6000);
    }
  }
  $("current-art").onerror = () => { if (!$("current-art").src.endsWith(LOGO)) $("current-art").src = LOGO; };
  $("fp-art").onerror = () => { if (!$("fp-art").src.endsWith(LOGO)) $("fp-art").src = LOGO; };
  // El saludo se mantiene al día aunque la app lleve horas abierta
  const refreshGreeting = () => { const g = $("greeting"); if (g) g.textContent = greeting(); };
  setInterval(refreshGreeting, 30000);
  document.addEventListener("visibilitychange", refreshGreeting);
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    const hadSW = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("sw.js").catch(() => {});
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadSW) return;
      if (audio.paused) location.reload(); else toast("Hay una versión nueva de la app: se aplicará al volver a abrirla", 7000);
    });
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  init();
})();
