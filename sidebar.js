// sidebar.js — versión limpia con validación unificada, OCR mejorado y herramientas externas
// ==========================================================================

// ---------------------------------------------------------------------------
// Helper para API de extensión (Firefox / Chrome)
// ---------------------------------------------------------------------------
function getExtApi() {
  if (typeof browser !== "undefined") return browser;
  if (typeof chrome !== "undefined") return chrome;
  return null;
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
const tabs = document.querySelectorAll(".tab");
const contents = document.querySelectorAll(".tab-content");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    contents.forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

// ---------------------------------------------------------------------------
// Utilidad común: leer datos del portal (Inpart / Chubb / Qualitas)
// mediante background + extractor.js
// ---------------------------------------------------------------------------
// includeFotos=false evita que el content script cargue/expanda imágenes
async function leerDatosDesdePortal(options = {}) {
  return new Promise((resolve) => {
    try {
      const api = getExtApi();
      if (!api) return resolve(null);

      const includeFotos = options.includeFotos !== false;

      api.runtime.sendMessage(
        { action: "analizarSolicitud" },
        (response) => resolve(response?.datos || null)
      );
    } catch (e) {
      resolve(null);
    }
  });
}

function _cwParseFechaMx(raw) {
  const s = String(raw || "").trim();
  // Soporta: 25/01/2026 06:59 p. m. | 25/01/2026 18:59 | 25/01/2026 6:59 PM
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?:\s*([ap])\.?\s*m\.?)?/i);
  if (!m) return null;

  let dd = +m[1], mm = +m[2], yyyy = +m[3], hh = +m[4], mi = +m[5];
  const ap = m[6] ? m[6].toLowerCase() : null;

  if (ap) {
    if (ap === "p" && hh < 12) hh += 12;
    if (ap === "a" && hh === 12) hh = 0;
  }

  return new Date(yyyy, mm - 1, dd, hh, mi, 0, 0);
}

function _cwFmtFechaMx(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function _cwIsWeekend(d) {
  const day = d.getDay(); // 0 dom, 6 sáb
  return day === 0 || day === 6;
}

function _cwWorkWindowFor(d) {
  // L-J: 08-18, V: 08-16
  const day = d.getDay(); // 1 lun ... 5 vie
  const startHour = 8;
  const endHour = (day === 5) ? 16 : 18; // viernes
  return { startHour, endHour };
}

function _cwMoveToNextWorkStart(d) {
  let x = new Date(d.getTime());
  while (_cwIsWeekend(x)) {
    x.setDate(x.getDate() + 1);
    x.setHours(8, 0, 0, 0);
  }
  const { startHour, endHour } = _cwWorkWindowFor(x);

  // Antes de apertura
  if (x.getHours() < startHour || (x.getHours() === startHour && x.getMinutes() === 0 && x.getSeconds() === 0)) {
    x.setHours(startHour, 0, 0, 0);
    return x;
  }

  // Después de cierre
  if (x.getHours() >= endHour) {
    x.setDate(x.getDate() + 1);
    x.setHours(8, 0, 0, 0);
    return _cwMoveToNextWorkStart(x);
  }

  return x;
}

function _cwAddBusinessHoursHorarioWong(startDate, hoursToAdd) {
  let d = _cwMoveToNextWorkStart(startDate);
  let remaining = hoursToAdd;

  while (remaining > 0) {
    d = _cwMoveToNextWorkStart(d);

    const { endHour } = _cwWorkWindowFor(d);
    const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), endHour, 0, 0, 0);

    const availHours = (endOfDay.getTime() - d.getTime()) / 3600000;
    const step = Math.min(availHours, remaining);

    d = new Date(d.getTime() + step * 3600000);
    remaining -= step;

    if (remaining > 0) {
      // saltar al siguiente día hábil 08:00
      d.setDate(d.getDate() + 1);
      d.setHours(8, 0, 0, 0);
    }
  }

  return d;
}

// Fuente única de verdad: vencimiento SIEMPRE = creación + 4 horas laborales (tu horario)
function pintarFechasSolicitud(d) {
  if (!d) return;

  const creRaw = String(d.fechaCreacionCotizacion || "").trim();
  const creDate = _cwParseFechaMx(creRaw);

  if (!creDate) {
    // Si no parsea creación, no inventamos vencimiento.
    d.fechaVencimientoCotizacion = "";
    return;
  }

  const vencDate = _cwAddBusinessHoursHorarioWong(creDate, 4);

  // Normaliza strings a un formato estable
  d.fechaCreacionCotizacion = _cwFmtFechaMx(creDate);
  d.fechaVencimientoCotizacion = _cwFmtFechaMx(vencDate);
}

// ==========================================================================
// Pestaña: Solicitud
// ==========================================================================

document.getElementById("analizar")?.addEventListener("click", async () => {
  const d = await leerDatosDesdePortal({ includeFotos: false });
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || "—";
  };

  set("aseguradora", d.aseguradora);
  set("siniestro", d.siniestro);
  set("placas", d.placas);
  set("vin", d.vin);
  set("marca", d.marca);
  set("modelo", d.modelo);
  set("anio", d.anio);
  set("taller", d.taller);
  set("ciudad", d.ciudad);
  set("estado", d.estado);

  // Fechas (cálculo interno: +4 hrs hábiles)
  try { pintarFechasSolicitud(d); } catch (_) {}
  set("sol-fecha-creacion", d.fechaCreacionCotizacion);
  set("sol-fecha-vencimiento", d.fechaVencimientoCotizacion);

  // Preparar cabecera de impresión en la pestaña del portal
  try {
    const extApi = window.browser || window.chrome;
    if (extApi?.runtime?.sendMessage) {
      await extApi.runtime.sendMessage({
        action: "cw_prepare_print_overlay",
        datos: {
          ...d,
          fechaCreacionCotizacion: d.fechaCreacionCotizacion || "",
          fechaVencimientoCotizacion: d.fechaVencimientoCotizacion || "",
          creacion: d.fechaCreacionCotizacion || "",
          vencimiento: d.fechaVencimientoCotizacion || "",
        },
      });
    }
  } catch (e) {
    console.warn("[Copiloto][Sidebar] No se pudo preparar overlay de impresión:", e);
  }
});

document.getElementById("limpiar")?.addEventListener("click", () => {
  [
    "aseguradora",
    "siniestro",
    "placas",
    "vin",
    "marca",
    "modelo",
    "anio",
    "taller",
    "ciudad",
    "estado",
    "sol-fecha-creacion",
    "sol-fecha-vencimiento",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "—";
  });

  try {
    const extApi = window.browser || window.chrome;
    if (extApi?.runtime?.sendMessage) {
      extApi.runtime.sendMessage({ action: "cw_clear_print_overlay" });
    }
  } catch (e) {
    console.warn("[Copiloto][Sidebar] No se pudo limpiar overlay de impresión:", e);
  }
});

// ==========================================================================
// Utilidades VIN / Placas / Marca para Validación de Vehículo
// ==========================================================================

// Mapa VIN para dígito verificador
const VIN_MAP = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
};

const VIN_WEIGHT = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

function vinCheckDigit(vin) {
  vin = (vin || "").toUpperCase();
  if (vin.length !== 17) return null;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = vin[i];
    const val = VIN_MAP[ch];
    if (val == null) return null;
    sum += val * VIN_WEIGHT[i];
  }
  const resto = sum % 11;
  return resto === 10 ? "X" : String(resto);
}

// Región aproximada por primer carácter del VIN
function vinRegion(vin) {
  if (!vin || vin.length < 1) return null;
  const c = vin[0].toUpperCase();
  if ("12345".includes(c)) return "Norteamérica";
  if ("6789".includes(c)) return "Oceanía / Sudamérica";
  if (c === "J") return "Japón";
  if (c === "S") return "Reino Unido / Europa";
  if (c === "W") return "Alemania / Europa";
  if (c === "V") return "Francia / España";
  if (c === "K") return "Corea";
  if (c === "L") return "China";
  return null;
}

// Código de año (posición 10) → año calendario (con ciclos de 30 años)
const VIN_YEAR_MAP = {
  A: 1980, B: 1981, C: 1982, D: 1983, E: 1984, F: 1985,
  G: 1986, H: 1987, J: 1988, K: 1989, L: 1990, M: 1991,
  N: 1992, P: 1993, R: 1994, S: 1995, T: 1996, V: 1997,
  W: 1998, X: 1999, Y: 2000, 1: 2001, 2: 2002, 3: 2003,
  4: 2004, 5: 2005, 6: 2006, 7: 2007, 8: 2008, 9: 2009,
};

function vinYear(vin) {
  if (!vin || vin.length < 10) return null;
  const code = vin[9].toUpperCase();
  let base = VIN_YEAR_MAP[code];
  if (!base) return null;

  const thisYear = new Date().getFullYear();
  while (base + 30 <= thisYear + 1) {
    base += 30;
  }
  return base;
}

// WMI → marca esperada (simplificado)
const WMI_BRAND = {
  "3VW": "VOLKSWAGEN",
  "WVW": "VOLKSWAGEN",
  "1VW": "VOLKSWAGEN",
  "3N1": "NISSAN",
  "1N4": "NISSAN",
  "3HG": "HONDA",
  "1HG": "HONDA",
  "2HG": "HONDA",
  "3FA": "FORD",
  "1FT": "FORD",
  "1FA": "FORD",
  "3GN": "CHEVROLET",
  "3G1": "CHEVROLET",
  "1G1": "CHEVROLET",
  "5YJ": "TESLA",
  "WDB": "MERCEDES-BENZ",
  "WAU": "AUDI",
};

function vinBrandByWMI(vin) {
  if (!vin || vin.length < 3) return null;
  const wmi = vin.slice(0, 3).toUpperCase();
  return WMI_BRAND[wmi] || null;
}

// Equivalencias de marca (VW ~ VOLKSWAGEN, etc.)
const BRAND_EQUIV_GROUPS = [
  ["VOLKSWAGEN", "VW"],
  ["MERCEDESBENZ", "MERCEDES", "MB"],
  ["GENERALMOTORS", "GM"],
  ["BMW", "BMW"],
  ["KIA", "KIA"],
  ["HYUNDAI", "HYUNDAI"],
];

function normalizaMarcaClave(nombre) {
  const base = (nombre || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (!base) return "";
  for (const group of BRAND_EQUIV_GROUPS) {
    if (group.includes(base)) return group[0];
  }
  return base;
}

// Placas MX: patrones comunes
const PLACAS_REGEXES = [
  /^[A-Z]{3}\d{4}$/,        // ABC1234
  /^[A-Z]{1,3}-?\d{3,4}[A-Z]?$/, // ABC-123D, A-1234, etc.
  /^\d{3}-[A-Z]{3}$/,       // 123-ABC
  /^\d{1,2}\s?[A-Z]{3}\s?\d{3}$/, // 12 ABC 345
];

// ==========================================================================
// Análisis de fotos para contexto de importado/fronterizo (beta)
// ==========================================================================

function analizarFotosImportado(fotos) {
  const resultado = {
    detalles: [],
    extraSeverity: null, // null | "warn"
  };

  if (!Array.isArray(fotos) || fotos.length === 0) {
    return resultado;
  }

  const dominiosSospechosos = [
    "copart",
    "iaai",
    "auction",
    "autoauction",
    "manheim",
    "adessa",
    "bidfax",
    "salvage",
    "carfax",
  ];

  let seDetectoSubasta = false;
  const dominiosDetectados = new Set();

  for (const foto of fotos) {
    let src = "";

    if (typeof foto === "string") {
      src = foto;
    } else if (foto && typeof foto === "object") {
      // Preferimos fullSrc si viene del extractor (a veces incluye dominio completo).
      src = foto.fullSrc || foto.src || foto.url || foto.href || "";
    }

    if (!src) continue;

    const srcLower = src.toLowerCase();
    let host = "";
    try {
      const u = new URL(src);
      host = u.hostname.toLowerCase();
    } catch {
      host = "";
    }

    const textoAnalizar = (host || "") + " " + srcLower;

    if (dominiosSospechosos.some((pat) => textoAnalizar.includes(pat))) {
      seDetectoSubasta = true;
      if (host) dominiosDetectados.add(host);
    }
  }

  if (seDetectoSubasta) {
    const listaDominios =
      [...dominiosDetectados].join(", ") ||
      "portales de subasta / historiales";

    resultado.detalles.push(
      `Parte del material fotográfico parece provenir de ${listaDominios}. ` +
        "Esto puede ser un indicio de que el vehículo fue adquirido en subasta " +
        "o importado; conviene revisar pedimento, decreto o documentación de importación."
    );

    resultado.extraSeverity = "warn";
  }

  resultado.detalles.push(
    `Se analizaron ${fotos.length} fotografías como contexto de importación; ` +
      (seDetectoSubasta
        ? "se detectaron dominios de subasta / historiales conocidos."
        : "no se detectaron dominios de subasta conocidos en las URLs revisadas.")
  );

  return resultado;
}

// --------------------------------------------------------------------------
// Sugerencias de corroboración visual (VIN / placas en fotos)
// --------------------------------------------------------------------------

function sugerenciasCorroborarDesdeFotos(fotos) {
  const resultado = { detalles: [] };

  if (!Array.isArray(fotos) || fotos.length === 0) {
    return resultado;
  }

  let hayFotosRelacionadasConVin = false;
  let hayFotosRelacionadasConPlacas = false;

  for (const foto of fotos) {
    let buffer = "";

    if (typeof foto === "string") {
      buffer = foto;
    } else if (foto && typeof foto === "object") {
      const claves = ["src", "url", "href", "alt", "title", "name"];
      for (const k of claves) {
        if (foto[k] && typeof foto[k] === "string") {
          buffer += " " + foto[k];
        }
      }
      for (const k of Object.keys(foto)) {
        if (k.startsWith("data") && typeof foto[k] === "string") {
          buffer += " " + foto[k];
        }
      }
    }

    const t = buffer.toLowerCase();
    if (!t) continue;

    if (t.includes("vin") || t.includes("serie") || t.includes("serial")) {
      hayFotosRelacionadasConVin = true;
    }
    if (t.includes("placa") || t.includes("plates") || t.includes("matrícula")) {
      hayFotosRelacionadasConPlacas = true;
    }
  }

  if (hayFotosRelacionadasConVin) {
    resultado.detalles.push(
      "Se detectaron fotografías etiquetadas o nombradas como relacionadas con el VIN " +
        "(por ejemplo, archivos o textos con 'vin' / 'serie'). Pueden usarse para corroborar " +
        "visual y físicamente el número de serie cuando haya dudas."
    );
  }

  if (hayFotosRelacionadasConPlacas) {
    resultado.detalles.push(
      "Se detectaron fotografías asociadas a placas o matrícula. Pueden servir para " +
        "verificar visualmente las placas cuando la descripción del portal sea ambigua o incompleta."
    );
  }

  return resultado;
}

// ==========================================================================
// Validación unificada de vehículo (semáforo + texto)
// ==========================================================================

function runVehicleValidation(data) {
  const issues = [];
  const details = [];
  let severity = "ok"; // ok | warn | alert

  const vin = (data.vin || "").trim().toUpperCase();
  const placas = (data.placas || "").trim().toUpperCase();
  const marca = (data.marca || "").trim();
  const modelo = (data.modelo || "").trim();
  const anioTexto = (data.anioTexto || "").trim();
  const anioNum = data.anioNum ?? (parseInt(anioTexto, 10) || null);

  // --- VIN estructural ---
  if (!vin) {
    issues.push(
      "VIN / Chasis: No se recibió VIN. No se puede validar estructura ni año."
    );
    severity = "alert";
  } else {
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      issues.push(
        "VIN: Debe tener 17 caracteres y no contener I, O, Q ni símbolos."
      );
      severity = "alert";
    } else {
      const esperado = vinCheckDigit(vin);
      if (!esperado) {
        issues.push(
          "VIN: Formato no válido para cálculo de dígito verificador."
        );
        severity = "alert";
      } else {
        const real = vin[8];
        if (real !== esperado) {
          issues.push(
            "VIN: Dígito verificador (posición 9) no coincide con el esperado."
          );
          severity = "alert";
        } else {
          details.push("Formato y dígito verificador del VIN correctos.");
        }
      }
    }
  }

  // --- Región VIN ---
  if (vin) {
    const region = vinRegion(vin);
    if (region) {
      details.push(`Origen aproximado según VIN: ${region}.`);
    }
  }

  // --- Año por VIN vs año del portal ---
  if (vin) {
    const yearFromVin = vinYear(vin);
    if (yearFromVin) {
      if (anioNum) {
        if (Math.abs(yearFromVin - anioNum) <= 1) {
          details.push(
            `Año derivado del VIN: ${yearFromVin}. Coincide con el año capturado en el portal.`
          );
        } else {
          issues.push(
            `Año: Según VIN el año modelo podría ser ${yearFromVin}, pero el portal indica ${
              anioTexto || "—"
            }. Revisar documentación.`
          );
          if (severity !== "alert") severity = "warn";
        }
      } else {
        details.push(`Año derivado del VIN: ${yearFromVin}.`);
      }
    } else {
      details.push(
        "No se pudo inferir el año modelo desde el VIN (código de año no reconocido)."
      );
      if (severity === "ok") severity = "warn";
    }
  }

  // --- Marca vs WMI ---
  if (vin) {
    const brandFromVin = vinBrandByWMI(vin);

    // Solo mostramos algo cuando SÍ tenemos un WMI mapeado.
    if (brandFromVin) {
      const nMarca = normalizaMarcaClave(marca);
      const nVinBrand = normalizaMarcaClave(brandFromVin);

      if (nMarca && nVinBrand) {
        if (
          nMarca === nVinBrand ||
          nMarca.includes(nVinBrand) ||
          nVinBrand.includes(nMarca)
        ) {
          details.push(
            `Marca inferida por WMI del VIN: ${brandFromVin}. Coincide con la marca capturada.`
          );
        } else {
          issues.push(
            `Marca: Según WMI del VIN podría corresponder a ${brandFromVin}, pero el portal indica ${
              marca || "—"
            }. Revisar factura / tarjeta.`
          );
          if (severity !== "alert") severity = "warn";
        }
      } else {
        details.push(
          `Marca inferida por WMI del VIN: ${brandFromVin}. No se pudo comparar con la marca capturada.`
        );
        if (severity === "ok") severity = "warn";
      }
    }
    // Si brandFromVin es null, no agregamos ningún texto de WMI.
  }

  // --- Placas ---
  if (!placas) {
    details.push(
      "Placas: No se recibieron placas (campo opcional, no bloquea la validación)."
    );
  } else {
    const valido = PLACAS_REGEXES.some((r) => r.test(placas));
    if (valido) {
      details.push(
        "Formato de placas compatible con patrones comunes en México."
      );
    } else {
      issues.push(
        "Formato de placas atípico; revisar contra la tarjeta de circulación."
      );
      if (severity !== "alert") severity = "warn";
    }
  }

  // --- Marca / modelo / año vacíos o raros ---
  if (!marca) {
    issues.push("Marca: La marca no debe estar vacía.");
    if (severity !== "alert") severity = "warn";
  }
  if (!modelo) {
    issues.push("Modelo / Versión: No debe estar vacío.");
    if (severity !== "alert") severity = "warn";
  }
  if (!anioTexto) {
    issues.push("Año: No debe ir vacío.");
    if (severity !== "alert") severity = "warn";
  } else if (!/^\d{4}$/.test(anioTexto)) {
    issues.push("Año: Debe tener 4 dígitos.");
    if (severity !== "alert") severity = "warn";
  } else {
    const ahora = new Date().getFullYear();
    if (anioNum < 1980 || anioNum > ahora + 1) {
      issues.push(
        `Año: Fuera de rango razonable (1980–${ahora + 1}). Revisar documentación.`
      );
      if (severity !== "alert") severity = "warn";
    }
  }

  // --- Determinar etiqueta y resumen general ---
  let badgeText = "";
  let summaryText = "";

  if (!vin) {
    badgeText = "Revisión crítica";
    summaryText =
      "No se pudieron realizar validaciones estructurales porque no se recibió un VIN.";
  } else if (severity === "ok" && issues.length === 0) {
    badgeText = "Vehículo validado";
    summaryText =
      "No se detectaron inconsistencias estructurales en VIN, placas, marca, modelo y año.";
  } else if (severity === "alert") {
    badgeText = "Revisión crítica";
    summaryText =
      "Se detectaron inconsistencias fuertes que requieren revisar documentación y pedimentos.";
  } else {
    badgeText = "Revisión recomendada";
    summaryText =
      "Se detectaron algunos puntos a revisar, aunque la estructura general del VIN es válida.";
  }

  return { badgeText, summaryText, issues, details, severity };
}

// Helper para resaltar palabras clave
function highlightValidationText(msg) {
  if (!msg) return "";
  let html = String(msg);

  // 1) Frases negativas (advertencias)
  html = html.replace(
    /(no se detectaron|no se detect[oó]|no se pudo|no se encontr[oó]|no se identific[oó])(?=\b|$|[.,;:])/gi,
    '<span class="val-warn">$1</span>'
  );

  // 2) Frases positivas
  html = html.replace(
    /(correct[oa]s?|coincid[ea]n?|compatible|v[aá]lid[ao]s?)(?=\b|$|[.,;:])/gi,
    '<span class="val-ok">$1</span>'
  );

  // 3) Valor después de los dos puntos
  html = html.replace(/(:\s*)([^.]+)(\.)?/, function (_, sep, value, dot) {
    return sep + "<strong>" + value.trim() + "</strong>" + (dot || "");
  });

  return html;
}

// Pintar resultado en la tarjeta unificada
function renderVehicleValidation(result) {
  const card = document.getElementById("vehicle-validation-card");
  const badge = document.getElementById("vehicle-validation-badge");
  const summaryEl = document.getElementById("vehicle-validation-summary");
  const issuesEl = document.getElementById("vehicle-validation-issues");
  const detailsEl = document.getElementById("vehicle-validation-details");
  const tsEl = document.getElementById("vehicle-validation-timestamp");

  if (!card || !badge || !summaryEl || !issuesEl || !detailsEl || !tsEl) {
    console.warn("[Copiloto] Elementos de validación no encontrados en el DOM.");
    return;
  }

  card.classList.remove(
    "cw-status-ok",
    "cw-status-warn",
    "cw-status-alert",
    "cw-status-neutral"
  );

  if (result.severity === "alert") {
    card.classList.add("cw-status-alert");
  } else if (result.severity === "warn") {
    card.classList.add("cw-status-warn");
  } else if (result.severity === "ok") {
    card.classList.add("cw-status-ok");
  } else {
    card.classList.add("cw-status-neutral");
  }

  if (result.severity === "ok" && (!result.issues || result.issues.length === 0)) {
    badge.textContent = "";
    badge.style.display = "none";
  } else {
    badge.style.display = "";
    badge.textContent = result.badgeText;
  }

  summaryEl.textContent = result.summaryText;

  issuesEl.innerHTML = "";
  if (result.issues && result.issues.length) {
    result.issues.forEach((msg) => {
      const li = document.createElement("li");
      li.innerHTML = highlightValidationText(msg);
      issuesEl.appendChild(li);
    });
  }

  detailsEl.innerHTML = "";
  if (result.details && result.details.length) {
    result.details.forEach((msg) => {
      const li = document.createElement("li");
      li.innerHTML = highlightValidationText(msg);
      detailsEl.appendChild(li);
    });
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  tsEl.textContent = `Última validación: ${timeStr}.`;
}

// ==========================================================================
// Pestaña: Vehículo — cargar datos + ejecutar validación
// ==========================================================================

async function validarVehiculo() {
  const d = await leerDatosDesdePortal({ includeFotos: true },{ fotosModo: "full" });

  const setVeh = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || "—";
  };

  setVeh("veh-placas", d.placas);
  setVeh("veh-vin", d.vin);
  setVeh("veh-marca", d.marca);
  setVeh("veh-modelo", d.modelo);
  setVeh("veh-anio", d.anio);

  const input = {
    placas: d.placas || "",
    vin: d.vin || "",
    marca: d.marca || "",
    modelo: d.modelo || "",
    anioTexto: d.anio || "",
  };

  if (input.anioTexto && /^\d{4}$/.test(input.anioTexto)) {
    input.anioNum = parseInt(input.anioTexto, 10);
  }

  const result = runVehicleValidation(input);

  const fotos = Array.isArray(d.fotos) ? d.fotos : [];
  console.log("[Copiloto] Fotos recibidas para validación:", fotos);

  const infoImportado = analizarFotosImportado(fotos);
  if (infoImportado.detalles && infoImportado.detalles.length) {
    result.details = (result.details || []).concat(infoImportado.detalles);
    if (infoImportado.extraSeverity === "warn" && result.severity === "ok") {
      result.severity = "warn";
    }
  }

  const infoCorroboracion = sugerenciasCorroborarDesdeFotos(fotos);
  if (infoCorroboracion.detalles && infoCorroboracion.detalles.length) {
    result.details = (result.details || []).concat(infoCorroboracion.detalles);
  }

  renderVehicleValidation(result);
}

document.getElementById("validar-vehiculo")?.addEventListener("click", (e) => {
  e.preventDefault();
  validarVehiculo();
});

// ==========================================================================
// Botón "Probar fotos (beta)" — análisis básico de VIN y placas + Visión IA
// ==========================================================================

// Normaliza texto de VIN para comparación
function normalizarVin(vin) {
  return (vin || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Normaliza texto de placas para comparación
function normalizarPlacas(placas) {
  return (placas || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Extrae posibles VIN (secuencias largas alfanuméricas) del texto OCR
function extraerVinsDeTexto(texto) {
  if (!texto) return [];

  const limpio = texto.toUpperCase().replace(/[^A-Z0-9]/g, " ");
  const candidatos = limpio.match(/\b[A-Z0-9]{10,20}\b/g) || [];
  const normalizados = candidatos.map((c) => c.replace(/\s+/g, ""));
  const filtrados = normalizados.filter((c) => c.length >= 15 && c.length <= 18);
  return Array.from(new Set(filtrados));
}

// Texto “aplanado” para buscar placas como substring
function textoNormalizadoParaBusqueda(texto) {
  return (texto || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Coincidencia de placa con tolerancia de 1 carácter
function coincidePlacaConTexto(placasEsperadasNorm, textoNorm) {
  if (!placasEsperadasNorm || !textoNorm) return false;

  if (textoNorm.includes(placasEsperadasNorm)) {
    return true;
  }

  const L = placasEsperadasNorm.length;
  if (!L || textoNorm.length < L) return false;

  for (let i = 0; i <= textoNorm.length - L; i++) {
    let mismatches = 0;
    for (let j = 0; j < L; j++) {
      if (textoNorm[i + j] !== placasEsperadasNorm[j]) {
        mismatches++;
        if (mismatches > 1) break;
      }
    }
    if (mismatches <= 1) {
      return true;
    }
  }

  return false;
}

// Ejecuta OCR sobre un src de imagen usando Tesseract, con worker propio y timeout
async function ocrImagenSrc(src) {
  if (!window.Tesseract || typeof Tesseract.recognize !== "function") {
    throw new Error("Tesseract no está disponible en este contexto.");
  }

  // Ruta del worker dentro de la extensión
  const workerPath =
    window.TESSERACT_WORKER && typeof window.TESSERACT_WORKER === "string"
      ? window.TESSERACT_WORKER
      : (typeof browser !== "undefined" &&
         browser.runtime &&
         browser.runtime.getURL
          ? browser.runtime.getURL("tesseract.worker.min.js")
          : null);

  // Configuración: worker + whitelist de caracteres
  const options = workerPath
    ? {
        workerPath,
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      }
    : {
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      };

  console.log("[Copiloto][OCR] Iniciando OCR de una foto…");

  const ocrPromise = Tesseract.recognize(src, "eng", options);

  // Timeout de seguridad por si el worker no responde
  const TIMEOUT_MS = 15000;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("OCR timeout")), TIMEOUT_MS)
  );

  const res = await Promise.race([ocrPromise, timeoutPromise]);
  const text = res && res.data && res.data.text ? res.data.text : "";
  console.log(
    "[Copiloto][OCR] texto detectado (primeros 120 chars):",
    text.slice(0, 120)
  );
  return text;
}

// Palabras clave típicas en fotos de subastas / importados
const OCR_IMPORT_KEYWORDS = [
  "COPART",
  "IAAI",
  "SALVAGE",
  "AUCTION",
  "SUBASTA",
  "LOT",
  "RUNS AND DRIVES",
  "TITLE",
  "INSURANCE AUTO AUCTIONS",
];

// --------------------------------------------------------------------------
// Helper Visión IA: pintar resultado en la tarjeta "Historial público"
// --------------------------------------------------------------------------
function renderResultadoVision(data, datosPortal) {
  let el = document.getElementById("vision-status");

  // Fallback: si el elemento no existe (por cualquier razón), lo creamos dentro de la tarjeta
  if (!el) {
    const card = document.getElementById("historial-publico-card");
    if (!card) return;
    el = document.createElement("p");
    el.id = "vision-status";
    el.className = "note note-neutral";
    el.textContent = "Visión IA: — (aún sin análisis)";
    card.appendChild(el);
  }

  if (!data || data.ok === false) {
    el.className = "note note-error";
    el.textContent =
      "Visión IA (error): no se pudo obtener una lectura confiable de las fotos. Revisa consola/API local.";
    return;
  }

  const partes = [];
  let vinMatch = null;    // true/false/null
  let plateMatch = null;  // true/false/null

  // VIN
  const vinAI = data.bestVin && data.bestVin.value ? String(data.bestVin.value).trim().toUpperCase() : "";
  const vinPortal = (datosPortal && datosPortal.vin ? String(datosPortal.vin) : "").trim().toUpperCase();

  if (vinAI) {
    if (vinPortal) {
      vinMatch = (vinAI === vinPortal);
      partes.push(
        vinMatch
          ? `VIN detectado en fotos: ${vinAI} (coincide con el VIN del portal).`
          : `VIN detectado en fotos: ${vinAI} (NO coincide con el VIN del portal: ${vinPortal}).`
      );
    } else {
      partes.push(`VIN detectado en fotos: ${vinAI}.`);
    }
  } else {
    partes.push("VIN no identificado claramente en las fotos analizadas.");
  }

  // Placas
  const plateAI = data.bestPlate && data.bestPlate.value ? String(data.bestPlate.value).trim().toUpperCase() : "";
  const platePortal = (datosPortal && datosPortal.placas ? String(datosPortal.placas) : "").trim().toUpperCase();

  if (plateAI) {
    if (platePortal) {
      plateMatch = (plateAI === platePortal);
      partes.push(
        plateMatch
          ? `Placa detectada en fotos: ${plateAI} (coincide con la placa del expediente).`
          : `Placa detectada en fotos: ${plateAI} (NO coincide con la placa del expediente: ${platePortal}).`
      );
    } else {
      partes.push(`Placa detectada en fotos: ${plateAI}.`);
    }
  } else {
    partes.push("Placas no detectadas claramente en las fotos analizadas.");
  }

  // Clase visual: ok si todo coincide, warning si hay al menos un mismatch, neutral si no hubo datos
  const anyMismatch = (vinMatch === false) || (plateMatch === false);
  const anyMatch = (vinMatch === true) || (plateMatch === true);

  if (anyMismatch) el.className = "note note-warning";
  else if (anyMatch) el.className = "note note-good";
  else el.className = "note note-neutral";

  el.textContent = partes.join(" ");
}

// --------------------------------------------------------------------------
// Helper Visión IA: convertir URL → base64 (con cookies + validación + resize)
// --------------------------------------------------------------------------
async function cargarImagenComoBase64(src) {
  const MAX_DIM = 1600;          // balance: suficiente para VIN/placas sin inflar payload
  const JPEG_QUALITY = 0.82;     // balance: texto legible / peso razonable

  try {
    const resp = await fetch(src, {
      // IMPORTANTE: muchas URLs de fotos en Inpart/Qualitas requieren cookies de sesión.
      credentials: "include",
      cache: "no-store",
    });

    if (!resp.ok) {
      console.warn("[Copiloto][Visión] fetch falló", resp.status, src);
      return null;
    }

    const ct = (resp.headers.get("content-type") || "").toLowerCase();
    if (!ct.startsWith("image/")) {
      // Si esto pasa, frecuentemente es un HTML de login/redirect o un error del portal.
      const preview = await resp.text().catch(() => "");
      console.warn(
        "[Copiloto][Visión] Respuesta no es imagen (content-type=", ct, "):",
        src,
        preview ? preview.slice(0, 160) : ""
      );
      return null;
    }

    const blob = await resp.blob();

    // 1) Cargar imagen desde blob (evita canvas taint)
    const img = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const im = new Image();
      im.onload = () => {
        URL.revokeObjectURL(url);
        resolve(im);
      };
      im.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      im.src = url;
    });

    // 2) Redimensionar (si es necesario) y convertir a JPEG
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    if (!w || !h) return null;

    const scale = Math.min(1, MAX_DIM / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(img, 0, 0, tw, th);

    // Siempre JPEG para estabilizar tamaño (Gemini lee bien texto en JPEG si no está sobrecomprimido)
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch (e) {
    console.warn(
      "[Copiloto][Visión] No se pudo convertir la imagen a base64:",
      src,
      e
    );
    return null;
  }
}

// --------------------------------------------------------------------------
// Helper Visión IA: llamada a http://localhost:3000/analyze-vin-plates
// --------------------------------------------------------------------------
// Llama a la API local recibiendo imágenes base64
async function llamarApiVisionLocal(imagenesBase64, datosPortal) {
  const visionStatusEl = document.getElementById("vision-status");
  if (visionStatusEl) {
    visionStatusEl.textContent = "Visión: enviando fotos a la API local...";
  }

  if (!imagenesBase64 || !imagenesBase64.length) {
    if (visionStatusEl) {
      visionStatusEl.textContent =
        "Visión: no hay imágenes en formato base64 para enviar a la API local.";
    }
    return { ok: false, error: "Sin imágenes base64" };
  }

  try {
    console.log(
      "[Vision API] Enviando",
      imagenesBase64.length,
      "imágenes base64 a la API local"
    );

    const resp = await fetch("http://localhost:3000/analyze-vin-plates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images: imagenesBase64,
        meta: {
          vinPortal: datosPortal.vin || "",
          placasPortal: datosPortal.placas || "",
        },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("[Vision API] Error HTTP", resp.status, txt);
      if (visionStatusEl) {
        visionStatusEl.textContent =
          "Visión: la API local respondió con error (" + resp.status + ").";
      }
      return { ok: false, status: resp.status, error: txt };
    }

    const data = await resp.json();
    console.log("[Vision API] Respuesta de la API local:", data);

    const bestVin = data.bestVin || null;
    const bestPlate = data.bestPlate || null;

    if (visionStatusEl) {
      if (bestVin || bestPlate) {
        visionStatusEl.textContent =
          "Visión IA: VIN " +
          (bestVin && bestVin.value ? bestVin.value : "—") +
          " / Placa " +
          (bestPlate && bestPlate.value ? bestPlate.value : "—") +
          " (revísalos visualmente).";
      } else {
        visionStatusEl.textContent =
          "Visión IA: no se detectó un VIN o placa con confianza suficiente en las fotos analizadas.";
      }
    }

    // Pintar resumen en la tarjeta de "Historial público del vehículo"
    renderResultadoVision(
      {
        ...data,
        bestVin,
        bestPlate,
      },
      datosPortal
    );

    return {
      ok: true,
      data,
      bestVin,
      bestPlate,
    };
  } catch (err) {
    console.error("[Vision API] Error al llamar a la API local:", err);
    if (visionStatusEl) {
      visionStatusEl.textContent =
        "Visión: error al llamar a la API local. Revisa la consola para más detalles.";
    }
    return { ok: false, error: String(err) };
  }
}

// --------------------------------------------------------------------------
// Helper: priorizar fotos para Visión IA (VIN / placas)
// --------------------------------------------------------------------------
function priorizarFotosParaVision(fotosCrudas, maxFotos) {
  if (!Array.isArray(fotosCrudas) || !fotosCrudas.length) return [];

  const candidatos = [];

  for (let i = 0; i < fotosCrudas.length; i++) {
    const foto = fotosCrudas[i];
    let src = "";
    let meta = "";

    if (typeof foto === "string") {
      src = foto;
      meta = foto;
    } else if (foto && typeof foto === "object") {
      // Preferimos URL “grande” si el extractor la provee (fullSrc), y luego src.
      src =
        foto.fullSrc ||
        foto.full ||
        foto.original ||
        foto.src ||
        foto.url ||
        foto.href ||
        "";
      const claves = ["alt", "title", "name", "label", "data-label"];
      for (const k of claves) {
        if (foto[k] && typeof foto[k] === "string") {
          meta += " " + foto[k];
        }
      }
      // También revisamos claves del objeto que contengan "vin" o "placa"
      for (const k of Object.keys(foto)) {
        const kl = k.toLowerCase();
        if (
          (kl.includes("vin") || kl.includes("serie") || kl.includes("placa")) &&
          typeof foto[k] === "string"
        ) {
          meta += " " + foto[k];
        }
      }
    }

    if (!src) continue;

    const t = meta.toLowerCase();
    let score = 0;

    if (t.includes("vin") || t.includes("serie")) score += 3;
    if (t.includes("placa") || t.includes("plate") || t.includes("matri")) score += 2;
    if (t.includes("frente") || t.includes("delantera") || t.includes("trasera"))
      score += 1;

    candidatos.push({ index: i, src, score });
  }

  // Orden: primero más score, luego índice original (para mantener orden básico)
  candidatos.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  const urls = [];
  for (const c of candidatos) {
    if (!urls.includes(c.src)) {
      urls.push(c.src);
      if (urls.length >= maxFotos) break;
    }
  }

  return urls;
}

// --------------------------------------------------------------------------
// Analiza un subconjunto de fotos buscando VIN y placas + llama API Visión
// --------------------------------------------------------------------------
async function analizarFotosVinYPlacas() {
  const GLOBAL_TIMEOUT_MS = 25000;     // evita “botón pensando” eterno
  const ENABLE_OCR_BACKUP = true;      // ponlo en false si quieres lanzar rápido solo con Visión IA
  const MAX_FOTOS_OCR = 8;             // OCR es pesado: mantenlo bajo
  const MAX_FOTOS_VISION = 12;         // server.js ya recorta a 12

  const trabajoPrincipal = (async () => {
    const datos = await leerDatosDesdePortal({ fotosModo: "full" });
    const fotos = Array.isArray(datos.fotos) ? datos.fotos : [];

    let status = document.getElementById("ocr-status");
    if (!status) {
      const vehiculoSection = document.getElementById("vehiculo");
      status = document.createElement("p");
      status.id = "ocr-status";
      status.className = "vehiculo-note";
      vehiculoSection.appendChild(status);
    }

    const totalFotos = fotos.length || 0;
    if (!totalFotos) {
      status.textContent =
        "No se detectaron fotos aprovechables en la página (OCR / Visión IA).";
      return;
    }

    const vinEsperado = normalizarVin(datos.vin);
    const placasEsperadasNorm = normalizarPlacas(datos.placas);

    // 1) FOTOS PARA VISIÓN IA (principal)
    const urlsParaVision = priorizarFotosParaVision(fotos, MAX_FOTOS_VISION);

    const imagenesBase64 = [];
    for (let i = 0; i < urlsParaVision.length; i++) {
      const src = urlsParaVision[i];
      const dataUrl = await cargarImagenComoBase64(src);
      if (dataUrl) {
        // server.js acepta objetos con {dataUrl} o strings data:
        imagenesBase64.push({ src, dataUrl });
      }
    }

    // 2) Llamada a visión IA
    let visionInfo = null;
    let bestVinAI = null;
    let bestPlateAI = null;

    if (imagenesBase64.length) {
      visionInfo = await llamarApiVisionLocal(imagenesBase64, datos);

      if (visionInfo && visionInfo.ok && visionInfo.data) {
        const dAI = visionInfo.data;
        const vinVal = dAI.bestVin?.value || (typeof dAI.bestVin === "string" ? dAI.bestVin : null);
        const plateVal = dAI.bestPlate?.value || (typeof dAI.bestPlate === "string" ? dAI.bestPlate : null);

        bestVinAI = vinVal ? String(vinVal).toUpperCase().trim() : null;
        bestPlateAI = plateVal ? String(plateVal).toUpperCase().trim() : null;
      }
    }

    // 3) FOTOS PARA OCR (respaldo)
    const fotosAAnalizar = ENABLE_OCR_BACKUP
      ? fotos
          .slice(0, MAX_FOTOS_OCR)
          .map((f) =>
            typeof f === "string" ? f : (f && (f.src || f.url || f.href)) || ""
          )
          .filter(Boolean)
      : [];

    // Mensaje de progreso
    status.textContent =
      `Analizando fotos: Visión IA (${imagenesBase64.length}/${urlsParaVision.length} preparadas) ` +
      (ENABLE_OCR_BACKUP ? `+ OCR respaldo (${fotosAAnalizar.length}/${totalFotos}).` : "(solo Visión IA).");

    // 4) OCR respaldo
    const vinsDetectados = new Set();
    let placaCoincide = false;
    const palabrasImportDetectadas = new Set();

    if (ENABLE_OCR_BACKUP && fotosAAnalizar.length) {
      for (let i = 0; i < fotosAAnalizar.length; i++) {
        const src = fotosAAnalizar[i];
        try {
          const texto = await ocrImagenSrc(src);

          const vins = extraerVinsDeTexto(texto);
          vins.forEach((v) => vinsDetectados.add(v));

          const textoNorm = textoNormalizadoParaBusqueda(texto);
          if (coincidePlacaConTexto(placasEsperadasNorm, textoNorm)) {
            placaCoincide = true;
          }

          const textoMayus = texto.toUpperCase();
          OCR_IMPORT_KEYWORDS.forEach((kw) => {
            if (textoMayus.includes(kw)) palabrasImportDetectadas.add(kw);
          });
        } catch (e) {
          console.warn("[Copiloto] OCR falló en foto", i, e);
        }
      }
    }

    // 5) Construir mensajes (IA primero, OCR como respaldo)
    const mensajes = [];
    const iconos = { ok: "✅", warn: "⚠️", info: "ℹ️" };

    mensajes.push({
      tipo: "info",
      html:
        `<strong>Análisis completado:</strong> Visión IA procesó <strong>${imagenesBase64.length}</strong> fotos ` +
        (ENABLE_OCR_BACKUP
          ? `y OCR (respaldo) analizó <strong>${fotosAAnalizar.length}</strong> de <strong>${totalFotos}</strong> fotos.`
          : `y OCR está desactivado.`),
    });

    // VIN (IA)
    if (vinEsperado) {
      if (bestVinAI) {
        mensajes.push(
          bestVinAI === vinEsperado
            ? {
                tipo: "ok",
                html:
                  `<strong>VIN (IA) confirmado:</strong> la IA detectó <strong>${bestVinAI}</strong> ` +
                  `y coincide con el VIN del expediente.`,
              }
            : {
                tipo: "warn",
                html:
                  `<strong>VIN (IA) no coincide:</strong> la IA detectó <strong>${bestVinAI}</strong>, ` +
                  `pero el expediente indica <strong>${vinEsperado}</strong>. Revisar imagen y documentación.`,
              }
        );
      } else {
        mensajes.push({
          tipo: "warn",
          html:
            `<strong>VIN no identificado (IA):</strong> la IA no logró leer claramente el VIN en las fotos analizadas.`,
        });
      }
    } else if (bestVinAI) {
      mensajes.push({
        tipo: "info",
        html:
          `<strong>VIN (IA) detectado:</strong> la IA identificó el VIN <strong>${bestVinAI}</strong> en las fotografías.`,
      });
    }

    // VIN (OCR respaldo)
    if (ENABLE_OCR_BACKUP) {
      if (vinEsperado) {
        if (vinsDetectados.has(vinEsperado)) {
          mensajes.push({
            tipo: "ok",
            html:
              `<strong>VIN (OCR respaldo):</strong> el VIN del expediente (<strong>${vinEsperado}</strong>) ` +
              `también se detectó en al menos una foto.`,
          });
        } else if (vinsDetectados.size > 0) {
          mensajes.push({
            tipo: "info",
            html:
              `<strong>VIN posibles (OCR respaldo):</strong> se detectaron posibles VIN: ` +
              `<strong>${Array.from(vinsDetectados).join(", ")}</strong>.`,
          });
        } else {
          mensajes.push({
            tipo: "info",
            html:
              `<strong>VIN no identificado (OCR respaldo):</strong> el OCR no logró leer claramente el VIN.`,
          });
        }
      } else if (vinsDetectados.size > 0) {
        mensajes.push({
          tipo: "info",
          html:
            `<strong>VIN posibles (OCR):</strong> <strong>${Array.from(vinsDetectados).join(", ")}</strong>.`,
        });
      }
    }

    // Placas (IA)
    if (placasEsperadasNorm) {
      if (bestPlateAI) {
        const placaAI_norm = normalizarPlacas(bestPlateAI);
        mensajes.push(
          placaAI_norm === placasEsperadasNorm
            ? {
                tipo: "ok",
                html:
                  `<strong>Placas (IA) confirmadas:</strong> la IA leyó <strong>${bestPlateAI}</strong> ` +
                  `y coincide con la placa del expediente.`,
              }
            : {
                tipo: "warn",
                html:
                  `<strong>Placas (IA) no coinciden:</strong> la IA leyó <strong>${bestPlateAI}</strong>, ` +
                  `pero el expediente indica <strong>${datos.placas}</strong>. Revisar imagen y tarjeta de circulación.`,
              }
        );
      } else {
        mensajes.push({
          tipo: "warn",
          html:
            `<strong>Placas no identificadas (IA):</strong> la IA no logró leer claramente la placa en las fotos analizadas.`,
        });
      }
    } else if (bestPlateAI) {
      mensajes.push({
        tipo: "info",
        html:
          `<strong>Placas (IA) detectadas:</strong> la IA identificó <strong>${bestPlateAI}</strong> en las fotos.`,
      });
    }

    // Placas (OCR respaldo)
    if (ENABLE_OCR_BACKUP && placasEsperadasNorm) {
      mensajes.push(
        placaCoincide
          ? {
              tipo: "ok",
              html:
                `<strong>Placas (OCR respaldo):</strong> las placas del expediente (<strong>${datos.placas}</strong>) ` +
                `aparecen en al menos una foto.`,
            }
          : {
              tipo: "info",
              html:
                `<strong>Placas no detectadas (OCR respaldo):</strong> el OCR no encontró claramente la placa ` +
                `<strong>${datos.placas}</strong>.`,
            }
      );
    }

    // Contexto importación (OCR)
    if (ENABLE_OCR_BACKUP) {
      const listaImport = Array.from(palabrasImportDetectadas);
      mensajes.push(
        listaImport.length
          ? {
              tipo: "warn",
              html:
                `<strong>Contexto de importación (OCR respaldo):</strong> palabras detectadas: ` +
                `<strong>${listaImport.join(", ")}</strong>.`,
            }
          : {
              tipo: "info",
              html:
                `<strong>Contexto de importación (OCR respaldo):</strong> no se detectaron palabras típicas ` +
                `(<em>COPART</em>, <em>IAAI</em>, <em>SALVAGE</em>, etc.).`,
            }
      );
    }

    // Estado API visión
    if (visionInfo && visionInfo.ok) {
      mensajes.push({
        tipo: "info",
        html:
          `<strong>Visión IA:</strong> la API local respondió correctamente. ` +
          `El resumen se muestra en "Historial público del vehículo".`,
      });
    } else if (imagenesBase64.length) {
      mensajes.push({
        tipo: "warn",
        html:
          `<strong>Visión IA:</strong> no se pudo contactar correctamente la API local. ` +
          `Confirma que el servidor esté activo en <code>http://localhost:3000</code>.`,
      });
    } else {
      mensajes.push({
        tipo: "warn",
        html:
          `<strong>Visión IA:</strong> no se pudieron preparar imágenes (base64). Revisa CORS/permisos/URLs de fotos.`,
      });
    }

    // Render visual
    status.innerHTML = `
      <div class="ocr-list">
        ${mensajes
          .map(
            (m) => `
            <div class="ocr-item ocr-${m.tipo}">
              <span class="ocr-icon">${iconos[m.tipo] || ""}</span>
              <span class="ocr-text">${m.html}</span>
            </div>
          `
          )
          .join("")}
      </div>
    `;
  })();

  // Timeout global
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout global de análisis de fotos")), GLOBAL_TIMEOUT_MS)
  );

  return Promise.race([trabajoPrincipal, timeout]);
}

// Evento del botón
document.getElementById("probar-ocr")?.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    await analizarFotosVinYPlacas();
  } catch (err) {
    console.warn("[Copiloto] Error al analizar fotos con OCR/IA:", err);
    let status = document.getElementById("ocr-status");
    if (!status) {
      const vehiculoSection = document.getElementById("vehiculo");
      status = document.createElement("p");
      status.id = "ocr-status";
      status.className = "vehiculo-note";
      vehiculoSection.appendChild(status);
    }
    status.textContent =
      "No fue posible ejecutar el análisis de fotos (IA / OCR). Revisa la consola para más detalles.";
  }
});

// ==========================================================================
// Herramientas externas: Historial público (Google) y REPUVE
// ==========================================================================

function getCampoVehiculo(idVehiculo, idSolicitud) {
  const elVeh = idVehiculo ? document.getElementById(idVehiculo) : null;
  const elSol = idSolicitud ? document.getElementById(idSolicitud) : null;

  const txt =
    (elVeh && elVeh.textContent) || (elSol && elSol.textContent) || "";

  return txt.trim().replace(/^—+$/, "");
}

async function copiarAlPortapapeles(texto) {
  if (!texto) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(texto);
    } else {
      const ta = document.createElement("textarea");
      ta.value = texto;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  } catch (e) {
    console.warn("[Copiloto] No se pudo copiar al portapapeles:", e);
  }
}

function abrirEnNuevaPestana(url) {
  try {
    const api = getExtApi();
    if (api && api.tabs && api.tabs.create) {
      api.tabs.create({ url });
      return;
    }
  } catch (e) {
    console.warn("[Copiloto] No se pudo usar tabs.create:", e);
  }
  window.open(url, "_blank");
}

const btnBuscarHistorial =
  document.getElementById("btn-buscar-historial") ||
  document.getElementById("btn-search-history-vin");

if (btnBuscarHistorial) {
  btnBuscarHistorial.addEventListener("click", () => {
    const vin = getCampoVehiculo("veh-vin", "vin").replace(/[^A-Za-z0-9]/g, "");

    if (!vin) {
      alert(
        "No se encontró un VIN para este vehículo. Verifica que ya hayas validado el vehículo."
      );
      return;
    }

    const query = encodeURIComponent(vin);
    abrirEnNuevaPestana(`https://www.google.com/search?q=${query}`);

    let note = document.getElementById("public-history-note");
    if (!note) {
      const card = document.getElementById("vehicle-validation-card");
      note = document.createElement("p");
      note.id = "public-history-note";
      note.className = "vehiculo-note";
      card.appendChild(note);
    }
    note.textContent = "Se abrió una búsqueda pública con el VIN " + vin;
  });
}

const btnRepuve =
  document.getElementById("btn-abrir-repuve") ||
  document.getElementById("btn-open-repuve");

if (btnRepuve) {
  btnRepuve.addEventListener("click", async () => {
    const vin = getCampoVehiculo("veh-vin", "vin");
    const placas = getCampoVehiculo("veh-placas", "placas");
    const rawDato = vin || placas;

    if (!rawDato) {
      alert(
        "No se encontró VIN ni placas en el panel. Verifica la información del vehículo."
      );
      return;
    }

    const dato = rawDato.replace(/[^A-Za-z0-9]/g, "");
    await copiarAlPortapapeles(dato);

    const url = "https://www2.repuve.gob.mx:8443/ciudadania/";
    abrirEnNuevaPestana(url);
  });
}
