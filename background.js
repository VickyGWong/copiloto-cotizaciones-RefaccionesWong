/* Copiloto Wong - background.js (Firefox MV2) */
(() => {
  const OVERLAY_ID = "cw-print-header";
  const STYLE_ID = "cw-print-style";

  // ---------------------------
  // Utilidades tab
  // ---------------------------
  function getActiveTab() {
    return browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => (tabs && tabs[0]) || null)
      .catch(() => null);
  }

  function safeString(v) {
    return (v == null ? "" : String(v)).trim();
  }

  function escapeHtml(s) {
    return safeString(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------------------------
  // Normalización robusta impresión
  // ---------------------------
  function normalizePrintData(datos) {
    const d = datos || {};
    const portal = safeString(d.portal).toLowerCase();

    let aseguradora =
      safeString(d.aseguradora) ||
      safeString(d.compania) ||
      safeString(d.insurer) ||
      "";

    if (!aseguradora) {
      if (portal.includes("chubb")) aseguradora = "CHUBB";
      else if (portal.includes("qualitas")) aseguradora = "QUALITAS";
    }

    const siniestro =
      safeString(d.siniestro) ||
      safeString(d.numeroSiniestro) ||
      safeString(d.claim) ||
      "";

    const vin =
      safeString(d.vin) ||
      safeString(d.chasis) ||
      safeString(d.serie) ||
      "";

    const placas =
      safeString(d.placas) ||
      safeString(d.plate) ||
      "";

    const creacion =
      safeString(d.creacion) ||
      safeString(d.fechaCreacionCotizacion) ||
      safeString(d.fechaCreacion) ||
      "";

    const vencimiento =
      safeString(d.vencimiento) ||
      safeString(d.fechaVencimientoCotizacion) ||
      safeString(d.fechaVencimiento) ||
      "";

    const destino =
      safeString(d.destino) ||
      [safeString(d.taller), safeString(d.ciudad), safeString(d.estado)]
        .filter(Boolean)
        .join(" · ");

    const vehiculo =
      safeString(d.vehiculo) ||
      [safeString(d.marca), safeString(d.modelo), safeString(d.anio)]
        .filter(Boolean)
        .join(" · ");

    return {
      aseguradora,
      siniestro,
      vin,
      placas,
      creacion,
      vencimiento,
      destino,
      vehiculo,
    };
  }

function buildPrintCSS() {
    return `
#cw-print-header{
  position: fixed;
  left: -10000px;
  top: -10000px;
  width: calc(100vw - 24px);
  max-width: calc(100vw - 24px);
  visibility: hidden;
  pointer-events: none;
  background: #fff;
  font-family: Arial, sans-serif;
  font-size: 18px;
  border-bottom: 1px solid #000;
  padding: 10px 12px;
  z-index: 2147483647;
  box-sizing: border-box;
}

#cw-print-header .cw-k{ font-weight:700; }
#cw-print-header .cw-hide{ display:none !important; }

#cw-top-row{
  display:flex;
  gap:12px;
  align-items:baseline;
  flex-wrap:nowrap;
  width:100%;
  min-width:0;
  overflow:hidden;
  box-sizing:border-box;
}

#cw-company{
  flex: 1 1 auto;
  min-width: 140px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

#cw-siniestro{
  flex: 0 0 auto;
  min-width: 0;
  white-space:nowrap;
  overflow:visible;
  text-overflow:clip;
}

#cw-dates{
  flex: 0 0 auto;
  white-space:nowrap;
  font-size:14px;
}

#cw-top-row.cw-top-wrap{ flex-wrap:wrap !important; }
#cw-top-row.cw-top-wrap #cw-company{ flex: 1 1 100%; min-width:0; }
#cw-top-row.cw-top-wrap #cw-siniestro{ flex: 1 1 100%; }
#cw-top-row.cw-top-wrap #cw-siniestro-val{ word-break:break-all; }

#cw-print-header .cw-row{
  display:grid;
  grid-template-columns: 1fr auto;
  gap:10px 16px;
  align-items:baseline;
  margin-top:6px;
}
#cw-print-header .cw-left, #cw-print-header .cw-right{ white-space:nowrap; }
#cw-print-header .cw-right{ text-align:right; }

@media print{
  #cw-print-header{
    left: 0;
    top: 0;
    right: 0;
    width: 100%;
    max-width: 100%;
    visibility: visible;
    pointer-events: auto;
  }
  /* Cambio clave: Ocultamos el contenido pesado del portal solo al imprimir */
  #cphBody_tbcAnswerQuotation_tabImages, 
  .collapsiblePanel[data-cw-hide-print="1"] { 
    display:none !important; 
  }
  body{ margin-top: 140px !important; }
}
`.trim();
  }

  function buildPrintHTML(norm) {
    const aseguradora = escapeHtml(norm.aseguradora);
    const siniestro = escapeHtml(norm.siniestro);
    const destino = escapeHtml(norm.destino);
    const vehiculo = escapeHtml(norm.vehiculo);
    const placas = escapeHtml(norm.placas);
    const vin = escapeHtml(norm.vin);
    const creacion = escapeHtml(norm.creacion);
    const vencimiento = escapeHtml(norm.vencimiento);

    return `
<div class="cw-wrap">
  <div id="cw-top-row">
    <div id="cw-company">
      <span class="cw-k">Compañía:</span> <span id="cw-company-val">${aseguradora || "—"}</span>
    </div>
    <div id="cw-siniestro">
      <span class="cw-k">Sin.:</span> <span id="cw-siniestro-val">${siniestro || "—"}</span>
    </div>
    <div id="cw-dates">
      <span id="cw-cre-item" data-full="${creacion}">
        <span class="cw-k">Creación:</span> <span id="cw-cre-val">${creacion || "—"}</span>
      </span>
      <span id="cw-ven-item" data-full="${vencimiento}" style="margin-left:10px;">
        <span class="cw-k">Vencimiento:</span> <span id="cw-ven-val">${vencimiento || "—"}</span>
      </span>
    </div>
  </div>

  <div class="cw-row">
    <div class="cw-left"><span class="cw-k">Taller:</span> ${destino || "—"}</div>
    <div class="cw-right"><span class="cw-k">VIN:</span> ${vin || "—"}</div>
  </div>

  <div class="cw-row">
    <div class="cw-left"><span class="cw-k">Vehículo:</span> ${vehiculo || "—"}</div>
    <div class="cw-right"><span class="cw-k">Placas:</span> ${placas || "—"}</div>
  </div>
</div>`.trim();
  }

  async function injectOrUpdatePrintOverlay(tabId, datos) {
    const norm = normalizePrintData(datos);
    const css = buildPrintCSS();
    const html = buildPrintHTML(norm);

    const code = `
(() => {
  const styleId = ${JSON.stringify(STYLE_ID)};
  const headerId = ${JSON.stringify(OVERLAY_ID)};
  const cssText  = ${JSON.stringify(css)};
  const htmlText = ${JSON.stringify(html)};

  let st = document.getElementById(styleId);
  if (!st) {
    st = document.createElement("style");
    st.id = styleId;
    document.documentElement.appendChild(st);
  }
  st.textContent = cssText;

  let box = document.getElementById(headerId);
  if (!box) {
    box = document.createElement("div");
    box.id = headerId;
    document.documentElement.appendChild(box);
  }
  try {
    const panels = Array.from(document.querySelectorAll(".collapsiblePanel"));
    for (const p of panels) {
      const header = p.querySelector("div");
      const t = (header?.textContent || "").toLowerCase();
      if (t.includes("panel de imagenes") || t.includes("panel de imágenes")) {
        p.setAttribute("data-cw-hide-print", "1");
        break;
      }
    }
  } catch (_) {}

  box.innerHTML = htmlText;

  function shortDate(raw) {
    const s = String(raw || "").trim();
    if (!s) return "";
    const m = s.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})\\s+(\\d{1,2}):(\\d{2})/);
    if (!m) return s;
    const dd = String(m[1]).padStart(2,"0");
    const mm = String(m[2]).padStart(2,"0");
    const yy = String(m[3]).slice(-2);
    const hh = String(m[4]).padStart(2,"0");
    const mi = String(m[5]).padStart(2,"0");
    return dd + "/" + mm + "/" + yy + " " + hh + ":" + mi;
  }

  function isOverflow(el) {
    if (!el) return false;
    return (el.scrollWidth - el.clientWidth) > 2;
  }

  function adjustTopRow() {
    const top = document.getElementById("cw-top-row");
    const creItem = document.getElementById("cw-cre-item");
    const venItem = document.getElementById("cw-ven-item");
    const creVal  = document.getElementById("cw-cre-val");
    const venVal  = document.getElementById("cw-ven-val");
    if (!top || !creItem || !venItem || !creVal || !venVal) return;

    top.classList.remove("cw-top-wrap");
    creItem.classList.remove("cw-hide");
    venItem.classList.remove("cw-hide");

    const creFull = creItem.getAttribute("data-full") || "";
    const venFull = venItem.getAttribute("data-full") || "";
    creVal.textContent = creFull || "—";
    venVal.textContent = venFull || "—";

    if (!isOverflow(top)) return;

    if (creFull) creVal.textContent = shortDate(creFull) || "—";
    if (venFull) venVal.textContent = shortDate(venFull) || "—";
    if (!isOverflow(top)) return;

    creItem.classList.add("cw-hide");
    if (!isOverflow(top)) return;

    venItem.classList.add("cw-hide");
    if (!isOverflow(top)) return;

    top.classList.add("cw-top-wrap");
    
    function _cwIsTruncated(el) {
      if (!el) return false;
      return (el.scrollWidth - el.clientWidth) > 2;
    }

    function _cwAplicarReglaOcultarVencimientoPorRecorte() {
      const company = document.getElementById("cw-company");       // o tu id real
      const siniestro = document.getElementById("cw-siniestro");   // o tu id real
      const venItem = document.getElementById("cw-ven-item");      // contenedor de vencimiento
      if (!venItem) return;

      if (_cwIsTruncated(company) || _cwIsTruncated(siniestro)) {
        venItem.classList.add("cw-hide");   // o venItem.style.display="none"
      } else {
        venItem.classList.remove("cw-hide");
      }
    }

    // Ejecuta después de pintar
    requestAnimationFrame(_cwAplicarReglaOcultarVencimientoPorRecorte);
  }

  function scheduleAdjust() {
    setTimeout(() => { try { adjustTopRow(); } catch(e){} }, 0);
  }

  scheduleAdjust();

  if (!window.__cw_print_header_mql__) {
    window.__cw_print_header_mql__ = true;
    const mql = window.matchMedia ? window.matchMedia("print") : null;
    if (mql) {
      if (mql.matches) scheduleAdjust();
      const handler = (e) => { if (e.matches) scheduleAdjust(); };
      if (mql.addEventListener) mql.addEventListener("change", handler);
      else if (mql.addListener) mql.addListener(handler);
    }
    window.addEventListener("beforeprint", scheduleAdjust);
  }
})();`.trim();

    return browser.tabs.executeScript(tabId, { code });
  }

  function clearPrintOverlay(tabId) {
    const code = `
(() => {
  const ov = document.getElementById(${JSON.stringify(OVERLAY_ID)});
  if (ov) ov.remove();
  const st = document.getElementById(${JSON.stringify(STYLE_ID)});
  if (st) st.remove();
})();`.trim();

    return browser.tabs.executeScript(tabId, { code });
  }

  // ---------------------------
  // Google Vision helper
  // ---------------------------
  const VISION_ENDPOINT = (apiKey) =>
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;

  async function callVisionAnnotate({ apiKey, requests }) {
    const res = await fetch(VISION_ENDPOINT(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const snippet = (txt || "").slice(0, 600);
      const err = new Error(`Vision API error ${res.status}: ${snippet}`);
      err.status = res.status;
      err.raw = snippet;
      throw err;
    }

    return res.json();
  }

  async function resolveVisionApiKey(fallbackKey) {
    const stored = await browser.storage.local.get("visionApiKey").catch(() => ({}));
    const key = safeString(stored?.visionApiKey) || safeString(fallbackKey);
    return key || null;
  }

  // ---------------------------
  // Listener ÚNICO (acciones + vision)
  // ---------------------------
  browser.runtime.onMessage.addListener((message, sender) => {
    // 1) Vision annotate
    if (message && message.type === "COPILOTO_VISION_ANNOTATE") {
      return (async () => {
        try {
          const imagesBase64 = Array.isArray(message?.payload?.imagesBase64)
            ? message.payload.imagesBase64
            : [];

          if (!imagesBase64.length) {
            return { ok: false, error: "imagesBase64 vacío o inválido" };
          }

          const apiKey = await resolveVisionApiKey(message?.payload?.apiKey);
          if (!apiKey) {
            return { ok: false, error: "Falta visionApiKey en storage.local (y no se recibió fallback)" };
          }

          const batchSize = 6;
          const allResponses = [];

          for (let i = 0; i < imagesBase64.length; i += batchSize) {
            const slice = imagesBase64.slice(i, i + batchSize);

            const requests = slice.map((b64) => ({
              image: { content: b64 },
              features: [{ type: "TEXT_DETECTION" }, { type: "LABEL_DETECTION" }],
            }));

            const data = await callVisionAnnotate({ apiKey, requests });
            allResponses.push(data);
          }

          return { ok: true, data: allResponses };
        } catch (e) {
          return {
            ok: false,
            error: String(e?.message || e),
            status: e?.status || null,
          };
        }
      })();
    }

    // 2) Acciones overlay / relay
    const action = message && message.action;

    if (action === "analizarSolicitud") {
      return (async () => {
        const tab = sender && sender.tab ? sender.tab : await getActiveTab();
        if (!tab || !tab.id) return {};
        try {
          const resp = await browser.tabs.sendMessage(tab.id, { action: "analizarSolicitud" });
          return resp || {};
        } catch (e) {
          console.warn("[Copiloto][BG] No se pudo leer del content script:", e);
          return {};
        }
      })();
    }

    if (action === "cw_prepare_print_overlay") {
      return (async () => {
        const tab = sender && sender.tab ? sender.tab : await getActiveTab();
        if (!tab || !tab.id) return { ok: false };

        const datos = (message && message.datos) ? message.datos : {};
        try {
          await injectOrUpdatePrintOverlay(tab.id, datos);
          return { ok: true };
        } catch (e) {
          console.warn("[Copiloto][BG] Error preparando overlay impresión:", e);
          return { ok: false, error: String(e?.message || e) };
        }
      })();
    }

    if (action === "cw_clear_print_overlay") {
      return (async () => {
        const tab = sender && sender.tab ? sender.tab : await getActiveTab();
        if (!tab || !tab.id) return { ok: false };
        try {
          await clearPrintOverlay(tab.id);
          return { ok: true };
        } catch (e) {
          console.warn("[Copiloto][BG] Error limpiando overlay impresión:", e);
          return { ok: false, error: String(e?.message || e) };
        }
      })();
    }

    return undefined;
  });
})();
