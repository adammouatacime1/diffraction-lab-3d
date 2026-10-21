# Captures du laboratoire de diffraction existant

Ces images montrent l’application de diffraction originale, sans modification de ses fichiers `src/`. Elles servent de référence visuelle pour le kit ; la page exemple du kit utilise un autre modèle illustratif.

| Référence | Thème | Fenêtre du navigateur | Image complète |
| --- | --- | --- | --- |
| [Ordinateur clair](diffraction-desktop-light.png) | Clair | 1 440 × 1 000 px | 1 440 × 1 432 px |
| [Ordinateur sombre](diffraction-desktop-dark.png) | Sombre | 1 440 × 1 000 px | 1 440 × 1 432 px |
| [Mobile clair](diffraction-mobile-light.png) | Clair | 390 × 844 px | 390 × 2 544 px |
| [Mobile sombre](diffraction-mobile-dark.png) | Sombre | 390 × 844 px | 390 × 2 544 px |

Les captures couvrent la page entière. Sur ordinateur, le panneau de gauche conserve la hauteur et le défilement indépendant définis par l’application. Sur mobile, les paramètres apparaissent sous la simulation, conformément à son comportement actuel. Il n’y a pas de débordement horizontal à ces deux largeurs.

## Provenance

- Dépôt : `adammouatacime1/diffraction-lab-3d`.
- Branche source : `livraison-diffraction-lab-3d`.
- Révision de l’application : `db725076835a54065b8a59cf7c2b8375f4856e49`.
- Captures réalisées le 21 octobre 2026 avec Chromium, Playwright et WebGL logiciel SwiftShader. Le numéro exact du navigateur et l’horodatage UTC figurent dans [capture-metadata.json](capture-metadata.json).
- Densité : un pixel d’image par pixel CSS ; préférence de réduction des mouvements activée.
- Interface française, mode « Découverte », expérience « Fente étroite », caméra « Isométrique », calcul mis en pause après propagation de l’onde. Un même état physique est conservé entre les deux thèmes d’un appareil.
- Paramètres : source rectiligne, fente simple, fréquence 10 Hz, célérité 2 m/s, amplitude 4 mm, largeur de fente 0,1 m, longueur d’onde 0,2 m, maillage 201 × 115, bords absorbants avec couche amortissante. Le temps physique exact est enregistré pour chaque image dans les métadonnées.
- Aucun moteur physique, composant ni style du laboratoire source n’a été modifié pour ces captures. Aucun montage ou retouche d’image n’a été appliqué.

La pile CSS déclare `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Le dépôt ne fournit ni ne télécharge Inter. Sur la machine de capture, l’inspection des polices réellement rendues par Chromium indique **Liberation Sans** pour le titre principal. Le rendu typographique peut donc différer sous Windows ou macOS, comme dans le laboratoire original. Le rendu WebGL peut également varier légèrement selon le GPU.

## Reproduire les vues

Depuis la révision source indiquée, installer les dépendances puis lancer l’application :

```sh
npm ci
npm run dev -- --port 5181
```

Ouvrir l’URL locale indiquée par Vite. Régler la fenêtre à l’une des tailles du tableau, conserver l’expérience initiale et la vue isométrique, passer la vitesse de lecture à 1×, recommencer, puis mettre en pause après environ deux secondes de temps physique. Retirer le pointeur des boutons et capturer la page entière. Changer ensuite le thème avec le bouton du bandeau, sans relancer la simulation, et réaliser la seconde capture.

Les images sont des références de composition, de couleurs et de comportement adaptatif. Pour une comparaison pixel par pixel, conserver aussi le navigateur, les polices, le temps physique et le moteur de rendu précisés dans les métadonnées.

Des [captures séparées de la page modèle du kit](./example/README.md) permettent de comparer son assemblage. Elles montrent un oscillateur, pas le calcul de diffraction.
