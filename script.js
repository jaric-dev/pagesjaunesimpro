// ------------------------------------------------------
// CONFIG
// ------------------------------------------------------
let currentDayEvents = [];
let allEvents = {}; // stockage global optimisé
let cachedCards = {}; // cache des cartes DOM

const SPREADSHEET_ID = "1cV5sqtp73WazgB6og_d4aOG4y9HYo3EGePMrBuXAbRs";

const SHEETS = {
  lundi: "Impro_Lundi",
  mardi: "Impro_Mardi",
  mercredi: "Impro_Mercredi",
  jeudi: "Impro_Jeudi",
  vendredi: "Impro_Vendredi",
  samedi: "Impro_Samedi",
  dimanche: "Impro_Dimanche",
  ponctuel: "Impro_Ponctuel"
};

// ------------------------------------------------------
// CHARGEMENT UNIQUE DES DONNÉES + TRI INITIAL
// ------------------------------------------------------
async function loadAllDataOnce() {
  const result = {
    lundi: [],
    mardi: [],
    mercredi: [],
    jeudi: [],
    vendredi: [],
    samedi: [],
    dimanche: []
  };

  for (const [key, sheetName] of Object.entries(SHEETS)) {
    const url = `https://opensheet.elk.sh/${SPREADSHEET_ID}/${sheetName}`;
    const response = await fetch(url);
    const rows = await response.json();

    rows.forEach(item => {
      const nextDate = item.prochain_spectacle;
      if (!nextDate) return;

      if (key === "ponctuel") {
        const targetDay = (item.jour || "").trim().toLowerCase();
        if (result[targetDay]) {
          result[targetDay].push(item);
        }
      } else {
        result[key].push(item);
      }
    });
  }

  // Tri initial une seule fois par jour
  Object.keys(result).forEach(day => {
    result[day] = sortEvents(result[day]);
  });

  return result;
}

// ------------------------------------------------------
// TRI : Hors Saison à la fin, dates valides triées
// ------------------------------------------------------
function parseDate(d) {
  if (!d) return null;
  const parts = d.split("-");
  if (parts.length !== 3) return null;

  const [day, month, year] = parts;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(iso);

  return isNaN(date.getTime()) ? null : date;
}

function sortEvents(events) {
  return events.sort((a, b) => {
    const aRaw = (a.prochain_spectacle || "").trim().toLowerCase();
    const bRaw = (b.prochain_spectacle || "").trim().toLowerCase();

    const aHS = aRaw.startsWith("hors saison");
    const bHS = bRaw.startsWith("hors saison");

    const aAC = aRaw.startsWith("à confirmer");
    const bAC = bRaw.startsWith("à confirmer");

    // 1. Hors Saison à la fin
    if (aHS && !bHS) return 1;
    if (!aHS && bHS) return -1;

    // 2. À confirmer après les dates valides
    if (aAC && !bAC) return 1;
    if (!aAC && bAC) return -1;

    // 3. Tri chronologique des dates valides
    const aDate = aHS || aAC ? null : parseDate(a.prochain_spectacle);
    const bDate = bHS || bAC ? null : parseDate(b.prochain_spectacle);

    if (aDate && bDate) return aDate - bDate;
    if (aDate && !bDate) return -1;
    if (!aDate && bDate) return 1;

    return 0;
  });
}

// ------------------------------------------------------
// FILTRES DYNAMIQUES (Type + Ville)
// ------------------------------------------------------
function populateFilters(events) {
  const typeSelect = document.getElementById("filter-type");
  const villeSelect = document.getElementById("filter-ville");

  typeSelect.options.length = 0;
  villeSelect.options.length = 0;

  typeSelect.add(new Option("Type : Tous", ""));
  villeSelect.add(new Option("Ville : Toutes", ""));

  const types = new Set();
  const villes = new Set();

  events.forEach(ev => {
    if (ev.type) types.add((ev.type || "").trim());
    if (ev.ville) villes.add((ev.ville || "").trim());
  });

  [...types].forEach(t => typeSelect.add(new Option(t, t)));
  [...villes].forEach(v => villeSelect.add(new Option(v, v)));
}

// ------------------------------------------------------
// APPLICATION DES FILTRES
// ------------------------------------------------------
function applyFilters() {
  const type = document.getElementById("filter-type").value.toLowerCase();
  const ville = document.getElementById("filter-ville").value.toLowerCase();
  const hs = document.getElementById("filter-hs").value;

  return currentDayEvents.filter(ev => {
    const evType = (ev.type || "").toLowerCase().trim();
    const evVille = (ev.ville || "").toLowerCase().trim();
    const isHS = (ev.prochain_spectacle || "").trim().toLowerCase().startsWith("hors saison");

    const matchType = !type || evType === type;
    const matchVille = !ville || evVille === ville;

    const matchHS =
      hs === "" ||
      (hs === "hide" && !isHS) ||
      (hs === "only" && isHS);

    return matchType && matchVille && matchHS;
  });
}

function updateDisplay() {
  renderEvents(applyFilters());
}

// ------------------------------------------------------
// AFFICHAGE DES CARTES (cache + animations)
// ------------------------------------------------------
function makeCardKey(item) {
  return `${item.nom || ""}__${item.ville || ""}__${item.prochain_spectacle || ""}`;
}

function renderEvents(events) {
  const container = document.getElementById("events");
  container.innerHTML = "";

  if (!events || events.length === 0) {
    container.innerHTML = `<p class="no-events">Aucun événement pour ce jour.</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  events.forEach((item, index) => {
    const key = makeCardKey(item);
    let card = cachedCards[key];

    if (!card) {
      const rawDate = item.prochain_spectacle || "";
      const normalizedDate = rawDate.trim().toLowerCase();
      const isHorsSaison = normalizedDate.startsWith("hors saison");

      const title = item.nom || "Sans titre";
      const ville = item.ville || "";
      const lieu = item.lieu || "";
      const adresse = item.adresse || "";
      const description = item.description || "";
      const heure = item.heure || "";
      const type = item.type || "";
      const billet = item.billet || "";

      const mapsLink = adresse
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`
        : "";

      card = document.createElement("div");
      card.className = "event-card fade-in"; // classe pour animation CSS

      card.innerHTML = `
        <div class="badges">
          ${isHorsSaison ? `<span class="badge badge-hors-saison">Hors saison</span>` : ""}
        </div>

        <h3>${title}</h3>

        <div class="tags">
          ${type ? `<span class="tag ${type}">${type}</span>` : ""}
          ${ville ? `<span class="tag ville">${ville}</span>` : ""}
        </div>

        <div class="info-box">
          <p><strong>📅 Date :</strong> ${rawDate}</p>
          ${heure ? `<p><strong>⏰ Heure :</strong> ${heure}</p>` : ""}
          ${
            lieu
              ? `<p><strong>📍 Lieu :</strong> ${
                  mapsLink ? `<a href="${mapsLink}" target="_blank">${lieu}</a>` : lieu
                }</p>`
              : ""
          }
          <p><strong>Billet :</strong> ${billet || "?"}</p>
        </div>

        ${description ? `<p class="desc">${description}</p>` : ""}
      `;

      cachedCards[key] = card;
    }

    // petite animation en cascade (stagger)
    card.style.animationDelay = `${index * 40}ms`;

    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

// ------------------------------------------------------
// SÉLECTION DU JOUR
// ------------------------------------------------------
function selectDay(day) {
  currentDayEvents = allEvents[day] || [];
  populateFilters(currentDayEvents);
  updateDisplay();

  document.querySelectorAll(".day-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  document.getElementById(`btn-${day}`).classList.add("active");
}

// ------------------------------------------------------
// INITIALISATION
// ------------------------------------------------------
document.getElementById("filter-type").addEventListener("change", updateDisplay);
document.getElementById("filter-ville").addEventListener("change", updateDisplay);
document.getElementById("filter-hs").addEventListener("change", updateDisplay);

loadAllDataOnce().then(data => {
  allEvents = data;
  selectDay("lundi");
});

// ------------------------------------------------------
// ACCORDÉON MOBILE (Filtres)
// ------------------------------------------------------
const filtersToggle = document.getElementById("filters-toggle");
const filtersContent = document.getElementById("filters-content");

filtersToggle.addEventListener("click", () => {
  const isOpen = filtersContent.classList.toggle("open");
  filtersToggle.classList.toggle("open");
});

// Rendre la fonction accessible aux boutons HTML
window.selectDay = selectDay;
