# Vérification du montage sonore GBF et fente

Le [guide 3D et θ](GBF-3D.md) décrit la révision qui ouvre le montage directement en 3D, avec ses contrôles et ses vérifications. Les rapports ci-dessous conservent la référence du montage initial, commit `c8cfa6d`.

Cette révision ouvre directement le mode sonore sur un montage animé **GBF → câble → haut-parleur → fente → ondes diffractées**. Les traits sont tirés du champ de pression calculé. La vue d'observation masque les cartes de mesures et les panneaux avancés, accessibles avec **Outils et autres expériences**.

## Contrôles réalisés le 22 octobre 2026

| Contrôle | Résultat |
| --- | --- |
| Tests unitaires et numériques | **74/74**, dans 9 fichiers |
| Parcours de navigateur du mode eau | **18/18** |
| Parcours de navigateur de l'angle θ | **9/9** |
| Parcours complet acoustique, six géométries, 2D/3D, exports et absence de WebGL | **17/17** |
| Montage GBF : observation, réglages, extinction, mobile et retour aux outils | **8/8**, [rapport du montage](gbf-validation/gbf-browser-report.json) |
| Scène 3D finale, vue dessus et isométrique au même temps physique | **3/3**, [rapport 3D](gbf-validation/3d-browser-report.json) |
| Construction TypeScript + Vite | Réussie |

Les trois nouveaux tests numériques vérifient la propagation jusqu'à la région derrière la fente, la transmission **hors axe**, l'absence de pression transmise à travers une paroi complètement fermée, ainsi que la propagation et la dissipation des ondes après extinction de la source. Aucun émetteur artificiel n'est placé après la fente. La norme quadratique employée pour contrôler la dissipation est une grandeur numérique, sans conversion en intensité acoustique.

Le contrôle du montage dans Chromium vérifie que les réglages visibles modifient les valeurs réellement exportées, que le champ et le temps sont conservés lorsque le GBF est éteint en pause, et que la vue avancée reste accessible. Les captures couvrent ordinateur et mobile, en clair et en sombre. Les parcours complets ont précédé un dernier ajustement de lisibilité des étiquettes du GBF 3D ; le montage et la scène 3D sont contrôlés à nouveau sur la construction finale.

Les rapports bruts, les captures et les empreintes de cette construction sont conservés dans [gbf-validation/](gbf-validation/README.md). Le [bilan de la première version acoustique](VALIDATION-SON.md) conserve les contrôles antérieurs du cycle de vie et l'audit initial.

## Reproduire

```sh
npm ci
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4180
```

Dans un autre terminal, avec Chromium installé :

```sh
BASE_URL=http://127.0.0.1:4180 node scripts/gbf-browser.mjs
BASE_URL=http://127.0.0.1:4180 npm run test:browser
BASE_URL=http://127.0.0.1:4180 node scripts/theta-overlay-browser.mjs
BASE_URL=http://127.0.0.1:4180 node scripts/acoustic-browser.mjs
```

Exécuter les parcours l'un après l'autre sur une machine chargée : les rendus WebGL logiciels de plusieurs navigateurs peuvent ralentir fortement la progression de l'horloge physique.

## Limites

Le haut-parleur est un symbole d'une source acoustique localisée du modèle **2D**. Sa directivité réelle, son boîtier et son circuit électromécanique ne sont pas calculés. Le GBF contrôle la fréquence et l'activation de cette source ; aucune tension électrique calibrée n'est simulée. Les fronts visibles représentent la phase du champ, pas une amplitude constante ni des zones de silence entre les traits. Les parois restent rigides et les bords dissipatifs peuvent réfléchir une partie du champ.

Les contrôles utilisent Chromium, avec mobile émulé ; ils ne remplacent pas une expérience acoustique réelle. Voir le [guide du montage](GBF.md) et l'[audit du moteur](ACOUSTIC-ENGINE-AUDIT.md).
