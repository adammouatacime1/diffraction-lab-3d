# Design system — Diffraction Lab 3D

Ce document décrit le design effectivement présent dans le laboratoire, relevé dans `src/styles/app.css`, `src/App.tsx` et `src/components/WaveScene.tsx`, sur la branche `livraison-diffraction-lab-3d`, à la révision `db725076835a54065b8a59cf7c2b8375f4856e49`. Les captures du dossier [`references`](./references/) constituent les références visuelles du laboratoire d’origine.

Le kit reprend ce langage visuel pour d’autres expériences. Ses classes sont préfixées `lk-`, ses variables `--lk-`, et tous ses styles appartiennent à une racine `.lab-kit`. L’application de diffraction conserve ses propres styles et son moteur. Les composants génériques du kit ne constituent pas un nouveau solveur de diffraction.

## 1. Palette et thèmes

Les noms d’origine ci-dessous correspondent aux variables de la feuille de styles du laboratoire ; leur équivalent dans le kit ajoute le préfixe `lk` : `--bg` devient `--lk-bg`, par exemple.

| Rôle / variable d’origine | Clair | Sombre |
| --- | --- | --- |
| Fond de page `--bg` | `#edf2f5` | `#121c24` |
| Panneau `--panel` | `#ffffff` | `#1b2934` |
| Fond secondaire `--panel-soft` | `#f6f9fb` | `#22323e` |
| Texte principal `--text` | `#243b49` | `#dce7ee` |
| Texte secondaire `--muted` | `#7c8e99` | `#94a7b5` |
| Bordures/séparateurs `--line` | `#e6edf1` | `#2c3d48` |
| Accent interactif `--accent` | `#218ca2` | `#64c2d2` |
| Fond d’accent `--accent-soft` | `#e9f5f6` | `#24424c` |
| Fond CSS de simulation `--scene` | `#e8f1f7` | `#162a38` |
| Ombre `--shadow` | `0 4px 24px #28485904` | `0 5px 24px #00000011` |

Les codes à huit chiffres incluent une transparence : `#28485904` possède un alpha de `4/255` (≈ 1,6 %) ; `#0001`, écrit sous forme courte dans la source, équivaut à `#00000011` (≈ 6,7 %). Les cartes reposent surtout sur leurs bordures, avec une ombre très légère.

Autres couleurs présentes :

| Usage | Couleurs / traitement |
| --- | --- |
| Focus clavier | Contour `3px solid #45b3ce`, décalage `3px` |
| Libellé de paramètre | Clair `#617785` ; sombre `--muted` |
| Expérience inactive | `#657d8b` |
| État en calcul | Point `#45a98c` ; halo `#45a98c0b` ; texte `#588f7d` |
| État en pause | Point `#b69c67` |
| Bouton lecture | Fond `#243e4e`, texte blanc |
| Fond des onglets | Clair `#dfe7ec90`, bordure `#dce5eb` ; sombre `#15232d`, bordure `--line` |
| Avertissement | Clair : fond `#fff5de`, bordure `#edddab`, texte `#8f6b20` ; sombre : `#403827`, `#6c5b39`, `#e5c681` |
| Badge « théorie » | Fond `#fbf2df`, texte `#ac8a3c` |
| Badge de données | Fond `--accent-soft`, texte `--accent` |
| Courbes / sondes graphiques | Bleu `#218dba`, seconde série orange `#c26a46` |
| Icône de marque / carte pédagogique | Bordure `#d4e8eb`, fond `--accent-soft`, trait `--accent` |

Dans l’application d’origine, `data-theme="dark"` est placé sur `document.documentElement`. Dans le kit, le thème est appliqué **sur chaque racine `.lab-kit`** avec `data-lab-theme="light"` ou `"dark"`, et `color-scheme` suit ce thème. Cela permet d’intégrer deux laboratoires de thèmes différents sans changer le site hôte.

### Palette scientifique distincte de l’interface

L’élongation du champ est rendue avec un dégradé divergent : bleu négatif `#1763ad` → zéro `#acd2dc` → positif `#f6a97e`. Pour l’amplitude/intensité, la légende part de `#102342`, passe par `#acd2dc`, puis `#f6a97e`. Les cellules solides du champ ont la couleur `#112638`. Les valeurs hors échelle sont saturées ; les légendes l’indiquent.

Le fond **WebGL** réel est `#e1e9ed` en clair et `#09121f` en sombre ; il recouvre le fond CSS `--scene`. Ce ne sont donc pas deux valeurs interchangeables. Les parois, éclairages, sources, sondes et repères θ appartiennent au rendu de diffraction et ne sont pas des composants d’interface génériques. Les repères θ utilisent notamment des rayons `#ffb331`, un arc `#ffdc75` et un texte `#fff3c4`.

## 2. Typographie

Pile exacte : `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Aucun fichier de police n’est fourni et aucun service de polices n’est appelé. **Inter est utilisé seulement s’il est installé sur l’appareil** ; sinon la police système prend le relais. La forme des caractères peut donc varier entre Windows, macOS, Linux et mobile. Le kit conserve ce comportement sans requête réseau externe.

Les lettres mathématiques en italique utilisent `Georgia, serif`. Les valeurs numériques importantes utilisent `font-variant-numeric: tabular-nums` pour stabiliser les colonnes et l’horloge. Les décimales sont affichées en français dans le laboratoire (virgule) ; ce formatage relève des composants, et non du CSS.

| Élément | Taille / graisse / détails sur ordinateur |
| --- | --- |
| Texte racine | Graisse 400, `font-synthesis: none` |
| Marque | 19px, espacement −0,6px ; partie forte 700 |
| Sous-titre de marque | 7px, espacement 1,45px, marge haute 5px |
| Indication de version | 7px / 700, espacement 0,8px |
| Grand titre de laboratoire | 30px / 600, interligne 1,2, espacement −1,2px |
| Introduction | 12px, interligne 1,65, marge haute 8px |
| Surtitre général | 8px / 700, espacement 1,7px, marge basse 9px |
| Titre de panneau latéral | 12px / 650, espacement −0,15px |
| Titre de simulation | 16px / 600, espacement −0,3px |
| Surtitre d’expérience | 7px / 700, espacement 1,6px, marge basse 5px |
| Libellé de paramètre | 11px, interligne 1,5 ; symbole Georgia 12px |
| Entrée numérique | 12px / 600, chiffres tabulaires |
| Onglet principal | 11px ; commande de vue segmentée 9px |
| Label de mesure | 7px / 600, capitales, espacement 1px |
| Grande mesure | 21px / 500, espacement −0,6px ; symbole Georgia 20px / 400 |
| Unité / explication de mesure | 11px / 8px, explication interligne 1,6 |
| Horloge | 17px / 500, espacement −0,7px ; unité 10px ; label 6px espacement 1,3px |
| Carte pédagogique | Titre 12px / 600, interligne 1,6 ; paragraphe 10px, marge haute 7px |

Les petits corps font partie du design relevé. La documentation ne prétend pas qu’ils satisfont à eux seuls tous les besoins d’accessibilité : pour une présentation projetée ou un public ayant besoin de grands caractères, le laboratoire possède un mode Présentation qui augmente notamment les mesures (28px), le titre d’expérience (21px), le bouton de lecture (14px) et l’horloge (25px). Le kit laisse les contenus et la politique de zoom au projet qui l’intègre.

## 3. Structure, espacements et dimensions

L’interface est une page fluide limitée à **1800px**, centrée. L’en-tête mesure **80px** de haut, avec des marges internes horizontales de **36px**. L’introduction et la navigation des modes occupent la bande suivante : `34px 36px 25px`, avec un intervalle de 24px entre leurs blocs.

La grille principale comporte une colonne de réglages de **266px**, une colonne de simulation `minmax(0, 1fr)`, un intervalle de **22px** et des marges latérales de **36px**. La colonne latérale et la colonne principale empilent leurs cartes avec **16px** d’intervalle. Les panneaux ont `min-width: 0` lorsque nécessaire pour permettre à la grille de rétrécir.

Les espacements dominants sont 4, 7/8, 10/12, 14/16, 17/18, 20/22 et 25/36px. La source emploie ces valeurs directement : il ne s’agit pas d’une grille uniforme de multiples de 4px.

| Zone | Dimensions / espacements d’origine |
| --- | --- |
| Carte/panneau | Bordure 1px, rayon 13px, contenu débordant masqué |
| En-tête de panneau | 17px, intervalle 8px, séparation basse 1px |
| Corps des réglages | `15px 17px 9px` ; paramètre avec marge basse 17px |
| Liste d’expériences | Marge interne 7px ; ligne `10px 9px`, intervalle 10px, hauteur minimale 34px, rayon 6px |
| En-tête de simulation | `18px 21px`, intervalle 12px, séparation basse 1px |
| Barre de vue | `12px 19px`, intervalle 10px |
| Zone de simulation | Hauteur 470px ; bordures haute et basse 1px |
| Commandes de lecture | `12px 21px`, intervalles 12px |
| Bande de mesures | 4 colonnes égales, rayon 11px, marge interne `19px 4px` |
| Mesure | `0 20px`, intervalle vertical 10px, séparateur droit sauf dernière |
| Carte pédagogique | Marge interne 22px, intervalle 14px ; pictogramme 36×36px, rayon 10px |
| Petit encadré de valeurs | Rayon 8px, marge interne `12px 11px`, texte 9px, intervalle 10px |

### Défilement et interaction de la zone de simulation

Au-dessus de 600px, la colonne de réglages est `position: sticky; top: 16px; align-self: start`. Sa hauteur maximale vaut `max(300px, calc(100dvh - 210px))`. Elle défile verticalement de façon indépendante avec `overflow-y: auto`, `overscroll-behavior-y: contain`, une barre fine, une gouttière stable et 5px de réserve à droite. Son contour de focus est de 2px dans la couleur d’accent.

À 600px et moins, les réglages reprennent le défilement normal du document et passent **après** la simulation. Dans le laboratoire existant, la molette fait défiler la page ; le zoom de la caméra est une action à activer explicitement. Le canvas reçoit `touch-action: pan-y` par défaut, puis `none` pendant l’activation du zoom. Le kit fournit une enveloppe de simulation sans installer de gestionnaire de molette ni importer la caméra 3D.

## 4. Contrôles et états

### Boutons

- **Bouton principal** : marge interne `9px 12px`, rayon 7px, bordure 1px dans l’accent, fond `--accent`, texte `--panel`, corps 11px, interligne 1,3, intervalle icône/texte 7px. Survol : texte blanc et luminosité 1,05.
- **Bouton secondaire** : mêmes dimensions ; fond `--panel-soft`, bordure `--line`.
- **Bouton icône** : 31×31px, rayon 7px, couleur `--muted`, bordure transparente 1px. Survol/activation : fond `--accent-soft` et trait `--accent`.
- **Bouton texte** : 11px, marge interne `5px 0`, intervalle 7px, couleur `--muted`, accent quand sélectionné.
- **Lecture/pause** : fond `#243e4e`, texte blanc, rayon 7px, marge interne `9px 15px`, largeur minimale 85px, corps 10px ; survol dans la couleur d’accent.
- **Expérience sélectionnée** : fond `--accent-soft`, texte `--accent`, graisse 600, point d’accent à droite ; une expérience inactive conserve un texte gris bleuté.

Dans la source, un bouton désactivé a une opacité de 0,6 et un curseur `wait`. Le kit conserve l’opacité, mais utilise volontairement le curseur `not-allowed` pour une action indisponible. Ses composants portent les véritables attributs natifs `disabled` et un nom accessible explicite pour les actions uniquement représentées par une icône.

### Curseurs, valeurs et listes

Les curseurs utilisent le contrôle **natif** `input[type="range"]` avec `accent-color: --accent`, une hauteur CSS de 4px, une largeur de 100 %, un minimum de 40px et des marges `13px 0 5px`. La forme exacte du rail et du pouce dépend donc du navigateur ; aucune image de pouce n’est fournie.

La valeur éditable figure dans un bloc bordé de **28px** de haut et de rayon 6px, avec l’unité en 9px à droite. L’entrée numérique est alignée à droite, large de 68px, sans bordure propre, avec rayon 5px et marges internes `4px 2px`. Son survol affiche le fond secondaire. Les unités restent visibles hors du champ éditable.

**Adaptation volontaire dans le kit :** la source emploie un `input type="number"` natif ; le kit utilise un champ texte avec `inputMode="decimal"`, un rôle `spinbutton` et des bornes accessibles. Il accepte ainsi la virgule française aussi bien que le point, valide à la perte de focus ou avec Entrée, restaure une saisie invalide et limite la valeur aux bornes. Les touches fléchées modifient la valeur selon le pas. Les dimensions, couleurs et alignements suivent le laboratoire, mais les flèches natives d’un champ numérique ne sont pas reproduites. Il ne s’agit donc pas d’une identité de rendu entre tous les contrôles natifs des différents navigateurs.

Les `select` ont un fond secondaire, une bordure 1px, un rayon 7px, un corps 11px et des marges internes `7px 24px 7px 9px`. Dans les réglages latéraux, ils passent à 10px et une largeur maximale de 153px. Les cases à cocher sont natives, 14×14px, couleur d’accent, avec un texte 11px, un intervalle de 8px et un interligne 1,5.

### Onglets et commandes segmentées

La barre des modes est un cadre arrondi de 10px, bordé de 1px, avec 4px de marge interne et 2px d’écart. Chaque onglet possède un rayon de 7px et des marges internes `9px 15px`. L’onglet actif affiche le fond du panneau, le texte principal et une ombre `0 2px 6px #25465a14`.

Les commandes de caméra sont plus compactes : cadre de rayon 7px, fond secondaire, marge interne 3px, écart 1px ; boutons de rayon 4px, corps 9px, marges `6px 11px`. Le segment actif a le fond du panneau et l’ombre `0 1px 3px #324a6020`.

Les transitions des boutons, listes et curseurs sont de **150ms** pour le fond, la couleur et la bordure. La préférence système `prefers-reduced-motion: reduce` supprime transitions et animations CSS ; dans le kit cette règle est limitée à sa racine. L’arrêt du moteur d’animation relève séparément du cycle de vie du laboratoire, décrit dans [INTEGRATION.md](./INTEGRATION.md).

## 5. Mesures, légendes et cartes d’explication

Une mesure suit la hiérarchie **label → symbole + valeur + unité → explication**. Les unités sont plus petites et de couleur secondaire. La valeur est un chiffre tabulaire, sans retour à la ligne ; les unités physiques ne sont pas encodées dans les couleurs. Le rapport d’ouverture important utilise l’accent, les autres mesures le texte principal.

La légende de simulation est positionnée en bas à droite (20px du bord droit, 42px du bas), large de 151px, avec des marges internes `11px 12px`, un rayon de 8px et un flou d’arrière-plan de 8px. Son fond translucide est `#faffffd9` en clair et `#172b37d9` en sombre ; son texte est respectivement `#5b7787` et `#a8bfcc`. La barre colorée a une hauteur de 5px et un rayon de 5px. La légende ignore les événements de pointeur pour laisser interagir avec la simulation.

Les courbes originales affichent axes, graduations, noms des séries et unités. La distinction entre « théorie » et « données du solveur » est signalée par des badges textuels en plus de leur couleur. Les explications pédagogiques reposent sur une carte avec icône d’accent, surtitre, titre et paragraphe ; les limites scientifiques utilisent un encadré d’avertissement ou un filet gauche d’accent.

## 6. Adaptation aux écrans

Les points de rupture sont des media queries sur la largeur du **viewport**, conformément à l’application d’origine. Le kit n’invente pas de container queries. Dans une intégration en colonne étroite sur un très grand écran, le projet hôte devra donc donner au laboratoire l’espace prévu ou ajouter une adaptation locale.

| Largeur | Grille / panneaux | Simulation et détails |
| --- | --- | --- |
| ≥ 1500px | Colonne de réglages 285px ; intervalle 25px ; marges 36px | Vue 540px ; réglages `18px 22px` ; onglets `10px 20px` |
| 1151–1499px | Colonne 266px ; intervalle 22px ; marges 36px | Vue 470px ; mesures 4 colonnes |
| 851–1150px | Colonne 240px ; intervalle 16px ; marges 22px | Vue 430px ; mesures 18px ; onglets 10px ; version masquée ; analyses sur une colonne |
| 601–850px | Colonne 210px ; intervalle 12px ; marges 16px | Vue 380px ; mesures 2 colonnes ; introduction empilée ; titre 28px ; en-tête 70px |
| ≤ 600px | Une colonne ; marges 12px ; réglages après la simulation | Vue 370px ; titre 26px ; mesures 22px en 2 colonnes ; paramètres sur 2 colonnes ; liste d’expériences sur 2 colonnes |

Sur mobile, le logo descend à 33×33px et la marque à 15px. Les liens textuels secondaires de l’en-tête sont masqués. Les onglets passent à 9px avec des marges `8px 6px`. Les paramètres ont des labels de 10px et des champs de 49px ; listes, valeurs dérivées et options avancées occupent toute la largeur des deux colonnes de réglages. Les commandes de vue passent à 8px avec une marge de 6px. La légende mesure 130px, à 12px du bord et 35px du bas. L’horloge, les icônes et les espacements de lecture se compactent ; le libellé « temps physique » disparaît dès 1150px et moins.

## 7. Périmètre de réutilisation

À réutiliser : tokens, typographie, panneaux, disposition, onglets, paramètres numériques, choix, cases à cocher, boutons, badges, lecture/horloge, mesures et enveloppe de simulation. Le kit expose ces éléments indépendamment de toute équation physique.

À fournir par chaque laboratoire : modèle, unités, paramètres autorisés, validation scientifique, scène Canvas/SVG/WebGL, sondes, caméra éventuelle, chargement de ressources, export de résultats et arrêt/nettoyage. Le choix de couleur du champ scientifique doit correspondre à la grandeur représentée ; reprendre le turquoise de l’interface ne suffit pas à définir une échelle scientifique.

Le modèle exécutable du kit démontre l’assemblage et le cycle de vie avec une animation autonome. Il ne remplace pas l’expérience de diffraction. Voir [INTEGRATION.md](./INTEGRATION.md) pour les contrats d’intégration et [resources/README.md](./resources/README.md) pour les ressources et dépendances.
