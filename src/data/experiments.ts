import { DEFAULT_PARAMETERS, type Experiment } from '../types';

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
