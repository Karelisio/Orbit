package io.karelisio.orbit;

import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Build;
import android.widget.RemoteViews;

/**
 * Couleurs Material You des widgets, poussées par l'app (voir WidgetSync.tsx).
 *
 * Le fond de la tuile vient d'un drawable : il n'est teintable qu'à partir
 * d'Android 12 (RemoteViews.setColorStateList). Tant qu'on ne peut pas le
 * teinter, on garde aussi les couleurs de texte statiques d'origine : sinon,
 * en thème sombre, du texte clair se retrouvait sur le fond clair figé de la
 * tuile, donc illisible. Fond et texte viennent ainsi toujours de la même
 * palette, cohérents en clair comme en sombre.
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
        if (!dynamic) return parse(staticFallback, staticFallback);
        return parse(prefs.getString(prefKey, null), staticFallback);
    }

    /** Accorde le fond de la tuile aux couleurs de texte (Android 12+ uniquement). */
    void applyBackground(RemoteViews views, int rootViewId) {
        // setColorStateList n'existe qu'à partir d'Android 12 (API 31) ; en
        // dessous, `dynamic` est false et on n'arrive jamais ici.
        if (!dynamic) return;
        int container = color(OrbitWidgetPrefs.KEY_COLOR_PRIMARY_CONTAINER, "#EADDFF");
        views.setColorStateList(rootViewId, "setBackgroundTintList", ColorStateList.valueOf(container));
    }

    private static int parse(String hex, String fallbackHex) {
        try {
            return Color.parseColor(hex != null ? hex : fallbackHex);
        } catch (IllegalArgumentException e) {
            return Color.parseColor(fallbackHex);
        }
    }
}
