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

// Highlight + filtre jour
function selectDay(day) {
  currentDay = day;
  filterData();

  // highlight du bouton sélectionné
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.day === day);
  });
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
  if (!container) return; // sécurité si pas de filtre ville

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
  if (fin.toLower
