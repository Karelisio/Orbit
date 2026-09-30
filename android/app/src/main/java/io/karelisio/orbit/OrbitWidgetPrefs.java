package io.karelisio.orbit;

/** Clés SharedPreferences partagées entre WidgetDataPlugin et les AppWidgetProvider. */
final class OrbitWidgetPrefs {
    static final String NAME = "OrbitWidgetPrefs";
    static final String KEY_HAS_EVENT = "has_event";
    static final String KEY_EVENT_TITLE = "event_title";
    /** Libellé figé au moment de la synchro : repli seulement, quand KEY_NEXT_EVENTS_JSON est absente. */
    static final String KEY_EVENT_TIME_LABEL = "event_time_label";
    /**
     * JSON `[{"t": titre, "s": début en ms epoch, "a": journée entière}, ...]`
     * des prochaines occurrences, dans l'ordre (voir WidgetSync.tsx) : le
     * widget Fusion prend au rendu la première pas encore passée et recalcule
     * son libellé relatif (OrbitWidgetLabels). Absente tant qu'une version
     * antérieure de l'app a poussé les données : repli sur les deux clés
     * ci-dessus.
     */
    static final String KEY_NEXT_EVENTS_JSON = "next_events_json";
    static final String KEY_PENDING_TASKS_COUNT = "pending_tasks_count";
    static final String KEY_NEXT_TASK_TITLE = "next_task_title";
    /**
     * Facteur manuel de taille de police (Réglages > Widgets), composé avec
     * OrbitWidgetTheme.heightScale() plutôt que de le remplacer : un lanceur
     * peut accorder une hauteur de tuile bien plus généreuse qu'un autre, et
     * aucun calcul automatique ne convient à tout le monde.
     */
    static final String KEY_FONT_SCALE = "font_scale";
    /**
     * "aaaa-mm-jj:titre:couleurHexSansDièse;..." sur une fenêtre de plusieurs
     * mois à venir (voir WidgetSync.tsx) : dates absolues, pas juste un
     * numéro de jour, pour pouvoir couvrir plusieurs mois dans la même
     * chaîne. Le rendu (OrbitCalendarWidgetProvider) ne garde que les
     * entrées du mois affiché.
     */
    static final String KEY_EVENTS_CSV = "events_csv";
    /**
     * "aaaa-mm-jj;aaaa-mm-jj;..." des jours de règles enregistrés dans Wenn,
     * même fenêtre, désactivable dans Réglages (point plein). Poussé par une
     * version antérieure de l'app, il contient aussi les jours prévus.
     */
    static final String KEY_PERIOD_DAYS_CSV = "period_days_csv";
    /** Même format : jours de règles seulement prévus, hors jours enregistrés (simple contour). */
    static final String KEY_PREDICTED_PERIOD_DAYS_CSV = "predicted_period_days_csv";
    /** "aaaa-mm-jj;aaaa-mm-jj;..." des jours ayant au moins une tâche en attente, même fenêtre. */
    static final String KEY_TASK_DAYS_CSV = "task_days_csv";

    static final String KEY_HAS_JOURNAL = "has_journal";
    static final String KEY_JOURNAL_CONTENT = "journal_content";
    static final String KEY_JOURNAL_AUTHOR_LABEL = "journal_author_label";
    /** Libellé figé au moment de la synchro : repli seulement, quand KEY_JOURNAL_CREATED_AT est absente. */
    static final String KEY_JOURNAL_TIME_LABEL = "journal_time_label";
    /** Date de la dernière note, ms epoch en chaîne : « Hier »/« Il y a 3 j » recalculé à chaque rendu. */
    static final String KEY_JOURNAL_CREATED_AT = "journal_created_at";

    /**
     * Suffixe de la variante sombre de chaque couleur de palette ci-dessous :
     * l'app pousse les deux variantes d'un coup, et c'est Android qui choisit
     * selon le mode nuit du lanceur (voir OrbitWidgetTheme). Sans les deux, un
     * widget resterait figé dans le mode actif au dernier lancement de l'app.
     */
    static final String DARK_SUFFIX = "_dark";

    static final String KEY_COLOR_PRIMARY = "color_primary";
    static final String KEY_COLOR_ON_PRIMARY = "color_on_primary";
    static final String KEY_COLOR_PRIMARY_CONTAINER = "color_primary_container";
    static final String KEY_COLOR_ON_PRIMARY_CONTAINER = "color_on_primary_container";
    static final String KEY_COLOR_ON_SURFACE = "color_on_surface";
    static final String KEY_COLOR_ON_SURFACE_VARIANT = "color_on_surface_variant";
    static final String KEY_COLOR_TERTIARY = "color_tertiary";

    /**
     * Vrai sauf quand la copine a choisi une image de thème dans l'app. Dans
     * ce cas seulement, OrbitWidgetTheme applique la palette ci-dessus
     * (poussée par l'app) par-dessus les couleurs système dynamiques
     * déclarées par défaut dans les layouts XML des widgets (voir
     * CLAUDE.md — "Couleurs système dynamiques"). Sinon les couleurs
     * système suivent le fond d'écran d'elles-mêmes, sans le moindre code :
     * c'est Android/le lanceur qui repeint, pas Orbit.
     */
    static final String KEY_SEED_FOLLOWS_WALLPAPER = "seed_follows_wallpaper";

    /** Préfixe de clé pour le décalage de mois affiché par widget (navigation ‹ ›), par appWidgetId. */
    static final String KEY_CAL_MONTH_OFFSET_PREFIX = "cal_month_offset_";

    private OrbitWidgetPrefs() {}
}
