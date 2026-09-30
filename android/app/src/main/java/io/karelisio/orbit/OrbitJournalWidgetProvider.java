package io.karelisio.orbit;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
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
            String time = journalTimeLabel(prefs);
            views.setTextViewText(R.id.widget_journal_content, content);
            views.setTextViewText(R.id.widget_journal_footer, author.isEmpty() ? time : author + " · " + time);
        }

        OrbitWidgetTheme theme = OrbitWidgetTheme.from(prefs);
        theme.applyTileBackground(views, R.id.widget_bg);
        theme.textOnPrimaryContainer(views, R.id.widget_journal_title);
        theme.textOnPrimaryContainer(views, R.id.widget_journal_content);
        theme.textOnSurfaceVariant(views, R.id.widget_journal_footer);

        // minHeight de widget_journal_info.xml : la police grandit avec la
        // tuile si le lanceur en accorde plus que ce minimum.
        float scale = OrbitWidgetTheme.heightScale(appWidgetManager, appWidgetId, 40) * theme.userFontScale();
        theme.scaleText(views, R.id.widget_journal_title, 11f, scale);
        theme.scaleText(views, R.id.widget_journal_content, 12f, scale);
        theme.scaleText(views, R.id.widget_journal_footer, 10f, scale);

        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context, appWidgetId));
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    /**
     * « Hier », « Il y a 3 j »... recalculé à chaque rendu depuis la date de
     * la note (OrbitWidgetLabels), au lieu du texte figé au moment de la
     * synchro — gardé en repli pour des données poussées par une version
     * antérieure de l'app.
     */
    private static String journalTimeLabel(SharedPreferences prefs) {
        String createdAt = prefs.getString(OrbitWidgetPrefs.KEY_JOURNAL_CREATED_AT, "");
        if (createdAt != null && !createdAt.isEmpty()) {
            try {
                return OrbitWidgetLabels.journalTimeLabel(Long.parseLong(createdAt), System.currentTimeMillis());
            } catch (NumberFormatException ignored) {
                // date illisible : repli sur le texte figé
            }
        }
        return prefs.getString(OrbitWidgetPrefs.KEY_JOURNAL_TIME_LABEL, "");
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
