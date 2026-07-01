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

      // Ignorer les hors saison
      if (!nextDate || nextDate === "Hors saison") return;

      // Ponctuel → utiliser la colonne "jour"
      if (key === "ponctuel") {
        const targetDay = (item.jour || "").toLowerCase();
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
// TRI PAR DATE
// ------------------------------------------------------

function sortEvents(events) {
  return events.sort((a, b) => {
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
    const nextDate = item.prochain_spectacle;
    const title = item.nom || "Sans titre";
    const ville = item.ville || "";
    const lieu = item.lieu || "";
    const adresse = item.adresse || "";
    const description = item.description || "";
    const heure = item.heure || "";

    // Badges
    const isPonctuel = item.jour !== undefined && item.jour !== "";
    const isHorsSaison = nextDate === "Hors saison";

    const card = document.createElement("div");
    card.className = "event-card";

    card.innerHTML = `
      <div class="badges">
        ${isPonctuel ? `<span class="badge badge-ponctuel">Ponctuel</span>` : ""}
        ${isHorsSaison ? `<span class="badge badge-hors-saison">Hors saison</span>` : ""}
      </div>

      <h3>${title}</h3>

      <p><strong>Date :</strong> ${nextDate}</p>
      ${heure ? `<p><strong>Heure :</strong> ${heure}</p>` : ""}
      ${ville ? `<p><strong>Ville :</strong> ${ville}</p>` : ""}
      ${lieu ? `<p><strong>Lieu :</strong> ${lieu}</p>` : ""}
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

  document.querySelectorAll(".day-button").forEach(btn => {
    btn.classList.remove("active");
  });
  document.getElementById(`btn-${day}`).classList.add("active");
}

// ------------------------------------------------------
// CHARGEMENT INITIAL
// ------------------------------------------------------

selectDay("lundi");
