# Intégrer un nouveau laboratoire

## 1. Créer un projet React + TypeScript + Vite

Avec Node.js 22 ou 24 :

```sh
npm create vite@latest mon-laboratoire -- --template react-ts
cd mon-laboratoire
npm install
npm install lucide-react@0.468.0
```

Copier **le contenu de `design-kit/src/`** dans **`mon-laboratoire/src/shared/lab-ui/`**. Garder `Core.tsx`, `index.ts` et `styles.css` ensemble. React et ReactDOM sont déjà fournis par le modèle Vite ; l’exemple livré a été vérifié avec React 19 et TypeScript 5.8. Le kit ne nécessite pas Three.js.

Importer les composants depuis `./shared/lab-ui` : l’entrée `index.ts` charge aussi la feuille de styles. Si votre projet utilise une politique de suppression des modules `sideEffects: false`, conserver explicitement les fichiers CSS et l’entrée du kit dans les exceptions, ou importer `./shared/lab-ui/styles.css` dans votre entrée principale. Le `package.json` livré marque déjà ces effets comme nécessaires.

Retirer les styles de démonstration de Vite dans **`App.css` et `index.css`**, ou retirer leurs imports : ils contiennent notamment les règles globales pour boutons, titres, `#root` et le centrage du `body` avec `display: flex`. Le site hôte peut avoir ses propres styles ; le kit ne lui impose ni fond, ni marge du `body`, ni thème sur `document.documentElement`.

## 2. Exporter le laboratoire, séparer le site hôte

Organisation conseillée :

```text
src/
  App.tsx                    # navigation générale du site
  shared/lab-ui/             # copie des composants et du CSS du kit
  laboratories/pendulum/
    PendulumLaboratory.tsx   # composant principal exporté
    engine.ts                # équations, intégration et validation
    PendulumScene.tsx        # rendu et ressources propres à la scène
    pendulum.css             # styles spécifiques préfixés .pendulum-lab
```

Chaque dépôt expose au minimum un composant de ce type :

```tsx
export interface LaboratoryProps {
  active?: boolean;
  theme?: 'light' | 'dark';
}

export function PendulumLaboratory({ active = true, theme = 'light' }: LaboratoryProps) {
  // État et moteur propres au laboratoire.
  return <LabRoot theme={theme} className="lk-app pendulum-lab">
    {/* WorkspaceHeading, LabLayout, Panel, SimulationCard, MetricGrid… */}
  </LabRoot>;
}

export default PendulumLaboratory;
```

Les imports sont omis dans ce fragment de contrat. Le modèle complet et compilable est [ExampleLaboratory.tsx](./example/src/ExampleLaboratory.tsx). Il exporte `ExampleLaboratory` à la fois comme export nommé et comme export par défaut, sans routeur ni bandeau de navigation générale.

Le site décide quel laboratoire monter :

```tsx
import { useState } from 'react';
import { PendulumLaboratory } from './laboratories/pendulum/PendulumLaboratory';

export default function App() {
  const [opened, setOpened] = useState(true);
  return <>
    <nav aria-label="Laboratoires">
      <button onClick={() => setOpened(!opened)}>Ouvrir / fermer</button>
    </nav>
    {opened && <PendulumLaboratory theme="light" />}
  </>;
}
```

Un site qui garde un laboratoire monté dans un onglet masqué lui passe `active={false}`. Masquer le CSS, changer de route ou masquer un canvas ne suffit pas à arrêter ses calculs. Le contrat `active` doit être respecté par le moteur et par le rendu. Dans l’exemple, la fermeture du bandeau démontre le démontage ; [integration.html](./example/integration.html) démontre la désactivation sans démontage.

## 3. Assembler l’interface

| Composant | Responsabilité |
| --- | --- |
| `LabRoot` | Racine isolée et thème local ; englobe tous les éléments du kit |
| `LabHeader` | Bandeau optionnel, à utiliser dans le site hôte |
| `WorkspaceHeading` | Surtitre, titre, introduction et emplacement des modes |
| `Tabs` | Onglets avec navigation clavier ←/→, Début/Fin ; associer leur panneau |
| `LabLayout` | Colonne latérale indépendante sur ordinateur, simulation puis réglages sur mobile |
| `Panel`, `ExperimentList` | Cartes et choix d’expérience |
| `ParameterControl`, `NumericInput` | Nombre + curseur liés, bornes, virgule ou point, validation au flou/Entrée |
| `SelectControl`, `Toggle` | Listes et cases à cocher natives, avec libellés |
| `Button`, `IconButton`, `Badge` | Actions, nom accessible des icônes et statut textuel |
| `SegmentedControl` | Choix de vue avec état `aria-pressed` |
| `SimulationCard`, `SimulationViewport` | Enveloppe recevant votre propre Canvas, SVG ou WebGL |
| `PlaybackBar` | Lecture, pause, réinitialisation, pas, vitesse et horloge ; callbacks fournis par le moteur |
| `MetricGrid` | Label, symbole, valeur formatée, unité et explication |
| `Callout` | Explication pédagogique avec pictogramme facultatif |

Les props et types exportés sont lisibles dans [Core.tsx](./src/Core.tsx). Les composants ne connaissent aucune grandeur scientifique, aucun scénario de diffraction et aucun système d’unités imposé. Fournir les valeurs formatées à `MetricGrid` ; `toLocaleString('fr-FR', …)` reproduit la virgule et les chiffres tabulaires du laboratoire.

Pour `Tabs`, fournir un `id` unique (par exemple `useId()`), puis associer le panneau :

```tsx
<div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${mode}`}>
  {/* contenu du mode sélectionné */}
</div>
```

L’exemple montre ce lien complet. Pour les paramètres sur deux colonnes au mobile, ajouter `className="lk-parameters"` au `Panel`. Pour la liste d’expériences, utiliser `bodyClassName="lk-library-body"` afin d’éviter une double marge interne. La classe `lk-app` sur la racine du laboratoire fournit le centrage et la largeur maximale de 1800px.

`SimulationViewport` n’installe aucun gestionnaire de molette : le document peut défiler au-dessus de la scène. Si votre rendu 3D propose un zoom, l’activer par une commande explicite et nommée. Ne pas capturer la molette par défaut. Le canvas du modèle utilise `touch-action: pan-y`.

## 4. Isoler les styles et les ressources

- Tous les sélecteurs du kit appartiennent à `.lab-kit`. Les classes ont le préfixe `lk-` et les variables le préfixe `--lk-`. Les thèmes sont portés par `data-lab-theme` sur **chaque instance**.
- Les tokens sont redéfinis à chaque racine : des laboratoires clair et sombre peuvent être frères ou imbriqués. Aucun attribut de thème n’est écrit sur `html` ou `body`.
- Préfixer les styles de scène par une classe propre au laboratoire, ou utiliser des CSS Modules. Éviter les règles globales `canvas`, `button`, `h1`, `:root`, `*` et `body` dans un composant réutilisable.
- Les media queries du kit dépendent de la fenêtre, comme dans le laboratoire original. Prévoir une zone principale large. Pour un tableau de bord avec de petites colonnes sur grand écran, adapter la disposition localement ou utiliser une iframe : le kit n’emploie pas de container queries.
- Les préfixes évitent les conflits courants ; ils ne forment pas une frontière Shadow DOM contre un site qui imposerait des règles globales `!important`.

Ne pas copier `example/src/host.css` dans votre laboratoire : son unique reset `body { margin: 0 }` sert à l’exemple autonome. Les polices sont locales ; voir [resources/README.md](./resources/README.md). Le SVG facultatif peut être importé depuis `src/assets/` ; le kit fonctionne également sans ce favicon.

## 5. Éviter les chemins de déploiement fixes

Pour un site statique Vite :

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ base: './', plugins: [react()] });
```

Importer les ressources :

```ts
import apparatusUrl from './assets/apparatus.svg';
const worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
```

Éviter `/nom-du-depot/…`, `/assets/…`, les adresses `github.io` codées dans le composant et les chemins du poste de développement. Pour une ressource volontairement placée dans `public/`, utiliser `import.meta.env.BASE_URL` plutôt qu’une racine absolue.

La navigation générale appartient au site hôte : pour GitHub Pages, une navigation par fragment (`#laboratoires/pendule`) évite d’exiger une réécriture serveur. Un routeur avec URL de chemin doit recevoir sa base depuis la configuration du site et prévoir le service des routes. Un laboratoire exporté ne configure pas son propre routeur global.

## 6. Arrêter et nettoyer à la fermeture

Le modèle masse–ressort montre un `useEffect` qui ne démarre que si `active` vaut `true`. Son nettoyage annule `requestAnimationFrame`, déconnecte `ResizeObserver` et retire les écouteurs `visibilitychange` et `matchMedia`. Le temps est conservé en référence ; à la reprise, le temps écoulé pendant l’arrêt n’est pas ajouté. La simulation se suspend également quand l’onglet du navigateur est masqué.

Pour un autre moteur, appliquer ce même cycle de vie à ses propres ressources :

| Ressource créée par votre laboratoire | À la désactivation ou au démontage |
| --- | --- |
| `requestAnimationFrame`, timers | `cancelAnimationFrame`, `clearInterval`, `clearTimeout` |
| Worker de calcul | Arrêter le calcul et appeler `terminate()` ; recréer à l’activation si nécessaire |
| Écouteurs, observers | Retirer les mêmes fonctions ; `disconnect()` |
| Requêtes réseau en cours | Annuler avec `AbortController` quand elles ne sont plus utiles |
| Three.js/WebGL créé manuellement | Libérer géométries, matériaux, textures, render targets, contrôles et renderer |
| Audio créé par le laboratoire | Suspendre/arrêter puis fermer/libérer selon le type de ressource |

Avec React Three Fiber, respecter son cycle de démontage, arrêter les boucles manuelles et libérer les ressources externes qui ne lui appartiennent pas. Ne pas libérer une ressource partagée tant qu’une autre simulation l’utilise. Vérifier aussi avec `StrictMode`, qui répète les montages/nettoyages en développement.

L’interface peut rester visible mais inactive ; désactiver alors les commandes qui lanceraient du calcul. Le simple chargement du module du laboratoire ne doit pas créer de boucle, de worker ou d’abonnement : créer ces ressources dans le cycle de vie du composant.

## 7. Préparer le regroupement futur

Chaque dépôt peut d’abord publier son application autonome. Garder le composant principal et son moteur séparés de `App.tsx` permet ensuite de les importer dans un site commun, éventuellement par chargement différé (`React.lazy`). Le kit livré est une distribution de sources : le regroupement multi-dépôts reste une étape future, pas un service déjà raccordé.

Utiliser une version commune du kit dans les différents dépôts et noter la révision utilisée. Lors du regroupement, dédupliquer React et le CSS commun, confier le thème et la navigation au site et conserver les styles/ressources de chaque scène dans son propre module. Chaque laboratoire garde aussi ses tests et sa validation scientifique.

Pour vérifier une nouvelle intégration, reproduire les contrôles du [rapport de vérification](./VERIFICATION.md) : compilation indépendante, mise à jour des mesures, thèmes, petit écran sans débordement, défilement et nettoyage à la fermeture.
