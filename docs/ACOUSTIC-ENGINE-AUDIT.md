# Audit du noyau et configuration acoustique

Le mode sonore réutilise le noyau FDTD de `src/physics/WaveEngine.ts` après vérification de son opérateur, de ses masques et de ses mesures. Le mode eau conserve ses paramètres par défaut, son champ en mètres, son estimateur harmonique sur une période et son indicateur historique `A²/A₀²`.

## Équations et sens des champs

Dans un fluide homogène au repos, en acoustique linéaire :

- `ρ ∂u/∂t = −∇p′` ;
- `∂p′/∂t = −ρ c² ∇·u` ;
- donc `∂²p′/∂t² = c² ∇²p′` lorsque `ρ` et `c` sont constants.

Le tableau `field` contient **p′ en Pa** dans le mode sonore, et **η en m** dans le mode eau. Le noyau calcule l’équation scalaire en deux dimensions ; il ne calcule ni le vecteur vitesse particulaire `u`, ni la propagation volumique tridimensionnelle. La masse volumique n’est pas nécessaire à cette équation de pression seule. La vue en relief ne modifie pas le noyau.

L’acoustique est linéaire, homogène, non dispersive dans le modèle continu, sans écoulement moyen, absorption atmosphérique réaliste ou couplage fluide–solide. Le schéma numérique a sa propre dispersion. Les variations de fréquence et de célérité sont des paramètres de ce modèle, pas un calcul thermodynamique de l’air.

## Parois et masques

Une paroi rigide impose `u·n = 0`. Avec une condition initiale compatible, l’équation de quantité de mouvement conduit à **`∂p′/∂n = 0`**, et non à `p′ = 0`.

Le stencil existant remplace toute valeur voisine dans un solide par celle du nœud fluide courant. Il impose ainsi un flux nul à la face entre les deux cellules. Les cellules masquées contiennent zéro mais **ce zéro n’entre pas comme voisin Dirichlet dans le laplacien du fluide**. Une impulsion de pression réfléchie à incidence normale conserve son signe, ce que le banc acoustique vérifie.

Les six masques communs sont conservés et couplés au même stencil : domaine libre, fente simple, double fente, disque, rectangle et bord. Le disque représente la section d’un **cylindre infini dans la direction hors plan** ; le rectangle représente la section d’un obstacle invariant selon cette direction. Ce ne sont pas une sphère ou un bloc fini calculés en volume. Leurs contours sont approchés par un masque cartésien en escalier. L’épaisseur de la paroi à fentes vaut au moins une maille, avec une demi-épaisseur nominale minimale de 1,75 cm.

Les largeurs et positions ne sont donc pas exactes à une échelle inférieure à la maille. Le moteur avertit lorsqu’une ouverture couvre moins de six pas de maillage et lorsque deux fentes se touchent ou se chevauchent. Les tests font passer une impulsion devant **chaque géométrie** et vérifient une modification effective du champ, pas seulement le dessin du masque.

## Sources

La source est une **pression prescrite** sur une colonne ou un/des nœud(s), avec une rampe cosinus sur une période. L’amplitude acoustique est la pression de crête imposée à la source, en Pa ; elle n’est ni une puissance de haut-parleur ni la pression garantie en tout point du domaine.

- La source plane est une ligne excitée avec le déphasage transversal correspondant à l’incidence choisie. Elle émet des deux côtés de la ligne ; la région utile à droite reçoit l’onde vers `+x`.
- Une source « ponctuelle » 2D est une source localisée dans le plan, équivalente à une idéalisation de ligne hors plan. La divergence obtenue est celle de l’équation 2D.
- Les deux sources cohérentes partagent fréquence et amplitude, avec un déphasage relatif réglable. La superposition et l’interférence sont produites par le calcul.

La prescription locale de pression interagit avec les ondes qui reviennent à la source. Une directivité réelle de haut-parleur, une impédance d’émetteur ou une source transparente ne sont pas simulées. Aucun facteur artificiel `1/r` n’est ajouté. Les pictogrammes ou ondelettes Huygens sont des annotations et ne réinjectent aucun champ dans ce noyau.

## Discrétisation, stabilité et coût

Le domaine physique commun reste **2,8 × 1,6 m**. Les grilles ont 141, 201 ou 281 nœuds selon `performance`, `balanced` et `precision` ; `ny` suit le rapport du domaine. Le pas est :

`Δt = 0,8 / [c √(1/Δx² + 1/Δy²)]`.

Le CFL multidimensionnel vaut donc **0,8**, inférieur à la limite 1 du schéma explicite. À 340 m/s, le pas est de l’ordre de quelques dizaines de microsecondes ; le coût par pas dépend du nombre de nœuds, pas directement de l’unité « Hz ». Il faut davantage de pas par seconde physique pour le son. L’application ralentit le temps pédagogique plutôt que d’augmenter arbitrairement le pas du solveur.

Pour `f = 1 000 Hz`, `c = 340 m/s`, **λ = 0,34 m** : environ 17, 24 et 34 mailles par longueur d’onde selon la grille. Le moteur affiche un avertissement sous **12 mailles/λ** ; cela concerne la précision de propagation et ne change pas le CFL. Une fréquence sous-résolue peut rester numériquement stable tout en donnant une onde peu fidèle. Les bornes de l’interface doivent respecter ce critère en fonction de la grille et de la célérité.

Le stencil est centré d’ordre deux en espace et temps, stocké en `Float32Array`. Les sommes acoustiques de projection et de carrés utilisent une précision double pour limiter la dérive sur une longue acquisition, tandis que le tampon des 128 échantillons reste en simple précision pour contenir le coût mémoire (environ 12 Mo sur la grille équilibrée). Un changement de grille ou de milieu réalloue les tableaux, remet le champ au repos, réinitialise le temps et efface les mesures. Les tests de stabilité emploient des modes **libres sans source** : dans une cavité sans dissipation continuellement forcée, une croissance physique par résonance ne doit pas être confondue avec une instabilité CFL.

## Bords absorbants

La frontière externe du stencil est réfléchissante. En mode absorbant, une bande de **0,22 m** reçoit un amortissement progressif cubique :

`σ(x,y) = 55 c [max(0, 1 − distance_au_bord/0,22)]³`.

La mise à jour correspond à un amortissement centré de la dérivée temporelle scalaire, de type `p′tt + 2σ p′t = c² Δp′`. Ce terme ne constitue pas une modélisation complète des pertes visqueuses de l’air.

Il s’agit d’une **couche dissipative (sponge), pas d’une PML**. Des réflexions résiduelles subsistent et dépendent de l’incidence et de la fréquence. Le test compare l’énergie quadratique résiduelle d’une impulsion avec et sans couche ; il n’attribue pas un coefficient universel d’absorption à tous les cas.

## Amplitude, pression efficace et indicateur relatif

Les mesures interpolent le champ à des instants exacts **T/32** ; elles ne supposent pas qu’une période contient 32 pas de calcul. Pour le son, un tampon glissant couvre **quatre périodes**, soit **128 valeurs par nœud** ; pour l’eau, la fenêtre historique d’une période et 32 valeurs est conservée.

Trois tableaux distincts sont calculés :

- `field` : pression instantanée signée p′, en Pa ;
- `amplitude` : amplitude harmonique locale estimée à la fréquence de la source, par projections sinus/cosinus ;
- `rms` : **racine de la moyenne des véritables valeurs quadratiques** sur la fenêtre, y compris pendant un transitoire ; ce n’est pas une conversion systématique de l’amplitude harmonique.

L’estimateur harmonique est surtout pertinent pour un signal périodique après arrivée et établissement. Le statut `measurementReady` garantit seulement que la fenêtre est complète depuis la dernière remise à zéro, **pas que le régime stationnaire est atteint**. Une pression instantanément nulle peut coexister avec une amplitude et une pression efficace élevées.

Dans le mode sonore, le tableau historique `intensity` porte uniquement l’indicateur sans dimension **`⟨p′²⟩ / (A₀²/2)`**. Il ne s’agit pas d’une intensité en W/m², ni d’une mesure complète de l’énergie totale : la vitesse particulaire n’est pas calculée. La relation `p_rms²/(ρc)` exige une onde progressive appropriée ; elle ne peut pas être appliquée automatiquement aux champs proches, stationnaires, diffractés ou interférents.

La phase harmonique est indisponible sous un faible seuil d’amplitude. Aucune distance/c générale n’est calculée pour les microphones ; le trajet `2d/c` du test de réflexion concerne exclusivement une impulsion et une paroi droite connues.

`resetMeasurements()` efface uniquement les estimateurs et leur fenêtre, en conservant le champ et le temps physique. `reset()` repart du repos. Le moteur n’ouvre aucun worker, écouteur ou boucle d’animation ; il n’avance que sur appel `step()`, et la fermeture de l’application doit interrompre ces appels.

## Vérifications exécutables

`src/physics/acousticValidation.ts` fournit **quatre expériences calculées à la demande** :

1. Longueur d’onde, période et vitesse de phase d’une onde plane à 1 kHz.
2. Réflexion d’une impulsion de pression sans inversion sur un mur rigide, avec temps de retour contrôlé.
3. Stabilité d’un mode libre avec CFL 0,8 sur 800 pas.
4. Amplitude et pression efficace d’un signal prescrit sur quatre périodes.

`tests/acoustics.test.ts` ajoute les contrôles sur les six géométries, les trois résolutions, la vitesse d’un paquet, l’absence de facteur `1/r`, l’interférence de deux sources en opposition, l’ouverture/fermeture d’une paroi, la dissipation externe et les remises à zéro. Les tolérances reflètent le réseau cartésien et l’interpolation temporelle ; ces validations numériques ne remplacent pas une comparaison à une expérience acoustique réelle.
