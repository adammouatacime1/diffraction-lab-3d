# Fabrication et usage de la vidéo

La vidéo présente le laboratoire réellement exécuté dans Chromium. Les actions, cartes, sondes et graphiques proviennent de l’application. Les encadrés « Commentaire vidéo », les contours de mise en évidence, les titres et les sous-titres sont ajoutés pour la présentation.

Le temps de la vidéo n’est pas le temps physique du solveur. Les préparations entre chapitres sont coupées et les commandes de lecture peuvent ralentir les observations. Pour mesurer une période ou un délai, utilisez l’horloge et les sondes de l’application, avec leurs limites, plutôt que le chronomètre du lecteur vidéo.

La narration est une **voix de synthèse neuronale française Kokoro**, générée localement avec la voix `ff_siwis` et la langue `fr-fr`. Aucun enregistrement humain n’a été réalisé pour cette narration. Le texte est disponible dans `../VIDEO-PROFESSEUR.md` et `../../scripts/video/chapters.json`. Les images ne sont pas générées par une IA d’illustration.

Cette version remplace la narration eSpeak de la première livraison. Les images, les 22 chapitres et les 123 sous-titres sont conservés. Chaque segment vocal est ajusté à sa fenêtre d’origine avec le filtre `atempo` de FFmpeg, sans changement de hauteur de voix. L’identité du flux vidéo compressé est contrôlée par SHA-256 avant et après remplacement de l’audio.

Format de diffusion : MP4, vidéo H.264 en YUV 4:2:0, 1440 × 1080, 20 images par seconde ; audio AAC mono. Les sous-titres français sont incrustés et également disponibles dans un fichier SRT séparé. Le fichier `CONTROLES.json` contient les propriétés et vérifications du fichier livré.

## Refaire le montage

Cette opération technique est facultative : lire le MP4 ne nécessite aucun de ces outils. Les scripts de fabrication sont dans `scripts/video/` :

1. `build-narration.py` produit les WAV et leurs sous-titres à partir de `chapters.json`. Il accepte un exécutable de synthèse via `--speech-wrapper` ; `speak-fr.sh` utilise une installation locale d’eSpeak NG.
2. `record-lab.mjs` enregistre les manipulations de l’application avec Playwright et Chromium. Il prend `BASE_URL`, `LAB_VIDEO_ROOT`, `CHROMIUM_PATH` et `LAB_VIDEO_WORKERS` en options d’environnement. Le mode par défaut filme un chapitre à la fois dans un navigateur neuf, pour limiter les contraintes graphiques.
3. `assemble-video.py` assemble les captures et les voix avec FFmpeg. Il vérifie les sous-titres, flux, durées, chapitres, niveau sonore et décodage complet.
4. `build-neural-narration.py` remplace la première narration par Kokoro en réutilisant le dossier de fabrication précédent : `timing.json`, `clips/*.json` et `narration-assembled.wav`. Les poids sont fournis séparément dans `--model-dir` ; le résultat est écrit dans `neural-narration/`.
5. `remux-neural-video.py` reçoit le MP4 d’origine, le nouveau WAV et le SRT. Il remplace uniquement l’audio, copie les images et chapitres, puis vérifie le décodage complet, le niveau sonore et l’identité du flux vidéo.

Prérequis de fabrication : les dépendances npm du projet, Chromium, FFmpeg avec libx264/libass, eSpeak NG français, Python 3, Pillow pour le repérage visuel des crêtes, et une police DejaVu Sans. Playwright doit disposer d’un exécutable FFmpeg compatible pour son enregistreur. Les fichiers temporaires de tournage et les outils vocaux ne sont pas requis par l’application et ne sont pas inclus dans le dépôt.

La narration neuronale a été produite avec `kokoro-onnx==0.6.1`, `onnxruntime==1.31.0`, `numpy==2.5.4`, `soundfile==0.14.0` et la bibliothèque de phonémisation eSpeak NG embarquée par le moteur. eSpeak fournit ici les phonèmes ; la voix entendue est produite par le modèle neuronal Kokoro. Les dépendances Python de fabrication restent séparées de celles de l’application.

## Modèle vocal et provenance

Le moteur [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) est sous licence MIT ; le modèle [Kokoro 82M v1.0](https://huggingface.co/hexgrad/Kokoro-82M) est sous licence Apache 2.0. Les fichiers ont été téléchargés depuis la [publication officielle des modèles ONNX](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1), via HTTPS. Ils ne sont pas inclus dans le dépôt.

Empreintes des fichiers utilisés, conservées pour la reproductibilité :

```text
kokoro-v1.0.onnx  beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a
voices-v1.0.bin   bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d
```

Le rapport `CONTROLES.json` décrit le MP4 livré et les contrôles de synchronisation vocale. Ces contrôles techniques ne constituent pas une écoute subjective de la qualité de la voix.
