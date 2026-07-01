// ------------------------------------------------------
// CONFIG
// ------------------------------------------------------

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

      // On ignore seulement les lignes sans date du tout
      if (!nextDate) return;

      // Ponctuel → utiliser la colonne "jour"
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
// TRI PAR DATE & Hors saison à la fin
// ------------------------------------------------------

function sortEvents(events) {
  return events.sort((a, b) => {
    const aHS = (a.prochain_spectacle || "").trim().toLowerCase().startsWith("hors saison");
    const bHS = (b.prochain_spectacle || "").trim().toLowerCase().startsWith("hors saison");

    // 1. Les Hors Saison vont toujours à la fin
    if (aHS && !bHS) return 1;
    if (!aHS && bHS) return -1;

    // 2. Si les deux sont Hors Saison → garder l'ordre d'origine
    if (aHS && bHS) return 0;

    // 3. Sinon, tri normal par date
    const da = new Date(a.prochain_spectacle);
    const db = new Date(b.prochain_spectacle);
    return da - db;
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

    // Génération du lien Google Maps
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

      <p><strong>Date :</strong> ${rawDate}</p>
      ${heure ? `<p><strong>Heure :</strong> ${heure}</p>` : ""}

      ${
        lieu
          ? `<p><strong>Lieu :</strong> ${
              mapsLink ? `<a href="${mapsLink}" target="_blank">${lieu}</a>` : lieu
            }</p>`
          : ""
      }

      ${adresse ? `<p><strong>Adresse :</strong> ${adresse}</p>` : ""}
      ${description ? `<p class="desc">${description}</p>` : ""}
    `;

    container.appendChild(card);
  });
}

// ------------------------------------------------------
// SÉLECTION DU JOUR
// ------------------------------------------------------

async function selectDay(day) {
  const data = await loadData();
  const events = sortEvents(data[day] || []);
  renderEvents(events);

  document.querySelectorAll(".day-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  document.getElementById(`btn-${day}`).classList.add("active");
}

// ------------------------------------------------------
// CHARGEMENT INITIAL
// ------------------------------------------------------

selectDay("lundi");
