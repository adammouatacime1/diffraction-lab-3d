# Montage GBF en 3D et angle θ

Le [lien sonore](https://adammouatacime1.github.io/diffraction-lab-3d/?medium=sound) ouvre le montage **GBF → haut-parleur → fente** en vue 3D, avec le repère **θ** visible. Les ondes incidentes et diffractées proviennent du même champ de pression calculé que les cartes 2D et les microphones du laboratoire.

## Observer le montage

1. Laisser la lecture avancer pour que l'onde atteigne l'ouverture, puis la région derrière la paroi.
2. Utiliser **Isométrique**, **Dessus** ou **3D libre** pour changer de caméra. Ces commandes ne changent ni le champ ni le temps physique.
3. Régler **Angle θ du montage** avec le curseur ou la saisie numérique. L'axe de référence part du centre de la fente ; le rayon et l'arc indiquent la direction choisie.
4. Utiliser **Afficher θ sur le montage** pour masquer ou retrouver le repère. **Vue 2D** et **Vue 3D** conservent le même moteur et le même temps physique.

La fréquence et la largeur de fente restent modifiables. Leur changement recommence le calcul ; le changement de caméra ou de θ est uniquement visuel. **Pause** fige le temps et permet de comparer plusieurs directions sur le même champ.

**3D libre** active la rotation à la souris ou au doigt et le zoom par molette ou pincement. **Isométrique** ou **Dessus** rétablit le défilement normal sur le montage. L'arrêt de la lecture physique n'empêche pas de tourner la caméra.

θ est mesuré dans le plan horizontal du modèle. La perspective isométrique peut déformer son ouverture apparente à l'écran ; **Dessus** permet de lire sa géométrie sans ce raccourcissement.

En **3D libre**, glisser avec la souris ou le doigt fait tourner le montage ; la molette ou le pincement règle le zoom. La caméra reste manipulable quand le temps physique est en pause. **Isométrique** et **Dessus** rétablissent le défilement normal de la page sur l'écran tactile.

## Ce que signifie θ

Dans le montage initial, le haut-parleur représente une source acoustique localisée. Le repère est un **angle d'observation** entre la normale à la fente et une direction en aval. Il ne désigne pas un premier minimum de diffraction et n'impose aucune amplitude nulle au champ calculé.

Les valeurs initiales `a = 17 cm`, `λ = 34 cm` donnent `a/λ = 0,5`. La relation idéale de Fraunhofer `sin θ₁ = λ/a` ne donne alors aucun angle réel de premier minimum. De plus, son emploi suppose un éclairage approprié et le champ lointain : il ne s'applique pas arbitrairement à un haut-parleur localisé près de la fente.

Pour étudier séparément le premier minimum théorique, choisir **Cas θ₁ = 30° (théorie)** depuis le montage, ou ouvrir **Outils et autres expériences**, puis le cas **θ = 30°**. Ce cas emploie une source plane idéalisée et une ouverture appropriée. Les repères théoriques restent distincts des mesures du solveur à distance finie. **Voir le montage GBF et fente** restaure le haut-parleur localisé et son angle d'observation.

## Représentation 3D et disponibilité

Le relief représente la **pression acoustique**, pas un déplacement vertical de l'air. Le modèle de propagation reste **2D** ; les lignes mettent en évidence la phase du champ calculé. Elles ne représentent pas des zones de silence ni une amplitude constante. Le GBF commande la fréquence du haut-parleur ; le circuit électrique et sa directivité réelle ne sont pas entièrement simulés.

La scène 3D demande WebGL. Si ce dernier est indisponible, le laboratoire conserve le montage avec θ dans une vue Canvas 2D et affiche une explication. L'adresse `?medium=sound&view=2d` ouvre directement cette vue 2D sans tenter de créer un contexte WebGL.

## Contrôles de navigateur

Après `npm run build`, servir la construction puis exécuter :

```sh
npm run preview -- --host 127.0.0.1 --port 4180
BASE_URL=http://127.0.0.1:4180 node scripts/gbf-theta3d-browser.mjs
```

Le script utilise Chromium et produit ses résultats et captures dans `test-results/gbf-theta3d/`. Il contrôle le rendu WebGL, les fronts transmis, θ dessiné, les caméras, le partage du champ entre vues, les exports PNG issus du canvas visible, l'affichage mobile et le repli 2D. Les résultats doivent être lus dans le rapport généré ; ce document ne leur attribue pas un succès à l'avance.

Le **22 octobre 2026**, les **12 contrôles** ont réussi sur la construction de production, sans erreur JavaScript, console ou HTTP. Les **74 tests unitaires** et la construction TypeScript + Vite ont également réussi. Les [rapports et captures de référence](gbf-3d-validation/README.md) conservent ces résultats. La comparaison des exports PNG avec le canvas réellement affiché a trouvé zéro pixel différent pour les zones comparées, en 2D comme en 3D.
