# Vérifications du laboratoire eau et son

Pour la révision qui ouvre directement le montage **GBF → haut-parleur → fente**, consulter [GBF-VALIDATION.md](GBF-VALIDATION.md). Les résultats et captures ci-dessous conservent la référence de la première livraison acoustique, commit `102f00f`.

Version vérifiée le **22 octobre 2026**, sur la branche **`ajout-ondes-sonores`**, issue du code complet `b11607e208d996535705630ee71d9bcd30e64857` de `livraison-diffraction-lab-3d`. Les captures et rapports correspondent à la construction de production dont les empreintes figurent dans [tested-build.json](son-validation/tested-build.json).

## Résultats réellement obtenus

| Vérification | Résultat | Portée |
| --- | --- | --- |
| `npm test` | **71/71**, 8 fichiers | Régressions eau, propagation acoustique, réflexion de pression sur paroi rigide, stabilité, six masques, interférences, RMS, formats et instantanés synchronisés |
| `npm run build` | Réussi | Vérification TypeScript et construction Vite, avec chemins relatifs conservés |
| `npm run test:browser` | **18/18** | Laboratoire eau, outils, sources, sondes, exports, comparaison, thèmes et mobile |
| `node scripts/theta-overlay-browser.mjs` | **9/9** | Affichage de θ, conditions d'application, source ponctuelle, comparaison et téléphone |
| `node scripts/acoustic-browser.mjs` | **17/17** | Milieux indépendants, six géométries, microphones, RMS, vues, imports/exports, Huygens, mobile et absence de WebGL |
| Désactivation et démontage du composant exporté | **12/12 assertions** | Arrêt des animations, retrait des canvas, déconnexion des observateurs et écouteurs ; reprise des paramètres lors d'une réactivation |
| `git diff --check` | Réussi | Absence d'erreurs d'espacement dans les changements |

Les contrôles de navigateur ont utilisé **Chromium 154.0.8037.57**, les ressources de `npm run build` servies par `npm run preview` et des fenêtres ordinateur et mobile. Aucun message d'erreur JavaScript, console ou HTTP n'a été observé dans le parcours acoustique de production. Le contrôle de cycle de vie a utilisé séparément une page de test Vite ; son unique requête manquante était le favicon de cette page temporaire, sans rapport avec l'application publiée.

## Points contrôlés en détail

- Le mode eau conserve ses tests numériques et son parcours de navigateur. Les anciens exports version 1 sont migrés explicitement vers le milieu eau.
- Le solveur acoustique est testé sur la célérité, la longueur d'onde, le signe positif de la réflexion de pression sur une paroi rigide, la stabilité et l'effet des six géométries. Les sources cohérentes produisent des interférences calculées. Les bornes des deux sources et les imports invalides sont contrôlés avant modification de l'état.
- La pression efficace est calculée à partir de valeurs réellement échantillonnées sur quatre périodes. Les tests la distinguent de l'amplitude harmonique et vérifient sa remise à zéro.
- Le navigateur vérifie le déplacement des microphones, le refus d'une position solide et leur déplacement vers une cellule libre lorsqu'une nouvelle géométrie couvre leur emplacement. Le graphique utilise Pa et ms.
- La synchronisation est mesurée sur les **canvas réellement dessinés** : 20 images consécutives en vue partagée 2D/3D, puis 20 images avec les quatre canvas de comparaison. Toutes les horloges physiques sont identiques pour chaque image, tandis que le champ évolue. Les instantanés des deux moteurs de comparaison sont figés ensemble.
- La vue 2D est testée avec WebGL désactivé : elle ne tente pas de créer un contexte WebGL. Une demande de vue 3D affiche alors la carte 2D et une explication.
- Les contrôles visuels couvrent les thèmes clair et sombre à 1 440 et 390 pixels de largeur, les vues partagées mobiles et la comparaison. Les légendes restent hors des cartes acoustiques pour laisser les coordonnées visibles.
- Avec `active={false}` puis après démontage, le contrôle instrumenté constate zéro animation en attente, zéro cible observée, zéro écouteur de visibilité et zéro canvas. La réactivation conserve les paramètres et reprend le même moteur. Aucun worker n'est créé par cette version.

Les rapports bruts et les captures sont conservés dans [son-validation/](son-validation/README.md). L'[audit du moteur](ACOUSTIC-ENGINE-AUDIT.md) décrit les équations, les tolérances numériques et les conditions aux limites.

## Reproduire les contrôles

```sh
npm ci
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4180
```

Dans un deuxième terminal, avec Chromium disponible (le script utilise `/usr/bin/chromium` par défaut) :

```sh
BASE_URL=http://127.0.0.1:4180 npm run test:browser
BASE_URL=http://127.0.0.1:4180 node scripts/theta-overlay-browser.mjs
BASE_URL=http://127.0.0.1:4180 node scripts/acoustic-browser.mjs
```

Les sorties sont générées dans `test-results/`, dossier ignoré par Git. Le contrôle instrumenté du cycle de vie a été effectué ponctuellement avec une page de test du composant exporté ; son rapport est conservé, mais cette page temporaire ne fait pas partie de l'application.

## Limites de ces vérifications

Ces contrôles ne constituent pas une validation expérimentale de l'air réel. Le calcul reste un modèle scalaire de pression **2D** dans un milieu homogène, linéaire et non dispersif ; le relief est une représentation de pression. Les obstacles sont rigides et approchés sur un maillage cartésien. La couche dissipative extérieure laisse des réflexions résiduelles et n'est pas une PML.

Quatre périodes d'acquisition ne garantissent pas à elles seules un régime établi, notamment dans une cavité réfléchissante. Une faible pression instantanée ne démontre pas un silence. Aucune intensité absolue en W/m² ni propagation acoustique volumique n'est revendiquée.

Le contrôle mobile utilise une fenêtre émulée dans Chromium ; Safari, les téléphones physiques et une comparaison avec des mesures acoustiques réelles restent à vérifier séparément.
