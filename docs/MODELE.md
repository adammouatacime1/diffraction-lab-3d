# Modèle physique et méthode numérique

## Statut des représentations

L’application distingue quatre objets :

1. **Le champ numérique** η(x,y,t), issu de l’équation d’onde sur la grille.
2. **Les mesures** : lecture du nœud de grille le plus proche pour les sondes, et estimation harmonique pour amplitude et phase.
3. **La théorie analytique** : relations du modèle et profil idéal de Fraunhofer, soumis à des hypothèses.
4. **L’illustration de Huygens** : points et ondelettes pédagogiques, sans injection de nouvelles sources physiques.

La vue en relief et les cartes utilisent le même état du solveur. Le rendu peut exagérer verticalement η pour la rendre visible. Ce facteur graphique est distinct de l’amplitude en mètres ; il ne participe pas aux mesures.

## Équation et hypothèses

Dans un milieu homogène, l’élongation scalaire satisfait :

```text
∂²η/∂t² = v² (∂²η/∂x² + ∂²η/∂y²)
```

Les sources et l’amortissement aux limites complètent cette équation. Le modèle est linéaire : les contributions se superposent. Il est non dispersif : v ne dépend pas de f. Pour une excitation sinusoïdale, `T = 1/f` et `λ = v/f`.

Il s’agit d’une approximation pédagogique des phénomènes ondulatoires. La relation de dispersion des ondes gravito-capillaires réelles n’est pas implémentée. Le modèle ne calcule pas de champ de vitesse de fluide ni la pression, les effets de profondeur, la turbulence, le déferlement ou des pertes visqueuses quantitatives. Une valeur de v choisie ici n’est pas une prédiction de célérité dans une cuve réelle donnée.

## Domaine et grille

La cuve mesure **2,8 m × 1,6 m**. Les trois niveaux de résolution utilisent les grilles suivantes :

| Niveau | nx × ny | Δx | Δy approximatif |
| --- | --- | --- | --- |
| Performance | 141 × 81 | 0,020 m | 0,020 m |
| Équilibré | 201 × 115 | 0,014 m | 0,01404 m |
| Haute précision | 281 × 161 | 0,010 m | 0,010 m |

Les espacements sont calculés par `Δx = largeur/(nx−1)` et `Δy = hauteur/(ny−1)`. Une cellule n’est pas un point physique infiniment petit. Les frontières rigides sont approchées par un masque de cellules ; un cercle prend donc un contour en escalier.

Il faut représenter λ et les ouvertures avec suffisamment de cellules. Une condition de stabilité satisfaite ne rend pas une grille grossière précise. Les avertissements de l’interface signalent les configurations peu résolues. Une étude de convergence consiste à répéter une mesure avec une grille plus fine, au même temps physique et avec les mêmes paramètres, puis à comparer les résultats.

## Avancement FDTD

Le solveur est indépendant du moteur graphique. Le schéma centré utilise les valeurs aux instants `n−1` et `n` pour produire celles à `n+1`. Dans une région sans source ni amortissement :

```text
ηᵢⱼⁿ⁺¹ = 2ηᵢⱼⁿ − ηᵢⱼⁿ⁻¹
          + (vΔt/Δx)² (ηᵢ₊₁ⱼⁿ − 2ηᵢⱼⁿ + ηᵢ₋₁ⱼⁿ)
          + (vΔt/Δy)² (ηᵢⱼ₊₁ⁿ − 2ηᵢⱼⁿ + ηᵢⱼ₋₁ⁿ)
```

Le pas de temps applique une marge de 0,8 à la limite CFL :

```text
v Δt √(1/Δx² + 1/Δy²) = 0,8 < 1
```

Cette marge concerne le schéma de propagation. La discrétisation produit malgré tout une dispersion numérique et une légère anisotropie, qui augmentent pour les petites longueurs d’onde. La vitesse de lecture agit sur le nombre de pas observés par durée réelle, sans remplacer Δt par un pas instable.

Les sources sont discrétisées sur la grille. Une source ponctuelle excite le champ local ; la diminution d’amplitude liée à la propagation 2D découle ensuite du calcul, au lieu d’être annulée par une normalisation uniforme dans la cuve. La source plane impose une oscillation le long d’une colonne et émet des deux côtés : l’onde incidente utile à la diffraction se trouve à droite et se propage vers +x pour une incidence normale. Cette source n’est pas strictement unidirectionnelle. Elle est finie : ses extrémités, les bords et ses interactions peuvent éloigner le champ d’une onde plane idéale. La phase de source est réglée en degrés. Le moteur calcule les phases en radians ; l’interface convertit les phases des sondes et leurs différences en degrés.

## Obstacles et bords

Une paroi rigide utilise une condition de **Neumann** : dérivée normale nulle de η. C’est le choix de frontière réfléchissante pour ce champ scalaire. Il ne constitue pas un calcul complet de l’écoulement de l’eau contre un obstacle.

La diffraction par une fente, deux fentes, un disque, un rectangle ou un bord provient de cette géométrie et de l’avancement du champ. Aucun motif de diffraction attendu n’est appliqué artificiellement au champ transmis.

Les bords extérieurs ont deux modes :

- **Absorbants** : une couche dissipative d’épaisseur 0,22 m atténue progressivement le champ près des bords. C’est une zone « sponge », pas une PML. Son absorption est imparfaite et dépend notamment de la fréquence et de l’incidence.
- **Réfléchissants** : une frontière de Neumann conserve une réflexion visible, utile pour étudier les retours d’onde.

Évitez de réaliser une mesure de propagation libre dans la couche dissipative. Une réflexion par les limites ou la barrière peut former une onde stationnaire : la simple distance entre crêtes instantanées devient alors une mesure ambiguë de l’onde progressive incidente.

## Mesures harmoniques

L’élongation instantanée est lue dans le champ. Pour estimer amplitude et phase à la fréquence f, le moteur conserve **32 échantillons uniformément espacés de T/32 sur la dernière période**. Les pas FDTD ne coïncident pas nécessairement avec ces dates ; une interpolation linéaire dans le temps fournit les échantillons. L’estimation est actualisée tous les quatre échantillons.

La projection sur un sinus et un cosinus de fréquence f donne la composante harmonique du signal. On la représente sous la forme :

```text
η(t) ≈ A_local sin(2πft + φ)
```

La phase est référencée à l’horloge du solveur. Elle n’est pas affichée si l’estimation manque ou si l’amplitude est trop faible pour l’interpréter. Un déphasage entre sondes doit être lu modulo une période, avec prudence près d’un minimum d’amplitude. La lecture spatiale correspond au nœud de grille le plus proche : elle ne donne pas une précision spatiale meilleure que le maillage.

La fenêtre d’une période n’est pas un détecteur automatique de régime établi. Pendant un démarrage, après un changement de paramètres ou après l’extinction de la source, la mesure représente la projection du transitoire sur la fréquence choisie ; elle ne garantit pas l’existence d’une oscillation sinusoïdale stable. Il faut attendre la propagation et plusieurs périodes, puis examiner l’histoire des sondes. Un champ composé de plusieurs fréquences n’est pas entièrement décrit par cette mesure.

L’intensité relative est définie explicitement par :

```text
I_rel = A_local² / A_source²
```

Elle compare le carré d’une amplitude locale à celui de l’amplitude de référence de l’excitation. Cette grandeur sans unité n’est pas une mesure de puissance en W/m². Une superposition constructive peut donner une valeur supérieure à 1. L’énergie physique transportée et le bilan de puissance aux obstacles ne sont pas calculés par cette carte.

Une zone nodale affichée signifie « amplitude estimée sous le seuil choisi », pas « zéro exact ». Un zéro instantané de η ne démontre pas un nœud : tout point oscillant traverse l’équilibre.

## Détection des temps d’arrivée

Après un recommencement, l’interface relève pour chaque sonde le premier instant capturé tel que `|η| ≥ 0,05 A_source`. L’écart entre les deux arrivées est signé : `t₂ − t₁`. Pendant la lecture, une capture intervient au premier pas disponible après un intervalle de 4 ms ; l’intervalle entre captures est donc borné par `0,004 s + Δt`. En avancement manuel, les captures sont effectuées à chaque pas numérique. Ces valeurs décrivent l’échantillonnage de la détection ; elles ne constituent pas à elles seules l’incertitude physique du temps d’arrivée.

Le résultat dépend du seuil, de la rampe de démarrage, de la dispersion numérique et de la forme du signal. Ce n’est pas la date exacte d’un front idéal. Un changement de paramètres ou le placement d’une sonde après le départ désactive l’interprétation de l’arrivée jusqu’au recommencement. Une sonde dans un obstacle est signalée et ses données ne doivent pas être interprétées comme une mesure dans l’eau.

## Profil angulaire numérique

Pour une fente simple ou double, la composante harmonique du champ est échantillonnée sur un arc centré sur la barrière, entre −60° et +60° autour de l’axe +x, avec un pas angulaire de 1°. Le rayon est le minimum de 0,65 m et des distances disponibles avant les limites : les points restent à au moins 0,24 m des bords latéraux et à 0,25 m du bord en aval, hors de la couche amortissante de 0,22 m.

Le profil utilise `A²(θ)/A²(0)`, normalisé par l’amplitude mesurée sur l’axe au même rayon. Il se distingue de la carte d’intensité normalisée par A_source. La courbe n’est disponible qu’après une fenêtre harmonique complète, avec un signal axial suffisamment fort, un rayon exploitable et un arc sans obstacle. Les mesures spatiales emploient le nœud le plus proche ; leurs angles effectifs restent donc discrétisés. Aucun profil analytique n’est injecté dans ces valeurs.

L’indicateur `F_a = a²/(λr)` est affiché. Pour `F_a > 0,1`, le programme signale le champ proche et exclut une comparaison quantitative avec Fraunhofer. Un nombre plus petit ne garantit pas la validité de toutes les hypothèses du champ lointain. Pour deux fentes, cet indicateur fondé sur la largeur de chaque ouverture ne remplace pas la condition de distance associée à l’étendue totale du dispositif.

## Huygens-Fresnel

La visualisation associe des points de l’ouverture à des ondelettes virtuelles. Elle aide à comprendre qu’une portion de front peut être interprétée comme une distribution de contributions secondaires.

Les points et cercles ne sont pas réinjectés dans l’équation d’onde. Leur densité règle la représentation visuelle, sans augmenter l’excitation. Cette construction illustrative ne prétend pas reproduire une intégrale de diffraction complète avec toutes ses pondérations et conditions aux limites. Le résultat à mesurer reste le champ du solveur.

## Fraunhofer : domaine de validité

Pour une fente idéale de largeur a uniformément éclairée, en champ lointain :

```text
I(θ)/I(0) = [sin(β)/β]²
β = π a sin(θ) / λ
```

Au centre, la limite vaut 1. Les minima idéaux satisfont `a sin(θ) = mλ`, pour les entiers non nuls m tels que `|mλ/a| ≤ 1`.

L’amplitude théorique normalisée est `A(θ)/A(0) = |sin(β)/β|` ; son carré donne l’intensité normalisée. Pour le premier minimum, `θ₁ = arcsin(λ/a)` si `a ≥ λ`. Les directions `±θ₁` délimitent le lobe central ; les lobes secondaires au-delà ne sont pas supprimés. Lorsque `a < λ`, aucun zéro angulaire n’existe dans ce modèle. Lorsque `a = λ`, le premier zéro est dans les directions rasantes de ±90°. L’approximation `θ₁ ≈ λ/a`, exprimée en radians, ne convient qu’aux petits angles.

L’expérience **11 · Angle θ et premier minimum** prépare `a = 0,40 m`, `v = 2 m/s` et `f = 10 Hz`, soit `λ = 0,20 m`. Son panneau pédagogique trace l’axe et les rayons des premiers minima, avec un curseur d’angle et une lecture de l’amplitude théorique. Ici `sin θ₁ = 0,5`, donc `θ₁ = 30°` et la largeur angulaire du lobe central vaut 60°. Le bouton **Premier minimum** sélectionne ce zéro analytique. Le panneau représente la théorie en champ lointain ; il n’injecte ni enveloppe ni atténuation artificielle dans le solveur. Le champ de la cuve et le profil angulaire FDTD restent des calculs distincts.

La condition de champ lointain exige une distance grande devant l’échelle `a²/λ`, avec des détails selon la géométrie. Une cuve de taille finie ne satisfait pas toujours ce critère, surtout pour une grande ouverture. Le champ proche, la source finie, les réflexions, l’épaisseur numérique de la barrière et la forme réelle du champ dans l’ouverture peuvent modifier les profils. La théorie analytique est donc affichée comme une comparaison distincte du profil angulaire numérique ; elle ne doit pas être utilisée pour imposer le résultat de la simulation. Le profil mesuré ne garantit pas le champ lointain.

## Comparaison entre deux cuves

Les deux solveurs avancent avec des horloges synchronisées. Les paramètres sont partagés, sauf la largeur d’ouverture réglable dans la seconde cuve. Ce mode permet une comparaison contrôlée de l’effet de cette largeur ; il n’est pas un système général à deux configurations entièrement indépendantes. La copie des paramètres recommence les deux champs. Les calculs sont exécutés dans le navigateur, sans Web Worker dans cette version.

## Validation et limites des conclusions

Les commandes de vérification sont `npm test` et `npm run build`. La page **Validation scientifique** exécute des expériences de référence et affiche les résultats mesurés avec leurs paramètres et leurs critères. Une compilation réussie ne valide pas la physique ; un test ciblé réussi ne valide pas toutes les géométries ni tous les réglages.

Les contrôles utiles portent sur la période, la longueur d’onde, la stabilité du champ, la réflexion, la propagation circulaire, la superposition linéaire, les mesures harmoniques et la différence d’étalement entre fentes. Chaque résultat doit être confronté au test effectivement exécuté. Les valeurs d’erreur présentées par le programme sont des écarts associés à une procédure donnée, pas une incertitude universelle du solveur.

Le contrôle de circularité compare notamment des mesures réparties sur un cercle autour de la source, en plus de la symétrie axiale : la symétrie seule ne suffirait pas à établir des fronts circulaires. Le contrôle d’étalement compare des profils normalisés après des fentes de 0,20 m et 0,60 m, avec la même longueur d’onde ; il ne prétend pas démontrer la loi de Fraunhofer. Une comparaison avec une barrière fermée distingue la transmission diffractée d’un signal qui traverserait artificiellement les cellules solides.

Pour une étude devant le professeur, conservez les paramètres, la résolution, le temps physique et les positions de mesure. Recommencez avant une comparaison contrôlée. Rapprochez les résultats de la théorie seulement si ses hypothèses sont adaptées. L’export de paramètres ne contient pas le champ complet ; il permet de préparer une nouvelle exécution depuis les mêmes réglages.
