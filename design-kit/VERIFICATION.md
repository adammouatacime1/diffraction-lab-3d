# Vérifications du kit

Vérifications réalisées le **21 octobre 2026**, sous Linux, Node **24.19.0**, npm **11.9.0**, Chromium **154.0.8037.57**. Les contrôles mobiles utilisent des tailles de fenêtre mobiles dans Chromium ; ils ne constituent pas un essai sur un iPhone physique.

## Exemple autonome

Depuis `design-kit/` :

```sh
npm ci
npm run build
npm run verify:browser
```

La construction TypeScript stricte et Vite réussit. Versions résolues du kit : React/ReactDOM **19.3.1**, lucide-react **0.468.0**, TypeScript **5.8.3**, Vite **6.4.5**, playwright-core **1.64.1**. Le CSS du kit est bien inclus dans le résultat de production ; les fichiers ne dépendent pas des modules npm du laboratoire de diffraction.

Le script de navigateur lance son propre serveur local sur un port libre. Il sert **`example/dist/` sous `/cours/physique/laboratoire/`** pour vérifier les chemins du résultat construit. Il utilise Chrome, Chromium ou Edge déjà installé, sans télécharger de navigateur. Si nécessaire, renseigner `CHROME_PATH` avec le chemin de l’exécutable ; sous PowerShell :

```powershell
$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run verify:browser
```

Résultat : **9 groupes de contrôles réussis**, sans erreur JavaScript ni ressource HTTP manquante :

1. Chargement de la construction de production dans un sous-dossier, favicon et CSS inclus.
2. Saisie décimale avec virgule, bornes, rejet des valeurs invalides, touches de réglage et mise à jour des mesures.
3. Onglets au clavier et association au panneau affiché.
4. Animation, pause, pas à pas et remise à zéro.
5. Défilement indépendant des réglages sur ordinateur ; molette au-dessus du canvas faisant défiler le document.
6. Démontage du laboratoire puis réouverture : aucune boucle, aucun `ResizeObserver` ni écouteur de visibilité/préférence conservé après fermeture.
7. Thèmes clair/sombre et largeurs **320, 390, 768, 1024 et 1440px**, sans débordement horizontal ; réglages après la scène sur mobile.
8. Styles du site hôte préservés, thème clair imbriqué dans une racine sombre, largeur maximale 1800px appliquée au laboratoire autonome.
9. `active={false}` : arrêt complet sans démontage, horloge stable, commandes de lecture désactivées et reprise possible.

Le suivi des ressources instrumente les API du navigateur ; il vérifie les ressources créées par cet exemple, pas celles d’un futur moteur externe. Les futurs laboratoires doivent tester leurs propres workers, scènes 3D et calculs.

Le rapport JSON et les captures du contrôle sont générés dans `test-results/` (ignoré par Git et exclu de l’archive). Le [rapport de l’installation depuis l’archive](./references/verification-browser.json) et les [captures de l’exemple](./references/example/) sont conservés comme preuves de référence.

## Consommation dans un nouveau projet Vite

Un projet neuf a été créé dans un dossier temporaire indépendant avec **create-vite 9.3.1**, modèle `react-ts`. Seuls **`Core.tsx`, `index.ts` et `styles.css`** ont été copiés dans `src/shared/lab-ui/` ; ses dépendances ont été installées séparément, sans lien symbolique ni import vers le dépôt de diffraction.

Versions de ce second projet : **React/ReactDOM 19.3.1, TypeScript 6.0.3, Vite 8.3.5, lucide-react 0.468.0**. Sa compilation réussit, avec le CSS du kit présent. Sa construction a été servie sous **`/faculty/labs/mass/`** : paramètres et mesures liés, thème sombre, styles voisins du site conservés, aucun débordement à 1440 et 390px, aucune erreur JavaScript ni ressource manquante.

Cela vérifie la méthode de copie décrite dans [INTEGRATION.md](./INTEGRATION.md), en plus du modèle livré avec son propre fichier de verrouillage.

## Laboratoire de diffraction conservé

La référence de départ est `db725076835a54065b8a59cf7c2b8375f4856e49`, branche `livraison-diffraction-lab-3d`. Aucun fichier de `src/`, `public/` ni aucune configuration/dépendance de l’application d’origine n’a été modifié. Les empreintes SHA-256 des fichiers de l’application relevées avant le travail sont identiques après extraction.

À la racine du dépôt de diffraction : **`npm run build` réussit et `npm test` réussit, 23 tests sur 23**. Les [quatre captures réelles](./references/README.md) documentent son rendu sur ordinateur/mobile et dans les deux thèmes.

## Archive

`design-kit.zip`, à la racine du dépôt, contient le dossier `design-kit/`, ses sources, son fichier de verrouillage, la documentation et les captures. Les dossiers `node_modules`, `dist` et `test-results` en sont exclus. Pour la régénérer avec Python 3, depuis le dossier du kit :

```sh
python scripts/package-kit.py
```

Une copie de l’archive a été extraite dans un dossier temporaire indépendant, sans fichiers ni modules npm du dépôt parent : **`npm ci`, `npm run build` et les 9 groupes de contrôles navigateur y réussissent**. L’intégrité ZIP et l’identité des fichiers archivés avec le dossier source ont également été contrôlées.

Pour contrôler une archive reçue, l’extraire dans un dossier indépendant puis exécuter les trois commandes npm du début de ce document. La construction n’exige aucun fichier du dépôt parent.
