package io.karelisio.orbit;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WallpaperColorPlugin.class);
        registerPlugin(ApkInstallerPlugin.class);
        registerPlugin(WidgetDataPlugin.class);
        super.onCreate(savedInstanceState);
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // Le système réaffiche les barres après une interaction externe
        // (notification, changement d'app...) : on les recache dès que
        // l'app reprend le focus, pour rester réellement plein écran.
        if (hasFocus) hideSystemBars();
    }

    /**
     * Plein écran immersif : masque barre d'état ET barre de navigation.
     * StatusBar.hide() côté JS (main.tsx) ne suffit plus seul sur les
     * versions d'Android récentes qui appliquent l'edge-to-edge par défaut ;
     * on pilote directement WindowInsetsController côté natif. Un balayage
     * depuis le bord fait réapparaître les barres temporairement (comportement
     * standard "immersive", pas de blocage total de l'utilisateur).
     */
    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            controller.hide(WindowInsetsCompat.Type.systemBars());
        }
    }
}
