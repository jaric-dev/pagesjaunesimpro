// -------------------------------
// 1. Charger les données du Google Sheet
// -------------------------------

const SHEET_URL = "https://opensheet.elk.sh/1cV5sqtp73WazgB6og_d4aOG4y9HYo3EGePMrBuXAbRs/R%C3%A9pertoire";

async function loadData() {
  const response = await fetch(SHEET_URL);
  const data = await response.json();
  return data;
}

// -------------------------------
// 2. Filtrer par jour
// -------------------------------

function filterByDay(data, day) {
  return data.filter(item => item.jour?.trim().toLowerCase() === day.toLowerCase());
}

// -------------------------------
// 3. Gérer la logique date_fin
// -------------------------------

function isEventActive(item) {
  const fin = item.date_fin?.trim();

  if (!fin) return true; // vide → continue
  if (fin.toLowerCase() === "à confirmer") return true;
  if (fin.toLowerCase() === "pause") return false;
  if (fin.toLowerCase() === "saison") return true;

  // Date réelle
  const today = new Date();
  const endDate = new Date(fin);

  return today <= endDate;
}

// -------------------------------
// 4. Calculer la prochaine date selon la récurrence
// -------------------------------

function computeNextDate(item) {
  const start = new Date(item.date_debut);
  const recurrence = item.récurrence?.toLowerCase() || "";

  if (recurrence.includes("hebdo")) return computeWeekly(item);
  if (recurrence.includes("mensuel")) return computeMonthly(item);
  if (recurrence.includes("3e jeudi")) return computeThirdThursday(item);
  if (recurrence.includes("dernier vendredi")) return computeLastFriday(item);

  return "À confirmer";
}

// -------------------------------
// 4A. Hebdomadaire
// -------------------------------

function computeWeekly(item) {
  const today = new Date();
  const start = new Date(item.date_debut);

  const daysOfWeek = {
    "lundi": 1,
    "mardi": 2,
    "mercredi": 3,
    "jeudi": 4,
    "vendredi": 5,
    "samedi": 6,
    "dimanche": 0
  };

  const targetDay = daysOfWeek[item.jour.toLowerCase()];
  const next = new Date(today);

  next.setDate(today.getDate() + ((targetDay - today.getDay() + 7) % 7));

  if (next < today) next.setDate(next.getDate() + 7);

  return next.toLocaleDateString("fr-CA");
}

// -------------------------------
// 4B. Mensuel (même jour du mois)
// -------------------------------

function computeMonthly(item) {
  const today = new Date();
  const start = new Date(item.date_debut);

  let next = new Date(today.getFullYear(), today.getMonth(), start.getDate());

  if (next < today) {
    next = new Date(today.getFullYear(), today.getMonth() + 1, start.getDate());
  }

  return next.toLocaleDateString("fr-CA");
}

// -------------------------------
// 4C. 3e jeudi du mois
// -------------------------------

function computeThirdThursday(item) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  let count = 0;
  let next = null;

  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d);
    if (date.getDay() === 4) count++;
    if (count === 3) {
      next = date;
      break;
    }
  }

  if (next < today) {
    return computeThirdThursday({ ...item, date_debut: new Date(year, month + 1, 1) });
  }

  return next.toLocaleDateString("fr-CA");
}

// -------------------------------
// 4D. Dernier vendredi du mois
// -------------------------------

function computeLastFriday(item) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  let lastFriday = null;

  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d);
    if (date.getMonth() !== month) break;
    if (date.getDay() === 5) lastFriday = date;
  }

  if (lastFriday < today) {
    return computeLastFriday({ ...item, date_debut: new Date(year, month + 1, 1) });
  }

  return lastFriday.toLocaleDateString("fr-CA");
}

// -------------------------------
// 5. Afficher les événements
// -------------------------------

function renderEvents(events) {
  const container = document.getElementById("events");
  container.innerHTML = "";

  events.forEach(item => {
    const nextDate = computeNextDate(item);

    const html = `
      <div class="event">
        <h2>${item.nom}</h2>
        <p><strong>Lieu :</strong> ${item.lieu}</p>
        <p><strong>Ville :</strong> ${item.ville}</p>
        <p><strong>Prochaine date :</strong> ${nextDate}</p>
        <p>${item.description}</p>
      </div>
    `;

    container.innerHTML += html;
  });
}

// -------------------------------
// 6. Pipeline principal
// -------------------------------

async function init(day) {
  const data = await loadData();
  const filtered = filterByDay(data, day);
  const active = filtered.filter(isEventActive);
  renderEvents(active);
}
