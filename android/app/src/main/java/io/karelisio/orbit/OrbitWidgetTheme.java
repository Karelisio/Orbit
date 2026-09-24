package io.karelisio.orbit;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.widget.RemoteViews;

/**
 * Couleurs Material You des widgets, poussées par l'app (voir WidgetSync.tsx).
 *
 * L'app pousse la palette en DEUX variantes, claire et sombre (voir
 * OrbitWidgetPrefs.DARK_SUFFIX), et chaque couleur est posée ici avec les deux
 * valeurs à la fois : à partir d'Android 12, RemoteViews sait choisir selon le
 * mode nuit du lanceur, et refait ce choix tout seul quand le téléphone
 * bascule. Un widget suit donc le passage clair/sombre sans que l'app ait
 * besoin de tourner — avant, il restait figé sur le mode actif au dernier
 * lancement de l'app, parfois pendant des heures.
 *
 * C'est donc le mode nuit du LANCEUR qui tranche, et non le thème choisi dans
 * Orbit (Réglages > Thème) : fond, texte et pastilles viennent tous de cette
 * même décision, donc restent toujours cohérents entre eux — c'est ce qui
 * compte, un widget mi-clair mi-sombre étant illisible. En dessous
 * d'Android 12, rien de tout cela n'existe : on garde les couleurs statiques
 * d'origine, assorties au fond clair statique.
 *
 * La teinte (couleur source) vient toujours de l'app, elle : la palette
 * système d'Android (@android:color/system_accent1_*) suit le thème du
 * constructeur et pouvait diverger visiblement de celle qu'Orbit tire du fond
 * d'écran. Changer de fond d'écran reste le seul cas qui demande d'ouvrir
 * l'app une fois, le temps qu'elle recalcule la palette.
 */
final class OrbitWidgetTheme {

    private final SharedPreferences prefs;
    private final boolean dynamic;

    private OrbitWidgetTheme(SharedPreferences prefs, boolean dynamic) {
        this.prefs = prefs;
        this.dynamic = dynamic;
    }

    static OrbitWidgetTheme from(Context context, SharedPreferences prefs) {
        // Rattrape un changement de fond d'écran survenu pendant que l'app
        // était fermée : sans ça, la palette ne serait recalculée qu'au
        // prochain lancement d'Orbit (voir OrbitWidgetPalette).
        OrbitWidgetPalette.refreshFromWallpaperIfNeeded(context, prefs);
        return new OrbitWidgetTheme(prefs, Build.VERSION.SDK_INT >= Build.VERSION_CODES.S);
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

    /** Couleur de texte, dans ses deux variantes : Android choisit selon le mode nuit. */
    private void setTextColor(RemoteViews views, int viewId, String prefKey, String lightFallback, String darkFallback) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            views.setColorInt(viewId, "setTextColor", color(prefKey, lightFallback), darkColor(prefKey, darkFallback));
        } else {
            views.setTextColor(viewId, color(prefKey, lightFallback));
        }
    }

    /** Teinte le fond d'une vue avec une couleur de la palette, dans ses deux variantes. */
    private void tintFromPalette(RemoteViews views, int viewId, String prefKey, String lightFallback, String darkFallback) {
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
     * base unie teintée au primary-container de l'app, et un voile en dégradé
     * posé dessus en image pour retrouver le dégradé du fond de l'app. Deux
     * couches parce qu'un dégradé ne peut pas être teinté — le tint
     * l'aplatirait en une couleur unie — alors que la couleur, elle, doit
     * venir de l'app.
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
