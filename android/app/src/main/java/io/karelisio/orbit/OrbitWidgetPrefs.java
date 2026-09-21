package io.karelisio.orbit;

/** Clés SharedPreferences partagées entre WidgetDataPlugin et les AppWidgetProvider. */
final class OrbitWidgetPrefs {
    static final String NAME = "OrbitWidgetPrefs";
    static final String KEY_HAS_EVENT = "has_event";
    static final String KEY_EVENT_TITLE = "event_title";
    static final String KEY_EVENT_TIME_LABEL = "event_time_label";
    static final String KEY_PENDING_TASKS_COUNT = "pending_tasks_count";
    static final String KEY_NEXT_TASK_TITLE = "next_task_title";
    /** "jour:titre:couleurHexSansDièse;..." pour le mois en cours (un seul événement par jour). */
    static final String KEY_EVENTS_THIS_MONTH = "events_this_month";
    /** "jour;jour;..." des jours de règles (Wenn) du mois en cours, désactivable dans Réglages. */
    static final String KEY_PERIOD_DAYS_THIS_MONTH = "period_days_this_month";

    static final String KEY_HAS_JOURNAL = "has_journal";
    static final String KEY_JOURNAL_CONTENT = "journal_content";
    static final String KEY_JOURNAL_AUTHOR_LABEL = "journal_author_label";
    static final String KEY_JOURNAL_TIME_LABEL = "journal_time_label";

    static final String KEY_COLOR_PRIMARY = "color_primary";
    static final String KEY_COLOR_ON_PRIMARY = "color_on_primary";
    static final String KEY_COLOR_PRIMARY_CONTAINER = "color_primary_container";
    static final String KEY_COLOR_ON_PRIMARY_CONTAINER = "color_on_primary_container";
    static final String KEY_COLOR_ON_SURFACE = "color_on_surface";
    static final String KEY_COLOR_ON_SURFACE_VARIANT = "color_on_surface_variant";
    static final String KEY_COLOR_TERTIARY = "color_tertiary";

    /** Préfixe de clé pour le décalage de mois affiché par widget (navigation ‹ ›), par appWidgetId. */
    static final String KEY_CAL_MONTH_OFFSET_PREFIX = "cal_month_offset_";

    private OrbitWidgetPrefs() {}
}
