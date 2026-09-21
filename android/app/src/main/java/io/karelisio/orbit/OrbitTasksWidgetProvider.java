package io.karelisio.orbit;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * Widget "Tâches" : affiche le nombre de tâches en attente et la prochaine.
 * Les données sont écrites par WidgetDataPlugin (depuis WidgetSync.tsx).
 */
public class OrbitTasksWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            // onUpdate tourne dans le processus de l'app : une erreur de rendu
            // non rattrapée la fermerait entièrement.
            try {
                updateWidget(context, appWidgetManager, appWidgetId);
            } catch (Throwable ignored) {
            }
        }
    }

    static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(OrbitWidgetPrefs.NAME, Context.MODE_PRIVATE);
        int count = prefs.getInt(OrbitWidgetPrefs.KEY_PENDING_TASKS_COUNT, 0);
        String nextTaskTitle = prefs.getString(OrbitWidgetPrefs.KEY_NEXT_TASK_TITLE, "");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_tasks);

        views.setTextViewText(R.id.widget_tasks_count, String.valueOf(count));
        views.setTextViewText(R.id.widget_tasks_label, count <= 1 ? "tâche à faire" : "tâches à faire");
        views.setTextViewText(R.id.widget_tasks_next, count == 0 ? "Tout est fait ✨" : nextTaskTitle);

        OrbitWidgetTheme theme = OrbitWidgetTheme.from(prefs);
        int onPrimaryContainer = theme.color(OrbitWidgetPrefs.KEY_COLOR_ON_PRIMARY_CONTAINER, "#21005D");
        // Choisi à partir de la même donnée que la couleur du texte, jamais
        // par la résolution jour/nuit d'Android : voir OrbitWidgetTheme.isDarkTheme().
        views.setInt(
            R.id.widget_root,
            "setBackgroundResource",
            theme.isDarkTheme() ? R.drawable.widget_background_dark : R.drawable.widget_background_light
        );
        views.setTextColor(R.id.widget_tasks_count, onPrimaryContainer);
        views.setTextColor(R.id.widget_tasks_label, onPrimaryContainer);
        views.setTextColor(R.id.widget_tasks_next, onPrimaryContainer);

        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context, appWidgetId));
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    static PendingIntent openAppIntent(Context context, int appWidgetId) {
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
            context,
            appWidgetId,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, OrbitTasksWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) {
            try {
                updateWidget(context, manager, id);
            } catch (Throwable ignored) {
            }
        }
    }
}
