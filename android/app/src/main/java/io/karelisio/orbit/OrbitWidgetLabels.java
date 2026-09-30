package io.karelisio.orbit;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Libellés relatifs des widgets (« Demain à 10:00 », « Hier »...), recalculés
 * à chaque rendu à partir des dates absolues poussées par l'app — mêmes
 * formulations que src/lib/widgetLabels.ts, à garder alignées. Avant, l'app
 * les calculait au moment de la synchro et le widget les affichait tels
 * quels : « Dentiste — Demain à 10:00 » restait affiché le lendemain à 11 h
 * tant que l'app n'était pas rouverte (le rafraîchissement toutes les 30 min
 * ne faisait que réafficher le même texte).
 */
final class OrbitWidgetLabels {

    private static final long DAY_MS = 24L * 60 * 60 * 1000;

    private OrbitWidgetLabels() {}

    /** Prochain événement retenu pour le widget : son titre et son libellé relatif. */
    static final class NextEvent {
        final String title;
        final String timeLabel;

        NextEvent(String title, String timeLabel) {
            this.title = title;
            this.timeLabel = timeLabel;
        }
    }

    /**
     * Première occurrence pas encore passée parmi celles poussées par l'app
     * (JSON `[{"t", "s", "a"}]`, voir OrbitWidgetPrefs.KEY_NEXT_EVENTS_JSON),
     * ou null s'il n'y en a plus. Même règle que isOccurrenceUpcoming côté
     * app : une journée entière reste à venir jusqu'au soir, un événement
     * horaire jusqu'à son heure de début.
     */
    static NextEvent firstUpcoming(String json, long nowMs) throws JSONException {
        JSONArray events = new JSONArray(json);
        for (int i = 0; i < events.length(); i++) {
            JSONObject event = events.optJSONObject(i);
            if (event == null) continue;
            long startMs = event.optLong("s", 0L);
            boolean allDay = event.optBoolean("a", false);
            long endMs = allDay ? endOfDay(startMs) : startMs;
            if (endMs < nowMs) continue;
            return new NextEvent(event.optString("t", ""), eventTimeLabel(startMs, allDay, nowMs));
        }
        return null;
    }

    /** « Aujourd'hui à 10:00 », « Demain », « Dans 3 j à 18:30 », « 12 oct. »... */
    static String eventTimeLabel(long startMs, boolean allDay, long nowMs) {
        int days = calendarDaysBetween(nowMs, startMs);
        String time = allDay ? "" : " à " + new SimpleDateFormat("HH:mm", Locale.FRENCH).format(new Date(startMs));
        if (days <= 0) return "Aujourd'hui" + time;
        if (days == 1) return "Demain" + time;
        if (days < 7) return "Dans " + days + " j" + time;
        return new SimpleDateFormat("d MMM", Locale.FRENCH).format(new Date(startMs)) + time;
    }

    /** Symétrique pour une date passée (dernière note du journal) : « Hier », « Il y a 3 j »... */
    static String journalTimeLabel(long createdMs, long nowMs) {
        int days = calendarDaysBetween(createdMs, nowMs);
        if (days <= 0) return "Aujourd'hui";
        if (days == 1) return "Hier";
        if (days < 7) return "Il y a " + days + " j";
        return new SimpleDateFormat("d MMM", Locale.FRENCH).format(new Date(createdMs));
    }

    /**
     * Écart en jours calendaires locaux de `fromMs` à `toMs`, comme
     * differenceInCalendarDays de date-fns (l'arrondi absorbe les journées
     * de 23 h ou 25 h des changements d'heure).
     */
    static int calendarDaysBetween(long fromMs, long toMs) {
        return (int) Math.round((startOfDay(toMs) - startOfDay(fromMs)) / (double) DAY_MS);
    }

    private static long startOfDay(long ms) {
        return atLocalTime(ms, 0, 0, 0, 0);
    }

    /** 23:59:59.999 locale du même jour (pas « début + 24 h » : faux les jours de changement d'heure). */
    private static long endOfDay(long ms) {
        return atLocalTime(ms, 23, 59, 59, 999);
    }

    private static long atLocalTime(long ms, int hour, int minute, int second, int millisecond) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(ms);
        calendar.set(Calendar.HOUR_OF_DAY, hour);
        calendar.set(Calendar.MINUTE, minute);
        calendar.set(Calendar.SECOND, second);
        calendar.set(Calendar.MILLISECOND, millisecond);
        return calendar.getTimeInMillis();
    }
}
