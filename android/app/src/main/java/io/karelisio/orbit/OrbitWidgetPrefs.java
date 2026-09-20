package io.karelisio.orbit;

/** Clés SharedPreferences partagées entre WidgetDataPlugin et les AppWidgetProvider. */
final class OrbitWidgetPrefs {
    static final String NAME = "OrbitWidgetPrefs";
    static final String KEY_HAS_EVENT = "has_event";
    static final String KEY_EVENT_TITLE = "event_title";
    static final String KEY_EVENT_TIME_LABEL = "event_time_label";
    static final String KEY_PENDING_TASKS_COUNT = "pending_tasks_count";
    static final String KEY_NEXT_TASK_TITLE = "next_task_title";
    static final String KEY_EVENT_DAYS_THIS_MONTH = "event_days_this_month";

    private OrbitWidgetPrefs() {}
}
