# Guide d’utilisation

## Démarrer sans expérience en programmation

Ouvrez un terminal dans le dossier du projet. Lancez `npm install`, puis `npm run dev`. Ouvrez l’adresse locale affichée ; dans Codex cloud, ouvrez l’aperçu du port 5173. Un premier chargement peut prendre quelques secondes. Le calcul s’exécute dans le navigateur.

Les commandes de lecture permettent de lancer, mettre en pause, avancer d’un pas ou recommencer. Le temps affiché est le temps **physique simulé**, et non la durée passée devant l’écran. Le réglage de vitesse de lecture change la rapidité d’observation ; il n’autorise pas le solveur à dépasser sa limite de stabilité.

Les modes **Découverte**, **Huygens**, **Analyse**, **Comparaison** et **Présentation** adaptent les outils visibles. La bibliothèque fournit onze situations prêtes à explorer. Les textes « prédiction » et « explication » donnent des pistes : observez le calcul avant de conclure.

## Lire et régler les paramètres

| Symbole | Signification | Unité | Relation dans ce modèle |
| --- | --- | --- | --- |
| f | Fréquence | Hz | Nombre d’oscillations par seconde |
| T | Période | s | T = 1/f |
| v | Célérité | m/s | Paramètre indépendant, milieu non dispersif |
| λ | Longueur d’onde | m | λ = v/f |
| A | Amplitude de l’excitation | mm à l’écran | 1 mm = 0,001 m |
| a | Largeur d’une ouverture | m | Comparer a/λ |
| φ | Phase initiale | Degrés | Décalage du signal de source ; les phases et déphasages des sondes sont également affichés en degrés |

Les curseurs facilitent l’exploration ; les champs numériques permettent une saisie précise. Modifier T ou λ ajuste f selon les relations ci-dessus. Modifier f ou v change λ : vérifiez toujours les valeurs dépendantes.

Le grossissement vertical du relief est un réglage d’affichage. Il ne modifie ni A, ni les sondes, ni le calcul. De même, changer de caméra ne change pas l’état physique.

Une modification en cours d’expérience conserve le champ et le temps et peut faire coexister des ondes anciennes et nouvelles. Les estimations harmoniques sont alors réinitialisées. Le changement de résolution constitue une exception : il crée une nouvelle grille et recommence le calcul. Recommencez pour comparer deux situations depuis un état initial identique. Après tout changement, attendez l’arrivée de l’onde à la zone observée, puis plusieurs périodes avant d’interpréter les amplitudes et les phases.

## Choisir une vue

- **Dessus** : reconnaître les fronts, les franges et la géométrie des obstacles.
- **Profil** : distinguer les crêtes au-dessus et les creux au-dessous de l’équilibre.
- **Isométrique** : montrer simultanément relief et propagation.
- **Libre** : tourner autour de la cuve avec la souris. Le bouton de loupe **Activer le zoom à la molette**, à gauche de la cuve, permet de zoomer volontairement.

Par défaut, la molette au-dessus de la cuve fait défiler la page. Lorsque le zoom est activé, recliquez sur la loupe pour retrouver le défilement. Sur téléphone, le glissement vertical fait défiler la page tant que le zoom est désactivé ; son activation permet de manipuler la vue avec les gestes tactiles.

Sur ordinateur et tablette en disposition à deux colonnes, la colonne **Expériences et paramètres physiques** possède son propre défilement : placez le pointeur dessus et utilisez la molette. Elle reste accessible à côté de la cuve. Sur téléphone, les panneaux suivent le défilement normal de la page.

Le plein écran aide à la projection. Les couleurs sont accompagnées d’une légende : l’élongation peut être positive ou négative ; l’amplitude et l’intensité relative sont non négatives.

## Mesurer sans confondre les grandeurs

Activez l’outil **Placer une sonde**, puis cliquez sur l’eau. Une sonde lit l’état calculé au nœud de grille le plus proche de la position choisie. Deux sondes permettent de comparer leurs historiques ; après deux sondes, le clic suivant recommence leur placement. **Effacer les sondes** retire les sondes et leur historique. Placez-les dans l’eau, à distance de la source, des obstacles et de la couche amortissante si vous étudiez une propagation libre.

Un clic dans un obstacle est refusé. Si une modification de géométrie englobe une sonde déjà placée, la mention **DANS UN OBSTACLE** le signale : ce point ne mesure plus une oscillation de l’eau. Déplacez ou effacez les sondes avant d’interpréter leurs données.

L’élongation η est instantanée. Une courbe qui traverse zéro continue généralement à osciller : son amplitude n’est donc pas nulle. L’amplitude locale et la phase sont estimées à la fréquence de la source sur une fenêtre d’une période. Avant la constitution de cette fenêtre, et pendant les transitoires, l’estimation est absente ou peu représentative du régime périodique recherché.

L’intensité relative est définie par `Irel = A_local² / A_source²`. Elle n’a pas d’unité et peut dépasser 1 par interférences ou réflexion. Elle ne représente pas une puissance mesurée en W/m². Dans une zone de très faible amplitude, la phase devient mal définie.

Pour comparer les temps d’arrivée, placez les deux sondes, puis utilisez **Recommencer l’expérience**. Le temps d’arrivée opérationnel est la première observation où `|η| ≥ 5 % de A_source`. Le décalage affiché vaut l’arrivée à la sonde 2 moins celle à la sonde 1. Cette détection dépend du seuil, de l’amplitude et de la forme du signal ; elle ne localise pas un front mathématique exact. L’intervalle de capture est borné par `0,004 s + Δt`, indiqué dans l’interface. Après une modification de paramètres ou un placement en cours de propagation, recommencez pour rendre cette mesure interprétable.

Pour une règle, sélectionnez deux points. La distance correspond à leur séparation dans le plan de la cuve. Pour mesurer λ, prenez deux crêtes successives **suivant la direction de propagation**, dans une région où les fronts sont nets et quasi réguliers. La distance entre deux crêtes mesurée obliquement ne donne pas directement λ. Pour une coupe, choisissez deux extrémités : son profil représente le champ instantané sur le segment.

Les zones nodales correspondent à un seuil d’amplitude, pas à un zéro mathématique. Les maxima signalent des valeurs élevées de l’estimation ; ils restent sensibles au maillage et aux transitoires.

## Trois fentes à comparer

Conservez `v = 2 m/s` et `f = 10 Hz`, donc `λ = 0,20 m`. Utilisez une source plane et une seule fente.

| Ouverture a | a/λ | Prédiction qualitative |
| --- | --- | --- |
| 0,10 m | 0,5 | Étalement important après l’ouverture |
| 0,20 m | 1 | Étalement à comparer au premier cas |
| 0,80 m | 4 | Transmission davantage directionnelle ; effets de bord persistants |

La bibliothèque propose directement la fente étroite et la fente large. Le scénario **Fréquence** ou **Huygens** commence à `a = 0,20 m`. Pour une comparaison reproductible, employez la même résolution et observez le même temps physique après chaque recommencement.

En augmentant f à v et a constantes, λ diminue et a/λ augmente. Cela change la diffraction. Surveillez l’avertissement de résolution : une onde plus courte a besoin d’une grille plus fine.

## Montrer l’angle θ et son premier minimum

Cliquez sur **Voir le cas θ = 30°** au-dessus de la cuve, ou choisissez **11 · Angle θ et premier minimum** dans **Expériences**. Sur un téléphone, la bibliothèque d’expériences se trouve plus bas dans la page. Cette expérience prépare le mode Découverte, la vue du dessus et la carte d’amplitude locale. Elle utilise une onde plane en incidence normale, `v = 2 m/s`, `f = 10 Hz`, donc `λ = 0,20 m`, et une fente de largeur `a = 0,40 m`.

Le panneau pédagogique **Angle θ et premier minimum**, placé avant la cuve, montre séparément le modèle idéal de Fraunhofer en champ lointain. Il représente l’axe central et les deux directions du premier minimum, à `+θ₁` et `−θ₁`. L’angle θ₁ se mesure entre l’axe et un seul de ces rayons ; l’ouverture angulaire totale du lobe central vaut `2θ₁`. Si vous avez changé les paramètres ou l’incidence, utilisez **Rétablir le cas θ = 30°** pour retrouver la démonstration.

1. Lisez `sin θ₁ = λ/a = 0,50`, donc `θ₁ = 30°`. Le lobe central s’étend ici de −30° à +30°.
2. Déplacez le curseur d’angle pour suivre l’amplitude théorique normalisée `A(θ)/A(0)`.
3. Cliquez sur **Premier minimum** : la direction sélectionnée rejoint `+30°`, où l’amplitude et l’intensité théoriques sont nulles. Le tracé et la valeur indiquent ce zéro.
4. Expliquez que des lobes secondaires existent au-delà des premiers minima : θ₁ délimite le **lobe central**, pas toute l’onde transmise.

La relation utilisée est `sin θ₁ = λ/a`. L’approximation scolaire `θ₁ ≈ λ/a` donne un angle **en radians** et suppose de petits angles ; elle donne environ 28,6° pour cet exemple, contre 30° avec l’arcsinus. Si `a < λ`, aucun premier minimum n’existe dans le domaine angulaire de ce modèle. Pour `a = λ`, il se trouve à 90°, en direction rasante.

Ce panneau ne modifie pas le champ calculé dans la cuve. Son zéro est une prédiction du modèle idéal, pas une mesure FDTD : la cuve finie peut rester en champ proche et contenir des réflexions. N’interprétez donc pas une couleur ou une élongation momentanément nulle dans la cuve comme la preuve de ce minimum d’amplitude.

### Repérer θ directement sur la cuve

Cochez **Afficher θ sur la cuve**, puis utilisez **Type de repère θ** pour choisir ce que représente l’angle. L’activation choisit la vue **Dessus**, qui facilite la lecture.

- **Premier minimum idéal** ajoute l’axe, les directions théoriques `±θ₁`, un arc et la valeur de l’angle. Ce repère suppose une onde plane en incidence normale traversant une seule fente, avec un premier minimum non rasant (`a > λ`). La source doit être à gauche de la barrière et l’ouverture entièrement dans la cuve. Les rayons indiquent la prédiction de Fraunhofer ; ce ne sont pas des nœuds mesurés du champ FDTD.
- **Angle d’observation** ajoute un repère géométrique réglable avec **Angle d’observation sur la cuve**, de −80° à +80° (30° au départ). Avec une source ponctuelle, ce mode est choisi automatiquement et le mode de premier minimum idéal est désactivé. L’angle choisi n’affirme aucune annulation de l’amplitude et n’applique pas la loi de Fraunhofer à l’éclairage ponctuel.

Avec une seule fente, le repère d’observation part du **centre de l’ouverture**. Son axe de référence est la normale à la barrière, du côté transmis : vers `+x` si la source est à gauche, vers `−x` si elle est à droite. Avec une source ponctuelle **sans obstacle**, le repère part au contraire de la source : c’est un angle polaire mesuré depuis l’axe `+x`, choisi comme référence, sans notion de minimum de diffraction. L’annotation d’observation n’est pas disponible pour les autres géométries, comme deux fentes ou un obstacle circulaire. Aucun de ces repères ne modifie l’amplitude calculée.

Dans le mode **Premier minimum idéal**, une fente trop étroite (`a < λ`) affiche un message expliquant l’absence de minimum. Le bouton **Charger le cas θ = 30°** prépare alors `a = 0,40 m` et `λ = 0,20 m`. À `a = λ`, les directions du premier zéro sont rasantes (±90°), le long de la barrière : ce cas limite ne montre pas deux rayons qui s’écartent vers l’aval. En mode **Comparaison**, chaque cuve utilise sa propre largeur d’ouverture pour son annotation et son message ; des angles différents ou l’absence de minimum dans l’une des cuves sont donc possibles.

## Huygens, étape par étape

Ouvrez le mode **Huygens** et vérifiez que l’interrupteur **Visualisation de Huygens** est activé. Les boutons numérotés et **Suivant** font avancer l’explication ; l’interrupteur permet de masquer l’illustration à tout moment.

1. Repérez les fronts incidents avant la barrière.
2. Considérez la portion de front qui traverse l’ouverture.
3. Faites apparaître les sources secondaires virtuelles.
4. Observez leurs ondelettes.
5. Interprétez leur superposition.
6. Retrouvez le front diffracté dans le champ numérique.
7. Masquez l’illustration et observez uniquement le résultat du solveur.

Changer la densité des points modifie cette illustration. Il ne crée pas d’énergie supplémentaire dans la simulation. Les cercles aident à construire une explication ; ils ne constituent pas une preuve quantitative du champ obtenu.

## Comparer, présenter et exporter

Le mode Comparaison affiche deux cuves au même temps physique. Dans cette version, il sert principalement à faire varier **la largeur de la seconde fente** ; les autres paramètres sont communs. Il ne fournit pas deux panneaux de paramètres entièrement indépendants. Vérifiez les valeurs affichées. **Recopier les paramètres** rend les deux configurations identiques et recommence les deux calculs.

Le mode Présentation rend la cuve et les grandeurs principales plus lisibles. Un panneau rappelle l’équation d’onde, λ = v/f et T = 1/f. La case « Annotations explicatives » permet de masquer ou d’afficher le commentaire ; le bouton « Afficher les réglages » redonne accès aux paramètres. Préparez la scène avant de passer en plein écran. Vous pouvez mettre en pause pour commenter une crête, puis ralentir pour suivre sa propagation.

L’export PNG enregistre une image de l’expérience avec ses paramètres. **Exporter JSON** télécharge un fichier de paramètres. Pour le réutiliser, cliquez sur **Importer**, puis sélectionnez ce fichier JSON : ses paramètres sont contrôlés et l’expérience repart de l’équilibre. Un fichier invalide affiche une erreur et n’est pas appliqué. Le JSON ne sauvegarde pas l’intégralité du champ et de son histoire. Pour reproduire un résultat, utilisez aussi la même résolution et repartez du même état initial.

## Profil angulaire : mesure et théorie séparées

En mode Analyse, choisissez une fente simple ou double. Après l’acquisition d’une période complète et l’arrivée d’un signal suffisant, un profil numérique mesure `A²(θ)/A²(0)` sur un arc en aval de la barrière, de −60° à +60°. Son rayon s’adapte à la place disponible pour rester hors de la couche amortissante. La lecture reste celle du nœud de grille le plus proche ; les transitoires et réflexions peuvent influencer le résultat. En cas d’espace insuffisant, de signal axial faible ou d’obstacle sur l’arc, un message remplace la courbe.

Le nombre de Fresnel affiché `F_a = a²/(λr)` renseigne sur la distance. S’il dépasse 0,1, la courbe est signalée en champ proche et ne doit pas être comparée quantitativement à Fraunhofer. Une petite valeur reste un indice, pas une garantie : les autres hypothèses doivent aussi être satisfaites. En double fente, l’étendue totale des deux ouvertures compte également.

La courbe analytique de Fraunhofer est affichée séparément et concerne une **fente unique idéale**, uniformément éclairée par une onde plane en incidence normale. Elle n’est ni une mesure du solveur, ni la théorie adaptée à toutes les géométries.

## Déroulé conseillé en cinq minutes

| Temps | Manipulation | Explication à donner |
| --- | --- | --- |
| 0–1 min | Onde plane sans obstacle, vue du dessus | « À 10 Hz et 2 m/s, la période vaut 0,10 s et la longueur d’onde 0,20 m. » |
| 1–2 min | Fente étroite puis large, depuis le même départ | « Le rapport a/λ passe de 0,5 à 4. Comparons l’étalement transmis. » |
| 2–3 min | Étapes de Huygens | « Ces sources sont virtuelles. Le champ réel de cette application vient du solveur. » |
| 3–4 min | Double fente ou deux sources, carte d’amplitude et deux sondes | « Une élongation nulle à un instant n’est pas une amplitude nulle. » |
| 4–5 min | Page de validation et capture | « Voici ce qui a été calculé, et les limites liées au modèle et à la grille. » |

## Comprendre un écart ou une difficulté

- **Peu de vagues visibles** : laissez le temps à l’onde d’arriver ; vérifiez que la source est active et que la lecture n’est pas en pause.
- **Phase ou amplitude peu stable** : attendez plusieurs périodes après l’arrivée du front ; recommencez après un changement important.
- **Ondes réfléchies malgré les bords absorbants** : la couche amortissante réduit les réflexions sans les supprimer parfaitement.
- **Courbes ou contours peu réguliers** : augmentez la résolution si les ressources le permettent. La géométrie est discrétisée sur des cellules.
- **Ralentissements** : choisissez Performance ; cette action change aussi la précision numérique, ce qui est affiché. Réévaluez les avertissements de résolution.
- **Comparaison différente d’une cuve réelle** : le modèle ne comprend pas la dispersion gravito-capillaire, les effets de profondeur ou les pertes réelles de l’eau.

Pour le détail du calcul et les conditions de validité de Fraunhofer, consultez [MODELE.md](MODELE.md). Les tests et mesures affichés sur la page **Validation scientifique** doivent être lus avec leurs paramètres et leurs limites.

## Le même laboratoire pour les ondes sonores

Le sélecteur de milieu propose désormais **Surface de l’eau** et **Ondes sonores**, indépendamment des cinq onglets pédagogiques. Les manipulations décrites ci-dessus restent celles de l’eau. Chaque milieu garde ses propres paramètres ; passer de l’un à l’autre recommence le champ et les acquisitions, sans convertir une amplitude en millimètres en pression acoustique. Après un changement de milieu, cliquer sur **Démarrer** : le nouveau champ est initialement en pause.

En mode sonore, partez de `f = 1 000 Hz`, `c = 340 m/s`, soit `λ = 34 cm` et `T = 1 ms`. La couleur représente `p′` en Pa. Les vues **2D**, **3D** et **partagée 2D + 3D** lisent le même champ : le relief représente la pression, **pas un déplacement vertical de l’air**. La carte 2D fonctionne en Canvas 2D sans nécessiter WebGL. Lisez le facteur de ralentissement affiché : à 1×, le temps physique nominal progresse 200 fois plus lentement que le temps réel. Les contrôles **Vitesse de lecture pédagogique** et **Amplification du relief** offrent curseur et saisie numérique, sans modifier la physique.

Les six géométries restent disponibles : sans obstacle, fente simple, double fente, cercle, rectangle et bord unique. Le cercle est la section d’un cylindre ; le rectangle est la section d’un obstacle étendu perpendiculairement au plan. Ce ne sont pas des solides finis simulés en volume. Les parois rigides agissent sur le calcul de pression avec une dérivée normale nulle.

Les microphones virtuels **M1 bleu** et **M2 rouge** mesurent la pression dans les zones libres. Leurs courbes partagent une échelle en Pa et un temps en ms. Une pression instantanément nulle ne signifie pas absence de son ; distinguez la pression signée, l’amplitude harmonique estimée et la pression efficace acquise sur quatre périodes, après l’arrivée et l’établissement du signal. Un indicateur relatif d’énergie n’est pas une intensité en W/m². Ne déduisez pas automatiquement un retard par distance/c dans un champ diffracté ou réfléchi.

La bibliothèque sonore propose notamment la fente étroite (`a/λ = 0,5`), la fente large (`a/λ = 2`), l’influence de la fréquence, les obstacles circulaire et rectangulaire, le bord unique, les interférences, Huygens et une comparaison synchronisée. Les ondelettes de Huygens restent une surcouche illustrative, sans injection supplémentaire. Le cas θ = 30° (`a = 68 cm`, `λ = 34 cm`) reste une prédiction de Fraunhofer pour une seule fente idéalement éclairée, distincte du calcul numérique fini.

Le guide sonore complet, les limites du modèle, les unités et les conditions d’interprétation des microphones se trouvent dans [SON.md](SON.md).
