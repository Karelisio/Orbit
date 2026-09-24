package io.karelisio.orbit;

import android.appwidget.AppWidgetManager;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.widget.RemoteViews;

/**
 * Couleurs des widgets.
 *
 * Cas normal (la teinte suit le fond d'écran, `KEY_SEED_FOLLOWS_WALLPAPER`) :
 * cette classe **ne fait rien** — chaque layout XML de widget déclare déjà
 * `android:textColor`/`android:backgroundTint` par défaut vers
 * `@color/widget_dyn_*`, qui pointent sur les couleurs système dynamiques
 * (`@android:color/system_accent1_*` etc., Android 12+, variantes
 * `values-v31`/`values-night-v31`, voir CLAUDE.md). C'est Android/le lanceur
 * qui résout et repeint ces couleurs, y compris sans qu'Orbit tourne — la
 * limite d'avant (recalcul possible seulement au lancement de l'app, ou par
 * un recalcul natif coûteux à chaque rendu) n'existe plus, plus aucun code
 * n'est nécessaire.
 *
 * Seul cas où cette classe agit : une image de thème choisie dans l'app
 * (`KEY_SEED_FOLLOWS_WALLPAPER` faux). La palette alors poussée par
 * WidgetSync.tsx (deux variantes claire/sombre, `OrbitWidgetPrefs.DARK_SUFFIX`)
 * est appliquée par-dessus le défaut XML via `RemoteViews.setColorInt`/
 * `setColorStateList` (Android 12+ ; en dessous, la teinte système
 * n'existant pas non plus, ce sont de toute façon les couleurs statiques de
 * repli qui s'appliquent).
 */
final class OrbitWidgetTheme {

    private final SharedPreferences prefs;
    private final boolean dynamic;

    private OrbitWidgetTheme(SharedPreferences prefs, boolean dynamic) {
        this.prefs = prefs;
        this.dynamic = dynamic;
    }

    static OrbitWidgetTheme from(SharedPreferences prefs) {
        return new OrbitWidgetTheme(prefs, Build.VERSION.SDK_INT >= Build.VERSION_CODES.S);
    }

    /**
     * Vrai quand le défaut XML (couleurs système dynamiques) doit rester tel
     * quel, sans qu'aucune couleur ne soit appliquée par-dessus depuis ici.
     */
    private boolean usingDynamicColor() {
        return dynamic && prefs.getBoolean(OrbitWidgetPrefs.KEY_SEED_FOLLOWS_WALLPAPER, true);
    }

    /** Variante claire d'une couleur de la palette (ou la couleur statique d'origine). */
    private int color(String prefKey, String lightFallback) {
        if (!dynamic) return parseColorOr(lightFallback, lightFallback);
        return parseColorOr(prefs.getString(prefKey, null), lightFallback);
    }

    /** Variante sombre de la même couleur. */
    private int darkColor(String prefKey, String darkFallback) {
        return parseColorOr(prefs.getString(prefKey + OrbitWidgetPrefs.DARK_SUFFIX, null), darkFallback);
    }

    // Rôles Material 3 utilisés par les widgets. Les replis en dur sont les
    // couleurs de base M3 : ils ne servent qu'avant le premier lancement de
    // l'app (ou en dessous d'Android 12), le temps qu'elle pousse sa palette.

    void textOnPrimaryContainer(RemoteViews views, int viewId) {
        setTextColor(views, viewId, OrbitWidgetPrefs.KEY_COLOR_ON_PRIMARY_CONTAINER, "#21005D", "#EADDFF");
    }

    void textOnSurface(RemoteViews views, int viewId) {
        setTextColor(views, viewId, OrbitWidgetPrefs.KEY_COLOR_ON_SURFACE, "#1C1B1F", "#E6E1E5");
    }

    void textOnSurfaceVariant(RemoteViews views, int viewId) {
        setTextColor(views, viewId, OrbitWidgetPrefs.KEY_COLOR_ON_SURFACE_VARIANT, "#79747E", "#CAC4D0");
    }

    void textOnPrimary(RemoteViews views, int viewId) {
        setTextColor(views, viewId, OrbitWidgetPrefs.KEY_COLOR_ON_PRIMARY, "#FFFFFF", "#381E72");
    }

    void tintPrimary(RemoteViews views, int viewId) {
        tintFromPalette(views, viewId, OrbitWidgetPrefs.KEY_COLOR_PRIMARY, "#6750A4", "#D0BCFF");
    }

    void tintOnSurfaceVariant(RemoteViews views, int viewId) {
        tintFromPalette(views, viewId, OrbitWidgetPrefs.KEY_COLOR_ON_SURFACE_VARIANT, "#79747E", "#CAC4D0");
    }

    /**
     * Couleur de texte, dans ses deux variantes : Android choisit selon le
     * mode nuit. Ne fait rien si la teinte suit le fond d'écran : le défaut
     * XML (couleur système dynamique) est déjà correct et se réajuste seul.
     */
    private void setTextColor(RemoteViews views, int viewId, String prefKey, String lightFallback, String darkFallback) {
        if (usingDynamicColor()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            views.setColorInt(viewId, "setTextColor", color(prefKey, lightFallback), darkColor(prefKey, darkFallback));
        } else {
            views.setTextColor(viewId, color(prefKey, lightFallback));
        }
    }

    /**
     * Teinte le fond d'une vue avec une couleur de la palette, dans ses deux
     * variantes. Même repli que `setTextColor()` quand la teinte suit le
     * fond d'écran : le `android:backgroundTint` XML par défaut de la vue
     * (couleur système dynamique) reste actif, `setBackgroundResource()`
     * (appelé séparément, ex. `applyTileBackground()`) le réapplique
     * automatiquement à la nouvelle image du drawable.
     */
    private void tintFromPalette(RemoteViews views, int viewId, String prefKey, String lightFallback, String darkFallback) {
        if (usingDynamicColor()) return;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return;
        views.setColorStateList(
            viewId,
            "setBackgroundTintList",
            ColorStateList.valueOf(color(prefKey, lightFallback)),
            ColorStateList.valueOf(darkColor(prefKey, darkFallback))
        );
    }

    /**
     * Teinte le fond d'une vue avec une couleur qui ne dépend pas du thème
     * (pastille d'un événement : sa couleur vient de la personne assignée).
     */
    void tintBackground(RemoteViews views, int viewId, int color) {
        // setColorStateList n'existe qu'à partir d'Android 12 (API 31) ; en
        // dessous, on garde les couleurs statiques des drawables.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return;
        views.setColorStateList(viewId, "setBackgroundTintList", ColorStateList.valueOf(color));
    }

    /**
     * Pose le fond de la tuile sur une ImageView dédiée, en deux couches : une
     * base unie (couleur système dynamique par défaut, voir XML du widget —
     * ou teinte au primary-container de l'app si une image de thème est
     * choisie), et un voile en dégradé posé dessus en image pour retrouver le
     * dégradé du fond de l'app. Deux couches parce qu'un dégradé ne peut pas
     * être teinté — le tint l'aplatirait en une couleur unie.
     *
     * `setBackgroundResource()` est toujours appelé, même quand la teinte
     * suit le fond d'écran : il réapplique automatiquement le
     * `android:backgroundTint` XML déjà posé sur la vue à la nouvelle
     * instance du drawable (comportement standard de `View`), donc n'annule
     * rien du défaut système dynamique.
     *
     * Le voile vient de @drawable/widget_sheen, qui a une variante
     * drawable-night/ : Android la re-résout tout seul au basculement du mode
     * nuit, comme les couleurs ci-dessus.
     *
     * L'ImageView doit être une vue dédiée, jamais celle qui porte un clic :
     * mélanger fond et clic sur la même vue a déjà fait perdre le clic précis
     * sur un jour du widget calendrier sur au moins un lanceur.
     */
    void applyTileBackground(RemoteViews views, int viewId) {
        views.setInt(viewId, "setBackgroundResource", R.drawable.widget_background_solid);
        tintFromPalette(views, viewId, OrbitWidgetPrefs.KEY_COLOR_PRIMARY_CONTAINER, "#EADDFF", "#4F378B");
        views.setImageViewResource(viewId, R.drawable.widget_sheen);
    }

    /**
     * Échelle de police selon la hauteur réellement accordée par le lanceur,
     * par rapport à la hauteur minimale déclarée dans le `_info.xml` du
     * widget (sa taille à 1 ligne). Les tailles de police en dur dans les
     * layouts sont calées pour cette hauteur minimale ; un lanceur qui pose
     * la tuile plus haute (grille plus grossière, ou redimensionnement à la
     * main) laissait jusqu'ici le texte minuscule dans tout cet espace en
     * plus. Ne réduit jamais sous la taille de base, et plafonne pour ne pas
     * déborder sur une tuile démesurément haute.
     */
    static float heightScale(AppWidgetManager manager, int appWidgetId, int baselineHeightDp) {
        Bundle options = manager.getAppWidgetOptions(appWidgetId);
        int grantedDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, baselineHeightDp);
        if (grantedDp <= baselineHeightDp) return 1f;
        return Math.min(grantedDp / (float) baselineHeightDp, 1.6f);
    }

    /** Applique l'échelle de `heightScale()` à la taille de base (en sp) d'un texte. */
    void scaleText(RemoteViews views, int viewId, float baseSp, float scale) {
        views.setTextViewTextSize(viewId, TypedValue.COMPLEX_UNIT_SP, baseSp * scale);
    }

    /**
     * Facteur manuel choisi dans Réglages > Widgets (Petite/Normale/Grande),
     * à composer avec `heightScale()` plutôt qu'à sa place : l'ajustement
     * automatique corrige la hauteur réelle accordée par le lanceur, celui-ci
     * laisse le dernier mot à l'utilisatrice quand un lanceur donné ne
     * convient toujours pas (ex. Smart Launcher, tuile jugée trop grande
     * malgré l'auto-ajustement). 1 par défaut si jamais poussé par l'app.
     */
    float userFontScale() {
        return prefs.getFloat(OrbitWidgetPrefs.KEY_FONT_SCALE, 1f);
    }

    /** Parse une couleur "#rrggbb", en retombant sur `fallbackHex` si elle est absente ou invalide. */
    static int parseColorOr(String hex, String fallbackHex) {
        try {
            return Color.parseColor(hex != null ? hex : fallbackHex);
        } catch (IllegalArgumentException e) {
            return Color.parseColor(fallbackHex);
        }
    }
}
