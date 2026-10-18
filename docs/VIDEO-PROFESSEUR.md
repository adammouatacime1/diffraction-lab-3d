# Diffraction Lab 3D — vidéo de présentation au professeur

Ce document constitue le script de la visite vidéo en français. La narration utilise désormais une voix de synthèse neuronale française Kokoro, en remplacement de la première voix eSpeak. La synthèse vocale est annoncée dans l’introduction ; aucun enregistrement humain n’a été réalisé pour cette narration. Les images montrent l’application réelle. Les prévisions qualitatives sont formulées comme des attentes ; aucune valeur de mesure ni aucun résultat de validation n’est inventé.

Les commandes de lancement sont présentées dans une carte explicative ; aucune séquence ne prétend montrer un système Windows exécuté dans le cloud.

Durée : environ **10 min 21 s**, en 22 chapitres. Le support structuré de narration se trouve dans [scripts/video/chapters.json](../scripts/video/chapters.json).

Cette vidéo présente la version à dix expériences. Le cas supplémentaire « Angle θ et premier minimum », le défilement indépendant de la colonne et l’activation volontaire du zoom ont été ajoutés ensuite ; leur utilisation figure dans le [guide actuel](GUIDE.md).

- [Vidéo MP4 à télécharger](https://raw.githubusercontent.com/adammouatacime1/diffraction-lab-3d/livraison-diffraction-lab-3d/docs/video/presentation-professeur.mp4)
- [Aperçu de la voix de synthèse, environ 9 secondes](https://raw.githubusercontent.com/adammouatacime1/diffraction-lab-3d/livraison-diffraction-lab-3d/docs/video/extrait-voix-francaise.mp3)
- [Repères de lecture](video/chapitres.txt)
- [Sous-titres français SRT](video/presentation-professeur.srt)
- [Texte à lire pour enregistrer une vraie voix humaine](video/narration-voix-humaine.txt)
- [Contrôles techniques du fichier final](video/CONTROLES.json)

Pour la montrer au professeur : téléchargez le MP4, ouvrez-le avec le lecteur vidéo de Windows ou VLC, puis utilisez le plein écran. Les sous-titres sont déjà visibles dans l’image. Le fichier SRT séparé permet aussi de consulter ou de réutiliser le texte des sous-titres.

Pour remplacer la narration par la vraie voix d’une personne, le texte à enregistrer est fourni ci-dessus, avec les 22 chapitres et quelques indications de prononciation. La première phrase y est adaptée pour une présentation humaine. Le MP4 actuel conserve sa voix de synthèse ; une version avec voix humaine nécessite de recevoir l’enregistrement, puis d’adapter le montage et les sous-titres à son rythme.

Pour une démonstration reproductible : remettre le champ à l’équilibre, conserver les paramètres et la résolution, observer le même temps physique, et attendre l’arrivée des ondes puis plusieurs périodes avant les estimations harmoniques.

## 01 — Bienvenue dans Diffraction Lab 3D

Bonjour. Cette visite, commentée par une voix de synthèse, présente Diffraction Lab 3D à votre professeur. Le laboratoire calcule la propagation d’ondes dans une cuve numérique. Sur Windows, installez Node.js en version LTS, extrayez le projet, puis ouvrez un terminal dans le dossier contenant package.json. Lancez npm ci, puis npm run dev, et ouvrez l’adresse locale affichée. Le calcul fonctionne ensuite dans le navigateur.

**À afficher à l’écran :** Carte de titre, puis vue générale du laboratoire ; afficher les commandes de démarrage dans une carte, sans simuler un bureau Windows.

**Repères :**

- Visite commentée en français
- Démarrage : npm ci puis npm run dev
- Calcul dans le navigateur

## 02 — Se repérer dans le laboratoire

À gauche, la bibliothèque propose dix expériences : propagation, diffraction, interférences et comparaison. Chaque scénario fournit des paramètres de départ, un objectif et une prédiction à confronter au calcul. Les cinq modes, Découverte, Huygens, Analyse, Comparaison et Présentation, adaptent les outils visibles. Au centre se trouve la cuve de deux mètres quatre-vingts sur un mètre soixante. Les paramètres physiques restent accessibles dans le panneau latéral.

**À afficher à l’écran :** Vue générale du mode Découverte, bibliothèque et paramètres visibles ; survoler les cinq modes.

**Repères :**

- 10 expériences préparées
- 5 modes de travail
- Cuve : 2,80 × 1,60 m

## 03 — Lecture et temps physique

Les commandes permettent de démarrer, mettre en pause, avancer d’un pas d’observation ou recommencer l’expérience. La vitesse de lecture règle la rapidité de présentation, pas la célérité physique. L’horloge affiche le temps simulé. Un changement ordinaire de paramètre conserve les ondes déjà présentes : l’ancien et le nouveau régime peuvent coexister. Pour une comparaison propre, recommencez, attendez l’arrivée du signal, puis plusieurs périodes.

**À afficher à l’écran :** Onde plane en vue Dessus ; montrer Pause, pas d’observation, vitesse de lecture et Recommencer l’expérience.

**Repères :**

- Pause, démarrage, pas d’observation, recommencement
- Vitesse de lecture ≠ célérité
- Recommencer avant une comparaison

## 04 — Fréquence, période, célérité et amplitude

La fréquence indique le nombre d’oscillations par seconde. La période vaut un divisé par la fréquence. La célérité est la vitesse de propagation, et la longueur d’onde vaut la célérité divisée par la fréquence. À dix hertz et deux mètres par seconde, on obtient une période de zéro virgule dix seconde et une longueur d’onde de vingt centimètres. L’amplitude source, exprimée en millimètres, règle l’excitation. Modifier la période ou la longueur d’onde ajuste la fréquence.

**À afficher à l’écran :** Onde plane, paramètres f = 10 Hz et v = 2 m/s ; montrer valeurs dérivées et Réglages avancés.

**Repères :**

- T = 1/f
- λ = v/f
- 10 Hz ; 2 m/s → T = 0,10 s ; λ = 0,20 m

## 05 — Choisir et orienter les sources

Source d’onde propose Rectiligne, Ponctuelle et Deux sources cohérentes. La source ponctuelle permet d’étudier les fronts circulaires. Deux sources ajoutent une séparation et un déphasage réglables. Les réglages avancés donnent la position, la phase initiale et, pour la source rectiligne, la direction incidente. Source active coupe ou rétablit l’excitation. La source rectiligne est finie et émet des deux côtés : elle approche une onde plane sans être idéale partout.

**À afficher à l’écran :** Montrer successivement les trois choix de Source d’onde ; ouvrir Réglages avancés et montrer Source active, positions, phase et direction.

**Repères :**

- Rectiligne, Ponctuelle, Deux sources cohérentes
- Position, direction, phase et activation
- Deux sources : séparation et déphasage

## 06 — Caméras et relief visuel

La vue Dessus facilite la lecture des fronts et des obstacles. Profil distingue crêtes et creux. Isométrique montre simultanément le relief et la propagation. En 3D libre, glissez pour tourner et utilisez la molette pour zoomer. Le curseur Relief visuel grossit seulement les déplacements affichés. Il ne modifie ni l’amplitude physique, ni le calcul, ni les mesures des sondes.

**À afficher à l’écran :** Onde plane ou fente étroite ; montrer les quatre caméras puis faire varier Exagération verticale.

**Repères :**

- Dessus, Profil, Isométrique, 3D libre
- Relief visuel : réglage d’affichage
- Mesures physiques conservées

## 07 — Comprendre le rapport d’ouverture

La diffraction dépend notamment du rapport entre largeur de fente et longueur d’onde. À dix hertz et deux mètres par seconde, comparez des ouvertures de dix, vingt et quatre-vingts centimètres : les rapports valent zéro virgule cinq, un et quatre. Une petite ouverture devrait davantage étaler l’onde transmise. Une grande ouverture devrait rendre la transmission plus directionnelle, avec des effets de bord. Augmenter la fréquence réduit la longueur d’onde : surveillez alors la résolution et recommencez avant de comparer.

**À afficher à l’écran :** Vue Dessus ; utiliser les trois boutons COMPARER a / λ : 0,5, 1 et 4 ; laisser propager chaque expérience.

**Repères :**

- a = 0,10 / 0,20 / 0,80 m
- λ = 0,20 m → a/λ = 0,5 / 1 / 4
- Augmenter f diminue λ à v constante

## 08 — Obstacles et géométries

Géométrie propose Sans obstacle, Fente simple, Double fente, Obstacle circulaire, Obstacle rectangulaire et Bord unique. Selon le choix, réglez largeur d’ouverture, écartement des fentes, diamètre ou dimensions de l’obstacle. Les réglages avancés déplacent l’obstacle. Diffraction, réflexion et superposition proviennent du champ calculé. Les contours sont représentés par des cellules : leur précision dépend du maillage, notamment pour un cercle.

**À afficher à l’écran :** Montrer le menu Géométrie puis successivement double fente, cercle, rectangle et bord unique avec leurs paramètres.

**Repères :**

- 6 géométries disponibles
- Dimensions et positions réglables
- Contournement et réflexion calculés

## 09 — Les bords de la cuve

Dans les réglages avancés, Bords de cuve permet de choisir Absorbants ou Réfléchissants. La couche amortissante réduit les retours d’onde sans les supprimer parfaitement. Elle n’est pas une absorption idéale. Les bords réfléchissants font apparaître des retours et peuvent favoriser des ondes stationnaires. Pour étudier une propagation libre, placez les mesures loin des obstacles et de la périphérie amortissante.

**À afficher à l’écran :** Source ponctuelle sans obstacle ; montrer les deux choix Bords de cuve et laisser évoluer avec Réfléchissants.

**Repères :**

- Absorbants : atténuation imparfaite
- Réfléchissants : retours d’onde
- Mesurer hors de la périphérie

## 10 — Résolution et stabilité numérique

Résolution du solveur propose Performance, Équilibré et Haute précision. Une grille plus fine décrit mieux les petites ouvertures et les longueurs d’onde courtes, mais demande davantage de calcul. Changer de résolution recommence l’expérience. L’indicateur CFL concerne la stabilité du pas de temps : être stable ne garantit pas une mesure précise. Lisez les avertissements et comparez, si nécessaire, une même mesure avec deux résolutions.

**À afficher à l’écran :** Ouvrir Réglages avancés, montrer Résolution du solveur et la carte MAILLAGE NUMÉRIQUE ; montrer un avertissement de résolution si présent.

**Repères :**

- Performance, Équilibré, Haute précision
- Nouveau maillage → recommencement
- Stabilité ≠ précision

## 11 — Huygens : du front aux ondelettes

Le mode Huygens décompose l’explication en sept étapes. Première étape : repérez les fronts incidents. Deuxième : observez la portion qui traverse l’ouverture. Troisième : faites apparaître les sources secondaires virtuelles. Quatrième : regardez leurs ondelettes. Les boutons numérotés et Suivant permettent d’avancer à votre rythme. Cette construction aide à expliquer la propagation après la fente.

**À afficher à l’écran :** Choisir l’expérience Huygens ; activer Visualisation de Huygens ; montrer les étapes 1, 2, 3 et 4.

**Repères :**

- 1 : fronts incidents
- 2 : portion transmise
- 3 : sources virtuelles ; 4 : ondelettes

## 12 — Huygens : distinguer illustration et calcul

Cinquième étape : les contributions se superposent. Sixième : retrouvez le front diffracté dans le champ numérique. Septième : les illustrations disparaissent et seul le résultat calculé reste visible. Sources secondaires visibles règle la densité des points dessinés. Ajouter ces points ne fournit aucune énergie supplémentaire au solveur. L’interrupteur Visualisation de Huygens masque aussi l’illustration. Les ondelettes constituent une explication qualitative, pas une mesure indépendante.

**À afficher à l’écran :** Montrer Huygens étapes 5, 6 et 7 ; revenir étape 4 et modifier Sources secondaires visibles puis masquer l’illustration.

**Repères :**

- 5 : superposition ; 6 : champ diffracté
- 7 : champ numérique seul
- Densité des points sans effet physique

## 13 — Lire les trois cartes physiques

Grandeur visualisée distingue Élongation instantanée, Amplitude locale estimée et Intensité relative. L’élongation décrit le déplacement maintenant ; traverser zéro ne signifie pas cesser d’osciller. L’amplitude est estimée à la fréquence source sur une période complète. L’intensité relative est le carré de l’amplitude locale divisé par le carré de l’amplitude source. Sans unité, elle peut dépasser un par superposition ; ce n’est pas une puissance en watts par mètre carré.

**À afficher à l’écran :** Double fente en vue Dessus après propagation ; montrer les trois choix de Grandeur visualisée et leurs légendes.

**Repères :**

- η : déplacement instantané signé
- Amplitude : estimation sur une période
- Irel = A locale² / A source² ; sans unité

## 14 — Deux sondes et leurs signaux

En Analyse, Placer une sonde autorise deux points de mesure. Cliquez dans l’eau, ou saisissez précisément leurs coordonnées. Les valeurs viennent du nœud de grille le plus proche. Le panneau affiche élongation, amplitude, phase harmonique et historiques temporels. Attendez plusieurs périodes pour interpréter ces estimations. La phase devient indéfinie près d’une amplitude nulle. Une sonde englobée par un obstacle est signalée ; effacez-la ou déplacez-la.

**À afficher à l’écran :** Mode Analyse avec onde plane ; placer deux sondes puis montrer Mesures dans la cuve, coordonnées et courbes.

**Repères :**

- Deux sondes au maximum
- Coordonnées, η, amplitude, phase, historiques
- Mesure au nœud de grille le plus proche

## 15 — Mesurer une arrivée

Pour comparer des arrivées, placez d’abord les sondes puis recommencez. L’arrivée opérationnelle correspond au premier relevé où la valeur absolue de l’élongation atteint cinq pour cent de l’amplitude source. Le décalage est l’arrivée à la sonde deux moins celle à la sonde un. Ce seuil dépend du signal et ne repère pas exactement un front mathématique. L’interface indique aussi l’intervalle maximal entre captures.

**À afficher à l’écran :** Onde plane sans obstacle, deux sondes alignées en propagation ; Recommencer puis montrer l’arrivée opérationnelle et le décalage.

**Repères :**

- Placer les sondes puis recommencer
- Seuil : |η| ≥ 5 % de A₀
- Décalage : arrivée S2 − arrivée S1

## 16 — Règle et coupe spatiale

Mesurer une distance sélectionne deux points dans le plan de la cuve. Pour mesurer une longueur d’onde, prenez deux crêtes consécutives suivant la direction de propagation. Une distance oblique ne donne pas directement cette longueur. Tracer une coupe demande deux extrémités et affiche l’élongation instantanée le long du segment. Les portions situées dans les obstacles sont exclues. Mettez en pause pour choisir les points et commenter le profil.

**À afficher à l’écran :** Onde plane en pause, vue Dessus ; Mesurer λ avec deux points puis Tracer une coupe et montrer son graphique.

**Repères :**

- λ : deux crêtes successives dans la propagation
- Distance dans le plan de la cuve
- Coupe du champ instantané

## 17 — Profil angulaire et Fraunhofer

En Analyse, le profil numérique échantillonne les amplitudes sur un arc, après acquisition d’une période et d’un signal suffisant. Il est normalisé par l’amplitude sur l’axe. La courbe de Fraunhofer, affichée séparément, concerne une fente unique idéale, éclairée uniformément en incidence normale et observée loin. Si le nombre de Fresnel dépasse zéro virgule un, l’application signale le champ proche. Une faible valeur ne garantit pas à elle seule toutes les hypothèses.

**À afficher à l’écran :** Analyse avec fente simple ; montrer Diffraction en champ lointain, profil numérique, nombre de Fresnel et courbe analytique séparée.

**Repères :**

- Profil mesuré : A²(θ) / A²(0)
- Fraunhofer : fente unique idéale en champ lointain
- Fₐ > 0,1 : champ proche signalé

## 18 — Interférences, minima et maxima

Double fente et Deux sources cohérentes permettent d’étudier les interférences. Afficher les zones de faible amplitude utilise un seuil relatif réglable et active la carte d’amplitude. Ce sont des minima estimés, pas la preuve d’un zéro exact. Une zone encore non atteinte paraît aussi faible. Afficher les maxima locaux repère des valeurs élevées. Attendez la propagation et examinez les sondes avant de conclure sur un nœud.

**À afficher à l’écran :** Expérience Zones nodales en Analyse ; après propagation activer zones de faible amplitude, modifier Seuil nodal relatif et afficher maxima locaux.

**Repères :**

- Deux sources ou double fente
- Zones faibles : seuil relatif
- Maxima et minima sensibles aux transitoires

## 19 — Comparer deux cuves

Comparaison affiche deux cuves au même temps physique. Dans cette version, la largeur de la seconde fente est le paramètre séparé ; les autres réglages sont communs. Faites varier Fente de la seconde cuve pour isoler son influence. Recopier les paramètres rend les configurations identiques et recommence les deux calculs. Pour présenter une différence, conservez la même résolution et comparez depuis le même départ, au même temps physique.

**À afficher à l’écran :** Choisir Comparaison ; montrer deux cuves, Fente de la seconde cuve et Recopier les paramètres.

**Repères :**

- Deux horloges synchronisées
- Largeur de seconde fente indépendante
- Recopier les paramètres recommence les calculs

## 20 — Exporter et retrouver une expérience

Capturer l’expérience en PNG enregistre une image avec ses paramètres. Exporter JSON conserve les réglages. Importer permet de les réutiliser : le fichier est contrôlé, puis le champ repart de l’équilibre. Un fichier invalide déclenche une erreur. Le JSON ne contient ni tout le champ ni son historique. Pour reproduire une observation, notez également le temps physique et les positions de mesure, puis recommencez avec la même résolution.

**À afficher à l’écran :** Montrer l’icône Capturer l’expérience en PNG puis les commandes Exporter JSON et Importer au bas du laboratoire.

**Repères :**

- PNG : image de l’expérience
- JSON : paramètres, sans historique complet
- Importer recommence depuis l’équilibre

## 21 — Préparer la présentation au professeur

Le mode Présentation agrandit la cuve et rappelle l’équation d’onde ainsi que les relations entre fréquence, période et longueur d’onde. Annotations explicatives affiche ou masque le commentaire. Afficher les réglages retrouve les paramètres. Le bouton de thème choisit un fond clair ou sombre ; Plein écran facilite la projection. Préparez une scène, ralentissez la lecture, puis mettez en pause pour expliquer ce que vous observez et les paramètres conservés.

**À afficher à l’écran :** Passer en Présentation ; montrer Annotations explicatives, Afficher les réglages, thème sombre puis clair et Plein écran si disponible.

**Repères :**

- Présentation : cuve et équations lisibles
- Annotations et réglages accessibles
- Thème clair/sombre et plein écran

## 22 — Validation scientifique et limites

Validation scientifique exécute de vraies expériences de référence dans le navigateur : lisez paramètres, résultats et critères affichés. Ces contrôles concernent le modèle scalaire linéaire, non dispersif, calculé sur une grille. Ils ne valident pas tous les réglages ni une cuve réelle. Les effets gravito-capillaires, la profondeur, la turbulence et les pertes réelles de l’eau ne sont pas modélisés. Devant le professeur, distinguez toujours le résultat calculé, la mesure, l’illustration pédagogique et la théorie idéale.

**À afficher à l’écran :** Ouvrir Validation scientifique ; cliquer Exécuter les validations et filmer les résultats réellement obtenus, puis carte finale des limites.

**Repères :**

- Exécuter les validations et lire leurs critères
- Modèle linéaire non dispersif sur grille
- Distinguer calcul, mesure, illustration et théorie

## Références et portée

- [Guide d’utilisation](GUIDE.md)
- [Modèle physique et méthode numérique](MODELE.md)
- Interface réelle : `src/App.tsx` ; scénarios : `src/data/experiments.ts`.

Les résultats de la page Validation scientifique doivent être exécutés au moment de la capture. Une vérification réussie n’est jamais présentée comme une validation universelle de tous les paramètres. La vidéo peut être accompagnée du fichier de sous-titres pour une lecture sans le son.

## Voix et sous-titres

La narration est une voix française de synthèse **eSpeak NG**, produite hors ligne avec la voix `fr-fr`, à 155 mots par minute. Elle ne reproduit pas la voix d’une personne réelle. La génération conserve un son PCM mono, 16 bits, 22 050 Hz. Les marques techniques reçoivent seulement dans la voix une aide de prononciation ; le texte technique original reste intact dans les sous-titres.

Le script reproductible [build-narration.py](../scripts/video/build-narration.py) lit [chapters.json](../scripts/video/chapters.json), synthétise chaque phrase ou proposition séparément, puis calcule les horodatages à partir du nombre exact d’échantillons audio. Il ajoute 0,8 seconde de silence au début et à la fin de chaque chapitre, et 0,2 seconde entre les segments. La narration complète dure **10 minutes et 20,6 secondes**, silences compris, et contient **123 segments de sous-titres**.

Le fichier de synchronisation `timing.json` utilise des secondes locales au chapitre pour `subtitles[].start` et `subtitles[].end`, et des secondes depuis le début de la vidéo pour les propriétés `start` et `end` du chapitre. Le fichier `subtitles.srt` utilise les temps globaux. Les fichiers WAV, le SRT et les métadonnées sont des artefacts générés, distincts du code de l’application.
