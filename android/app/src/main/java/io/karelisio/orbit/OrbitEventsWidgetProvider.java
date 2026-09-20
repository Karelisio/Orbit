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
 * Widget "Calendrier" : affiche le prochain événement à venir. Les données
 * sont écrites par WidgetDataPlugin (depuis WidgetSync.tsx) ; ce provider ne
 * fait que les relire et rafraîchir l'affichage.
 */
public class OrbitEventsWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(OrbitWidgetPrefs.NAME, Context.MODE_PRIVATE);
        boolean hasEvent = prefs.getBoolean(OrbitWidgetPrefs.KEY_HAS_EVENT, false);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_events);

        if (!hasEvent) {
            views.setTextViewText(R.id.widget_event_title, "Aucun événement à venir");
            views.setTextViewText(R.id.widget_event_time, "Ouvre Orbit pour en ajouter");
        } else {
            views.setTextViewText(R.id.widget_event_title, prefs.getString(OrbitWidgetPrefs.KEY_EVENT_TITLE, ""));
            views.setTextViewText(R.id.widget_event_time, prefs.getString(OrbitWidgetPrefs.KEY_EVENT_TIME_LABEL, ""));
        }

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
        ComponentName component = new ComponentName(context, OrbitEventsWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) {
            updateWidget(context, manager, id);
        }
    }
}
