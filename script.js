// ------------------------------------------------------
// 1. Charger les données du Google Sheet
// ------------------------------------------------------

const SHEET_URL =
  "https://opensheet.elk.sh/1cV5sqtp73WazgB6og_d4aOG4y9HYo3EGePMrBuXAbRs/R%C3%A9pertoire";

let fullData = [];
let currentDay = "";

// Chargement initial
async function loadData() {
  const response = await fetch(SHEET_URL);
  fullData = await response.json();
  return fullData;
}

// ------------------------------
// Mapping des jours
// ------------------------------
const weekdayMap = {
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
  dimanche: 0,
};

// ------------------------------
// Détection intelligente des récurrences
// ------------------------------
function computeNextDate(item) {
  const freq = (item["fréquence"] || "").toLowerCase().trim();
  const details = (item["détails_fréquence"] || "").toLowerCase().trim();

  // 1. Hebdomadaire
  if (freq.includes("hebdo") || freq.includes("hebdomadaire")) {
    return computeWeekly(item);
  }

  // 2. Mensuel
  if (freq.includes("mensuel")) {

    // Dernier X du mois
    if (details.includes("dernier")) {
      return computeLastWeekdayOfMonth(item);
    }

    // 1er / 2e / 3e / 4e X du mois
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
      const n = nthMap[nthMatch[0]];
      return computeNthWeekdayOfMonth(item, n);
    }

    return computeMonthly(item);
  }

  // 3. À l'année
  if (freq.includes("année")) {
    return computeYearly(item);
  }

  // 4. Autre → on analyse "détails_fréquence"
  if (freq.includes("autre")) {

    // un X sur deux
    if (details.includes("sur deux") || details.includes("2 semaines")) {
      return computeBiweekly(item);
    }

    // un X sur trois
    if (details.includes("sur trois")) {
      return computeEveryThreeWeeks(item);
    }

    // dernier X du mois
    if (details.includes("dernier")) {
      return computeLastWeekdayOfMonth(item);
    }

    // 1er / 2e / 3e / 4e X du mois
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
      const n = nthMap[nthMatch[0]];
      return computeNthWeekdayOfMonth(item, n);
    }
  }

  // 5. À confirmer
  if (freq.includes("confirmer")) {
    return "À confirmer";
  }

  // 6. Valeur par défaut
  return "À confirmer";
}

// ------------------------------
// Hebdomadaire
// ------------------------------
function computeWeekly(item) {
  const today = new Date();
  const target = weekdayMap[item.jour.toLowerCase()];
  const next = new Date(today);

  next.setDate(today.getDate() + ((target - today.getDay() + 7) % 7));
  if (next < today) next.setDate(next.getDate() + 7);

  return next.toLocaleDateString("fr-CA");
}

// ------------------------------
// Mensuel (même date chaque mois)
// ------------------------------
function computeMonthly(item) {
  const today = new Date();
  const start = new Date(item["date_debut"]);

  let next = new Date(today.getFullYear(), today.getMonth(), start.getDate());
  if (next < today) {
    next = new Date(today.getFullYear(), today.getMonth() + 1, start.getDate());
  }

  return next.toLocaleDateString("fr-CA");
}

// ------------------------------
// Dernier X du mois
// ------------------------------
function computeLastWeekdayOfMonth(item) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const targetDay = weekdayMap[item.jour.toLowerCase()];

  let last = null;

  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d);
    if (date.getMonth() !== month) break;
    if (date.getDay() === targetDay) last = date;
  }

  if (last < today) {
    return computeLastWeekdayOfMonth({
      ...item,
      date_debut: new Date(year, month + 1, 1),
    });
  }

  return last.toLocaleDateString("fr-CA");
}

// ------------------------------
// Nᵉ X du mois (1er, 2e, 3e, 4e)
// ------------------------------
function computeNthWeekdayOfMonth(item, n) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const targetDay = weekdayMap[item.jour.toLowerCase()];

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

  if (nth < today) {
    return computeNthWeekdayOfMonth({
      ...item,
      date_debut: new Date(year, month + 1, 1),
    }, n);
  }

  return nth.toLocaleDateString("fr-CA");
}

// ------------------------------
// Bi‑hebdomadaire (un X sur deux)
// ------------------------------
function computeBiweekly(item) {
  const today = new Date();
  const start = new Date(item["date_debut"]);

  let next = new Date(start);

  while (next < today) {
    next.setDate(next.getDate() + 14);
  }

  return next.toLocaleDateString("fr-CA");
}

// ------------------------------
// Toutes les 3 semaines
// ------------------------------
function computeEveryThreeWeeks(item) {
  const today = new Date();
  const start = new Date(item["date_debut"]);

  let next = new Date(start);

  while (next < today) {
    next.setDate(next.getDate() + 21);
  }

  return next.toLocaleDateString("fr-CA");
}

// ------------------------------
// Annuel
// ------------------------------
function computeYearly(item) {
  const today = new Date();
  const start = new Date(item["date_debut"]);

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
  container.innerHTML = "";

  if (events.length === 0) {
    container.innerHTML = `<p>Aucun événement pour ce jour.</p>`;
    return;
  }

  events.forEach((item) => {
    const nextDate = computeNextDate(item);

    const html = `
      <div class="event-card">
        <h2>${item.nom}</h2>
        <span class="tag ${item.type}">${item.type}</span>
        <p><strong>Prochaine date :</strong> ${nextDate}</p>
        <p><strong>Lieu :</strong> ${item.lieu}</p>
        <p><strong>Ville :</strong> ${item.ville}</p>
        <p>${item.description || ""}</p>
      </div>
    `;

    container.innerHTML += html;
  });
}

// ------------------------------------------------------
// 6. Lancer le site
// ------------------------------------------------------

loadData().then(() => selectDay("lundi"));
