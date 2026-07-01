// ------------------------------------------------------
// CONFIG
// ------------------------------------------------------
let currentDayEvents = [];
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
// CHARGEMENT DES DONNÉES
// ------------------------------------------------------

async function loadData() {
  const allEvents = {
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
        if (allEvents[targetDay]) {
          allEvents[targetDay].push(item);
        }
      } else {
        allEvents[key].push(item);
      }
    });
  }

  return allEvents;
}

// ------------------------------------------------------
// TRI : Hors Saison à la fin
// ------------------------------------------------------

function sortEvents(events) {
  return events.sort((a, b) => {
    const aHS = (a.prochain_spectacle || "").trim().toLowerCase().startsWith("hors saison");
    const bHS = (b.prochain_spectacle || "").trim().toLowerCase().startsWith("hors saison");

    if (aHS && !bHS) return 1;
    if (!aHS && bHS) return -1;
    if (aHS && bHS) return 0;

    const da = new Date(a.prochain_spectacle);
    const db = new Date(b.prochain_spectacle);
    return da - db;
  });
}

// ------------------------------------------------------
// FILTRES DYNAMIQUES (Type + Ville)
// ------------------------------------------------------

function populateFilters(events) {
  const typeSelect = document.getElementById("filter-type");
  const villeSelect = document.getElementById("filter-ville");

  const types = new Set();
  const villes = new Set();

  events.forEach(ev => {
    if (ev.type) types.add((ev.type || "").trim());
    if (ev.ville) villes.add((ev.ville || "").trim());
  });

  typeSelect.innerHTML =
    `<option value="">Type : Tous</option>` +
    [...types].map(t => `<option value="${t}">${t}</option>`).join("");

  villeSelect.innerHTML =
    `<option value="">Ville : Toutes</option>` +
    [...villes].map(v => `<option value="${v}">${v}</option>`).join("");
}

// ------------------------------------------------------
// APPLICATION DES FILTRES COMBINÉS
// ------------------------------------------------------

function applyFilters() {
  const type = document.getElementById("filter-type").value.toLowerCase();
  const ville = document.getElementById("filter-ville").value.toLowerCase();

  return currentDayEvents.filter(ev => {
    const evType = (ev.type || "").toLowerCase().trim();
    const evVille = (ev.ville || "").toLowerCase().trim();

    const matchType = !type || evType === type;
    const matchVille = !ville || evVille === ville;

    return matchType && matchVille;
  });
}

// ------------------------------------------------------
// AFFICHAGE DES CARTES
// ------------------------------------------------------

function renderEvents(events) {
  const container = document.getElementById("events");
  container.innerHTML = "";

  if (!events || events.length === 0) {
    container.innerHTML = `<p class="no-events">Aucun événement pour ce jour.</p>`;
    return;
  }

  events.forEach(item => {
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

    const card = document.createElement("div");
    card.className = "event-card";

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

    container.appendChild(card);
  });
}

// ------------------------------------------------------
// SÉLECTION DU JOUR + FILTRES COMBINÉS
// ------------------------------------------------------

async function selectDay(day) {
  const data = await loadData();
  currentDayEvents = sortEvents(data[day] || []);

  populateFilters(currentDayEvents);

  const filtered = applyFilters();
  renderEvents(filtered);

  document.querySelectorAll(".day-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  document.getElementById(`btn-${day}`).classList.add("active");

  document.getElementById("filter-type").onchange = () => {
    renderEvents(applyFilters());
  };
  document.getElementById("filter-ville").onchange = () => {
    renderEvents(applyFilters());
  };
}

// ------------------------------------------------------
// CHARGEMENT INITIAL
// ------------------------------------------------------

selectDay("lundi");
