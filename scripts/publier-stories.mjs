// ------------------------------
// Publication automatique des stories du jour sur la Page Facebook
// Projets Oh? — lancé chaque matin par la GitHub Action
// .github/workflows/stories-facebook.yml.
//
// 1. Ouvre le vrai site dans un Chrome invisible (Puppeteer), à l'heure
//    de Québec, pour que "aujourd'hui" soit le bon jour.
// 2. Demande à window.storyAuto (script.js) les spectacles du jour et
//    l'image story de chacun — même gabarit que le bouton "📸 Créer une story".
// 3. Publie chaque image en story via l'API Meta : téléversement de la
//    photo sans la publier, puis publication comme story.
//
// Mode test (MODE_TEST=true) : génère les images dans le dossier
// stories-generees/ sans rien publier sur Facebook.
// ------------------------------
import puppeteer from "puppeteer";
import { mkdir, writeFile } from "node:fs/promises";

const URL_SITE = "https://boussole.projetsoh.ca/";
const GRAPH = "https://graph.facebook.com/v25.0";
const PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
const MODE_TEST = process.env.MODE_TEST === "true";

if (!MODE_TEST && (!PAGE_ID || !PAGE_TOKEN)) {
  console.error("FB_PAGE_ID ou FB_PAGE_TOKEN manquant dans les Secrets du dépôt.");
  process.exit(1);
}

async function appelGraph(chemin, corps) {
  const reponse = await fetch(`${GRAPH}/${chemin}`, { method: "POST", body: corps });
  const json = await reponse.json();
  if (!reponse.ok || json.error) {
    throw new Error(`Erreur Meta (${chemin}) : ${JSON.stringify(json.error || json)}`);
  }
  return json;
}

async function publierStory(pngBuffer, nomFichier) {
  // Étape 1 : téléverser la photo sans la publier sur le fil de la Page
  const formulaire = new FormData();
  formulaire.append("source", new Blob([pngBuffer], { type: "image/png" }), nomFichier);
  formulaire.append("published", "false");
  formulaire.append("access_token", PAGE_TOKEN);
  const photo = await appelGraph(`${PAGE_ID}/photos`, formulaire);

  // Étape 2 : publier cette photo comme story
  const story = new URLSearchParams({ photo_id: photo.id, access_token: PAGE_TOKEN });
  return appelGraph(`${PAGE_ID}/photo_stories`, story);
}

const navigateur = await puppeteer.launch({ args: ["--no-sandbox"] });
let echecs = 0;

try {
  const page = await navigateur.newPage();
  await page.emulateTimezone("America/Toronto");
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(URL_SITE, { waitUntil: "networkidle0", timeout: 90000 });

  // Attendre que les 8 onglets du Sheet soient chargés
  await page.waitForFunction(
    () => window.storyAuto && window.storyAuto.evenementsDuJour() !== null,
    { timeout: 90000 }
  );

  const titres = await page.evaluate(() =>
    window.storyAuto.evenementsDuJour().map(ev => ev.titre)
  );
  console.log(`${titres.length} spectacle(s) aujourd'hui :`, titres);

  if (MODE_TEST) await mkdir("stories-generees", { recursive: true });

  // Ordre aléatoire, pour ne pas toujours mettre les mêmes spectacles en premier
  const ordre = titres.map((_, i) => i);
  for (let j = ordre.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [ordre[j], ordre[k]] = [ordre[k], ordre[j]];
  }

  for (const i of ordre) {
    const nomFichier = `story-${i + 1}-${titres[i].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}.png`;
    try {
      const dataUrl = await page.evaluate(index => window.storyAuto.genererImage(index), i);
      const png = Buffer.from(dataUrl.split(",")[1], "base64");

      if (MODE_TEST) {
        await writeFile(`stories-generees/${nomFichier}`, png);
        console.log(`✅ [TEST] Image générée : ${nomFichier}`);
      } else {
        const resultat = await publierStory(png, nomFichier);
        console.log(`✅ Story publiée : ${titres[i]} (post ${resultat.post_id || "?"})`);
      }
    } catch (err) {
      echecs++;
      console.error(`❌ Échec pour « ${titres[i]} » :`, err.message);
    }
  }
} finally {
  await navigateur.close();
}

// Un échec fait échouer l'exécution → GitHub envoie un courriel d'avertissement
if (echecs > 0) {
  console.error(`${echecs} story(s) en échec.`);
  process.exit(1);
}
