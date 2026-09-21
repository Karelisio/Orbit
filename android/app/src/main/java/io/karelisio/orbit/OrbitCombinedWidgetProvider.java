package io.karelisio.orbit;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

/**
 * Widget "Fusion" : calendrier + tâches + journal dans un seul widget, pour
 * qui ne veut placer qu'une seule tuile sur son écran d'accueil.
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

        boolean hasJournal = prefs.getBoolean(OrbitWidgetPrefs.KEY_HAS_JOURNAL, false);
        views.setViewVisibility(R.id.widget_combined_journal, hasJournal ? View.VISIBLE : View.GONE);
        if (hasJournal) {
            String journalContent = prefs.getString(OrbitWidgetPrefs.KEY_JOURNAL_CONTENT, "");
            views.setTextViewText(R.id.widget_combined_journal, "📝 " + journalContent);
        }

        OrbitWidgetTheme theme = OrbitWidgetTheme.from(prefs);
        theme.applyTileBackground(views, R.id.widget_bg);
        theme.textOnPrimaryContainer(views, R.id.widget_combined_event);
        theme.textOnPrimaryContainer(views, R.id.widget_combined_tasks);
        theme.textOnPrimaryContainer(views, R.id.widget_combined_journal);

        // minHeight de widget_combined_info.xml : la police grandit avec la
        // tuile si le lanceur en accorde plus que ce minimum.
        float scale = OrbitWidgetTheme.heightScale(appWidgetManager, appWidgetId, 40);
        theme.scaleText(views, R.id.widget_combined_event, 12f, scale);
        theme.scaleText(views, R.id.widget_combined_tasks, 12f, scale);
        theme.scaleText(views, R.id.widget_combined_journal, 12f, scale);

        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context, appWidgetId));
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onAppWidgetOptionsChanged(
        Context context,
        AppWidgetManager appWidgetManager,
        int appWidgetId,
        Bundle newOptions
    ) {
        // Redimensionnement à la main : la police doit se réajuster tout de
        // suite, pas seulement à la prochaine mise à jour de données.
        try {
            updateWidget(context, appWidgetManager, appWidgetId);
        } catch (Throwable ignored) {
        }
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
