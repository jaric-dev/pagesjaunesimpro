document.addEventListener("DOMContentLoaded", () => {
  // Accordéon mobile
  const filtersToggle = document.getElementById("filters-toggle");
  const filtersContent = document.getElementById("filters-content");
  if (filtersToggle && filtersContent) {
    filtersToggle.addEventListener("click", () => {
      filtersContent.classList.toggle("open");
      filtersToggle.classList.toggle("open");
    });
  }

  // Charger les événements depuis les 8 onglets Google Sheets via OpenSheet
  const SHEET_ID = "1cV5sqtp73WazgB6og_d4aOG4y9HYo3EGePMrBuXAbRs";
  const ONGLETS = {
    lundi: "Impro_Lundi",
    mardi: "Impro_Mardi",
    mercredi: "Impro_Mercredi",
    jeudi: "Impro_Jeudi",
    vendredi: "Impro_Vendredi",
    samedi: "Impro_Samedi",
    dimanche: "Impro_Dimanche",
    ponctuel: "Impro_Ponctuel"
  };

  const requetes = Object.entries(ONGLETS).map(([jour, onglet]) =>
    fetch(`https://opensheet.elk.sh/${SHEET_ID}/${onglet}`)
      .then(r => r.json())
      .then(rows => rows.map(ev => ({ ...ev, jour: ev.jour || jour })))
  );

  Promise.all(requetes)
    .then(resultats => {
      window.eventsData = resultats.flat();
      populateFilters();
      selectDay("lundi");
    })
    .catch(err => console.error("Erreur de chargement des données:", err));

  function populateFilters() {
    const types = new Set();
    const villes = new Set();
    window.eventsData.forEach(ev => {
      types.add(ev.type);
      villes.add(ev.ville);
    });
    fillSelect(document.getElementById("filter-type"), types);
    fillSelect(document.getElementById("filter-ville"), villes);
    fillSelect(document.querySelector("#filters-mobile select:nth-child(1)"), types);
    fillSelect(document.querySelector("#filters-mobile select:nth-child(2)"), villes);
  }

  function fillSelect(select, values) {
    if (!select) return;
    select.innerHTML = `<option value="">Tous</option>`;
    values.forEach(v => {
      select.innerHTML += `<option value="${v}">${v}</option>`;
    });
  }

  window.selectDay = function(day) {
    const events = window.eventsData.filter(ev => ev.jour === day);
    displayEvents(events);
  };

  function displayEvents(events) {
    const container = document.getElementById("events");
    container.innerHTML = "";
    events.forEach(ev => {
      const card = document.createElement("div");
      card.className = "event-card";
      card.innerHTML = `
        <h3>${ev.titre}</h3>
        <div class="tags">
          <span class="tag ${ev.type}">${ev.type}</span>
          <span class="tag ville">${ev.ville}</span>
        </div>
        <div class="info-box">
          <p><strong>Date :</strong> ${ev.date}</p>
          <p><strong>Heure :</strong> ${ev.heure}</p>
          <p><strong>Lieu :</strong> ${ev.lieu}</p>
          <p><a href="${ev.billet}" target="_blank">Billetterie</a></p>
        </div>
      `;
      container.appendChild(card);
    });
  }
});
