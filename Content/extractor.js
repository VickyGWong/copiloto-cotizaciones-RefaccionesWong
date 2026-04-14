// extractor.js — versión estable (Inpart + Chubb + Qualitas) con fotos (URLs) listas para OCR
// IMPORTANTE: Este archivo NO debe llamar a Vision API. Solo extrae datos + lista de fotos.
// La llamada a Vision debe ejecutarse en background.js (Ruta 1 segura).

if (!window.__copiloto_inyectado__) {
  window.__copiloto_inyectado__ = true;
  console.log("[Copiloto] extractor.js INYECTADO en", location.href);

  const N = (s) => (s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const txt = (el) => N(el?.textContent || el?.value || "");

  // Normaliza URLs relativas y deja intactos data:image/...
  const resolveUrl = (src) => {
    if (!src) return "";
    try {
      return new URL(src, window.location.href).href;
    } catch (e) {
      return src;
    }
  };

  // ------------------------------------------------------
  // Limpieza general de textos visibles (marca / modelo)
  // ------------------------------------------------------
  function cleanDisplayText(s) {
    return (s || "")
      .replace(/[.,]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ======================================================
  //  INPART (AUDATEX)
  // ======================================================
  async function leerInpart(opts = {}) {
    try {
      if (!location.href.includes("inpart.audatex.com.mx")) return null;

      const val = (id) => {
        const el = document.getElementById(id);
        return el ? N(el.textContent || el.value) : "";
      };

    // Busca un valor de fecha por texto visible (fallback robusto)
    function findDateByLabel(labelRe) {
      const candidates = Array.from(document.querySelectorAll("td, span, label, div"));
      for (const el of candidates) {
        const t = N(el.textContent || "");
        if (!t) continue;
        if (!labelRe.test(t)) continue;

        // 1) Hermano inmediato (muy común en tablas)
        const sib = el.nextElementSibling;
        if (sib) {
          const v = N(sib.textContent || "");
          if (v) return v;
        }

        // 2) Misma fila (tr) con 2+ celdas
        const tr = el.closest("tr");
        if (tr) {
          const tds = Array.from(tr.querySelectorAll("td"));
          if (tds.length >= 2) {
            // intenta buscar el primer td que no sea el label
            for (let i = 0; i < tds.length; i++) {
              const v = N(tds[i].textContent || "");
              if (v && !labelRe.test(v)) return v;
            }
          }
        }
      }
      return "";
    }

      const fechaCreacionCotizacion = val("cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_lblDateOfQuotationBegin");

      const aseguradora = val("cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_lblInsurerName");
      const siniestro  = val("cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_lblClaimNumber");
      const placas     = val("cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_lblLicensePlate");

      const vin =
        val("cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_lblVIN") ||
        val("cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_lblChasis") ||
        val("cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_lblVehicleChasis");

      const marca = val("cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_lblVehicleBranch");
      const armadora = val("cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_lblVehicleManufacturer");
      const descripcion = val("cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_lblVehicleDescription");

      const modeloRaw = val("cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_lblVehicleModel");
      const anioModelo = val("cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_lblYearModel");
      const anioFab = val("cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_lblYearManufacture");

      const taller = val("cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_ucQuotationBodyShopDetails_lblBodyshop");
      const ciudad = val("cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_ucQuotationBodyShopDetails_lblCity");
      const estado = val("cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_ucQuotationBodyShopDetails_lblState");

      const bad = [
        "Part Serial Number",
        "Seleccionar Todos",
        "Cargando...",
        "Descripción Pieza",
        "Original",
      ];
      const isOk = (s) => !!s && !bad.includes(N(s));

      let marcaFinal = "";
      if (isOk(marca)) marcaFinal = marca;
      else if (isOk(armadora)) marcaFinal = armadora;
      else if (isOk(descripcion)) marcaFinal = descripcion.split("/")[0];

      let modeloFinal = "";
      if (isOk(descripcion)) {
        const partes = descripcion.split("/");
        modeloFinal = partes.length > 1 ? N(partes.slice(1).join(" / ")) : descripcion;
      } else if (isOk(modeloRaw)) {
        modeloFinal = modeloRaw;
      }

      let anioFinal = "";
      if (isOk(anioModelo)) anioFinal = anioModelo;
      else if (isOk(anioFab)) anioFinal = anioFab;
      else if (isOk(modeloRaw)) anioFinal = modeloRaw;

      // ------------------------------------------------------
      // Bind de botones de impresión: SOLO UNA VEZ
      // (Evita que cada "Analizar solicitud" agregue listeners nuevos)
      // ------------------------------------------------------
      if (!window.__cw_print_buttons_bound__) {
        window.__cw_print_buttons_bound__ = true;

        document.getElementById("btnPrepararImpresion")?.addEventListener("click", async () => {
          const btn = document.getElementById("btnPrepararImpresion");
          const btnOff = document.getElementById("btnQuitarImpresion");

          try {
            if (btn) {
              btn.disabled = true;
              btn.textContent = "Preparando…";
            }

            // Estas funciones deben existir en tu script (si no existen, dará error al click).
            await prepararImpresionEnPagina();

            if (btn) btn.textContent = "Preparación lista (Ctrl+P)";
            if (btnOff) btnOff.style.display = "";
          } catch (e) {
            console.error("[Copiloto] preparar impresión error:", e);
            if (btn) btn.textContent = "Preparar impresión (Ctrl+P)";
            alert("No fue posible preparar la impresión. Revisa consola.");
          } finally {
            if (btn) btn.disabled = false;
          }
        });

        document.getElementById("btnQuitarImpresion")?.addEventListener("click", async () => {
          const btnOff = document.getElementById("btnQuitarImpresion");
          try {
            if (btnOff) btnOff.disabled = true;

            await quitarImpresionEnPagina();

            if (btnOff) {
              btnOff.style.display = "none";
              btnOff.disabled = false;
            }

            const btn = document.getElementById("btnPrepararImpresion");
            if (btn) btn.textContent = "Preparar impresión (Ctrl+P)";
          } catch (e) {
            console.error("[Copiloto] quitar impresión error:", e);
            alert("No fue posible quitar el bloque de impresión. Revisa consola.");
          } finally {
            if (btnOff) btnOff.disabled = false;
          }
        });
      }

      // ------------------ FOTOS INPART --------------------
      // NOTA: usar function declaration para evitar ReferenceError por hoisting
    async function extractInpartPhotos(mode = "full") {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      // 1) Solo en FULL: expandir panel
      if (mode === "full") {
        try { ensureInpartImagePanelExpanded(); } catch (e) {}
        await sleep(250);

        // 2) Solo en FULL: scroll para forzar carga
        try { scrollInpartImagePanelToLoadAll(); } catch (e) {}
      }

      // 3) Solo en FULL: reintentos por render tardío
      if (mode === "full") {
        let lastCount = -1;
        for (let attempt = 0; attempt < 6; attempt++) {
          const panel = findInpartImagePanel();
          if (!panel) return [];
          const content = panel.querySelector(".content") || panel;

          const imgs = [
            ...Array.from(content.querySelectorAll("img[src]")),
            ...Array.from(content.querySelectorAll("input[type='image'][src]")),
          ];

          const countNow = imgs.length;
          if (countNow > 0 && countNow === lastCount) break;
          lastCount = countNow;

          await sleep(350);
          try { scrollInpartImagePanelToLoadAll(); } catch (_) {}
        }
      }

      const LIGHT_MODE = true;

      if (!LIGHT_MODE) {
        try { ensureInpartImagePanelExpanded(); } catch (e) {}
        await sleep(250);
        try { scrollInpartImagePanelToLoadAll(); } catch (e) {}
      }

      // 4) Reintentos: Inpart a veces inserta <img> después de un postback / render tardío
      let lastCount = -1;
      for (let attempt = 0; attempt < 6; attempt++) {
        const panel = findInpartImagePanel();
        if (!panel) {
          console.warn("[Copiloto] No se encontró el panel de imágenes en Inpart.");
          return [];
        }

        const content = panel.querySelector(".content") || panel;

        // OJO: algunos thumbnails pueden venir como input[type=image] también
        const imgs = [
          ...Array.from(content.querySelectorAll("img[src]")),
          ...Array.from(content.querySelectorAll("input[type='image'][src]")),
        ];

        const countNow = imgs.length;

        // Si el conteo ya se estabilizó y hay imágenes, salimos del loop
        if (countNow > 0 && countNow === lastCount) break;

        lastCount = countNow;

        // Reintenta un poco más
        await sleep(350);
        try { scrollInpartImagePanelToLoadAll(); } catch (_) {}
      }

      // 5) Extracción final
      const panel = findInpartImagePanel();
      if (!panel) return [];

      const content = panel.querySelector(".content") || panel;

      const candidates = [];
      const elements = [
        ...Array.from(content.querySelectorAll("img[src]")),
        ...Array.from(content.querySelectorAll("input[type='image'][src]")),
      ];

      for (const el of elements) {
        const srcRaw = (el.getAttribute("src") || "").trim();
        if (!srcRaw) continue;

        // ignora controles UI del collapse/expand
        if (srcRaw.includes("collapse.png") || srcRaw.includes("expand.png")) continue;

        // ignora data:image muy cortos (normalmente icons)
        if (srcRaw.startsWith("data:image") && srcRaw.length < 200) continue;

        const absThumb = toAbsUrl(srcRaw);

        // intenta resolver URL “full”
        const full = resolveFullFromThumb(el, absThumb);

        const label =
          (el.getAttribute("alt") || el.getAttribute("title") || el.getAttribute("aria-label") || "").trim();

        const finalSrc = full || absThumb;
        if (!finalSrc) continue;

        candidates.push({
          src: finalSrc,
          thumb: absThumb,
          label,
          portal: "inpart",
          ts: Date.now(),
        });
      }

      // Dedup por src
      const seen = new Set();
      const unique = [];
      for (const c of candidates) {
        if (!c.src) continue;
        if (seen.has(c.src)) continue;
        seen.add(c.src);
        unique.push(c);
      }

      console.log(`[Copiloto] Fotos detectadas en Inpart (final): ${unique.length}`, unique);
      return unique;
    }

      /* =========================
         Helpers: Inpart Images
      ========================= */

      function toAbsUrl(u) {
        try {
          return new URL(u, window.location.href).href;
        } catch {
          return u;
        }
      }

      function findInpartImagePanel() {
        const panels = Array.from(document.querySelectorAll(".collapsiblePanel"));
        for (const p of panels) {
          const header = p.querySelector("div");
          const text = (header?.textContent || "").toLowerCase();
          if (text.includes("panel de imagenes") || text.includes("panel de imágenes")) return p;
        }

        const all = Array.from(document.querySelectorAll("div"));
        for (const d of all) {
          const t = (d.textContent || "").toLowerCase();
          if (t.includes("panel de imagenes") || t.includes("panel de imágenes")) {
            return d.closest(".collapsiblePanel") || d.parentElement;
          }
        }
        return null;
      }

      function ensureInpartImagePanelExpanded() {
        const panel = findInpartImagePanel();
        if (!panel) return;

        const state = panel.querySelector('input[type="hidden"][id$="_ClientState"]');
        const isCollapsed = state && String(state.value).toLowerCase() === "true";

        const toggle = panel.querySelector(
          'input[type="image"][id*="ibtQuotationImageCollapse"], input[type="image"][src*="collapse"], input[type="image"][src*="expand"]'
        );

        const content = panel.querySelector(".content") || panel;
        const hasAnyImg = content.querySelectorAll("img").length > 0;

        if ((!hasAnyImg || isCollapsed) && toggle) {
          toggle.click();
        }
      }

      function scrollInpartImagePanelToLoadAll() {
        const panel = findInpartImagePanel();
        if (!panel) return;

        const content = panel.querySelector(".content") || panel;

        const scrollers = Array.from(content.querySelectorAll("div")).filter(d => {
          const st = window.getComputedStyle(d);
          return (st.overflowX === "auto" || st.overflowX === "scroll") && d.scrollWidth > d.clientWidth;
        });

        const target = scrollers[0] || content;

        const max = Math.max(0, target.scrollWidth - target.clientWidth);
        for (let i = 0; i < 6; i++) {
          target.scrollLeft = Math.floor((max * i) / 5);
        }
        target.scrollLeft = 0;
      }

      function resolveFullFromThumb(imgEl, absThumb) {
        const a = imgEl.closest("a[href]");
        if (a) {
          const href = (a.getAttribute("href") || "").trim();
          if (href && !href.startsWith("#") && !href.toLowerCase().startsWith("javascript:")) {
            return toAbsUrl(href);
          }
        }

        const dataFull =
          (imgEl.getAttribute("data-full") ||
            imgEl.getAttribute("data-original") ||
            imgEl.getAttribute("data-src") || "").trim();
        if (dataFull) return toAbsUrl(dataFull);

        const onClick = (imgEl.getAttribute("onclick") || "").trim();
        if (onClick) {
          const m =
            onClick.match(/['"]([^'"]+\.(?:jpg|jpeg|png|gif|webp)[^'"]*)['"]/i) ||
            onClick.match(/['"]([^'"]+\.aspx\?[^'"]*)['"]/i) ||
            onClick.match(/['"]([^'"]+\/frm[^'"]+)['"]/i);
          if (m && m[1]) return toAbsUrl(m[1]);
        }

        try {
          const u = new URL(absThumb);
          const q = u.searchParams;
          const thumbHints = ["thumb", "thumbnail", "small", "size", "w", "h", "maxwidth", "maxheight"];
          const hasHint = thumbHints.some(k => (u.pathname.toLowerCase().includes(k) || q.has(k)));

          if (hasHint) {
            if (q.has("maxwidth")) q.set("maxwidth", "2000");
            if (q.has("maxheight")) q.set("maxheight", "2000");
            if (q.has("w")) q.set("w", "2000");
            if (q.has("h")) q.set("h", "2000");
            if (q.has("size")) q.set("size", "full");
            if (q.has("thumb")) q.set("thumb", "0");
            if (q.has("thumbnail")) q.set("thumbnail", "0");
            return u.toString();
          }
        } catch {}

        return null;
      }

      // Extrae fotos (Inpart puede cargar async; por eso usamos await + reintentos)
      const fotosModo = (typeof opts?.fotosModo === "string") ? opts.fotosModo : "none";
      const MAX_FOTOS_FAST = 12;
      const MAX_FOTOS_FULL = 50;
      let fotos = [];
      if (fotosModo === "full") {
        fotos = colectarFotosInpart().slice(0, 50);
      }

      // ---------------- FIN FOTOS INPART -------------------

      const datos = {
        portal: "inpart",
        aseguradora,
        siniestro,
        placas,
        vin,
        marca: marcaFinal,
        modelo: modeloFinal,
        anio: anioFinal,
        descripcion,
        taller,
        ciudad,
        estado,
        fechaCreacionCotizacion,
        fotos,
      };

      return datos;
    } catch (e) {
      console.warn("[Copiloto] leerInpart() falló:", e);
      return null;
    }
  }

  // ======================================================
  //  CHUBB
  // ======================================================
  function leerChubb(opts = {}) {
    const fotosModo = (opts?.fotosModo === "full") ? "full" : "none";

    try {
      if (!location.host.includes("siniestros.chubbnet.com")) return null;

      const siniestro = txt(document.getElementById("PlaceHolderMain_siniestro"));
      const vin = txt(document.getElementById("PlaceHolderMain_serie"));
      const vehDesc = txt(document.getElementById("spanVehiculoDesc"));
      const vehTabla = txt(document.getElementById("PlaceHolderMain_VehiculoId"));

      let marca = "";
      let modelo = "";
      let anio = "";

      if (vehDesc) {
        let linea = vehDesc.replace(/\s+/g, " ").trim();

        const marcasConocidas = [
          "Volkswagen","VW","Nissan","Chevrolet","Buick","Ford","Honda","Toyota","Kia","Hyundai","Mazda","GMC",
          "Chrysler","Dodge","Jeep","Ram","Renault","Peugeot","Seat","Audi","BMW","Mercedes","Suzuki",
          "General motors","MG","JAC",
        ];

        for (const m of marcasConocidas) {
          const re = new RegExp("^" + m.replace(/\s+/g, "\\s+") + "\\b", "i");
          if (re.test(linea)) { marca = m; break; }
        }

        if (!marca) marca = linea.split(" ")[0];

        const yMatch = linea.match(/\b(19[6-9]\d|20[0-2]\d|2030)\b/);
        if (yMatch) anio = yMatch[1];

        let resto = linea;
        if (marca) {
          const reMarcaInicio = new RegExp("^" + marca.replace(/\s+/g, "\\s+") + "\\s*", "i");
          resto = resto.replace(reMarcaInicio, "");
        }
        if (anio) {
          const idx = resto.indexOf(anio);
          if (idx !== -1) resto = resto.slice(0, idx);
        }
        modelo = resto.trim();
      }

      if (vehTabla) {
        const plain = vehTabla.replace(/<[^>]+>/g, " ");

        const mMarca = plain.match(/Marca:\s*([^:]+?)(?=(SubMarca:|Tipo\s+Veh[ií]culo:|Clase:|Descripción:|Modelo:|Clasificación:|Tonelaje:|$))/i);
        const mSub = plain.match(/SubMarca:\s*([^:]+?)(?=(Tipo\s+Veh[ií]culo:|Clase:|Descripción:|Modelo:|Clasificación:|Tonelaje:|$))/i);
        const mTipo = plain.match(/Tipo\s+Veh[ií]culo:\s*([^:]+?)(?=(Clase:|Descripción:|Modelo:|Clasificación:|Tonelaje:|$))/i);
        const mMod = plain.match(/Modelo:\s*(\d{4})/i);

        if (!marca && mMarca) marca = N(mMarca[1]);

        if (mSub) {
          const sub = N(mSub[1]);
          if (/general\s+motors/i.test(marca || "")) marca = sub;
          if (!modelo && mTipo) modelo = N(mTipo[1]);
          else if (!modelo) modelo = sub;
        } else if (!modelo && mTipo) {
          modelo = N(mTipo[1]);
        }

        if (!anio && mMod) anio = mMod[1];
      }

      if (marca.length > 40 && vehTabla) {
        const plain = vehTabla.replace(/<[^>]+>/g, " ");
        const mMarca2 = plain.match(/Marca:\s*([^:]+?)(?=(SubMarca:|Tipo\s+Veh[ií]culo:|Clase:|Descripción:|Modelo:|Clasificación:|Tonelaje:|$))/i);
        const mSub2 = plain.match(/SubMarca:\s*([^:]+?)(?=(Tipo\s+Veh[ií]culo:|Clase:|Descripción:|Modelo:|Clasificación:|Tonelaje:|$))/i);
        if (mMarca2) marca = N(mMarca2[1]);
        if (mSub2 && (/general\s+motors/i.test(marca) || !marca)) marca = N(mSub2[1]);
      }

      if (modelo.length > 80 && vehTabla) {
        const plain = vehTabla.replace(/<[^>]+>/g, " ");
        const mTipo2 = plain.match(/Tipo\s+Veh[ií]culo:\s*([^:]+?)(?=(Clase:|Descripción:|Modelo:|Clasificación:|Tonelaje:|$))/i);
        const mSub2 = plain.match(/SubMarca:\s*([^:]+?)(?=(Tipo\s+Veh[ií]culo:|Clase:|Descripción:|Modelo:|Clasificación:|Tonelaje:|$))/i);
        const mDesc2 = plain.match(/Descripción:\s*([^:]+?)(?=(Modelo:|Clasificación:|Tonelaje:|$))/i);
        if (mTipo2) modelo = N(mTipo2[1]);
        else if (mSub2) modelo = N(mSub2[1]);
        else if (mDesc2) modelo = N(mDesc2[1]);
      }

      marca = cleanDisplayText(N(marca));
      modelo = cleanDisplayText(N(modelo));

      let taller = "";
      const hs = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5"));
      for (const h of hs) {
        const t = N(h.innerText);
        if (/^taller\s*:/i.test(t)) {
          taller = t.replace(/^taller\s*:/i, "").trim();
          break;
        }
      }

      let ciudad = "";
      let estado = "";

      let dirDiv = null;
      const sol = document.getElementById("solicitud-de-cotizacion");
      if (sol) {
        const candidates = Array.from(sol.querySelectorAll(".dark-gray"));
        dirDiv = candidates.find((d) => /c[oó]digo\s+postal/i.test(d.textContent || "")) || candidates[candidates.length - 1] || null;
      }
      if (!dirDiv) {
        const candidates = Array.from(document.querySelectorAll("div.dark-gray"));
        dirDiv = candidates.find((d) => /c[oó]digo\s+postal/i.test(d.textContent || "")) || candidates[candidates.length - 1] || null;
      }

      if (dirDiv) {
        const lines = dirDiv.innerHTML
          .split(/<br\s*\/?>/i)
          .map((l) => l.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
          .filter(Boolean);

        const secondLine = lines[1] || "";
        const parts = secondLine.split(",").map((p) => p.trim()).filter(Boolean);

        if (parts.length >= 2) {
          const segmentCiudad = parts[0];
          const segmentEstado = parts[1];

          const palabras = segmentCiudad.split(/\s+/).filter(Boolean);
          let ciudadFinal = palabras[palabras.length - 1] || "";
          const prefijos = ["CIUDAD","CD.","CD","SAN","SANTA","SANTO","NUEVO","PUERTO","VILLA"];
          if (palabras.length >= 2) {
            const penultima = palabras[palabras.length - 2].toUpperCase();
            if (prefijos.includes(penultima)) {
              ciudadFinal = palabras[palabras.length - 2] + " " + palabras[palabras.length - 1];
            }
          }

          ciudad = N(ciudadFinal);
          if (!estado) estado = N(segmentEstado);
        }
      }

      const fotos = (fotosModo === "full") ? colectarFotosGenericas() : [];

      return {
        portal: "chubb",
        aseguradora: "CHUBB",
        siniestro,
        placas: "",
        vin,
        marca,
        modelo,
        anio,
        descripcion: vehDesc,
        taller,
        ciudad,
        estado,
        fotos,
      };
    } catch (e) {
      console.warn("[Copiloto] leerChubb() falló:", e);
      return null;
    }
  }

  // ======================================================
  //  QUALITAS (qvaluaciones)
  // ======================================================
  function leerQualitas(opts = {}) {
    const fotosModo = (typeof opts?.fotosModo === "full") ? "full" : "none";
    try {
      if (!location.host.includes("qvaluaciones.qualitas.com.mx")) return null;

      if (location.href.includes("/jsp/appletV2/")) {
      const fotos = (fotosModo === "full") ? colectarFotosGenericas() : [];
        return {
          portal: "qualitas-fotos",
          aseguradora: "QUALITAS",
          siniestro: "",
          placas: "",
          vin: "",
          marca: "",
          modelo: "",
          anio: "",
          taller: "",
          ciudad: "",
          estado: "",
          descripcion: "Ventana de fotos Qualitas",
          fotos,
        };
      }

      const clean = (s) => (s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
      const tds = Array.from(document.querySelectorAll("td.label_l_4col_bold"));

      let siniestro = "";
      let vehiculoLinea = "";
      let tallerLinea = "";
      let direccionLinea = "";

      for (const td of tds) {
        const t = clean(td.innerText || "");

        if (t.includes("Reporte:")) {
          const m = t.match(/Reporte:\s*(.+?)\s*Siniestro:/i);
          if (m) siniestro = clean(m[1]);
          else {
            const r = t.match(/Reporte:\s*([A-Z0-9\-]+)/i);
            if (r) siniestro = clean(r[1]);
          }
        }

        if (t.startsWith("Marca/Tipo:")) vehiculoLinea = t;
        if (t.startsWith("Razon Social:")) tallerLinea = t;
        if (t.startsWith("Direccion Comercial:")) direccionLinea = t;
      }

      let marca = "";
      let modelo = "";
      let anio = "";
      let placas = "";
      let vin = "";

      if (vehiculoLinea) {
        const line = vehiculoLinea;

        const placasM = line.match(/Placas:\s*([A-Z0-9]+)/i);
        if (placasM) placas = clean(placasM[1]);

        const vinM = line.match(/Serie:\s*([A-HJ-NPR-Z0-9]{11,17})/i);
        if (vinM) vin = clean(vinM[1]);

        const afterMarca = line.split("Marca/Tipo:")[1] || "";
        const hastaPlacas = afterMarca.split("Placas:")[0] || "";
        const mtRaw = clean(hastaPlacas);

        if (mtRaw) {
          const partes = mtRaw.split("/");

          if (partes.length >= 1) marca = clean(partes[0]);

          let modeloRaw = "";
          if (partes.length >= 3) modeloRaw = partes.slice(2).join("/");
          else if (partes.length >= 2) modeloRaw = partes.slice(1).join("/");

          modeloRaw = clean(modeloRaw);
          if (modeloRaw.includes(".")) modeloRaw = modeloRaw.split(".")[0];
          modelo = modeloRaw;
        }

        const yearMatch = line.match(/\b(19[6-9]\d|20[0-2]\d|2030)\b/);
        if (yearMatch) anio = yearMatch[1];
      }

      let taller = "";
      let estado = "";
      let ciudad = "";

      if (tallerLinea) {
        const t = tallerLinea.match(/Razon\s+Social:\s*(.+?)(Entidad:|$)/i);
        if (t) {
          let rs = clean(t[1]);
          rs = rs.replace(/^\d+\s+/, "");
          taller = rs;
        }

        const e = tallerLinea.match(/Entidad:\s*([A-ZÁÉÍÓÚÜÑ\s]+)/i);
        if (e) estado = clean(e[1]);
      }

      if (direccionLinea) {
        let dir = direccionLinea.replace(/^Direccion Comercial:\s*/i, "");
        dir = clean(dir);

        const antesCP = dir.split(/C\.?P/i)[0].trim();
        const partesComa = antesCP.split(",");
        if (partesComa.length >= 2) {
          const segmentoCiudad = clean(partesComa[partesComa.length - 2]);
          const segmentoEstado = clean(partesComa[partesComa.length - 1]);

          const palabras = segmentoCiudad.split(/\s+/).filter(Boolean);
          let ciudadFinal = palabras[palabras.length - 1] || "";

          const prefijos = ["CIUDAD","CD.","CD","SAN","SANTA","SANTO","NUEVO","PUERTO","VILLA"];
          if (palabras.length >= 2) {
            const penultima = palabras[palabras.length - 2].toUpperCase();
            if (prefijos.includes(penultima)) {
              ciudadFinal = palabras[palabras.length - 2] + " " + palabras[palabras.length - 1];
            }
          }

          ciudad = clean(ciudadFinal);
          if (!estado) estado = segmentoEstado;
        }
      }

      const numeroSiniestro = siniestro || "";
      const fotos = (fotosModo === "full") ? colectarFotosGenericas() : [];

      return {
        portal: "qualitas",
        aseguradora: "QUALITAS",
        siniestro: numeroSiniestro,
        placas,
        vin,
        marca,
        modelo,
        anio,
        taller,
        ciudad,
        estado,
        descripcion: vehiculoLinea,
        fotos,
      };
    } catch (e) {
      console.warn("[Copiloto] leerQualitas() falló:", e);
      return null;
    }
  }

  // ======================================================
  // MENSAJES SIDEBAR (único listener)
  // ======================================================
  const api =
    (typeof browser !== "undefined" && browser.runtime) ? browser :
    (typeof chrome !== "undefined" && chrome.runtime) ? chrome :
    null;

  if (!api || !api.runtime || !api.runtime.onMessage) {
    console.warn("[Copiloto] runtime API no disponible en content script.");
  } else {
  api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.action !== "analizarSolicitud") return;
    (async () => {
      try {
      const fotosModo = message?.fotosModo || "none";
      const opts = { fotosModo };

      // 1) Qualitas (sync)
      const q = (typeof leerQualitas === "function") ? leerQualitas(opts) : null;
      if (q) { sendResponse({ datos: q }); return; }

      // 2) Chubb (sync)
      const c = (typeof leerChubb === "function") ? leerChubb(opts) : null;
      if (c) { sendResponse({ datos: c }); return; }

      // 3) Inpart (async)
      if (typeof leerInpart === "function") {
        const i = await leerInpart(opts);
        if (i) { sendResponse({ datos: i }); return; }
      }

        // Fallback
        sendResponse({ datos: { fotos: [] } });
      } catch (e) {
        console.warn("[Copiloto] Error en analizarSolicitud:", e);
        sendResponse({ datos: { fotos: [] } });
      }
    })();

    return true;
  });

  // ---------------------------------------------------------------------
  // Recolección genérica de fotos visibles en la página
  // ---------------------------------------------------------------------
  function colectarFotosGenericas() {
    const fotos = [];
    const docs = [document];

    Array.from(document.querySelectorAll("iframe")).forEach((frame) => {
      try {
        const doc = frame.contentDocument;
        const win = frame.contentWindow;
        if (doc && win && win.location && win.location.host === window.location.host) {
          docs.push(doc);
        }
      } catch (e) {
        // iframes de otro dominio → ignorar
      }
    });

    docs.forEach((doc) => {
      const elementos = Array.from(doc.querySelectorAll("img, input[type='image']"));
      elementos.forEach((el) => {
        const srcAttr = el.getAttribute("src") || "";
        if (!srcAttr) return;

        const rect = el.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 50) return;

        let srcAbs;
        try {
          srcAbs = new URL(srcAttr, doc.location.href).href;
        } catch {
          srcAbs = srcAttr;
        }

        fotos.push({
          src: srcAbs,
          alt: el.alt || "",
          title: el.title || "",
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      });
    });

    console.log("[Copiloto] fotos detectadas en la página (genérico):", fotos.length, fotos);
    return fotos;
  }
}
}