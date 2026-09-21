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
 * Widget "Fusion" : calendrier + tâches dans un seul widget, pour qui ne
 * veut placer qu'une seule tuile sur son écran d'accueil.
 */
public class OrbitCombinedWidgetProvider extends AppWidgetProvider {

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
        boolean hasEvent = prefs.getBoolean(OrbitWidgetPrefs.KEY_HAS_EVENT, false);
        int taskCount = prefs.getInt(OrbitWidgetPrefs.KEY_PENDING_TASKS_COUNT, 0);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_combined);

        if (!hasEvent) {
            views.setTextViewText(R.id.widget_combined_event, "📅 Aucun événement à venir");
        } else {
            String title = prefs.getString(OrbitWidgetPrefs.KEY_EVENT_TITLE, "");
            String timeLabel = prefs.getString(OrbitWidgetPrefs.KEY_EVENT_TIME_LABEL, "");
            views.setTextViewText(R.id.widget_combined_event, "📅 " + title + " — " + timeLabel);
        }

        views.setTextViewText(
            R.id.widget_combined_tasks,
            taskCount == 0 ? "✅ Tout est fait" : "✅ " + taskCount + (taskCount == 1 ? " tâche à faire" : " tâches à faire")
        );

        OrbitWidgetTheme theme = OrbitWidgetTheme.from(prefs);
        int onPrimaryContainer = theme.color(OrbitWidgetPrefs.KEY_COLOR_ON_PRIMARY_CONTAINER, "#21005D");
        // Le fond en dégradé vient des ressources (drawable-v31/widget_background.xml) :
        // pas de teinte ici, elle aplatirait le dégradé (voir ce fichier).
        views.setTextColor(R.id.widget_combined_event, onPrimaryContainer);
        views.setTextColor(R.id.widget_combined_tasks, onPrimaryContainer);

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
        ComponentName component = new ComponentName(context, OrbitCombinedWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) {
            try {
                updateWidget(context, manager, id);
            } catch (Throwable ignored) {
            }
        }
    }
}
