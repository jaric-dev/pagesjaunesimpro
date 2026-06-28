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

// ------------------------------------------------------
// 2. Filtre : jour uniquement
// ------------------------------------------------------

function filterData() {
  let events = fullData;

  if (currentDay) {
    events = events.filter(
      (item) => item.jour?.trim().toLowerCase() === currentDay.toLowerCase()
    );
  }

  events = events.filter(isEventActive);

  renderEvents(events);
}

// Highlight + filtre jour
function selectDay(day) {
  currentDay = day;
  filterData();

  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.day === day);
  });
}

// ------------------------------------------------------
// 3. Gestion de date_fin
// ------------------------------------------------------

function isEventActive(item) {
  const fin = item.date_fin?.trim();

  if (!fin) return true;
  if (fin.toLowerCase() === "à confirmer") return true;
  if (fin.toLowerCase() === "pause") return false;
  if (fin.toLowerCase() === "saison") return true;

  const today = new Date();
  const endDate = new Date(fin);

  return today <= endDate;
}

// ------------------------------------------------------
// 4. Calcul des dates récurrentes
// ------------------------------------------------------

function computeNextDate(item) {
  const recurrence = item["récurrence"]?.toLowerCase() || "";

  if (recurrence.includes("hebdo")) return computeWeekly(item);
  if (recurrence.includes("mensuel")) return computeMonthly(item);
  if (recurrence.includes("3e jeudi")) return computeThirdThursday(item);
  if (recurrence.includes("dernier vendredi")) return computeLastFriday(item);

  return "À confirmer";
}

// Hebdomadaire
function computeWeekly(item) {
  const today = new Date();
  const days = {
    lundi: 1,
    mardi: 2,
    mercredi: 3,
    jeudi: 4,
    vendredi: 5,
    samedi: 6,
    dimanche: 0,
  };

  const target = days[item.jour.toLowerCase()];
  const next = new Date(today);

  next.setDate(today.getDate() + ((target - today.getDay() + 7) % 7));

  if (next < today) next.setDate(next.getDate() + 7);

  return next.toLocaleDateString("fr-CA");
}

// Mensuel
function computeMonthly(item) {
  const today = new Date();
  const start = new Date(item["date_debut"]);

  let next = new Date(today.getFullYear(), today.getMonth(), start.getDate());
  if (next < today) {
    next = new Date(today.getFullYear(), today.getMonth() + 1, start.getDate());
  }

  return next.toLocaleDateString("fr-CA");
}

// 3e jeudi
function computeThirdThursday(item) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  let count = 0;
  let next = null;

  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d);
    if (date.getMonth() !== month) break;
    if (date.getDay() === 4) count++;
    if (count === 3) {
      next = date;
      break;
    }
  }

  if (next < today) {
    return computeThirdThursday({
      ...item,
      date_debut: new Date(year, month + 1, 1),
    });
  }

  return next.toLocaleDateString("fr-CA");
}

// Dernier vendredi
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
    return computeLastFriday({
      ...item,
      date_debut: new Date(year, month + 1, 1),
    });
  }

  return lastFriday.toLocaleDateString("fr-CA");
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
