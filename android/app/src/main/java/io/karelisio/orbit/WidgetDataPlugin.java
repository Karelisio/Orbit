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

        String eventDaysThisMonth = call.getString("eventDaysThisMonth");
        editor.putString(OrbitWidgetPrefs.KEY_EVENT_DAYS_THIS_MONTH, eventDaysThisMonth != null ? eventDaysThisMonth : "");

        editor.apply();

        OrbitCalendarWidgetProvider.refreshAll(context);
        OrbitTasksWidgetProvider.refreshAll(context);
        OrbitCombinedWidgetProvider.refreshAll(context);
        call.resolve();
    }
}
