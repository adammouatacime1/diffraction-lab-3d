# Kit d’interface des laboratoires

Kit source React + TypeScript extrait du laboratoire de diffraction, branche **`livraison-diffraction-lab-3d`**, référence scientifique et visuelle **`db72507`**. Il fournit l’interface commune ; chaque laboratoire garde son moteur physique.

## Essayer le modèle

Installer **Node.js 22 LTS ou 24 LTS** avec npm, puis ouvrir un terminal dans le dossier **`design-kit`** extrait de l’archive :

```sh
npm ci
npm run dev
```

Ouvrir l’adresse locale affichée par Vite. Garder le terminal ouvert pendant l’utilisation. Ne pas ouvrir `index.html` par double-clic : React et TypeScript passent par Vite.

L’exemple propose un oscillateur masse–ressort : paramètres éditables, expériences prédéfinies, deux vues, lecture/pause, pas à pas, vitesse, mesures calculées et thèmes clair/sombre. Le bouton du bandeau ferme puis rouvre le laboratoire ; cette navigation appartient au site hôte. Avec la préférence système « réduire les animations », l’exemple démarre en pause.

```sh
npm run build
npm run preview
```

La version publiable se trouve dans **`example/dist/`**. Le `base: './'` de Vite permet de la servir à la racine ou dans un sous-dossier. Aucun compte GitHub ni nom de dépôt n’est inscrit dans les chemins de l’application exemple.

## Contenu

| Emplacement | Usage |
| --- | --- |
| [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) | Relevé précis du design existant, couleurs et adaptation mobile |
| [src/Core.tsx](./src/Core.tsx) | Composants React indépendants du moteur physique |
| [src/styles.css](./src/styles.css) | Tokens et styles isolés sous `.lab-kit`, classes et variables préfixées |
| [src/index.ts](./src/index.ts) | Exports de l’interface et import de la feuille de styles |
| [example/src/ExampleLaboratory.tsx](./example/src/ExampleLaboratory.tsx) | Composant principal exporté, rendu Canvas et nettoyage des ressources |
| [example/src/App.tsx](./example/src/App.tsx) | Site hôte : bandeau, thème et ouverture/fermeture |
| [example/integration.html](./example/integration.html) | Page de contrôle : styles du site hôte, thèmes imbriqués, désactivation sans démontage |
| [INTEGRATION.md](./INTEGRATION.md) | Réutilisation dans un nouveau projet React + TypeScript + Vite |
| [resources/](./resources/) | Marque SVG locale, polices et notices des dépendances |
| [references/](./references/) | Quatre captures du laboratoire original et leur provenance |
| [VERIFICATION.md](./VERIFICATION.md) | Résultats et reproduction des vérifications |
| [scripts/verify-browser.mjs](./scripts/verify-browser.mjs) | Vérification exécutable de l’exemple construit |

Les seules dépendances d’interface sont **React, ReactDOM et lucide-react**. Le fichier `package-lock.json` verrouille l’exemple. Aucun solveur de diffraction, Three.js, texture, police distante ou enregistrement audio n’est nécessaire.

Ce dossier est une distribution de sources à copier dans vos projets, pas un paquet déjà publié sur npm. La feuille `example/src/host.css` appartient uniquement à la page autonome : ne pas la copier dans le composant d’un laboratoire intégré.
