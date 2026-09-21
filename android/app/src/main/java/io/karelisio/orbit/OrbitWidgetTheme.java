package io.karelisio.orbit;

import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Build;
import android.widget.RemoteViews;

/**
 * Couleurs Material You des widgets, poussées par l'app (voir WidgetSync.tsx).
 *
 * Le fond en dégradé de la tuile vient directement des ressources
 * (drawable-v31/widget_background.xml sur Android 12+, dégradé statique en
 * dessous) et n'est jamais teint ici : teindre un drawable applique UNE
 * seule couleur unie dessus, ce qui aplatirait le dégradé. Les couleurs de
 * texte, elles, ne sont dynamiques (poussées par l'app) qu'à partir
 * d'Android 12 (RemoteViews.setColorStateList) ; en dessous on garde les
 * couleurs statiques d'origine, assorties au dégradé statique du fond.
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

    /** Parse une couleur "#rrggbb", en retombant sur `fallbackHex` si elle est absente ou invalide. */
    static int parseColorOr(String hex, String fallbackHex) {
        try {
            return Color.parseColor(hex != null ? hex : fallbackHex);
        } catch (IllegalArgumentException e) {
            return Color.parseColor(fallbackHex);
        }
    }
}
