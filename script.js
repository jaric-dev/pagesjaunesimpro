document.addEventListener("DOMContentLoaded", () => {
  // ------------------------------
  // Accordéon mobile
  // ------------------------------
  const filtersToggle = document.getElementById("filters-toggle");
  const filtersContent = document.getElementById("filters-content");
  if (filtersToggle && filtersContent) {
    filtersToggle.addEventListener("click", () => {
      filtersContent.classList.toggle("open");
      filtersToggle.classList.toggle("open");
    });
  }

  // ------------------------------
  // Chargement des données (8 onglets Google Sheets via OpenSheet)
  // ------------------------------
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

  let currentDay = "lundi";

  const requetes = Object.entries(ONGLETS).map(([jour, onglet]) =>
    fetch(`https://opensheet.elk.sh/${SHEET_ID}/${onglet}`)
      .then(r => r.json())
      .then(rows => rows.map(ev => normalizeEvent(ev, jour)))
      .catch(err => {
        console.error(`Erreur de chargement de l'onglet ${onglet}:`, err);
        return [];
      })
  );

  Promise.all(requetes)
    .then(resultats => {
      window.eventsData = resultats.flat().filter(ev => ev.titre); // ignore lignes vides
      populateFilters();
      wireFilterEvents();
      selectDay("lundi");
    })
    .catch(err => console.error("Erreur de chargement des données:", err));

  // ------------------------------
  // Adaptation des colonnes réelles du Google Sheet vers le format attendu
  // Colonnes du sheet : nom, type, saison, prochain_spectacle, date_debut,
  // date_fin, lieu, adresse, ville, fréquence, heure, billet, instagram,
  // facebook, Site, description, soirs_off, jour (onglet Ponctuel seulement)
  // ------------------------------
  function normalizeEvent(ev, ongletJour) {
    const hors_saison = (ev.prochain_spectacle || "").trim().toLowerCase() === "hors saison";
    const dateStr = hors_saison ? "" : (ev.prochain_spectacle || "").trim();
    return {
      titre: (ev.nom || "").trim(),
      type: (ev.type || "").trim(),
      ville: (ev.ville || "").trim(),
      date: dateStr,
      dateObj: parseDate(dateStr),
      heure: (ev.heure || "").trim(),
      lieu: (ev.lieu || "").trim(),
      adresse: (ev.adresse || "").trim(),
      // Colonne L : Oui/Non — indique si un billet est requis (ce n'est pas un lien)
      billetRequis: (ev.billet || "").trim(),
      instagram: (ev.instagram || "").trim(),
      facebook: (ev.facebook || "").trim(),
      site: (ev.Site || ev.site || "").trim(),
      logo: (ev.logo || "").trim(),
      description: (ev.description || "").trim(),
      hors_saison: hors_saison,
      // La colonne "jour" existe dans l'onglet Impro_Ponctuel ; pour les
      // autres onglets, le jour est déduit du nom de l'onglet.
      jour: (ev.jour || ongletJour || "").trim().toLowerCase()
    };
  }

  // Convertit une date au format "JJ-MM-AAAA" en objet Date (null si invalide)
  function parseDate(str) {
    if (!str) return null;
    const parts = str.split("-");
    if (parts.length !== 3) return null;
    const [jour, mois, annee] = parts.map(p => parseInt(p, 10));
    if (!jour || !mois || !annee) return null;
    const d = new Date(annee, mois - 1, jour);
    return isNaN(d.getTime()) ? null : d;
  }

  // Trie : événements hors saison à la fin, sinon par date croissante
  // (le plus proche d'aujourd'hui en premier)
  function sortEvents(events) {
    return [...events].sort((a, b) => {
      if (a.hors_saison && !b.hors_saison) return 1;
      if (!a.hors_saison && b.hors_saison) return -1;
      if (a.hors_saison && b.hors_saison) return 0;
      if (!a.dateObj && !b.dateObj) return 0;
      if (!a.dateObj) return 1;
      if (!b.dateObj) return -1;
      return a.dateObj - b.dateObj;
    });
  }

  // ------------------------------
  // Filtres
  // ------------------------------
  function populateFilters() {
    const types = new Set();
    const villes = new Set();
    window.eventsData.forEach(ev => {
      if (ev.type) types.add(ev.type);
      if (ev.ville) villes.add(ev.ville);
    });
    fillSelect(document.getElementById("filter-type"), types, "Type : Tous");
    fillSelect(document.getElementById("filter-ville"), villes, "Ville : Toutes");
    fillSelect(document.querySelector("#filters-mobile select:nth-child(1)"), types, "Type : Tous");
    fillSelect(document.querySelector("#filters-mobile select:nth-child(2)"), villes, "Ville : Toutes");
  }

  function fillSelect(select, values, placeholder) {
    if (!select) return;
    select.innerHTML = `<option value="">${placeholder}</option>`;
    [...values].sort().forEach(v => {
      select.innerHTML += `<option value="${v}">${v}</option>`;
    });
  }

  function wireFilterEvents() {
    const pairs = [
      ["filter-type", ".mobile-type"],
      ["filter-ville", ".mobile-ville"],
      ["filter-hs", ".mobile-hs"]
    ];
    pairs.forEach(([desktopId, mobileSelector]) => {
      const desktopEl = document.getElementById(desktopId);
      const mobileEl = document.querySelector(mobileSelector);
      [desktopEl, mobileEl].forEach(el => {
        if (!el) return;
        el.addEventListener("change", () => {
          // Garde les deux versions (desktop/mobile) synchronisées
          if (desktopEl) desktopEl.value = el.value;
          if (mobileEl) mobileEl.value = el.value;
          selectDay(currentDay);
        });
      });
    });
  }

  // ------------------------------
  // Sélection du jour + affichage
  // ------------------------------
  window.selectDay = function (day) {
    currentDay = day;

    document.querySelectorAll(".day-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.day === day);
    });

    const typeFilter = document.getElementById("filter-type")?.value || "";
    const villeFilter = document.getElementById("filter-ville")?.value || "";
    const hsFilter = document.getElementById("filter-hs")?.value || "";

    let events = window.eventsData.filter(ev => ev.jour === day);

    if (typeFilter) events = events.filter(ev => ev.type === typeFilter);
    if (villeFilter) events = events.filter(ev => ev.ville === villeFilter);
    if (hsFilter === "hide") events = events.filter(ev => !ev.hors_saison);
    if (hsFilter === "only") events = events.filter(ev => ev.hors_saison);

    displayEvents(sortEvents(events));
  };

  function displayEvents(events) {
    const container = document.getElementById("events");
    container.innerHTML = "";

    if (events.length === 0) {
      container.innerHTML = `<p style="text-align:center; width:100%;">Aucun spectacle trouvé pour ce jour avec ces filtres.</p>`;
      return;
    }

    events.forEach(ev => {
      const card = document.createElement("div");
      card.className = "event-card";

      const lieuHtml = ev.adresse
        ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.adresse)}" target="_blank" rel="noopener">${ev.lieu}</a>`
        : ev.lieu;

      const billetTexte = ev.billetRequis
        ? `<div class="billet-requis">Billet requis : <strong>${ev.billetRequis}</strong></div>`
        : "";

      const liensSociaux = [];
      if (ev.instagram) liensSociaux.push(`<a href="${ev.instagram}" target="_blank" rel="noopener">Instagram</a>`);
      if (ev.facebook) liensSociaux.push(`<a href="${ev.facebook}" target="_blank" rel="noopener">Facebook</a>`);
      if (ev.site) liensSociaux.push(`<a href="${ev.site}" target="_blank" rel="noopener">Site web</a>`);
      const liensSociauxHtml = liensSociaux.length
        ? `<div class="social-links">${liensSociaux.join("")}</div>`
        : "";

      const logoHtml = ev.logo
        ? `<div class="event-logo-wrapper"><img src="${ev.logo}" alt="Logo ${ev.titre}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
        : "";

      card.innerHTML = `
        ${logoHtml}
        <div class="event-card-body">
          <div class="tags">
            <span class="tag ${ev.type}">${ev.type}</span>
            <span class="tag ville">${ev.ville}</span>
          </div>
          ${ev.hors_saison ? `<div class="badges"><span class="badge badge-hors-saison">Hors saison</span></div>` : ""}
          <h3>${ev.titre}</h3>
          <ul class="meta-list">
            <li><span class="icon">📅</span> ${ev.date || "À venir"}</li>
            <li><span class="icon">🕒</span> ${ev.heure}</li>
            <li><span class="icon">📍</span> ${lieuHtml}</li>
          </ul>
          ${billetTexte}
          ${liensSociauxHtml}
        </div>
      `;
      container.appendChild(card);
    });
  }
});
