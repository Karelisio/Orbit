package io.karelisio.orbit;

import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Build;
import android.widget.RemoteViews;

/**
 * Couleurs Material You des widgets, poussées par l'app (voir WidgetSync.tsx).
 *
 * Le fond en dégradé de la tuile vient de ressources statiques
 * (widget_background_light/dark.xml, drawable-v31/ sur Android 12+) et
 * n'est jamais teint : teindre un drawable applique UNE seule couleur unie
 * dessus, ce qui aplatirait le dégradé. Le choix clair/sombre entre ces
 * deux ressources se fait en code (voir isDarkTheme()), à partir de la même
 * donnée que la couleur du texte — jamais via la résolution jour/nuit
 * d'Android, qui suit le thème système et peut différer du thème choisi
 * dans l'app. Les couleurs de texte, elles, ne sont dynamiques (poussées
 * par l'app) qu'à partir d'Android 12 (RemoteViews.setColorStateList) ; en
 * dessous on garde les couleurs statiques d'origine, assorties au fond
 * clair statique.
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
     * Le fond de la tuile (drawable_background_light/dark) doit être choisi
     * avec la MÊME donnée que la couleur du texte, jamais par la résolution
     * jour/nuit d'Android : le thème système du téléphone peut différer du
     * thème choisi dans l'app (Réglages > Thème), et c'est ce dernier qui
     * colore le texte. On déduit donc le fond de la luminance de
     * onSurfaceColor (déjà utilisée pour le texte) : claire = thème sombre.
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
