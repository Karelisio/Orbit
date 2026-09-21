package io.karelisio.orbit;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Pont JS -> widgets d'écran d'accueil : reçoit le résumé du prochain
 * événement et des tâches en attente (recalculé côté app à chaque
 * changement de données, voir WidgetSync.tsx) et le stocke pour que les
 * AppWidgetProvider puissent l'afficher.
 */
@CapacitorPlugin(name = "WidgetData")
public class WidgetDataPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(OrbitWidgetPrefs.NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        String eventTitle = call.getString("nextEventTitle");
        String eventTimeLabel = call.getString("nextEventTimeLabel");
        if (eventTitle != null) {
            editor.putBoolean(OrbitWidgetPrefs.KEY_HAS_EVENT, true);
            editor.putString(OrbitWidgetPrefs.KEY_EVENT_TITLE, eventTitle);
            editor.putString(OrbitWidgetPrefs.KEY_EVENT_TIME_LABEL, eventTimeLabel != null ? eventTimeLabel : "");
        } else {
            editor.putBoolean(OrbitWidgetPrefs.KEY_HAS_EVENT, false);
        }

        Integer pendingTasksCount = call.getInt("pendingTasksCount");
        editor.putInt(OrbitWidgetPrefs.KEY_PENDING_TASKS_COUNT, pendingTasksCount != null ? pendingTasksCount : 0);

        String nextTaskTitle = call.getString("nextTaskTitle");
        editor.putString(OrbitWidgetPrefs.KEY_NEXT_TASK_TITLE, nextTaskTitle != null ? nextTaskTitle : "");

        String eventsThisMonth = call.getString("eventsThisMonth");
        editor.putString(OrbitWidgetPrefs.KEY_EVENTS_THIS_MONTH, eventsThisMonth != null ? eventsThisMonth : "");

        String periodDaysThisMonth = call.getString("periodDaysThisMonth");
        editor.putString(OrbitWidgetPrefs.KEY_PERIOD_DAYS_THIS_MONTH, periodDaysThisMonth != null ? periodDaysThisMonth : "");

        String journalContent = call.getString("journalContent");
        if (journalContent != null) {
            editor.putBoolean(OrbitWidgetPrefs.KEY_HAS_JOURNAL, true);
            editor.putString(OrbitWidgetPrefs.KEY_JOURNAL_CONTENT, journalContent);
            editor.putString(OrbitWidgetPrefs.KEY_JOURNAL_AUTHOR_LABEL, call.getString("journalAuthorLabel", ""));
            editor.putString(OrbitWidgetPrefs.KEY_JOURNAL_TIME_LABEL, call.getString("journalTimeLabel", ""));
        } else {
            editor.putBoolean(OrbitWidgetPrefs.KEY_HAS_JOURNAL, false);
        }

        putColorIfPresent(call, editor, "primaryColor", OrbitWidgetPrefs.KEY_COLOR_PRIMARY);
        putColorIfPresent(call, editor, "onPrimaryColor", OrbitWidgetPrefs.KEY_COLOR_ON_PRIMARY);
        putColorIfPresent(call, editor, "primaryContainerColor", OrbitWidgetPrefs.KEY_COLOR_PRIMARY_CONTAINER);
        putColorIfPresent(call, editor, "onPrimaryContainerColor", OrbitWidgetPrefs.KEY_COLOR_ON_PRIMARY_CONTAINER);
        putColorIfPresent(call, editor, "onSurfaceColor", OrbitWidgetPrefs.KEY_COLOR_ON_SURFACE);
        putColorIfPresent(call, editor, "onSurfaceVariantColor", OrbitWidgetPrefs.KEY_COLOR_ON_SURFACE_VARIANT);
        putColorIfPresent(call, editor, "tertiaryColor", OrbitWidgetPrefs.KEY_COLOR_TERTIARY);

        editor.apply();

        // Le rendu d'un widget est isolé : il tourne dans le processus de
        // l'app, et une erreur ici (RemoteViews trop lourdes, mémoire...)
        // fermerait l'app entière. Les données sont déjà enregistrées, un
        // widget non rafraîchi se rattrapera au cycle suivant.
        refreshQuietly(context);
        call.resolve();
    }

    private static void refreshQuietly(Context context) {
        try {
            OrbitCalendarWidgetProvider.refreshAll(context);
        } catch (Throwable ignored) {
        }
        try {
            OrbitTasksWidgetProvider.refreshAll(context);
        } catch (Throwable ignored) {
        }
        try {
            OrbitCombinedWidgetProvider.refreshAll(context);
        } catch (Throwable ignored) {
        }
        try {
            OrbitJournalWidgetProvider.refreshAll(context);
        } catch (Throwable ignored) {
        }
    }

    /** Couleur Material You optionnelle (hex "#rrggbb") envoyée depuis le thème JS courant. */
    private void putColorIfPresent(PluginCall call, SharedPreferences.Editor editor, String field, String prefKey) {
        String value = call.getString(field);
        if (value != null) {
            editor.putString(prefKey, value);
        }
    }
}
