package io.karelisio.orbit;

import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Expose la palette Material You DYNAMIQUE du système (Android 12+, extraite
 * du fond d'écran par Android lui-même via les tons `system_accent1_x`/
 * `system_neutral2_x`) à la webview.
 *
 * Contrairement à `WallpaperColorPlugin` (une seule couleur source, ensuite
 * recalculée en JS par material-color-utilities), ce plugin renvoie
 * directement les rôles déjà résolus par le système — mêmes valeurs que
 * celles que les widgets lisent en XML (voir res/values-v31,
 * res/values-night-v31, CLAUDE.md "Couleurs système dynamiques") : app et
 * widgets affichent ainsi toujours exactement la même teinte, sans jamais
 * pouvoir diverger.
 */
@CapacitorPlugin(name = "DynamicColor")
public class DynamicColorPlugin extends Plugin {

    @PluginMethod
    public void getColors(PluginCall call) {
        JSObject result = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            result.put("available", true);
            result.put("light", buildPalette(false));
            result.put("dark", buildPalette(true));
        } else {
            result.put("available", false);
        }
        call.resolve(result);
    }

    // Mêmes tons que res/values-v31 et res/values-night-v31/widget_dynamic_colors.xml.
    private JSObject buildPalette(boolean dark) {
        JSObject p = new JSObject();
        if (!dark) {
            p.put("primary", hex(android.R.color.system_accent1_600));
            p.put("onPrimary", hex(android.R.color.system_accent1_0));
            p.put("primaryContainer", hex(android.R.color.system_accent1_100));
            p.put("onPrimaryContainer", hex(android.R.color.system_accent1_900));
            p.put("secondary", hex(android.R.color.system_accent2_600));
            p.put("onSecondary", hex(android.R.color.system_accent2_0));
            p.put("secondaryContainer", hex(android.R.color.system_accent2_100));
            p.put("onSecondaryContainer", hex(android.R.color.system_accent2_900));
            p.put("tertiary", hex(android.R.color.system_accent3_600));
            p.put("background", hex(android.R.color.system_neutral1_10));
            p.put("onBackground", hex(android.R.color.system_neutral1_900));
            p.put("surface", hex(android.R.color.system_neutral1_10));
            p.put("onSurface", hex(android.R.color.system_neutral1_900));
            p.put("surfaceVariant", hex(android.R.color.system_neutral2_100));
            p.put("onSurfaceVariant", hex(android.R.color.system_neutral2_700));
            p.put("outline", hex(android.R.color.system_neutral2_500));
        } else {
            p.put("primary", hex(android.R.color.system_accent1_200));
            p.put("onPrimary", hex(android.R.color.system_accent1_800));
            p.put("primaryContainer", hex(android.R.color.system_accent1_700));
            p.put("onPrimaryContainer", hex(android.R.color.system_accent1_100));
            p.put("secondary", hex(android.R.color.system_accent2_200));
            p.put("onSecondary", hex(android.R.color.system_accent2_800));
            p.put("secondaryContainer", hex(android.R.color.system_accent2_700));
            p.put("onSecondaryContainer", hex(android.R.color.system_accent2_100));
            p.put("tertiary", hex(android.R.color.system_accent3_200));
            p.put("background", hex(android.R.color.system_neutral1_900));
            p.put("onBackground", hex(android.R.color.system_neutral1_100));
            p.put("surface", hex(android.R.color.system_neutral1_900));
            p.put("onSurface", hex(android.R.color.system_neutral1_100));
            p.put("surfaceVariant", hex(android.R.color.system_neutral2_700));
            p.put("onSurfaceVariant", hex(android.R.color.system_neutral2_200));
            p.put("outline", hex(android.R.color.system_neutral2_400));
        }
        return p;
    }

    private String hex(int resId) {
        int color = ContextCompat.getColor(getContext(), resId);
        return String.format("#%06X", 0xFFFFFF & color);
    }
}
