# Fabrication et usage de la vidéo

La vidéo présente le laboratoire réellement exécuté dans Chromium. Les actions, cartes, sondes et graphiques proviennent de l’application. Les encadrés « Commentaire vidéo », les contours de mise en évidence, les titres et les sous-titres sont ajoutés pour la présentation.

Le temps de la vidéo n’est pas le temps physique du solveur. Les préparations entre chapitres sont coupées et les commandes de lecture peuvent ralentir les observations. Pour mesurer une période ou un délai, utilisez l’horloge et les sondes de l’application, avec leurs limites, plutôt que le chronomètre du lecteur vidéo.

La narration est une **voix de synthèse française eSpeak NG**, générée localement. Le texte est disponible dans `../VIDEO-PROFESSEUR.md` et `../../scripts/video/chapters.json`. Les sources vocales n’imitent aucune personne. Les images ne sont pas générées par une IA d’illustration.

Format de diffusion : MP4, vidéo H.264 en YUV 4:2:0, 1440 × 1080, 20 images par seconde ; audio AAC mono. Les sous-titres français sont incrustés et également disponibles dans un fichier SRT séparé. Le fichier `CONTROLES.json` contient les propriétés et vérifications du fichier livré.

## Refaire le montage

Cette opération technique est facultative : lire le MP4 ne nécessite aucun de ces outils. Les scripts de fabrication sont dans `scripts/video/` :

1. `build-narration.py` produit les WAV et leurs sous-titres à partir de `chapters.json`. Il accepte un exécutable de synthèse via `--speech-wrapper` ; `speak-fr.sh` utilise une installation locale d’eSpeak NG.
2. `record-lab.mjs` enregistre les manipulations de l’application avec Playwright et Chromium. Il prend `BASE_URL`, `LAB_VIDEO_ROOT`, `CHROMIUM_PATH` et `LAB_VIDEO_WORKERS` en options d’environnement. Le mode par défaut filme un chapitre à la fois dans un navigateur neuf, pour limiter les contraintes graphiques.
3. `assemble-video.py` assemble les captures et les voix avec FFmpeg. Il vérifie les sous-titres, flux, durées, chapitres, niveau sonore et décodage complet.

Prérequis de fabrication : les dépendances npm du projet, Chromium, FFmpeg avec libx264/libass, eSpeak NG français, Python 3, Pillow pour le repérage visuel des crêtes, et une police DejaVu Sans. Playwright doit disposer d’un exécutable FFmpeg compatible pour son enregistreur. Les fichiers temporaires de tournage et les outils vocaux ne sont pas requis par l’application et ne sont pas inclus dans le dépôt.
