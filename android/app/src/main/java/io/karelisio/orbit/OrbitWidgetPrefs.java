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

    static final String KEY_COLOR_PRIMARY = "color_primary";
    static final String KEY_COLOR_ON_PRIMARY = "color_on_primary";
    static final String KEY_COLOR_ON_PRIMARY_CONTAINER = "color_on_primary_container";
    static final String KEY_COLOR_ON_SURFACE = "color_on_surface";
    static final String KEY_COLOR_ON_SURFACE_VARIANT = "color_on_surface_variant";
    static final String KEY_COLOR_TERTIARY = "color_tertiary";

    /** Préfixe de clé pour le décalage de mois affiché par widget (navigation ‹ ›), par appWidgetId. */
    static final String KEY_CAL_MONTH_OFFSET_PREFIX = "cal_month_offset_";

    private OrbitWidgetPrefs() {}
}
