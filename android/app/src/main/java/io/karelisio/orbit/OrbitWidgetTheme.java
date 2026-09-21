package io.karelisio.orbit;

import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Build;
import android.widget.RemoteViews;

/**
 * Couleurs Material You des widgets, poussées par l'app (voir WidgetSync.tsx).
 *
 * Le fond de la tuile est construit en deux couches par applyTileBackground()
 * à partir de cette même palette, pour qu'il suive exactement les couleurs de
 * l'app. Les couleurs de texte, elles, ne sont dynamiques qu'à partir
 * d'Android 12 (RemoteViews.setColorStateList) ; en dessous on garde les
 * couleurs statiques d'origine, assorties au fond clair statique.
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

    /** Couleur de la palette de l'app, ou la couleur statique d'origine si on ne peut pas teinter le fond. */
    int color(String prefKey, String staticFallback) {
        if (!dynamic) return parseColorOr(staticFallback, staticFallback);
        return parseColorOr(prefs.getString(prefKey, null), staticFallback);
    }

    /** Teinte le fond d'une vue (pastille du jour, pastille d'événement, quadrillage...). */
    void tintBackground(RemoteViews views, int viewId, int color) {
        // setColorStateList n'existe qu'à partir d'Android 12 (API 31) ; en
        // dessous, on garde les couleurs statiques des drawables.
        if (!dynamic) return;
        views.setColorStateList(viewId, "setBackgroundTintList", ColorStateList.valueOf(color));
    }

    /**
     * Pose le fond de la tuile sur une ImageView dédiée, en deux couches :
     * une base unie teintée avec le primary-container de l'app, et un voile
     * en dégradé posé dessus en image pour retrouver le dégradé du fond de
     * l'app. Deux couches sont nécessaires parce qu'un dégradé ne peut pas
     * être teinté (le tint l'aplatirait en une couleur unie) — or la couleur
     * doit venir de l'app : la palette système Android
     * (@android:color/system_accent1_*), utilisée jusqu'ici, suit le thème du
     * constructeur et pouvait diverger visiblement de la palette que l'app
     * tire du fond d'écran.
     *
     * L'ImageView doit être une vue dédiée, jamais celle qui porte un clic :
     * mélanger fond et clic sur la même vue a déjà fait perdre le clic précis
     * sur un jour du widget calendrier sur au moins un lanceur.
     */
    void applyTileBackground(RemoteViews views, int viewId) {
        views.setInt(viewId, "setBackgroundResource", R.drawable.widget_background_solid);
        tintBackground(views, viewId, color(OrbitWidgetPrefs.KEY_COLOR_PRIMARY_CONTAINER, "#EADDFF"));
        views.setImageViewResource(viewId, isDarkTheme() ? R.drawable.widget_sheen_dark : R.drawable.widget_sheen_light);
    }

    /**
     * Clair ou sombre déduit de la MÊME donnée que la couleur du texte, jamais
     * de la résolution jour/nuit d'Android : le thème système du téléphone peut
     * différer du thème choisi dans l'app (Réglages > Thème), et c'est ce
     * dernier qui colore le texte. On lit donc la luminance de onSurfaceColor
     * (déjà utilisée pour le texte) : claire = thème sombre.
     */
    boolean isDarkTheme() {
        if (!dynamic) return false;
        int onSurface = color(OrbitWidgetPrefs.KEY_COLOR_ON_SURFACE, "#1C1B1F");
        double luma = (0.299 * Color.red(onSurface) + 0.587 * Color.green(onSurface) + 0.114 * Color.blue(onSurface)) / 255.0;
        return luma > 0.5;
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
