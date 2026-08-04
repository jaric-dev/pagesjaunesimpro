document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("partage-events");
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const donnees = params.get("liste");

  if (!donnees) {
    container.innerHTML = `<p style="text-align:center; width:100%;">Ce lien ne contient aucune suggestion — demande à la personne qui te l'a envoyé de te renvoyer un nouveau lien depuis sa vue "Mes favoris".</p>`;
    return;
  }

  const clesRecues = decoderListePartage(donnees);
  if (clesRecues.length === 0) {
    container.innerHTML = `<p style="text-align:center; width:100%;">Ce lien ne contient aucune suggestion valide.</p>`;
    return;
  }

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
      const tousLesEvenements = resultats.flat()
        .filter(ev => ev.titre)
        .filter(ev => ev.masquer.toLowerCase() !== "oui");

      const evenementsPartages = tousLesEvenements.filter(ev => clesRecues.includes(favKey(ev)));

      afficherSuggestions(evenementsPartages);
    })
    .catch(err => {
      console.error("Erreur de chargement des données:", err);
      container.innerHTML = `<p style="text-align:center; width:100%;">Erreur de chargement — réessaie plus tard.</p>`;
    });

  function afficherSuggestions(events) {
    container.innerHTML = "";

    if (events.length === 0) {
      container.innerHTML = `<p style="text-align:center; width:100%;">Aucun des spectacles suggérés n'est disponible en ce moment — ils sont peut-être hors saison ou n'existent plus.</p>`;
      return;
    }

    const JOURS_LABELS = {
      lundi: "Lundi", mardi: "Mardi", mercredi: "Mercredi", jeudi: "Jeudi",
      vendredi: "Vendredi", samedi: "Samedi", dimanche: "Dimanche"
    };

    events.forEach(ev => {
      const card = document.createElement("div");
      card.className = ev.hors_saison ? "event-card event-card--hors-saison" : "event-card";

      const lieuHtml = ev.adresse
        ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.adresse)}" target="_blank" rel="noopener">${ev.lieu}</a>`
        : ev.lieu;

      const liensSociaux = [];
      if (ev.instagram) liensSociaux.push(`<a href="${ev.instagram}" target="_blank" rel="noopener">Instagram</a>`);
      if (ev.facebook) liensSociaux.push(`<a href="${ev.facebook}" target="_blank" rel="noopener">Facebook</a>`);
      if (ev.site) liensSociaux.push(`<a href="${ev.site}" target="_blank" rel="noopener">Site web</a>`);
      if (ev.linktree) liensSociaux.push(`<a href="${ev.linktree}" target="_blank" rel="noopener">Linktree</a>`);
      const liensSociauxHtml = liensSociaux.length
        ? `<div class="social-links">${liensSociaux.join("")}</div>`
        : "";

      const logoHtml = ev.logo
        ? `<div class="event-logo-wrapper"><img src="${ev.logo}" alt="Logo ${ev.titre}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
        : "";

      const typeTagsHtml = ev.types.map(t => `<span class="tag ${t}">${t}</span>`).join("");
      const langueTagHtml = ev.langue ? `<span class="tag ${ev.langue}">${ev.langue}</span>` : "";

      const descriptionHtml = ev.description
        ? `<p class="event-description">${ev.description}</p>`
        : "";

      const badges = [];
      if (ev.hors_saison) badges.push(`<span class="badge badge-hors-saison">Hors saison</span>`);
      const badgesHtml = badges.length ? `<div class="badges">${badges.join("")}</div>` : "";

      card.innerHTML = `
        ${logoHtml}
        <div class="event-card-body">
          <div class="tags">
            ${typeTagsHtml}
            <span class="tag ville">${ev.ville}</span>
            ${langueTagHtml}
          </div>
          ${badgesHtml}
          <h3>${ev.titre}</h3>
          ${descriptionHtml}
          <ul class="meta-list">
            <li><span class="icon">📅</span> ${JOURS_LABELS[ev.jour] ? JOURS_LABELS[ev.jour] + " · " : ""}${ev.date || "À venir"}</li>
            <li><span class="icon">🕒</span> ${ev.heure}</li>
            <li><span class="icon">📍</span> ${lieuHtml}</li>
          </ul>
          ${liensSociauxHtml}
        </div>
      `;
      container.appendChild(card);
    });
  }
});
