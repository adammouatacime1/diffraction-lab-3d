# Voir la diffraction sonore : GBF, haut-parleur et fente

Ouvrir le [laboratoire en mode sonore](https://adammouatacime1.github.io/diffraction-lab-3d/?medium=sound). Il présente directement le montage d’observation :

**GBF → câble électrique → haut-parleur → onde incidente → fente → onde diffractée.**

Le GBF commande le haut-parleur avec un signal sinusoïdal. Le haut-parleur représente la source du son ; le GBF lui-même n’émet pas directement l’onde acoustique.

## Observer

1. Laisser l’animation avancer : les fronts partent de l’émetteur et se dirigent vers la paroi.
2. Observer les ondes qui passent par l’ouverture. Elles se propagent ensuite de part et d’autre de l’axe, derrière la fente.
3. Modifier **Largeur de la fente** ou **Fréquence du son**, puis comparer le nouvel état après sa propagation. Un changement de ces paramètres recommence le calcul.

Le montage initial emploie une source localisée à `(0,38 ; 0,80) m`, une paroi à `x = 1,35 m`, une fente de `17 cm`, `f = 1 000 Hz` et `c = 340 m/s`. La longueur d’onde est donc `34 cm`, soit `a/λ = 0,5`. Les fronts incidents de cette source localisée sont déjà courbés ; la fente limite la partie transmise et provoque la diffraction derrière la paroi.

La simulation commence depuis le repos. Il faut laisser le temps à l’onde d’atteindre la fente puis la région derrière celle-ci. **Pause** fige le temps ; **Recommencer** repart du repos. Arrêter le GBF coupe l’excitation : les ondes déjà émises continuent leur propagation et leur amortissement, au lieu de disparaître instantanément.

## Retrouver les outils du laboratoire

**Outils et autres expériences** ouvre les vues de pression 2D/3D, les microphones, les six géométries et les expériences précédentes. **Voir le montage GBF et fente** revient à la vue d’observation et recharge ce montage. Le milieu eau reste accessible avec le sélecteur de milieu.

## Ce que représente le dessin

Les fronts affichés proviennent du même champ de pression calculé que les cartes et les microphones ; l’ouverture n’ajoute pas une source artificielle. Les traits rendent la phase visible : ils ne représentent ni une amplitude partout constante, ni une absence de son entre deux traits. Les zones solides du masque agissent réellement sur le calcul.

Le calcul acoustique est bidimensionnel. Le haut-parleur est un symbole d’émetteur idéalisé ; son boîtier, sa directivité réelle et son circuit électrique ne sont pas simulés. Le GBF affiche et règle la fréquence effectivement utilisée par la source, sans prétendre convertir des volts réels en pression calibrée. La formule de Fraunhofer n’est pas imposée à cette source localisée ; les cas adaptés restent disponibles dans les outils.

Les parois sont rigides et les frontières extérieures utilisent une couche dissipative progressive, sans PML. Voir l’[audit scientifique](ACOUSTIC-ENGINE-AUDIT.md) et le [guide acoustique complet](SON.md) pour les autres limites.
