import { DEFAULT_PARAMETERS, SOUND_PARAMETERS, type Experiment } from '../types';

const base = { ...DEFAULT_PARAMETERS, speed: 2, frequency: 10, boundary: 'absorbing' as const };

/** Prédictions à discuter : elles ne remplacent jamais une observation du calcul. */
export const EXPERIMENTS: Experiment[] = [
  {
    id: 'plane', title: '01 · Propagation rectiligne', shortTitle: 'Onde plane', category: 'Propagation',
    objective: 'Reconnaître des fronts rectilignes parallèles et mesurer leur espacement.',
    prediction: 'Loin des extrémités de la source, deux crêtes voisines devraient être séparées d’environ 0,20 m.',
    explanation: 'À célérité constante, λ = v/f = 2/10 = 0,20 m et T = 0,10 s. Une crête se déplace, tandis qu’un point du milieu oscille.',
    parameters: { ...base, source: 'plane', obstacle: 'none' }, mode: 'discovery',
  },
  {
    id: 'circular', title: '02 · Propagation circulaire', shortTitle: 'Onde circulaire', category: 'Propagation',
    objective: 'Suivre l’expansion de fronts circulaires autour d’une source ponctuelle.',
    prediction: 'Les crêtes devraient former des cercles concentriques avant les interactions avec les bords.',
    explanation: 'Le même calcul se propage dans toutes les directions. L’amplitude peut diminuer avec la distance : elle n’est pas imposée uniforme dans toute la cuve.',
    parameters: { ...base, source: 'point', sourceX: 0.7, obstacle: 'none' }, mode: 'discovery',
  },
  {
    id: 'narrow', title: '03 · Diffraction par une fente étroite', shortTitle: 'Fente étroite', category: 'Diffraction',
    objective: 'Observer l’étalement d’une onde transmise lorsque a < λ.',
    prediction: 'Pour a = 0,10 m et λ = 0,20 m, soit a/λ = 0,5, les fronts transmis devraient s’étaler fortement.',
    explanation: 'Les bords limitent le front transmis. La propagation après l’ouverture résulte de l’équation d’onde et des conditions sur la barrière.',
    parameters: { ...base, source: 'plane', obstacle: 'slit', aperture: 0.1 }, mode: 'discovery',
  },
  {
    id: 'wide', title: '04 · Diffraction par une fente large', shortTitle: 'Fente large', category: 'Diffraction',
    objective: 'Comparer la propagation transmise avec celle d’une fente étroite.',
    prediction: 'Pour a = 0,80 m, a/λ = 4 : le faisceau transmis devrait rester plus directionnel, avec de la diffraction près des bords.',
    explanation: 'Un rapport a/λ élevé réduit l’étalement angulaire principal. Il ne fait pas disparaître les effets de bord.',
    parameters: { ...base, source: 'plane', obstacle: 'slit', aperture: 0.8 }, mode: 'discovery',
  },
  {
    id: 'frequency', title: '05 · Influence de la fréquence', shortTitle: 'Fréquence', category: 'Diffraction',
    objective: 'Modifier f à célérité et largeur de fente constantes, puis comparer les fronts.',
    prediction: 'Si f augmente, λ = v/f diminue et a/λ augmente. La transmission devrait devenir plus directionnelle.',
    explanation: 'Partez de f = 10 Hz, v = 2 m/s et a = 0,20 m, soit a/λ = 1. Comparez 5, 10 et 15 Hz en recommençant chaque expérience et vérifiez la résolution.',
    parameters: { ...base, source: 'plane', obstacle: 'slit', aperture: 0.2 }, mode: 'analysis',
  },
  {
    id: 'huygens', title: '06 · Principe de Huygens', shortTitle: 'Huygens', category: 'Comprendre',
    objective: 'Relier une portion de front dans l’ouverture à des ondelettes secondaires virtuelles.',
    prediction: 'La superposition d’ondelettes permet d’interpréter qualitativement la forme des fronts transmis.',
    explanation: 'Les marqueurs et cercles sont une illustration pédagogique superposée au champ calculé. Ils ne constituent pas des sources supplémentaires injectées dans le solveur.',
    parameters: { ...base, source: 'plane', obstacle: 'slit', aperture: 0.2 }, mode: 'huygens',
  },
  {
    id: 'circle', title: '07 · Diffraction autour d’un obstacle', shortTitle: 'Obstacle circulaire', category: 'Obstacles',
    objective: 'Repérer la réflexion, les fronts contournant un disque et sa région d’ombre.',
    prediction: 'L’onde devrait se réfléchir en amont et pénétrer partiellement dans l’ombre géométrique en aval.',
    explanation: 'La taille de l’obstacle relativement à λ influence l’ombre et le contournement. Sa frontière est représentée sur une grille, avec une précision limitée par le maillage.',
    parameters: { ...base, source: 'plane', obstacle: 'circle', obstacleWidth: 0.4, obstacleHeight: 0.4 }, mode: 'discovery',
  },
  {
    id: 'double', title: '08 · Interférences par deux fentes', shortTitle: 'Double fente', category: 'Interférences',
    objective: 'Observer la superposition des ondes issues de deux ouvertures cohérentes.',
    prediction: 'Des régions de forte et de faible amplitude devraient apparaître après la barrière.',
    explanation: 'Les contributions peuvent arriver en phase ou en opposition de phase. La carte d’amplitude distingue ces minima d’un passage instantané par η = 0.',
    parameters: { ...base, source: 'plane', obstacle: 'double', aperture: 0.1, separation: 0.5 }, mode: 'analysis',
  },
  {
    id: 'nodes', title: '09 · Minima et zones nodales', shortTitle: 'Zones nodales', category: 'Interférences',
    objective: 'Comparer deux sondes et repérer des régions durablement proches d’un minimum d’amplitude.',
    prediction: 'Deux sources ponctuelles de même fréquence et de même phase devraient produire des franges d’interférences.',
    explanation: 'Les zones affichées sous un seuil sont des faibles amplitudes estimées, pas la preuve d’un zéro exact. Attendez la propagation puis plusieurs périodes avant de conclure.',
    parameters: { ...base, source: 'pair', sourceX: 0.6, sourceSeparation: 0.5, phase: 0, obstacle: 'none' }, mode: 'analysis',
  },
  {
    id: 'comparison', title: '10 · Comparaison expérimentale', shortTitle: 'Deux expériences', category: 'Comparer',
    objective: 'Comparer une fente étroite et une fente large avec la même source et la même durée physique.',
    prediction: 'Avec λ = 0,20 m, la cuve à a = 0,10 m devrait présenter plus d’étalement que celle à a = 0,80 m.',
    explanation: 'Comparez des états issus du même départ et vérifiez les paramètres des deux cuves. Les prédictions restent à confronter aux résultats réellement calculés.',
    parameters: { ...base, source: 'plane', obstacle: 'slit', aperture: 0.1 }, mode: 'comparison',
  },
  {
    id: 'theta', title: '11 · Angle θ et premier minimum', shortTitle: 'Angle θ et premier minimum', category: 'Diffraction',
    objective: 'Repérer le premier minimum théorique et l’angle qui délimite le lobe central.',
    prediction: 'Dans le modèle idéal de Fraunhofer, a = 0,40 m et λ = 0,20 m donnent θ₁ = 30° et une amplitude nulle à ±30°.',
    explanation: 'Le panneau de théorie montre les directions des minima et leur amplitude. La cuve numérique à distance finie est distincte ; ces repères ne sont pas des nœuds mesurés dans le solveur. Des lobes secondaires subsistent au-delà du premier minimum.',
    parameters: { ...base, source: 'plane', obstacle: 'slit', aperture: 0.4, sourceAngle: 0, resolution: 'precision' }, mode: 'discovery',
  },
];

const soundBase = { ...SOUND_PARAMETERS, boundary: 'absorbing' as const };

/** Pressure-wave experiments in the same 2D domain; predictions are not measured results. */
export const SOUND_EXPERIMENTS: Experiment[] = [
  {
    id: 'plane', title: '01 · Propagation d’une onde sonore plane', shortTitle: 'Onde plane', category: 'Propagation',
    objective: 'Suivre des fronts de pression rectilignes et mesurer leur espacement.',
    prediction: 'À c = 340 m/s et f = 1 000 Hz, deux crêtes voisines devraient être séparées d’environ 34 cm ; T = 1 ms.',
    explanation: 'La couleur code la perturbation de pression p′ en pascals. La source est une ligne de pression imposée, idéale et bidirectionnelle ; l’onde utile à droite se dirige vers l’obstacle. La directivité d’un haut-parleur réel n’est pas calculée.',
    parameters: { ...soundBase, source: 'plane', obstacle: 'none' }, mode: 'discovery',
  },
  {
    id: 'circular', title: '02 · Propagation sonore circulaire en 2D', shortTitle: 'Onde circulaire 2D', category: 'Propagation',
    objective: 'Observer la divergence géométrique d’une onde de pression dans le plan du modèle.',
    prediction: 'Avant les réflexions aux bords, les fronts devraient former des cercles autour de la source et leur amplitude varier avec la distance.',
    explanation: 'La source ponctuelle du dessin idéalise une source linéique perpendiculaire au plan. Les cercles sont la section d’une propagation cylindrique, pas des sphères sonores calculées en volume. La divergence provient du solveur 2D, sans loi 1/r ajoutée.',
    parameters: { ...soundBase, source: 'point', sourceX: 0.7, obstacle: 'none' }, mode: 'discovery',
  },
  {
    id: 'narrow', title: '03 · Son à travers une fente étroite', shortTitle: 'Fente étroite', category: 'Diffraction',
    objective: 'Observer le fort étalement d’une onde sonore transmise pour a < λ.',
    prediction: 'Avec a = 17 cm et λ = 34 cm, a/λ = 0,5 : les fronts transmis devraient s’étaler fortement.',
    explanation: 'La paroi rigide réfléchit une partie de la pression incidente ; la perturbation transmise se propage et diffracte aux bords de l’ouverture. Une grande longueur d’onde relativement à l’ouverture favorise cet étalement.',
    parameters: { ...soundBase, source: 'plane', obstacle: 'slit', aperture: 0.17 }, mode: 'discovery',
  },
  {
    id: 'wide', title: '04 · Son à travers une fente large', shortTitle: 'Fente large', category: 'Diffraction',
    objective: 'Comparer une ouverture de largeur supérieure à λ à la fente étroite.',
    prediction: 'Avec a = 68 cm et λ = 34 cm, a/λ = 2 : la transmission devrait être plus directionnelle que pour a/λ = 0,5.',
    explanation: 'Une ouverture large n’annule pas la diffraction : des effets de bord persistent. Comparez les deux expériences après le même temps physique, en distinguant pression instantanée et amplitude estimée.',
    parameters: { ...soundBase, source: 'plane', obstacle: 'slit', aperture: 0.68 }, mode: 'discovery',
  },
  {
    id: 'frequency', title: '05 · Fréquence du son et contournement', shortTitle: 'Fréquence', category: 'Diffraction',
    objective: 'Modifier la fréquence à célérité et ouverture constantes pour suivre le rapport a/λ.',
    prediction: 'À c = 340 m/s et a = 34 cm, f = 500, 1 000 et 1 500 Hz donnent a/λ = 0,5, 1 et 1,5.',
    explanation: 'À célérité constante, diminuer la fréquence allonge λ. Une onde dont la longueur d’onde est grande par rapport aux dimensions pertinentes pénètre plus nettement certaines régions d’ombre. Recommencez après chaque changement et vérifiez les avertissements de résolution ; les bornes dépendent du maillage.',
    parameters: { ...soundBase, source: 'plane', obstacle: 'slit', aperture: 0.34 }, mode: 'analysis',
  },
  {
    id: 'huygens', title: '06 · Huygens pour les ondes sonores', shortTitle: 'Huygens', category: 'Comprendre',
    objective: 'Interpréter les fronts de pression transmis à l’aide d’ondelettes secondaires illustratives.',
    prediction: 'Les ondelettes de l’ouverture aident à comprendre qualitativement la construction d’un front diffracté.',
    explanation: 'Les points et cercles sont une surcouche pédagogique que l’on peut afficher ou masquer. Ils n’injectent aucune seconde onde et leur nombre ne change pas la pression calculée par le solveur.',
    parameters: { ...soundBase, source: 'plane', obstacle: 'slit', aperture: 0.34 }, mode: 'huygens',
  },
  {
    id: 'circle', title: '07 · Son autour d’un cylindre rigide', shortTitle: 'Obstacle circulaire', category: 'Obstacles',
    objective: 'Observer réflexion et diffraction autour d’une section circulaire.',
    prediction: 'Pour un diamètre d = 34 cm, d/λ = 1 : la pression devrait se réfléchir en amont et pénétrer partiellement l’ombre en aval.',
    explanation: 'Le cercle représente la section d’un cylindre invariant perpendiculairement au plan, pas une sphère. Sa paroi est rigide. Son contour est approché par le masque du maillage ; l’effet d’escalier limite la précision près de la surface.',
    parameters: { ...soundBase, source: 'plane', obstacle: 'circle', obstacleWidth: 0.34, obstacleHeight: 0.34 }, mode: 'discovery',
  },
  {
    id: 'rectangle', title: '08 · Son autour d’un obstacle rectangulaire', shortTitle: 'Obstacle rectangulaire', category: 'Obstacles',
    objective: 'Comparer la réflexion sur une face plane et la diffraction aux coins.',
    prediction: 'Un obstacle de hauteur h = 51 cm donne h/λ = 1,5 : des fronts devraient contourner ses deux extrémités.',
    explanation: 'Le rectangle est la section d’un obstacle étendu perpendiculairement au plan. Aucun bloc fini en volume n’est simulé. La largeur, la hauteur et la position changent réellement le masque des cellules solides et donc le champ de pression.',
    parameters: { ...soundBase, source: 'plane', obstacle: 'rectangle', obstacleWidth: 0.25, obstacleHeight: 0.51 }, mode: 'discovery',
  },
  {
    id: 'edge', title: '09 · Diffraction sonore par un bord unique', shortTitle: 'Bord unique', category: 'Obstacles',
    objective: 'Suivre les fronts de pression qui contournent l’extrémité d’une paroi.',
    prediction: 'La pression devrait pénétrer partiellement dans l’ombre du bord, avec des fronts courbés près de son extrémité.',
    explanation: 'Le bord est une demi-paroi rigide dans ce domaine fini. Sa position règle son extrémité. Il ne possède pas deux ouvertures : on n’y applique pas la formule angulaire de la fente unique.',
    parameters: { ...soundBase, source: 'plane', obstacle: 'edge', obstacleY: 0.8 }, mode: 'discovery',
  },
  {
    id: 'double', title: '10 · Interférences sonores par deux fentes', shortTitle: 'Double fente', category: 'Interférences',
    objective: 'Observer la superposition cohérente des champs transmis par deux ouvertures.',
    prediction: 'Deux fentes de 17 cm séparées de 51 cm devraient produire des régions d’amplitude élevée et faible après la paroi.',
    explanation: 'La paroi et ses deux ouvertures agissent sur un seul champ calculé. Les interférences résultent de sa propagation. Une pression momentanément nulle ne prouve pas un minimum d’amplitude durable ; utilisez l’estimation harmonique et les microphones après établissement du signal.',
    parameters: { ...soundBase, source: 'plane', obstacle: 'double', aperture: 0.17, separation: 0.51 }, mode: 'analysis',
  },
  {
    id: 'nodes', title: '11 · Régions de faible amplitude sonore', shortTitle: 'Faibles amplitudes', category: 'Interférences',
    objective: 'Comparer deux microphones virtuels dans le champ de deux sources cohérentes.',
    prediction: 'Deux sources de même fréquence et de même phase devraient former des zones d’interférence constructive et destructive.',
    explanation: 'Les régions sous le seuil sont de faibles amplitudes estimées, pas des zéros exacts ni la preuve d’une absence complète de son. Attendez l’arrivée du signal et une fenêtre de plusieurs périodes. Près d’un minimum, la phase est mal déterminée.',
    parameters: { ...soundBase, source: 'pair', sourceX: 0.6, sourceSeparation: 0.51, phase: 0, obstacle: 'none' }, mode: 'analysis',
  },
  {
    id: 'comparison', title: '12 · Comparaison de deux ouvertures sonores', shortTitle: 'Deux configurations', category: 'Comparer',
    objective: 'Comparer deux largeurs de fente avec le même milieu, la même source et le même temps physique.',
    prediction: 'À λ = 34 cm, une ouverture de 17 cm devrait étaler davantage les fronts qu’une ouverture de 68 cm.',
    explanation: 'Les configurations repartent ensemble. La comparaison porte sur l’ouverture de la seconde paroi ; les autres paramètres sont communs. Vérifiez les valeurs affichées et confrontez cette prédiction aux champs réellement calculés.',
    parameters: { ...soundBase, source: 'plane', obstacle: 'slit', aperture: 0.17 }, mode: 'comparison',
  },
  {
    id: 'theta', title: '13 · Angle θ : prédiction pour une fente sonore', shortTitle: 'Angle θ et premier minimum', category: 'Diffraction',
    objective: 'Lire le premier minimum de Fraunhofer tout en le distinguant du champ numérique proche.',
    prediction: 'À λ = 34 cm et a = 68 cm, le modèle idéal de fente uniformément éclairée prévoit sin θ₁ = 0,5, donc θ₁ = 30°.',
    explanation: 'Ces directions sont une prédiction analytique en champ lointain, pas des nœuds mesurés dans le domaine fini. La formule suppose une seule fente éclairée par une onde plane en incidence normale ; elle ne s’applique pas au cylindre, au rectangle, au bord ou à une source ponctuelle.',
    parameters: { ...soundBase, source: 'plane', obstacle: 'slit', aperture: 0.68, sourceAngle: 0, resolution: 'precision' }, mode: 'discovery',
  },
];
