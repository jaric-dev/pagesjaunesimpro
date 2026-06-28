// ------------------------------------------------------
// 1. Charger les données du Google Sheet
// ------------------------------------------------------

const SHEET_URL =
  "https://opensheet.elk.sh/1cV5sqtp73WazgB6og_d4aOG4y9HYo3EGePMrBuXAbRs/R%C3%A9pertoire";

let fullData = [];
let currentDay = "";
let currentType = "";
let currentCity = "";

// Chargement initial
async function loadData() {
  const response = await fetch(SHEET_URL);
  const data = await response.json();
  fullData = data;
  generateCityButtons(data);
  return data;
}

// ------------------------------------------------------
// 2. Filtres : jour, type, ville
// ------------------------------------------------------

function filterData() {
  let events = fullData;

  // Filtre jour
  if (currentDay) {
    events = events.filter(
      (item) => item.jour?.trim().toLowerCase() === currentDay.toLowerCase()
    );
  }

  // Filtre type
  if (currentType) {
    events = events.filter(
      (item) => item.type?.trim().toLowerCase() === currentType.toLowerCase()
    );
  }

  // Filtre ville
  if (currentCity) {
    events = events.filter(
      (item) => item.ville?.trim().toLowerCase() === currentCity.toLowerCase()
    );
  }

  // Filtre date_fin
  events = events.filter(isEventActive);

  renderEvents(events);
}

function init(day) {
  currentDay = day;
  filterData();
}

function filterType(type) {
  currentType = type;
  filterData();
}

function filterCity(city) {
  currentCity = city;
  filterData();
}

// ------------------------------------------------------
// 3. Extraire automatiquement les villes
// ------------------------------------------------------

function generateCityButtons(data) {
  const container = document.getElementById("city-buttons");
  container.innerHTML = "";

  const cities = [...new Set(data.map((i) => i.ville?.trim()).filter(Boolean))].sort();

  cities.forEach((city) => {
    const btn = document.createElement("button");
    btn.className = "city-btn";
    btn.textContent = city;
    btn.onclick = () => filterCity(city);
    container.appendChild(btn);
  });

  // Bouton "Toutes"
  const allBtn = document.createElement("button");
  allBtn.className = "city-btn";
  allBtn.textContent = "Toutes";
  allBtn.onclick = () => filterCity("");
  container.appendChild(allBtn);
}

// ------------------------------------------------------
// 4. Gestion de date_fin
// ------------------------------------------------------

function isEventActive(item) {
  const fin = item.date_fin?.trim();

  if (!fin) return true; // vide → actif
  if (fin.toLowerCase() === "à confirmer") return true;
  if (fin.toLowerCase() === "pause") return false;
  if (fin.toLowerCase() === "saison") return true;

  const today = new Date();
  const endDate = new Date(fin);

  return today <= endDate;
}

// ------------------------------------------------------
// 5. Calcul des dates récurrentes
// ------------------------------------------------------

function computeNextDate(item) {
  const recurrence = item.récurrence?.toLowerCase() || "";

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
  const start = new Date(item.date_debut);

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
// 6. Affichage des événements
// ------------------------------------------------------

function renderEvents(events) {
  const container = document.getElementById("events");
  container.innerHTML = "";

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
// 7. Lancer le site
// ------------------------------------------------------

loadData().then(() => init("lundi"));
