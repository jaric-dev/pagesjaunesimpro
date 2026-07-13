document.addEventListener("DOMContentLoaded", () => {
  // ------------------------------
  // Bouton "+ Ajouter un événement" — formulaire vierge, avec seulement
  // "Nouveau spectacle à ajouter" pré-sélectionné
  // ------------------------------
  const addEventBtn = document.getElementById("add-event-btn");
  if (addEventBtn) {
    const FORM_BASE_URL_HEADER = "https://docs.google.com/forms/d/e/1FAIpQLSfwO7_cgumk2x7Qq-LafFKZOJn6WhrrOafhyWD98qCtaOpi6A/viewform";
    addEventBtn.href = `${FORM_BASE_URL_HEADER}?usp=pp_url&entry.1798147304=${encodeURIComponent("Nouveau spectacle à ajouter")}`;
  }

  // ------------------------------
  // Lightbox — clic sur un logo pour le voir en plein écran
  // ------------------------------
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxClose = document.querySelector(".lightbox-close");
  const eventsContainer = document.getElementById("events");

  function ouvrirLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.classList.add("open");
  }

  function fermerLightbox() {
    lightbox.classList.remove("open");
    lightboxImg.src = "";
  }

  if (eventsContainer) {
    eventsContainer.addEventListener("click", (e) => {
      const img = e.target.closest(".event-logo-wrapper img");
      if (img) ouvrirLightbox(img.src, img.alt);
    });
  }

  if (lightboxClose) lightboxClose.addEventListener("click", fermerLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) fermerLightbox();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fermerLightbox();
  });

  // ------------------------------
  // Sélection du jour + plage de dates — les deux se combinent, ne
  // s'excluent plus. "tous" affiche tous les jours de la semaine.
  // ------------------------------
  let currentDay = "lundi";

  const filterDateStart = document.getElementById("filter-date-start");
  const filterDateEnd = document.getElementById("filter-date-end");

  // Pré-remplit "Du" avec la date d'aujourd'hui, au même format JJ-MM-AAAA
  // utilisé partout ailleurs sur le site
  if (filterDateStart) {
    const aujourdhui = new Date();
    const jj = String(aujourdhui.getDate()).padStart(2, "0");
    const mm = String(aujourdhui.getMonth() + 1).padStart(2, "0");
    const aaaa = aujourdhui.getFullYear();
    filterDateStart.value = `${jj}-${mm}-${aaaa}`;
  }

  if (filterDateStart) filterDateStart.addEventListener("change", rafraichirAffichage);
  if (filterDateEnd) filterDateEnd.addEventListener("change", rafraichirAffichage);

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
      window.eventsData = resultats.flat()
        .filter(ev => ev.titre) // ignore lignes vides
        .filter(ev => ev.masquer.toLowerCase() !== "oui"); // ignore lignes masquées
      populateFilters();
      wireFilterEvents();
      afficherStats();
      rafraichirAffichage();
    })
    .catch(err => console.error("Erreur de chargement des données:", err));

  // Compte les spectacles distincts (par nom) et les villes distinctes
  // représentées, tous jours et toute saison confondus (pas juste ce qui
  // est affiché à l'écran présentement)
  function afficherStats() {
    const statsEl = document.getElementById("site-stats");
    if (!statsEl || !window.eventsData) return;

    const spectaclesUniques = new Set(window.eventsData.map(ev => ev.titre));
    const villesUniques = new Set(window.eventsData.map(ev => ev.ville).filter(Boolean));

    statsEl.innerHTML = `
      <div class="stat-item"><strong>${spectaclesUniques.size}</strong> spectacles annoncés</div>
      <div class="stat-item"><strong>${villesUniques.size}</strong> villes représentées</div>
    `;
  }

  // ------------------------------
  // Adaptation des colonnes réelles du Google Sheet vers le format attendu
  // ------------------------------
  function normalizeEvent(ev, ongletJour) {
    const hors_saison = (ev.prochain_spectacle || "").trim().toLowerCase() === "hors saison";
    const dateStr = hors_saison ? "" : (ev.prochain_spectacle || "").trim();
    return {
      titre: (ev.nom || "").trim(),
      types: (ev.type || "").split(",").map(t => t.trim()).filter(Boolean),
      ville: (ev.ville || "").trim(),
      date: dateStr,
      dateObj: parseDate(dateStr),
      heure: (ev.heure || "").trim(),
      lieu: (ev.lieu || "").trim(),
      adresse: (ev.adresse || "").trim(),
      billetRequis: (ev.billet || "").trim(),
      prix: (ev.prix || "").trim(),
      instagram: (ev.instagram || "").trim(),
      facebook: (ev.facebook || "").trim(),
      site: (ev.Site || ev.site || "").trim(),
      logo: (ev.logo || "").trim(),
      description: (ev.description || "").trim(),
      hors_saison: hors_saison,
      date_debut: (ev.date_debut || "").trim(),
      date_fin: (ev.date_fin || "").trim(),
      frequence: (ev["fréquence"] || "").trim(),
      jour: (ev.jour || ongletJour || "").trim().toLowerCase(),
      source: ongletJour,
      masquer: (ev.masquer || "").trim()
    };
  }

  function parseDate(str) {
    if (!str) return null;
    // Tolère "-" ou "/" comme séparateur (ex: 21-07-2026 ou 21/07/2026)
    // — filet de sécurité contre les fautes de frappe dans le Sheet,
    // qui ne devraient plus faire disparaître un événement silencieusement.
    const parts = str.split(/[-/]/);
    if (parts.length !== 3) return null;
    const [jour, mois, annee] = parts.map(p => parseInt(p, 10));
    if (!jour || !mois || !annee) return null;
    const d = new Date(annee, mois - 1, jour);
    return isNaN(d.getTime()) ? null : d;
  }

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
  // Construction du lien pré-rempli vers le formulaire de mise à jour
  // ------------------------------
  const FORM_BASE_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfwO7_cgumk2x7Qq-LafFKZOJn6WhrrOafhyWD98qCtaOpi6A/viewform";
  const FORM_ENTRIES = {
    updateOuNouveau: "1798147304",
    nom: "591253351",
    type: "257632126",
    frequence: "812800412",
    datesMultiples: "800161543",
    dateDebut: "234964401",
    dateFin: "1363438021",
    lieu: "1839982334",
    adresse: "408181221",
    ville: "1402047938",
    heure: "98808884",
    billet: "528702374",
    instagram: "959381308",
    facebook: "1083296963",
    site: "631214797",
    description: "1847814997",
    logo: "1963225269",
    prix: "487354818"
  };

  function tronquerTexte(texte, max) {
    if (!texte || texte.length <= max) return texte;
    const coupe = texte.slice(0, max);
    const dernierEspace = coupe.lastIndexOf(" ");
    const propre = dernierEspace > 0 ? coupe.slice(0, dernierEspace) : coupe;
    return propre.trim() + "…";
  }

  function toISODate(str) {
    if (!str) return "";
    const parts = str.split(/[-/]/);
    if (parts.length !== 3) return "";
    const [j, m, a] = parts;
    return `${a}-${m.padStart(2, "0")}-${j.padStart(2, "0")}`;
  }

  function addParam(parts, entryKey, value) {
    if (value === undefined || value === null || value === "") return;
    parts.push(`entry.${FORM_ENTRIES[entryKey]}=${encodeURIComponent(value)}`);
  }

  function buildUpdateLink(ev) {
    const parts = [];
    addParam(parts, "updateOuNouveau", "Mise à jour pour un spectacle sur le site");
    addParam(parts, "nom", ev.titre);
    ev.types.forEach(t => parts.push(`entry.${FORM_ENTRIES.type}=${encodeURIComponent(t)}`));
    addParam(parts, "lieu", ev.lieu);
    addParam(parts, "adresse", ev.adresse);
    addParam(parts, "ville", ev.ville);
    addParam(parts, "heure", ev.heure);
    addParam(parts, "billet", ev.billetRequis);
    addParam(parts, "instagram", ev.instagram);
    addParam(parts, "facebook", ev.facebook);
    addParam(parts, "site", ev.site);
    addParam(parts, "description", ev.description);
    addParam(parts, "logo", ev.logo);
    addParam(parts, "prix", ev.prix);

    const estIrregulier = ev.frequence.toLowerCase() === "ponctuel" || (ev.source === "ponctuel" && !ev.frequence);

    if (estIrregulier) {
      addParam(parts, "frequence", "Dates multiples");
      const memeSpectacle = window.eventsData.filter(e =>
        e.titre === ev.titre &&
        (e.frequence.toLowerCase() === "ponctuel" || (e.source === "ponctuel" && !e.frequence))
      );
      const lignes = memeSpectacle
        .filter(e => e.date)
        .map(e => `${e.date} | ${e.lieu} | ${e.adresse}`);
      addParam(parts, "datesMultiples", lignes.join("\n"));
    } else {
      addParam(parts, "frequence", ev.frequence);
      addParam(parts, "dateDebut", toISODate(ev.date_debut));
      addParam(parts, "dateFin", toISODate(ev.date_fin));
    }

    return `${FORM_BASE_URL}?usp=pp_url&${parts.join("&")}`;
  }

  // ------------------------------
  // Filtres (type / ville / hors-saison) — un seul jeu de contrôles,
  // partagé par les deux modes d'affichage
  // ------------------------------
  function populateFilters() {
    const types = new Set();
    const villes = new Set();
    window.eventsData.forEach(ev => {
      ev.types.forEach(t => types.add(t));
      if (ev.ville) villes.add(ev.ville);
    });
    fillSelect(document.getElementById("filter-type"), types, "Type : Tous");
    fillSelect(document.getElementById("filter-ville"), villes, "Ville : Toutes");
  }

  function fillSelect(select, values, placeholder) {
    if (!select) return;
    select.innerHTML = `<option value="">${placeholder}</option>`;
    [...values].sort().forEach(v => {
      select.innerHTML += `<option value="${v}">${v}</option>`;
    });
  }

  function wireFilterEvents() {
    ["filter-type", "filter-ville", "filter-hs"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", rafraichirAffichage);
    });
  }

  // Applique les filtres communs (type / ville / hors-saison) à un
  // ensemble d'événements déjà pré-filtré (par jour ou par plage de dates)
  function appliquerFiltresCommuns(events) {
    const typeFilter = document.getElementById("filter-type")?.value || "";
    const villeFilter = document.getElementById("filter-ville")?.value || "";
    const hsFilter = document.getElementById("filter-hs")?.value || "";

    let resultat = events;
    if (typeFilter) resultat = resultat.filter(ev => ev.types.includes(typeFilter));
    if (villeFilter) resultat = resultat.filter(ev => ev.ville === villeFilter);
    if (hsFilter === "hide") resultat = resultat.filter(ev => !ev.hors_saison);
    if (hsFilter === "only") resultat = resultat.filter(ev => ev.hors_saison);
    return resultat;
  }

  // ------------------------------
  // Rendu principal — s'adapte au mode courant (jour ou plage de dates)
  // ------------------------------
  // ------------------------------
  // Rendu principal — combine jour (ou "tous") ET plage de dates,
  // en plus des filtres communs (type / ville / hors-saison)
  // ------------------------------
  function rafraichirAffichage() {
    if (!window.eventsData) return;

    let base = currentDay === "tous"
      ? window.eventsData
      : window.eventsData.filter(ev => ev.jour === currentDay);

    const debut = parseDate((filterDateStart?.value || "").trim());
    const fin = parseDate((filterDateEnd?.value || "").trim());

    if (debut || fin) {
      // Les hors saison n'ont pas de date connue et restent gérés
      // uniquement par leur propre filtre ("Hors saison"), jamais par la
      // plage de dates — sinon ils disparaîtraient silencieusement dès
      // que "Du" contient une valeur par défaut (aujourd'hui).
      base = base.filter(ev => {
        if (ev.hors_saison) return true;
        if (!ev.dateObj) return false;
        if (debut && ev.dateObj < debut) return false;
        if (fin && ev.dateObj > fin) return false;
        return true;
      });
    }

    displayEvents(sortEvents(appliquerFiltresCommuns(base)));
  }

  window.selectDay = function (day) {
    currentDay = day;
    document.querySelectorAll(".day-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.day === day);
    });
    rafraichirAffichage();
  };

  const JOURS_LABELS = {
    lundi: "Lundi", mardi: "Mardi", mercredi: "Mercredi", jeudi: "Jeudi",
    vendredi: "Vendredi", samedi: "Samedi", dimanche: "Dimanche"
  };

  function displayEvents(events) {
    const container = document.getElementById("events");
    container.innerHTML = "";

    if (events.length === 0) {
      container.innerHTML = `<p style="text-align:center; width:100%;">Aucun spectacle trouvé avec ces filtres.</p>`;
      return;
    }

    events.forEach(ev => {
      const card = document.createElement("div");
      card.className = ev.hors_saison ? "event-card event-card--hors-saison" : "event-card";

      const lieuHtml = ev.adresse
        ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.adresse)}" target="_blank" rel="noopener">${ev.lieu}</a>`
        : ev.lieu;

      const billetLignes = [];
      if (ev.billetRequis) billetLignes.push(`Billet requis : <strong>${ev.billetRequis}</strong>`);
      if (ev.prix) billetLignes.push(`Prix : <strong>${ev.prix}</strong>`);
      const billetTexte = billetLignes.length
        ? `<div class="billet-requis">${billetLignes.join(" — ")}</div>`
        : "";

      const liensSociaux = [];
      if (ev.instagram) liensSociaux.push(`<a href="${ev.instagram}" target="_blank" rel="noopener">Instagram</a>`);
      if (ev.facebook) liensSociaux.push(`<a href="${ev.facebook}" target="_blank" rel="noopener">Facebook</a>`);
      if (ev.site) liensSociaux.push(`<a href="${ev.site}" target="_blank" rel="noopener">Site web</a>`);
      const liensSociauxHtml = liensSociaux.length
        ? `<div class="social-links">${liensSociaux.join("")}</div>`
        : "";

      const majLienHtml = `<div class="update-link"><a href="${buildUpdateLink(ev)}" target="_blank" rel="noopener">Mettre à jour</a></div>`;

      const logoHtml = ev.logo
        ? `<div class="event-logo-wrapper"><img src="${ev.logo}" alt="Logo ${ev.titre}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
        : "";

      const typeTagsHtml = ev.types.map(t => `<span class="tag ${t}">${t}</span>`).join("");

      const descriptionHtml = ev.description
        ? `<p class="event-description">${tronquerTexte(ev.description, 150)}</p>`
        : "";

      card.innerHTML = `
        ${logoHtml}
        <div class="event-card-body">
          <div class="tags">
            ${typeTagsHtml}
            <span class="tag ville">${ev.ville}</span>
          </div>
          ${ev.hors_saison ? `<div class="badges"><span class="badge badge-hors-saison">Hors saison</span></div>` : ""}
          <h3>${ev.titre}</h3>
          ${descriptionHtml}
          <ul class="meta-list">
            <li><span class="icon">📅</span> ${JOURS_LABELS[ev.jour] ? JOURS_LABELS[ev.jour] + " · " : ""}${ev.date || "À venir"}</li>
            <li><span class="icon">🕒</span> ${ev.heure}</li>
            <li><span class="icon">📍</span> ${lieuHtml}</li>
          </ul>
          ${billetTexte}
          ${liensSociauxHtml}
          ${majLienHtml}
        </div>
      `;
      container.appendChild(card);
    });
  }
});
