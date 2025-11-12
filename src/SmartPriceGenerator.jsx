import React, { useMemo, useState, useEffect } from "react";

/**
 * Smart Price Generator
 * - Base costs embedded (no DB)
 * - Surcharges:
 *   • Disney Hotel (No +10%, only for Disney World)
 *   • Season (High +20%)
 *   • Lead Time (3 days +10%, <3 days +20%)
 *   • Guests variation:
 *       - 5–11  => +10%
 *       - 12–15 => +15%
 *       - 16–20 => +20%
 * - Cost rule:
 *   • Cost increases by HALF of the Final Sale % increase.
 */

const CATEGORY = {
  DISNEY_WORLD: "Disney World",
  DISNEYLAND: "Disneyland Resort",
  UNIVERSAL: "Universal",
  OTHER: "Other Orlando Parks",
};

const PARKS = {
  [CATEGORY.DISNEY_WORLD]: ["Disney World"],
  [CATEGORY.DISNEYLAND]: ["Disneyland Park", "Disney California Adventure"],
  [CATEGORY.UNIVERSAL]: [
    "Universal or Islands (Per Park)",
    "Epic",
    "Universal Hollywood",
  ],
  [CATEGORY.OTHER]: ["Sea World", "Busch Gardens", "Legoland"],
};

const SERVICES = {
  TEAM_USA: "USA Team",
  TEAM_BRAZIL: "Brazil Team",
  STANDARD: "Standard",
  ATTRACTION_ASSISTANCE: "Attraction Assistance",
  HALLOWEEN: "Halloween/Christmas",
};

const TOUR_TYPES = {
  VIRTUAL: "Virtual Tour",
  IN_PERSON: "In-Person Tour",
  VIRTUAL_ASSIST: "Virtual Assistance",
  VIRTUAL_GENERIC: "Virtual",
  PREMIER_VIRTUAL: "Premier Virtual",
};

const LEAD_TIMES = ["7 days", "3 days", "Less than 3 days"];
const SEASONS = ["Low", "High"];
const MIN_HOURS = 6;

// ---------- Guests variation ----------
const GUEST_VARIATION = [
  { min: 1, max: 4, adj: 0.0 },
  { min: 5, max: 11, adj: 0.10 },
  { min: 12, max: 15, adj: 0.15 },
  { min: 16, max: 20, adj: 0.20 },
];
function getGuestAdj(guests) {
  const tier = GUEST_VARIATION.find((t) => guests >= t.min && guests <= t.max);
  return tier ? tier.adj : 0;
}

// ---------- Helpers ----------
function rowKey(category, park, service, type) {
  return `${category} | ${park} | ${service} | ${type}`;
}
function expandRange(cost, sale, start, end) {
  const rows = [];
  for (let n = start; n <= end; n++) rows.push({ n, cost, sale });
  return rows;
}
const cloneRows = (rows) => rows.map((r) => ({ ...r }));

// ---------- Base data ----------
const BASE_DATA = (() => {
  const data = new Map();

  const dwUsaVirtual = [
    { n: 1, cost: 65, sale: 150 },
    { n: 2, cost: 85, sale: 170 },
    { n: 3, cost: 135, sale: 210 },
    { n: 4, cost: 135, sale: 220 },
    { n: 5, cost: 135, sale: 240 },
    { n: 6, cost: 135, sale: 260 },
    { n: 7, cost: 185, sale: 370 },
    { n: 8, cost: 185, sale: 390 },
    { n: 9, cost: 185, sale: 400 },
    { n: 10, cost: 285, sale: 530 },
    { n: 11, cost: 285, sale: 560 },
    { n: 12, cost: 285, sale: 580 },
    { n: 13, cost: 335, sale: 600 },
    { n: 14, cost: 335, sale: 650 },
    { n: 15, cost: 435, sale: 750 },
    { n: 16, cost: 464, sale: 800 },
    { n: 17, cost: 493, sale: 850 },
    { n: 18, cost: 522, sale: 900 },
    { n: 19, cost: 551, sale: 950 },
    { n: 20, cost: 580, sale: 1000 },
  ];
  data.set(
    rowKey(CATEGORY.DISNEY_WORLD, "Disney World", SERVICES.TEAM_USA, TOUR_TYPES.VIRTUAL),
    dwUsaVirtual
  );

  const dwBrVirtual = [
    { n: 1, cost: 40, sale: 120 },
    { n: 2, cost: 45, sale: 140 },
    { n: 3, cost: 55, sale: 190 },
    { n: 4, cost: 65, sale: 190 },
    { n: 5, cost: 65, sale: 220 },
    { n: 6, cost: 65, sale: 240 },
    { n: 7, cost: 75, sale: 260 },
    { n: 8, cost: 75, sale: 280 },
    { n: 9, cost: 75, sale: 300 },
    { n: 10, cost: 85, sale: 320 },
    { n: 11, cost: 85, sale: 320 },
    { n: 12, cost: 85, sale: 320 },
    { n: 13, cost: 95, sale: 350 },
    { n: 14, cost: 95, sale: 400 },
    { n: 15, cost: 105, sale: 450 },
    { n: 16, cost: 115, sale: 500 },
    { n: 17, cost: 125, sale: 550 },
    { n: 18, cost: 135, sale: 600 },
    { n: 19, cost: 145, sale: 650 },
    { n: 20, cost: 155, sale: 700 },
  ];
  data.set(
    rowKey(CATEGORY.DISNEY_WORLD, "Disney World", SERVICES.TEAM_BRAZIL, TOUR_TYPES.VIRTUAL),
    dwBrVirtual
  );

  data.set(
    rowKey(CATEGORY.DISNEY_WORLD, "Disney World", SERVICES.TEAM_USA, TOUR_TYPES.PREMIER_VIRTUAL),
    cloneRows(dwBrVirtual)
  );

  data.set(
    rowKey(CATEGORY.DISNEY_WORLD, "Disney World", SERVICES.ATTRACTION_ASSISTANCE, TOUR_TYPES.VIRTUAL_ASSIST),
    [
      ...expandRange(40, 80, 1, 6),
      ...expandRange(60, 120, 7, 12),
      ...expandRange(80, 160, 13, 15),
    ]
  );

  data.set(
    rowKey(CATEGORY.DISNEY_WORLD, "Disney World", SERVICES.HALLOWEEN, TOUR_TYPES.VIRTUAL_GENERIC),
    [
      ...expandRange(60, 120, 1, 10),
      ...expandRange(90, 140, 11, 14),
      ...expandRange(120, 240, 15, 16),
      ...expandRange(80, 200, 17, 18),
    ]
  );

  const uniInPerson = [
    ...expandRange(200, 300, 1, 5),
    { n: 6, cost: 200, sale: 400 },
    ...expandRange(250, 400, 7, 9),
    { n: 10, cost: 250, sale: 600 },
    { n: 11, cost: 250, sale: 600 },
    { n: 12, cost: 250, sale: 600 },
    { n: 13, cost: 250, sale: 600 },
    { n: 14, cost: 300, sale: 700 },
    ...expandRange(300, 700, 15, 20),
  ];
  data.set(
    rowKey(CATEGORY.UNIVERSAL, "Universal or Islands (Per Park)", SERVICES.STANDARD, TOUR_TYPES.IN_PERSON),
    uniInPerson
  );
  data.set(
    rowKey(CATEGORY.UNIVERSAL, "Universal or Islands (Per Park)", SERVICES.STANDARD, TOUR_TYPES.VIRTUAL),
    uniInPerson.map(({ n, cost, sale }) => ({ n, cost: Math.round(cost / 2), sale: Math.round(sale / 2) }))
  );

  const epicInPerson = [
    ...expandRange(200, 550, 1, 5),
    { n: 6, cost: 200, sale: 650 },
    ...expandRange(250, 650, 7, 10),
    ...expandRange(250, 800, 11, 13),
    ...expandRange(300, 1000, 14, 20),
  ];
  data.set(rowKey(CATEGORY.UNIVERSAL, "Epic", SERVICES.STANDARD, TOUR_TYPES.IN_PERSON), epicInPerson);
  data.set(
    rowKey(CATEGORY.UNIVERSAL, "Epic", SERVICES.STANDARD, TOUR_TYPES.VIRTUAL),
    epicInPerson.map(({ n, cost, sale }) => ({ n, cost: Math.round(cost / 2), sale: Math.round(sale / 2) }))
  );

  const uHInPerson = [
    ...expandRange(300, 600, 1, 5),
    ...expandRange(400, 800, 6, 10),
    ...expandRange(500, 1000, 11, 13),
    ...expandRange(600, 1200, 14, 20),
  ];
  data.set(
    rowKey(CATEGORY.UNIVERSAL, "Universal Hollywood", SERVICES.STANDARD, TOUR_TYPES.IN_PERSON),
    uHInPerson
  );
  data.set(
    rowKey(CATEGORY.UNIVERSAL, "Universal Hollywood", SERVICES.STANDARD, TOUR_TYPES.VIRTUAL),
    uHInPerson.map(({ n, cost, sale }) => ({ n, cost: Math.round(cost / 2), sale: Math.round(sale / 2) }))
  );

  const otherTemplate = [
    ...expandRange(200, 300, 1, 5),
    { n: 6, cost: 200, sale: 400 },
    ...expandRange(250, 400, 7, 9),
    { n: 10, cost: 250, sale: 600 },
    { n: 11, cost: 250, sale: 600 },
    { n: 12, cost: 250, sale: 600 },
    { n: 13, cost: 250, sale: 600 },
    { n: 14, cost: 300, sale: 700 },
    ...expandRange(300, 700, 15, 20),
  ];
  ["Sea World", "Busch Gardens", "Legoland"].forEach((p) => {
    data.set(rowKey(CATEGORY.OTHER, p, SERVICES.STANDARD, TOUR_TYPES.IN_PERSON), otherTemplate);
  });

  const dlVirtual = [
    { n: 1, cost: 100, sale: 200 },
    { n: 2, cost: 110, sale: 220 },
    { n: 3, cost: 120, sale: 230 },
    { n: 4, cost: 130, sale: 240 },
    { n: 5, cost: 140, sale: 260 },
    { n: 6, cost: 185, sale: 280 },
    { n: 7, cost: 185, sale: 370 },
    { n: 8, cost: 185, sale: 390 },
    { n: 9, cost: 185, sale: 420 },
    { n: 10, cost: 285, sale: 530 },
    { n: 11, cost: 285, sale: 560 },
    { n: 12, cost: 285, sale: 580 },
    { n: 13, cost: 335, sale: 600 },
    { n: 14, cost: 335, sale: 650 },
    { n: 15, cost: 435, sale: 650 },
    { n: 16, cost: 435, sale: 670 },
    { n: 17, cost: 485, sale: 690 },
    { n: 18, cost: 485, sale: 700 },
    { n: 19, cost: 535, sale: 750 },
    { n: 20, cost: 535, sale: 800 },
  ];
  const dlInPerson = [
    { n: 1, cost: 360, sale: 425 },
    { n: 2, cost: 360, sale: 455 },
    { n: 3, cost: 360, sale: 475 },
    { n: 4, cost: 360, sale: 495 },
    { n: 5, cost: 360, sale: 515 },
    { n: 6, cost: 360, sale: 585 },
    { n: 7, cost: 400, sale: 605 },
    { n: 8, cost: 420, sale: 625 },
    { n: 9, cost: 440, sale: 645 },
    { n: 10, cost: 460, sale: 950 },
    { n: 11, cost: 480, sale: 1000 },
    { n: 12, cost: 500, sale: 1200 },
    { n: 13, cost: 520, sale: 1200 },
    { n: 14, cost: 540, sale: 1300 },
    { n: 15, cost: 580, sale: 1500 },
    { n: 16, cost: 600, sale: 1600 },
    { n: 17, cost: 620, sale: 1700 },
    { n: 18, cost: 640, sale: 1800 },
    { n: 19, cost: 660, sale: 1800 },
    { n: 20, cost: 660, sale: 2000 },
  ];
  ["Disneyland Park", "Disney California Adventure"].forEach((p) => {
    data.set(rowKey(CATEGORY.DISNEYLAND, p, SERVICES.STANDARD, TOUR_TYPES.VIRTUAL), dlVirtual);
    data.set(rowKey(CATEGORY.DISNEYLAND, p, SERVICES.STANDARD, TOUR_TYPES.IN_PERSON), dlInPerson);
  });

  return data;
})();

function getBaseForGuests(category, park, service, type, guests) {
  const key = rowKey(category, park, service, type);
  const rows = BASE_DATA.get(key);
  if (!rows) return null;
  return rows.find((r) => r.n === guests) || null;
}

function currency(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default function SmartPriceGenerator() {
  const [category, setCategory] = useState(CATEGORY.DISNEY_WORLD);
  const [park, setPark] = useState(PARKS[CATEGORY.DISNEY_WORLD][0]);

  const serviceOptions = useMemo(() => {
    if (category === CATEGORY.DISNEY_WORLD)
      return [SERVICES.TEAM_USA, SERVICES.TEAM_BRAZIL, SERVICES.ATTRACTION_ASSISTANCE, SERVICES.HALLOWEEN];
    if (category === CATEGORY.UNIVERSAL) return [SERVICES.STANDARD];
    if (category === CATEGORY.DISNEYLAND) return [SERVICES.STANDARD];
    return [SERVICES.STANDARD];
  }, [category]);
  const [service, setService] = useState(serviceOptions[0]);

  const tourTypeOptions = useMemo(() => {
    if (service === SERVICES.ATTRACTION_ASSISTANCE) return [TOUR_TYPES.VIRTUAL_ASSIST];
    if (service === SERVICES.HALLOWEEN) return [TOUR_TYPES.VIRTUAL_GENERIC];
    if (category === CATEGORY.DISNEY_WORLD) return [TOUR_TYPES.VIRTUAL, TOUR_TYPES.PREMIER_VIRTUAL];
    if (category === CATEGORY.UNIVERSAL) return [TOUR_TYPES.IN_PERSON, TOUR_TYPES.VIRTUAL];
    if (category === CATEGORY.DISNEYLAND) return [TOUR_TYPES.VIRTUAL, TOUR_TYPES.IN_PERSON];
    return [TOUR_TYPES.IN_PERSON];
  }, [category, service]);
  const [tourType, setTourType] = useState(tourTypeOptions[0]);

  const [guests, setGuests] = useState(4);
  const [hotel, setHotel] = useState("Yes");
  const [leadTime, setLeadTime] = useState(LEAD_TIMES[0]);
  const [season, setSeason] = useState(SEASONS[0]);

  // keep selections valid
  useEffect(() => {
    if (!PARKS[category].includes(park)) setPark(PARKS[category][0]);
  }, [category, park]);
  useEffect(() => {
    if (!serviceOptions.includes(service)) setService(serviceOptions[0]);
  }, [serviceOptions, service]);
  useEffect(() => {
    if (!tourTypeOptions.includes(tourType)) setTourType(tourTypeOptions[0]);
  }, [tourTypeOptions, tourType]);

  const baseRow = getBaseForGuests(category, park, service, tourType, guests);
  const baseCost = baseRow?.cost ?? null;
  const baseSale = baseRow?.sale ?? null;

  // Surcharges
  const hotelAdj = park === "Disney World" ? (hotel === "No" ? 0.1 : 0) : 0;
  const seasonAdj = season === "High" ? 0.2 : 0;
  const leadAdj = leadTime === "3 days" ? 0.1 : leadTime === "Less than 3 days" ? 0.2 : 0;
  const guestAdj = getGuestAdj(guests);

  // Multiplicador total que define o aumento do Final Sale
  const totalMultiplier = (1 + hotelAdj) * (1 + seasonAdj) * (1 + leadAdj) * (1 + guestAdj);

  // Final Sale ajustado
  const finalSale = baseSale != null ? Math.round(baseSale * totalMultiplier) : null;

  // >>> NOVO: custo sobe metade da % do Final Sale
  // Ex.: totalMultiplier = 1.30 (30%); costMultiplier = 1 + 0.30/2 = 1.15 (15%)
  const costMultiplier = 1 + (totalMultiplier - 1) / 2;
  const finalCost = baseCost != null ? Math.round(baseCost * costMultiplier) : null;

  const pricePerGuest =
    finalSale != null ? Math.round((finalSale / Math.max(guests, 1)) * 100) / 100 : null;
  const pricePerHour =
    finalSale != null ? Math.round((finalSale / MIN_HOURS) * 100) / 100 : null;

  // Notices
  const notices = [
    "EN: All prices are park-specific and subject to selected surcharges.",
    "PT: Todos os preços são específicos por parque e sujeitos aos acréscimos selecionados.",
  ];
  if (park === "Disney World" && tourType === TOUR_TYPES.IN_PERSON) {
    notices.push("EN: No in-person tour available for Disney World.", "PT: Disney World não possui In-Person Tour.");
  }
  if (service === SERVICES.ATTRACTION_ASSISTANCE && park !== "Disney World") {
    notices.push(
      "EN: Attraction Assistance is only valid for Disney World.",
      "PT: O serviço Attraction Assistance só é válido para o parque Disney World."
    );
  }
  if (park === "Disney World" && service === SERVICES.ATTRACTION_ASSISTANCE) {
    notices.push("EN: Remember: this service covers only 2 attractions.", "PT: Lembre-se: este serviço cobre apenas 2 atrações.");
  }
  if (guests > 12) {
    notices.push(
      "EN: Large group—consider splitting into 2+ services if there’s a big age difference.",
      "PT: Grupo grande — considere dividir em 2+ serviços se houver grande diferença de idade."
    );
  }
  if (park === "Epic" || park === "Universal Hollywood") {
    notices.push("EN: Add the guide’s park ticket to the total ($300+).", "PT: Adicione o ingresso do guia ao total (US$300+).");
  }
  if (category === CATEGORY.DISNEYLAND) {
    notices.push(
      "EN: Remind the client which attractions are included in Lightning Lane.",
      "PT: Avise o cliente das atrações incluídas no Lightning Lane."
    );
  }
  if (park === "Disney World" && service === SERVICES.HALLOWEEN) {
    notices.push("EN: Special event: client may enter the park from 4:00 PM.", "PT: Evento especial: o cliente pode entrar no parque a partir das 16h.");
  }
  if (!baseRow) {
    notices.push(
      "EN: No base price for this combination (check Category/Park/Service/Tour Type/Guests).",
      "PT: Sem preço base para esta combinação (confira Categoria/Parque/Serviço/Tipo/Convidados)."
    );
  }

  // ---- UI helpers ----
  const labelCls = "text-sm font-medium text-slate-700";
  const boxCls = "rounded-2xl border border-slate-200 bg-white shadow-sm p-5 hover:shadow transition";
  const selectCls = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300";
  const pillCls = "inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100";

  // ---- Guests Stepper ----
  function clampGuests(n) {
    return Math.max(1, Math.min(20, n));
  }
  function inc() {
    setGuests((g) => clampGuests(g + 1));
  }
  function dec() {
    setGuests((g) => clampGuests(g - 1));
  }
  function onGuestsChange(e) {
    const onlyDigits = (e.target.value || "").replace(/\D+/g, "");
    const n = onlyDigits === "" ? 1 : parseInt(onlyDigits, 10);
    setGuests(clampGuests(Number.isNaN(n) ? 1 : n));
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-50 to-white text-slate-900">
      <header className="mx-auto max-w-6xl px-6 pt-10 pb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Smart Price Generator</h1>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: selectors */}
        <section className={boxCls + " lg:col-span-2"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className={labelCls}>Category</label>
              <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.values(CATEGORY).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Park */}
            <div>
              <label className={labelCls}>Park</label>
              <select className={selectCls} value={park} onChange={(e) => setPark(e.target.value)}>
                {PARKS[category].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Service/Team */}
            <div>
              <label className={labelCls}>Service / Team</label>
              <select className={selectCls} value={service} onChange={(e) => setService(e.target.value)}>
                {serviceOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Tour Type */}
            <div>
              <label className={labelCls}>Tour Type</label>
              <select className={selectCls} value={tourType} onChange={(e) => setTourType(e.target.value)}>
                {tourTypeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Guests — mobile stepper */}
            <div>
              <label className={labelCls}>Guests (1–20)</label>
              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={dec}
                  className="h-11 w-12 shrink-0 rounded-xl border border-slate-300 bg-white text-xl font-bold hover:bg-slate-50 active:scale-95"
                  aria-label="Decrease guests"
                >
                  –
                </button>

                <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={guests}
                    onChange={onGuestsChange}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="h-11 flex-1 min-w-0 text-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-lg font-semibold tracking-wide"
                    />

                <button
                  type="button"
                  onClick={inc}
                  className="h-11 w-12 shrink-0 rounded-xl border border-slate-300 bg-white text-xl font-bold hover:bg-slate-50 active:scale-95"
                  aria-label="Increase guests"
                >
                  +
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">Use os botões ou digite — valores entre 1 e 20.</p>
            </div>

            {/* Disney Hotel? (only for Disney World) */}
            {park === "Disney World" && (
              <div>
                <label className={labelCls}>Disney Hotel?</label>
                <select className={selectCls} value={hotel} onChange={(e) => setHotel(e.target.value)}>
                  {["Yes", "No"].map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Lead Time */}
            <div>
              <label className={labelCls}>Lead Time</label>
              <select className={selectCls} value={leadTime} onChange={(e) => setLeadTime(e.target.value)}>
                {LEAD_TIMES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Season */}
            <div>
              <label className={labelCls}>Season</label>
              <select className={selectCls} value={season} onChange={(e) => setSeason(e.target.value)}>
                {SEASONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Surcharge pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            <span className={pillCls}>Hotel Adj: {(hotelAdj * 100).toFixed(0)}%</span>
            <span className={pillCls}>Season Adj: {(seasonAdj * 100).toFixed(0)}%</span>
            <span className={pillCls}>Lead Time Adj: {(leadAdj * 100).toFixed(0)}%</span>
            <span className={pillCls}>Guests Adj: {(guestAdj * 100).toFixed(0)}%</span>
          </div>
        </section>

        {/* Right: results */}
        <aside className={boxCls}>
          <h2 className="text-lg font-semibold text-slate-900">Result</h2>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {/* Mostra custo AJUSTADO (metade da % do sale) */}
            <Row label="Cost" value={currency(finalCost)} />
            <Row label="Final Sale" value={currency(finalSale)} big />
            <div className="h-px w-full bg-slate-200 my-2" />
            <Row label="Price / Guest" value={currency(pricePerGuest)} />
            <Row label={`Price / Hour (min ${MIN_HOURS}h)`} value={currency(pricePerHour)} />
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Notices (PT/EN)</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
              {notices.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>

          {!baseRow && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
              No base price for this combination (check Category/Park/Service/Tour Type/Guests).
            </div>
          )}
        </aside>
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-xs text-slate-500">
        © {new Date().getFullYear()} MIMO Trips — Pricing helper
      </footer>
    </div>
  );
}

function Row({ label, value, big = false }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-sky-50 px-3 py-2 border border-sky-100">
      <span className="text-slate-700 text-sm">{label}</span>
      <span className={"font-semibold text-slate-900 " + (big ? "text-xl" : "text-base")}>
        {value}
      </span>
    </div>
  );
}
