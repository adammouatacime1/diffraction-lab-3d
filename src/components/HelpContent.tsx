export function HelpContent() {
  return (
    <article className="help-content">
      <p className="eyebrow">Le modèle, le calcul et ses limites</p>
      <h2>Comment fonctionne la simulation ?</h2>
      <p>La cuve représente une surface en deux dimensions. Chaque point porte une élongation verticale η, calculée à partir de ses voisins. La vue en relief affiche ces mêmes valeurs : elle ne fabrique pas une autre animation.</p>
      <p>Sur ordinateur, la colonne des expériences et des paramètres défile séparément. La molette au-dessus de la cuve fait défiler la page ; le bouton de loupe permet d’activer le zoom, puis de le désactiver. Sur téléphone, le glissement vertical reste disponible tant que le zoom est désactivé.</p>

      <section className="card">
        <h3>1. Une onde mécanique simplifiée</h3>
        <p>Le modèle est scalaire, linéaire et non dispersif : toutes les fréquences se propagent à la même célérité v. Les amplitudes restent petites et les ondes peuvent se superposer.</p>
        <p className="equation">∂²η/∂t² = v² (∂²η/∂x² + ∂²η/∂y²)</p>
        <p>Les sources et l’amortissement aux bords complètent cette équation. Ce modèle permet d’étudier propagation, diffraction et interférences, mais ne reproduit pas toute la physique de l’eau : ni dispersion gravito-capillaire, ni viscosité réaliste, ni déferlement. La célérité est un paramètre du modèle.</p>
        <p>La source plane est une ligne oscillante qui émet des deux côtés. Pour la diffraction, on étudie l’onde à droite de cette source, incidente sur la barrière ; il ne s’agit pas d’une source strictement unidirectionnelle.</p>
      </section>

      <section className="card">
        <h3>2. Les grandeurs à lire</h3>
        <dl>
          <dt>Fréquence f · Hz</dt><dd>Nombre d’oscillations par seconde.</dd>
          <dt>Période T · s</dt><dd>Durée d’une oscillation : T = 1/f.</dd>
          <dt>Célérité v · m/s</dt><dd>Vitesse de propagation du signal dans le modèle.</dd>
          <dt>Longueur d’onde λ · m</dt><dd>Distance entre deux crêtes successives d’une onde progressive : λ = v/f.</dd>
          <dt>Amplitude A · mm</dt><dd>Échelle physique de l’excitation. Elle est distincte du grossissement du relief à l’écran.</dd>
          <dt>Ouverture a · m</dt><dd>Largeur de chaque fente. Le rapport a/λ aide à prévoir l’étalement.</dd>
        </dl>
        <p>Exemple : v = 2 m/s et f = 10 Hz donnent T = 0,10 s et λ = 0,20 m. Avec a = 0,10 m, a/λ = 0,5 ; avec a = 0,80 m, a/λ = 4. Ce sont des valeurs cohérentes dans ce modèle pédagogique, sans garantie de correspondre à n’importe quelle cuve réelle.</p>
      </section>

      <section className="card">
        <h3>3. Une grille et un pas de temps</h3>
        <p>Le solveur FDTD approche les dérivées par des différences entre points voisins et avance le champ par petits pas Δt. Les niveaux Performance, Équilibré et Haute précision changent la grille numérique. Les valeurs Δx, Δy et Δt permettent d’évaluer sa finesse.</p>
        <p className="equation">v Δt √(1/Δx² + 1/Δy²) ≤ 1</p>
        <p>La marge CFL choisie est 0,8. Cette condition assure la stabilité du schéma de propagation, mais ne garantit pas sa précision. Une longueur d’onde ou une ouverture représentée par trop peu de cellules reste mal résolue. Le réglage de vitesse de lecture ne change pas cette condition.</p>
      </section>

      <section className="card">
        <h3>4. Barrières et limites de la cuve</h3>
        <p>Un obstacle rigide impose une dérivée normale nulle de η : c’est une condition de Neumann pour ce modèle scalaire. L’onde peut se réfléchir sur ses parois et se propager par les ouvertures ; la diffraction émerge du calcul.</p>
        <p>Aux bords extérieurs, une zone amortissante réduit les réflexions. C’est une couche dissipative (« sponge »), pas une frontière parfaitement absorbante ni une PML. Des réflexions résiduelles restent possibles. Le mode de bords réfléchissants permet au contraire de les étudier.</p>
        <p>Les contours des obstacles sont approchés par la grille. Les parois courbes comportent donc un effet d’escalier, qui diminue quand on affine le maillage.</p>
      </section>

      <section className="card">
        <h3>5. Élongation, amplitude et intensité</h3>
        <p><strong>η(x,y,t)</strong> est l’élongation à un instant donné. Une valeur nulle peut simplement indiquer que le point traverse sa position d’équilibre.</p>
        <p><strong>L’amplitude locale</strong> est estimée par projection sur un sinus et un cosinus à la fréquence de la source, avec 32 échantillons répartis sur la dernière période. Les échantillons sont interpolés entre les pas du solveur. Cette mesure devient interprétable lorsque le signal est périodique et suffisamment établi.</p>
        <p><strong>La phase</strong> est celle du signal harmonique η ≈ A<sub>local</sub> sin(2πft + φ), par rapport à l’horloge de simulation. Elle est affichée en degrés, comme le déphasage entre les sondes. Elle n’est pas indiquée si l’estimation manque ou si l’amplitude est trop faible.</p>
        <p className="equation">I<sub>rel</sub> = A<sub>local</sub>² / A<sub>source</sub>²</p>
        <p>Cette intensité relative est un indicateur normalisé sans unité, pas une mesure de puissance en W/m². Elle peut dépasser 1 par superposition. Les zones nodales sont des régions sous un seuil réglable ; elles ne prouvent pas un zéro exact.</p>
        <p>La sonde lit le nœud de grille le plus proche : sa précision spatiale dépend donc du maillage. Après une modification de fréquence, de source ou de géométrie, des ondes anciennes et nouvelles coexistent. Attendez plusieurs périodes et le temps de propagation avant d’interpréter amplitude et phase, ou recommencez l’expérience. Changer de résolution crée une nouvelle grille et recommence le calcul.</p>
        <p>Placez deux sondes puis recommencez pour mesurer leur arrivée opérationnelle : la première observation où |η| atteint 5 % de l’amplitude de source. Le pas maximal de capture est indiqué. Ce seuil dépend du signal ; il ne repère pas un front exact. Effacer les sondes retire aussi leur historique. Une sonde signalée dans un obstacle ne mesure pas une oscillation de l’eau.</p>
      </section>

      <section className="card">
        <h3>6. Huygens : une illustration identifiée</h3>
        <p>Les points visibles dans l’ouverture représentent des sources secondaires virtuelles ; leurs ondelettes aident à comprendre la construction d’un front transmis. Leur nombre règle la densité de cette illustration. L’interrupteur « Visualisation de Huygens » permet de la masquer.</p>
        <p>Les points et les cercles ne sont pas des sources réelles supplémentaires dans le solveur. Le champ diffracté reste celui de l’équation d’onde. Une construction par cercles ne constitue pas à elle seule une reconstruction quantitative exacte de Huygens-Fresnel.</p>
      </section>

      <section className="card">
        <h3>7. Une théorie à comparer avec prudence</h3>
        <p>Pour une fente idéale et en champ lointain, l’approximation de Fraunhofer prévoit :</p>
        <p className="equation">I(θ)/I(0) = [sin(β)/β]², avec β = πa sin(θ)/λ</p>
        <p>Au centre, la limite vaut 1. Les minima théoriques satisfont a sin(θ) = mλ pour les entiers m non nuls dont l’angle existe. Ce profil analytique suppose notamment une ouverture uniformément éclairée. Il ne décrit pas automatiquement le champ proche, un obstacle circulaire ou toutes les réflexions de la cuve.</p>
        <p>Pour montrer le premier minimum, cliquez sur <strong>Voir le cas θ = 30°</strong> au-dessus de la cuve, ou choisissez <strong>11 · Angle θ et premier minimum</strong> dans <strong>Expériences</strong>. Sur téléphone, cette bibliothèque se trouve plus bas dans la page. Avec a = 0,40 m et λ = 0,20 m, sin θ₁ = λ/a = 0,5 : θ₁ vaut 30°. Le panneau pédagogique, placé avant la cuve, trace l’axe et les directions ±θ₁ ; le bouton <strong>Premier minimum</strong> place le curseur au zéro de l’amplitude théorique A(θ)/A(0) = |sin β/β|. <strong>Rétablir le cas θ = 30°</strong> retrouve les paramètres et l’incidence normale de cette démonstration.</p>
        <p>θ₁ est le demi-angle du lobe central, dont l’ouverture totale vaut 2θ₁. Les lobes secondaires au-delà des minima ne disparaissent pas. Si a &lt; λ, aucun premier minimum n’existe ; si a = λ, il est à 90°, en direction rasante. L’approximation θ₁ ≈ λ/a donne un angle en radians et n’est valable qu’aux petits angles.</p>
        <p>Ce schéma représente le modèle idéal en champ lointain. Son zéro analytique ne force aucune amplitude à zéro dans la cuve ; il ne démontre pas que le champ FDTD, dans un domaine fini, présente un zéro au même angle.</p>
        <p>La case <strong>Afficher θ sur la cuve</strong>, près de la vue, ajoute l’axe, les directions théoriques ±θ₁, un arc et l’angle sur la cuve numérique. La vue <strong>Dessus</strong> facilite la lecture. Cette annotation suppose une onde plane en incidence normale et une seule fente avec a &gt; λ, éclairée depuis la gauche ; elle prédit des directions de minima en champ lointain, sans mesurer des nœuds FDTD ni changer le champ calculé. Pour a &lt; λ, un message explique l’absence de minimum et <strong>Charger le cas θ = 30°</strong> prépare a = 0,40 m et λ = 0,20 m. À a = λ, les directions sont rasantes, le long de la barrière. En Comparaison, chaque cuve utilise sa propre ouverture pour son annotation et son message.</p>
        <p>Un autre profil mesure réellement A²(θ)/A²(0) dans le champ numérique, sur un arc en aval entre −60° et +60°. Son rayon s’adapte pour éviter la couche amortissante. Le nombre de Fresnel a²/(λr) renseigne sur la distance : au-dessus de 0,1, aucune comparaison quantitative avec Fraunhofer ; en dessous, les autres hypothèses restent nécessaires. En double fente, l’étendue complète des deux ouvertures compte également.</p>
        <p>La page de validation distingue ces prédictions des mesures réellement effectuées. Un résultat numérique peut différer de la théorie à cause du maillage, des frontières ou des conditions de l’expérience.</p>
      </section>

      <section className="card">
        <h3>8. Une présentation en cinq minutes</h3>
        <p>Le mode Comparaison fait principalement varier la largeur de la seconde fente ; les autres paramètres sont communs. Pour reproduire une expérience, exportez ses paramètres en JSON, puis utilisez « Importer » : le champ repartira de l’équilibre, sans restaurer un état passé.</p>
        <ol>
          <li><strong>0–1 min :</strong> onde plane, vue du dessus. Lire f, v, T et λ ; placer deux crêtes pour mesurer leur distance.</li>
          <li><strong>1–2 min :</strong> fente étroite, puis large. Comparer a/λ = 0,5 et 4 depuis le même départ.</li>
          <li><strong>2–3 min :</strong> activer Huygens. Expliquer les ondelettes virtuelles puis revenir au champ calculé.</li>
          <li><strong>3–4 min :</strong> double fente ou deux sources. Comparer l’élongation et l’amplitude après établissement du régime.</li>
          <li><strong>4–5 min :</strong> lire une sonde et les résultats de validation. Expliquer une limite du modèle avant d’exporter une capture.</li>
        </ol>
      </section>
    </article>
  );
}
