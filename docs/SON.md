# Diffraction des ondes sonores

Le laboratoire propose deux milieux dans la même application : **Surface de l’eau** et **Ondes sonores**. Le sélecteur de milieu est distinct des onglets Découverte, Huygens, Analyse, Comparaison et Présentation. Les paramètres des deux milieux sont conservés séparément ; chaque changement de milieu recommence le champ et les mesures afin de ne pas mélanger élongations et pressions. Après ce changement, la lecture est **en pause** : cliquer sur **Démarrer** pour commencer la nouvelle acquisition.

## Commencer une expérience sonore

1. Sélectionner **Ondes sonores**.
2. Choisir une expérience de la bibliothèque ou régler librement la source et l’obstacle.
3. Choisir **Vue 2D**, **Vue 3D** ou **Vue partagée 2D + 3D**.
4. Cliquer sur **Démarrer** si la lecture est en pause, puis observer le temps physique, exprimé en millisecondes, et le facteur de ralentissement pédagogique affiché.
5. Pour comparer des états reproductibles, recommencer après un changement de configuration et attendre l’arrivée de l’onde puis plusieurs périodes.

Les valeurs initiales sont `f = 1 000 Hz`, `c = 340 m/s` et une amplitude de source de `1 Pa`. Ainsi :

```text
λ = c/f = 0,34 m = 34 cm
T = 1/f = 0,001 s = 1 ms
```

L’amplitude est une amplitude **de pression**, pas une élongation de l’air en millimètres. La vitesse de lecture et l’amplification du relief sont des réglages de visualisation : ils ne modifient ni `f`, ni `c`, ni l’amplitude physique. Les contrôles **Vitesse de lecture pédagogique** et **Amplification du relief** proposent chacun un curseur et une saisie numérique. À 1×, une seconde réelle correspond nominalement à 0,005 s physiques : le phénomène est ralenti **200 fois**. À 0,25×, il est ralenti **800 fois**. Le facteur affiché suit ce réglage ; le coût du calcul peut ralentir encore la progression sur une machine chargée.

Pour ouvrir directement le milieu sonore, ajouter `?medium=sound` à l’adresse de l’application. Lors d’un chargement initial direct, le calcul démarre comme dans le mode eau ; la mise en pause décrite ci-dessus concerne le changement de milieu pendant une session.

## Ce qui est calculé

Le champ est la perturbation de pression acoustique `p′(x,y,t)` dans un milieu homogène, linéaire et non dispersif. Hors sources et couche dissipative, le modèle est :

```text
∂²p′/∂t² = c² (∂²p′/∂x² + ∂²p′/∂y²)
```

La pression de repos n’est pas représentée ; les couleurs distinguent les perturbations positives et négatives autour de cette pression. Le modèle ne calcule ni écoulement moyen, ni turbulence, ni non-linéarité, ni absorption acoustique réaliste dépendant de la fréquence.

Une paroi parfaitement rigide impose une vitesse normale nulle. Dans cette formulation linéaire en pression, la condition correspondante est **`∂p′/∂n = 0`**. Le solveur utilise le même noyau de différences finies que le modèle scalaire de l’eau, après vérification de cette condition ; les configurations et unités des deux milieux sont distinctes. Une cellule fluide voisine d’un solide est réfléchie à la face solide pour imposer la dérivée normale nulle. Les obstacles agissent donc sur le champ calculé, et pas seulement sur le dessin.

La source est une pression imposée, mise en route progressivement pour éviter une impulsion artificielle. Elle constitue une idéalisation et peut interagir avec des ondes réfléchies. Ce n’est pas un modèle électromécanique complet de haut-parleur.

## Vues 2D, 3D et partagée

La **Vue 2D** est une carte plane du champ calculé, rendue en Canvas 2D. Elle reste disponible sans WebGL. Elle montre les cellules solides, les ouvertures, les microphones, les coordonnées et les repères de longueur. Les fronts et l’illustration de Huygens sont des surcouches que l’on peut masquer. Les lignes de front représentent ici des contours instantanés de pression nulle, tracés dans les régions déjà perturbées : elles ne signalent pas une amplitude sonore nulle. Dans un champ réfléchi ou interférent, leur interprétation comme fronts progressifs demande de la prudence. Pour une onde plane harmonique, deux contours zéro successifs peuvent être espacés de λ/2 : mesurer λ entre deux crêtes positives successives, repérées par la même couleur, plutôt qu’entre ces deux lignes.

La **Vue 3D** trace un relief à partir des mêmes valeurs de pression. Les vues isométrique, dessus, profil et caméra libre changent l’angle d’observation ; l’amplification règle uniquement la hauteur dessinée. Les contours solides restent ceux du même masque de grille. Le relief est normalisé par l’amplitude de pression source puis multiplié par l’amplification visuelle. Les valeurs en Pa se lisent sur la légende et les microphones.

**Le relief représente la pression acoustique ; ce n’est pas un déplacement vertical de l’air.**

La vue partagée n’exécute pas deux calculs distincts : ses deux représentations lisent **le même champ et le même temps physique**. Un instantané commun est figé à chaque image du navigateur ; les deux configurations de Comparaison sont figées ensemble pour conserver aussi leur synchronisation visuelle. Il s’agit d’une visualisation 3D d’un **modèle 2D**, pas d’une propagation acoustique volumique complète.

## Sources et obstacles idéalisés

| Choix | Signification dans ce modèle 2D |
| --- | --- |
| Onde plane | Ligne de pression imposée, émettant des deux côtés ; l’onde incidente utile est étudiée du côté de l’obstacle |
| Source ponctuelle | Source localisée dans le plan, correspondant à une idéalisation linéique perpendiculaire au plan ; fronts circulaires, pas sphères en volume |
| Deux sources cohérentes | Deux excitations de même fréquence, avec séparation et déphasage réglables |
| Sans obstacle | Propagation dans le domaine, avec les conditions de bord extérieures choisies |
| Fente simple | Paroi rigide interrompue par une ouverture de largeur `a` |
| Double fente | Même paroi avec deux ouvertures ; largeur et séparation réglables |
| Obstacle circulaire | Section d’un **cylindre** invariant perpendiculairement au plan ; le diamètre règle sa taille |
| Obstacle rectangulaire | Section d’un obstacle **étendu perpendiculairement au plan**, pas un bloc fini simulé en volume |
| Bord unique | Paroi rigide partielle ; diffraction à son extrémité |

Pour les deux sources cohérentes, les bornes de position et de séparation sont liées afin de garder les deux émetteurs dans le domaine dessiné. Un fichier sonore qui place un émetteur hors du domaine est refusé explicitement.

Les positions et dimensions modifient le masque géométrique. La représentation sur grille approche les frontières par des marches : augmenter la résolution améliore leur précision sans transformer le modèle en simulation volumique. Un éventuel symbole de haut-parleur représente seulement la source ; sa directivité réelle n’est pas entièrement simulée.

Le rapport **`a/λ`** concerne les ouvertures. Pour un cylindre, utiliser le diamètre `d/λ` ; pour un rectangle, la hauteur transverse `h/λ` ; pour un bord, nommer la dimension ou l’étendue comparée. Une formule de fente ne s’applique pas automatiquement aux autres obstacles.

## Microphones et mesures

Les deux microphones virtuels sont **M1 bleu** et **M2 rouge**. Ouvrir l’onglet **Analyse**, choisir **Déplacer M1** ou **Déplacer M2**, puis cliquer dans une zone libre de la vue 2D ou 3D. Dans la carte 2D, on peut aussi faire glisser un marqueur. Les coordonnées x et y sont éditables dans les cartes des microphones ; un emplacement dans un obstacle est refusé. Leur précision spatiale reste celle du nœud de grille utilisé pour la lecture. Si une nouvelle géométrie recouvre un microphone, sa position est ramenée au nœud libre le plus proche, y compris au passage en Comparaison.

Le graphique superpose `p′₁(t)` et `p′₂(t)` sur une **échelle de pression commune**, en pascals, avec le temps en millisecondes. **Réinitialiser les mesures** efface les acquisitions et recommence la fenêtre de mesure sans réinitialiser tout le champ. **Recommencer l’expérience** remet aussi le champ et son temps physique à zéro. Déplacer un microphone efface l’historique partagé afin de ne pas mélanger deux positions.

Il faut distinguer :

- **Pression instantanée signée `p′`** : la valeur à un instant donné. Son passage par zéro n’implique pas une absence de son.
- **Amplitude locale estimée** : la composante harmonique à la fréquence de la source, obtenue par projection sinus/cosinus sur la fenêtre de mesure.
- **Pression efficace `p_rms`** : racine de la moyenne temporelle de `p′²`, calculée sur une fenêtre de **quatre périodes** en mode sonore. Avant la constitution de cette fenêtre, la mesure n’est pas prête. Attendre aussi l’arrivée de l’onde et l’établissement du régime ; une fenêtre complète peut encore contenir un transitoire.
- **Indicateur relatif d’énergie** : une grandeur normalisée sans unité, si elle est affichée. Elle n’est pas une intensité absolue en W/m² et peut dépasser sa valeur de référence par superposition.

La relation `I = p_rms²/(ρc)` suppose une onde progressive appropriée et une impédance correspondante. Le modèle ne calcule pas une intensité vectorielle complète à partir de la vitesse particulaire. En champ proche, dans une onde stationnaire ou en présence d’interférences, **ne pas convertir automatiquement `p_rms²` en W/m²**.

Une phase n’est interprétable que si le signal harmonique est suffisamment établi et son amplitude non négligeable. Un déphasage peut être ambigu modulo une période. Une détection d’arrivée dépend du seuil et de l’échantillonnage. Dans un champ diffracté ou réfléchi, ne pas identifier systématiquement un retard à la distance directe divisée par `c` : plusieurs trajets et composantes peuvent coexister.

La décroissance géométrique provient du solveur 2D. Aucune loi arbitraire d’amplitude `1/r`, propre à une autre idéalisation, n’est ajoutée au champ.

## Expériences proposées

| Expérience | Manipulation et comparaison |
| --- | --- |
| Onde plane | Lire `λ = 34 cm` et `T = 1 ms`, puis mesurer l’espacement des fronts |
| Onde circulaire 2D | Observer des fronts circulaires autour de la source linéique idéalisée |
| Fente étroite | `a = 17 cm`, donc `a/λ = 0,5` |
| Fente large | `a = 68 cm`, donc `a/λ = 2` |
| Fréquence | À `a = 34 cm`, comparer 500, 1 000 et 1 500 Hz si la résolution choisie le permet |
| Huygens | Afficher puis masquer les ondelettes illustratives de l’ouverture |
| Obstacle circulaire | Comparer les régions réfléchie et transmise autour de la section du cylindre |
| Obstacle rectangulaire | Modifier largeur, hauteur et position ; observer la diffraction aux coins |
| Bord unique | Suivre le contournement de l’extrémité de la demi-paroi |
| Double fente | Rechercher les différences d’amplitude après la paroi à deux ouvertures |
| Faibles amplitudes | Deux sources cohérentes, carte d’amplitude et deux microphones |
| Deux configurations | Comparer deux ouvertures au même temps physique |
| Angle θ | Séparer le premier minimum analytique de Fraunhofer et le champ numérique fini |

À célérité constante, les sons de plus basse fréquence ont une plus grande longueur d’onde. Lorsque celle-ci devient comparable aux dimensions d’un obstacle ou d’une ouverture, la diffraction peut rendre le contournement ou l’étalement plus net. Ce constat est qualitatif et dépend aussi de la géométrie, de l’éclairage et des frontières.

## Huygens et angle θ

Les points secondaires et leurs ondelettes sont **illustratifs**. Les afficher, les masquer ou changer leur nombre ne crée aucune source supplémentaire dans le solveur et ne change pas l’énergie du champ. Les fronts résultants restent ceux du calcul.

Pour une seule fente uniformément éclairée, avec une onde plane en incidence normale et suffisamment loin de l’ouverture, la prédiction idéale de Fraunhofer donne :

```text
A(θ)/A(0) = |sin β / β|,  β = πa sin θ / λ
Premier minimum : sin θ₁ = λ/a
```

Le cas sonore de démonstration prend `a = 68 cm` et `λ = 34 cm`, donc `θ₁ = 30°`. Il montre un zéro **analytique**, pas un zéro imposé à la pression du solveur. Le domaine de 2,8 × 1,6 m reste fini ; il peut ne pas satisfaire le champ lointain. Le profil numérique et ses indicateurs de distance doivent être lus séparément. Cette loi de fente ne décrit ni le cylindre, ni le rectangle, ni le bord, ni une source ponctuelle éclairant arbitrairement l’obstacle.

## Maillage, bords et temps de calcul

Le pas de temps respecte une marge CFL de 0,8 :

```text
c Δt √(1/Δx² + 1/Δy²) = 0,8 ≤ 1
```

La stabilité ne suffit pas à garantir la précision. La fréquence maximale proposée tient compte de la célérité et de la grille ; viser au moins **12 cellules par longueur d’onde** et **6 cellules dans chaque ouverture**. Les avertissements signalent les longueurs d’onde et ouvertures insuffisamment résolues. Pour une double fente, vérifier aussi que les ouvertures ne se touchent pas et restent dans le domaine.

Le bord absorbant est une **couche dissipative progressive (« sponge »)**, avec des réflexions résiduelles. Ce n’est pas une PML. Le choix réfléchissant permet d’étudier les réflexions extérieures, tout en gardant les parois internes rigides.

Le temps physique sonore est de l’ordre de la milliseconde. Le ralentissement pédagogique affiché le rend observable ; il ne change pas les paramètres du modèle. Le budget de calcul reste fini : une grille plus fine, des fréquences plus élevées ou deux configurations simultanées coûtent davantage. Une machine lente peut progresser plus lentement que le rythme demandé ; lire l’horloge physique plutôt que déduire le temps à partir de la durée d’observation réelle.

## Export, import et conservation du mode eau

Les exports identifient le milieu, les unités et la version du format. Les fichiers de paramètres historiques de version 1 sont interprétés comme des expériences **Surface de l’eau** par une migration explicite ; ils ne deviennent pas des pressions acoustiques. Un import recommence le calcul et ne restaure pas un ancien champ complet. Un export sonore dont la fréquence dépasse la limite de 12 cellules par longueur d’onde pour son maillage est refusé explicitement, quel que soit le milieu actuellement ouvert ; ses valeurs ne sont pas modifiées silencieusement.

Le changement de milieu ferme l’ancien affichage et remet les acquisitions à zéro. La vue partagée emploie un seul moteur par configuration. La fermeture ou la désactivation du laboratoire arrête ses boucles de calcul et ferme ses scènes. Les règles d’intégration du futur site commun sont documentées dans le [design-kit](../design-kit/INTEGRATION.md).

Le composant principal `DiffractionLaboratory` est exporté depuis `src/App.tsx` à la fois comme export nommé et par défaut. Un site hôte peut le monter, le démonter ou lui passer `active={false}` : l’interface et ses scènes sont alors retirées, la boucle de calcul s’arrête et les ressources graphiques sont nettoyées. Les paramètres restent en mémoire tant que le composant lui-même reste monté. Cette version ne crée pas de worker de calcul ; elle ne suppose donc aucun service externe à fermer.

## Branche de développement et publication

L’ajout se trouve dans le dépôt existant, sur **`ajout-ondes-sonores`**, issu de la branche complète `livraison-diffraction-lab-3d`. Le site conserve son adresse : <https://adammouatacime1.github.io/diffraction-lab-3d/>. Le lien <https://adammouatacime1.github.io/diffraction-lab-3d/?medium=sound> ouvre directement le milieu sonore. GitHub Pages publie les fichiers statiques de **`gh-pages`**, pas directement les fichiers TypeScript de la branche de développement. Enregistrer ou pousser cette branche source ne publie donc pas automatiquement le mode sonore ; la mise en ligne passe par la construction et la publication de la version validée dans `gh-pages`. Son fichier `deployment.json` identifie le commit source et les empreintes de la construction.

Les vidéos et l’archive compilée historiques, référencées depuis `livraison-diffraction-lab-3d`, présentent le **mode eau**. Elles restent utiles pour ses contrôles et ses explications ; elles ne constituent pas une visite du nouveau mode sonore.

Le guide général [GUIDE.md](GUIDE.md) conserve les manipulations du mode eau. L’audit du noyau acoustique et les validations numériques sont décrits séparément dans [ACOUSTIC-ENGINE-AUDIT.md](ACOUSTIC-ENGINE-AUDIT.md) ; lire leurs tolérances et limites avant une comparaison quantitative avec une expérience réelle. Les résultats effectivement obtenus, les commandes de contrôle et les captures sont réunis dans [VALIDATION-SON.md](VALIDATION-SON.md).
