// ------------------------------------------------------
// 1. Charger les données du Google Sheet
// ------------------------------------------------------

const SHEET_URL =
  "https://opensheet.elk.sh/1cV5sqtp73WazgB6og_d4aOG4y9HYo3EGePMrBuXAbRs/R%C3%A9pertoire";

let fullData = [];

// Chargement initial
async function loadData() {
  const response = await fetch(SHEET_URL);
  fullData = await response.json();
  return fullData;
}

// ------------------------------------------------------
// 2. Mapping des jours
// ------------------------------------------------------

const weekdayMap = {
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
  dimanche: 0,
};

// ------------------------------------------------------
// 3. Détection intelligente des récurrences
// ------------------------------------------------------

function computeNextDate(item) {
  const freq = (item["fréquence"] || "").toLowerCase().trim();
  const details = (item["détails_fréquence"] || "").toLowerCase().trim();
  const dateDebut = (item.date_debut || "").trim();

  // Si aucune date_debut → ne rien calculer (sauf Ponctuel)
  if (dateDebut === "") {
    if (!freq.includes("ponctuel")) {
      return "À confirmer";
    }
  }

  // Extraire le jour depuis les détails si présent
  const weekdayFromDetails = details.match(/lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche/);
  if (weekdayFromDetails) {
    item.jour = weekdayFromDetails[0];
  }

  // 1. Ponctuel → liste de dates
  if (freq.includes("ponctuel")) {
    const raw = details.split(",");
    const dates = raw
      .map(d => new Date(d.trim()))
      .filter(d => !isNaN(d));

    const today = new Date();
    const futureDates = dates.filter(d => d >= today);

    if (futureDates.length === 0) return "À confirmer";

    futureDates.sort((a, b) => a - b);
    return futureDates[0].toLocaleDateString("fr-CA");
  }

  // 2. Hebdomadaire
  if (freq.includes("hebdo")) {
    return computeWeekly(item);
  }

  // 3. Mensuel
  if (freq.includes("mensuel")) {

    if (details.includes("dernier")) {
      return computeLastWeekdayOfMonth(item);
    }

    const nthMatch = details.match(/(1er|premier|2e|deuxième|3e|troisième|4e|quatrième)/);
    if (nthMatch) {
      const nthMap = {
        "1er": 1,
        "premier": 1,
        "2e": 2,
        "deuxième": 2,
        "3e": 3,
        "troisième": 3,
        "4e": 4,
        "quatrième": 4
      };
      return computeNthWeekdayOfMonth(item, nthMap[nthMatch[0]]);
    }

    return computeMonthly(item);
  }

  // 4. À l'année
  if (freq.includes("année")) {
    return computeYearly(item);
  }

  // 5. Autre → irréguliers
  if (freq.includes("autre")) {

    if (details.includes("sur deux") || details.includes("2 semaines")) {
      return computeBiweekly(item);
    }

    if (details.includes("sur trois")) {
      return computeEveryThreeWeeks(item);
    }

    if (details.includes("dernier")) {
      return computeLastWeekdayOfMonth(item);
    }

    const nthMatch = details.match(/(1er|premier|2e|deuxième|3e|troisième|4e|quatrième)/);
    if (nthMatch) {
      const nthMap = {
        "1er": 1,
        "premier": 1,
        "2e": 2,
        "deuxième": 2,
        "3e": 3,
        "troisième": 3,
        "4e": 4,
        "quatrième": 4
      };
      return computeNthWeekdayOfMonth(item, nthMap[nthMatch[0]]);
    }
  }

  return "À confirmer";
}

// ------------------------------------------------------
// 4. Fonctions de calcul des dates
// ------------------------------------------------------

function computeWeekly(item) {
  const today = new Date();
  const target = weekdayMap[(item.jour || "").toLowerCase()];
  if (target === undefined) return "À confirmer";

  const next = new Date(today);
  next.setDate(today.getDate() + ((target - today.getDay() + 7) % 7));
  if (next < today) next.setDate(next.getDate() + 7);

  return next.toLocaleDateString("fr-CA");
}

function computeMonthly(item) {
  const today = new Date();
  const start = new Date(item["date_debut"]);
  if (isNaN(start)) return "À confirmer";

  let next = new Date(today.getFullYear(), today.getMonth(), start.getDate());
  if (next < today) {
    next = new Date(today.getFullYear(), today.getMonth() + 1, start.getDate());
  }

  return next.toLocaleDateString("fr-CA");
}

//  SANS RÉCURSION
function computeLastWeekdayOfMonth(item) {
  const today = new Date();
  const start = new Date(item.date_debut || today);

  let year = start.getFullYear();
  let month = start.getMonth();
  const targetDay = weekdayMap[(item.jour || "").toLowerCase()];
  if (targetDay === undefined) return "À confirmer";

  while (true) {
    let last = null;

    for (let d = 1; d <= 31; d++) {
      const date = new Date(year, month, d);
      if (date.getMonth() !== month) break;
      if (date.getDay() === targetDay) last = date;
    }

    if (!last) return "À confirmer";

    if (last >= today) {
      return last.toLocaleDateString("fr-CA");
    }

    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }
}

function computeNthWeekdayOfMonth(item, n) {
  const today = new Date();
  const start = new Date(item.date_debut || today);

  let year = start.getFullYear();
  let month = start.getMonth();
  const targetDay = weekdayMap[(item.jour || "").toLowerCase()];
  if (targetDay === undefined) return "À confirmer";

  while (true) {
    let count = 0;
    let nth = null;

    for (let d = 1; d <= 31; d++) {
      const date = new Date(year, month, d);
      if (date.getMonth() !== month) break;
      if (date.getDay() === targetDay) {
        count++;
        if (count === n) {
          nth = date;
          break;
        }
      }
    }

    if (!nth) return "À confirmer";

    if (nth >= today) {
      return nth.toLocaleDateString("fr-CA");
    }

    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }
}

function computeBiweekly(item) {
  const today = new Date();
  const start = new Date(item["date_debut"]);
  if (isNaN(start)) return "À confirmer";

  let next = new Date(start);

  while (next < today) {
    next.setDate(next.getDate() + 14);
  }

  return next.toLocaleDateString("fr-CA");
}

function computeEveryThreeWeeks(item) {
  const today = new Date();
  const start = new Date(item["date_debut"]);
  if (isNaN(start)) return "À confirmer";

  let next = new Date(start);

  while (next < today) {
    next.setDate(next.getDate() + 21);
  }

  return next.toLocaleDateString("fr-CA");
}

function computeYearly(item) {
  const today = new Date();
  const start = new Date(item["date_debut"]);
  if (isNaN(start)) return "À confirmer";

  let next = new Date(today.getFullYear(), start.getMonth(), start.getDate());
  if (next < today) {
    next = new Date(today.getFullYear() + 1, start.getMonth(), start.getDate());
  }

  return next.toLocaleDateString("fr-CA");
}

// ------------------------------------------------------
// 5. Affichage des événements
// ------------------------------------------------------

function renderEvents(events) {
  const container = document.getElementById("events");
  if (!container) return;

  container.innerHTML = "";

  if (events.length === 0) {
    container.innerHTML = `<p>Aucun événement pour ce jour.</p>`;
    return;
  }
// Trier les événements par date
events.sort((a, b) => {
  const da = parseNextDate(a);
  const db = parseNextDate(b);

  // Cas 1 : les deux dates sont valides
  if (da && db) return da - db;

  // Cas 2 : a a une date, b n'en a pas → a en premier
  if (da && !db) return -1;

  // Cas 3 : b a une date, a n'en a pas → b en premier
  if (!da && db) return 1;

  // Cas 4 : aucun n'a de date → garder l'ordre
  return 0;
});

  // Trier les événements par date
events.sort((a, b) => {
  const na = computeNextDate(a);
  const nb = computeNextDate(b);

  const da = na && na !== "À confirmer" ? new Date(na) : null;
  const db = nb && nb !== "À confirmer" ? new Date(nb) : null;

  if (da && db) return da - db;
  if (da && !db) return -1;
  if (!da && db) return 1;
  return 0;
});

  events.forEach((item) => {
    const nextDate = computeNextDate(item);

    const html = `
      <div class="event-card">

        <h2>${item.nom}</h2>

        <span class="tag ${item.type}">
          ${item.type}
        </span>

        <span class="tag ville">
          ${item.ville}
        </span>

        <p><strong>Prochaine date :</strong> ${nextDate}</p>

        <p><strong>Heure :</strong> ${item.heure || "À confirmer"}</p>

        <p><strong>Description :</strong><br>
          ${item.description?.trim() || "(Aucune description)"}
        </p>

        <p><strong>Fréquence :</strong> ${item.fréquence || "Non spécifiée"}</p>

        <p><strong>Billet :</strong> ${item.billet?.toLowerCase() === "oui" ? "Oui" : "Non"}</p>

      <p><strong>Liens :</strong><br>
  ${
    item.instagram
      ? `<a href="${item.instagram}" target="_blank">Instagram</a><br>`
      : ""
  }
  ${
    item.facebook
      ? `<a href="${item.facebook}" target="_blank">Facebook</a><br>`
      : ""
  }
  ${
    item.site
      ? `<a href="${item.site}" target="_blank">Site web</a><br>`
      : ""
  }
  ${
    !item.instagram && !item.facebook && !item.site
      ? "Aucun lien disponible"
      : ""
  }
</p>

        <p><strong>Lieu :</strong> 
  <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.adresse)}" 
     target="_blank">
     ${item.lieu}
  </a>
</p>

      </div>
    `;

    container.insertAdjacentHTML("beforeend", html);
  });
}

// ------------------------------------------------------
// 6. Sélection d’un jour
// ------------------------------------------------------

function normalize(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[\r\n]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function selectDay(day) {
  const normalizedDay = normalize(day);

  const eventsForDay = fullData.filter((item) => {
    const jour = normalize(item.jour);
    return jour === normalizedDay;
  });

  renderEvents(eventsForDay);
}

// ------------------------------------------------------
// 7. Lancer le site
// ------------------------------------------------------

loadData().then(() => selectDay("lundi"));
