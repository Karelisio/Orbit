package io.karelisio.orbit;

import android.annotation.SuppressLint;
import android.app.WallpaperColors;
import android.app.WallpaperManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;

import com.google.android.material.color.utilities.Scheme;

/**
 * Recalcule la palette Material You des widgets à partir du fond d'écran
 * courant, côté natif, sans que l'app tourne.
 *
 * Sans ça, la palette n'était produite qu'en JS au lancement de l'app
 * (WidgetSync.tsx -> widgetPalettesFromSeed) : changer de fond d'écran
 * laissait les widgets avec les anciennes couleurs jusqu'à la prochaine
 * ouverture d'Orbit. Les deux moitiés du calcul existaient pourtant déjà
 * côté natif :
 * - la couleur source, lue exactement comme WallpaperColorPlugin le fait
 *   pour l'app (WallpaperManager#getWallpaperColors, sans permission) ;
 * - l'algorithme, dont `com.google.android.material.color.utilities.Scheme`
 *   est le jumeau Java de l'API `Scheme.light/dark` utilisée en JS. Même
 *   couleur source -> mêmes couleurs, donc aucun risque de re-diverger du
 *   thème de l'app (le bug "widget marron" venait d'une AUTRE source de
 *   couleurs, la palette système du constructeur).
 *
 * L'app garde le dernier mot : elle pousse la couleur source retenue et un
 * drapeau disant si celle-ci suit le fond d'écran. Quand la copine a choisi
 * une image de thème, le drapeau est faux et rien n'est recalculé ici.
 */
final class OrbitWidgetPalette {

    private OrbitWidgetPalette() {}

    /**
     * À appeler avant de lire les couleurs d'un widget (voir
     * OrbitWidgetTheme.from). Ne fait rien dans le cas normal : tant que le
     * fond d'écran n'a pas changé, la couleur source lue est identique à
     * celle déjà stockée et on ressort tout de suite.
     *
     * Tout est enveloppé : ce code tourne pendant le rendu d'un widget, donc
     * dans le processus de l'app, où une erreur non rattrapée fermerait
     * Orbit entièrement.
     */
    static void refreshFromWallpaperIfNeeded(Context context, SharedPreferences prefs) {
        try {
            // En dessous d'Android 12, OrbitWidgetTheme sert de toute façon
            // des couleurs statiques : rien à recalculer.
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return;
            if (!prefs.getBoolean(OrbitWidgetPrefs.KEY_SEED_FOLLOWS_WALLPAPER, false)) return;

            String seed = currentWallpaperSeed(context);
            if (seed == null || seed.equals(prefs.getString(OrbitWidgetPrefs.KEY_SEED_COLOR, null))) return;

            store(prefs, seed);
        } catch (Throwable ignored) {
            // palette inchangée : au pire le widget garde les couleurs
            // poussées par l'app au dernier lancement
        }
    }

    /** Même lecture et même format que WallpaperColorPlugin, pour pouvoir comparer les chaînes telles quelles. */
    private static String currentWallpaperSeed(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O_MR1) return null;
        WallpaperColors colors = WallpaperManager.getInstance(context).getWallpaperColors(WallpaperManager.FLAG_SYSTEM);
        if (colors == null) return null;
        return String.format("#%06X", 0xFFFFFF & colors.getPrimaryColor().toArgb());
    }

    /**
     * Écrit les deux variantes (claire et sombre) de la palette dans les
     * mêmes clés que celles poussées par l'app : la prochaine lecture par
     * OrbitWidgetTheme n'a plus rien de spécial à faire.
     */
    @SuppressLint("RestrictedApi")
    private static void store(SharedPreferences prefs, String seed) {
        int argb = 0xFF000000 | Integer.parseInt(seed.substring(1), 16);
        Scheme light = Scheme.light(argb);
        Scheme dark = Scheme.dark(argb);

        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(OrbitWidgetPrefs.KEY_SEED_COLOR, seed);
        putScheme(editor, light, "");
        putScheme(editor, dark, OrbitWidgetPrefs.DARK_SUFFIX);
        editor.apply();
    }

    @SuppressLint("RestrictedApi")
    private static void putScheme(SharedPreferences.Editor editor, Scheme scheme, String suffix) {
        editor.putString(OrbitWidgetPrefs.KEY_COLOR_PRIMARY + suffix, hex(scheme.getPrimary()));
        editor.putString(OrbitWidgetPrefs.KEY_COLOR_ON_PRIMARY + suffix, hex(scheme.getOnPrimary()));
        editor.putString(OrbitWidgetPrefs.KEY_COLOR_PRIMARY_CONTAINER + suffix, hex(scheme.getPrimaryContainer()));
        editor.putString(OrbitWidgetPrefs.KEY_COLOR_ON_PRIMARY_CONTAINER + suffix, hex(scheme.getOnPrimaryContainer()));
        editor.putString(OrbitWidgetPrefs.KEY_COLOR_ON_SURFACE + suffix, hex(scheme.getOnSurface()));
        editor.putString(OrbitWidgetPrefs.KEY_COLOR_ON_SURFACE_VARIANT + suffix, hex(scheme.getOnSurfaceVariant()));
        editor.putString(OrbitWidgetPrefs.KEY_COLOR_TERTIARY + suffix, hex(scheme.getTertiary()));
    }

    private static String hex(int argb) {
        return String.format("#%06X", 0xFFFFFF & argb);
    }
}
