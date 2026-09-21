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
 * Widget "Journal" : affiche la dernière note du journal du couple. Les
 * données sont écrites par WidgetDataPlugin (depuis WidgetSync.tsx).
 */
public class OrbitJournalWidgetProvider extends AppWidgetProvider {

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
        boolean hasJournal = prefs.getBoolean(OrbitWidgetPrefs.KEY_HAS_JOURNAL, false);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_journal);

        if (!hasJournal) {
            views.setTextViewText(R.id.widget_journal_content, "Aucune note pour l'instant");
            views.setTextViewText(R.id.widget_journal_footer, "");
        } else {
            String content = prefs.getString(OrbitWidgetPrefs.KEY_JOURNAL_CONTENT, "");
            String author = prefs.getString(OrbitWidgetPrefs.KEY_JOURNAL_AUTHOR_LABEL, "");
            String time = prefs.getString(OrbitWidgetPrefs.KEY_JOURNAL_TIME_LABEL, "");
            views.setTextViewText(R.id.widget_journal_content, content);
            views.setTextViewText(R.id.widget_journal_footer, author.isEmpty() ? time : author + " · " + time);
        }

        OrbitWidgetTheme theme = OrbitWidgetTheme.from(prefs);
        int onPrimaryContainer = theme.color(OrbitWidgetPrefs.KEY_COLOR_ON_PRIMARY_CONTAINER, "#21005D");
        int onSurfaceVariant = theme.color(OrbitWidgetPrefs.KEY_COLOR_ON_SURFACE_VARIANT, "#79747E");
        // Le fond en dégradé vient des ressources (drawable-v31/widget_background.xml) :
        // pas de teinte ici, elle aplatirait le dégradé (voir ce fichier).
        views.setTextColor(R.id.widget_journal_title, onPrimaryContainer);
        views.setTextColor(R.id.widget_journal_content, onPrimaryContainer);
        views.setTextColor(R.id.widget_journal_footer, onSurfaceVariant);

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
        ComponentName component = new ComponentName(context, OrbitJournalWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) {
            try {
                updateWidget(context, manager, id);
            } catch (Throwable ignored) {
            }
        }
    }
}
