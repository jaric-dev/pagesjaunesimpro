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

  // Chargement des données
  fetch("events.json")
    .then(response => response.json())
    .then(data => {
      window.eventsData = data;
      populateFilters();
      selectDay("lundi");
    });

  function populateFilters() {
    const types = new Set();
    const villes = new Set();

    window.eventsData.forEach(ev => {
      types.add(ev.type);
      villes.add(ev.ville);
    });

    fillSelect("filter-type", types);
    fillSelect("filter-type-mobile", types);

    fillSelect("filter-ville", villes);
    fillSelect("filter-ville-mobile", villes);
  }

  function fillSelect(id, values) {
    const select = document.getElementById(id);
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
