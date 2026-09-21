package io.karelisio.orbit;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Widget "Calendrier" : une vraie mini-grille du mois, colorée avec le thème
 * Material You courant de l'app (couleurs poussées par WidgetSync.tsx),
 * navigable mois par mois, avec le titre du premier événement de chaque jour
 * dans une pastille colorée.
 *
 * La grille est construite en vues natives (une cellule par jour, ajoutée via
 * RemoteViews.addView) et non plus dessinée sur un Bitmap : sur un widget
 * agrandi, le bitmap atteignait plusieurs dizaines de Mo, au-delà de la
 * limite autorisée pour un widget — updateAppWidget() levait une exception et
 * la tuile restait vide et non cliquable. Les vues natives restent aussi
 * nettes à n'importe quelle taille, avec un texte de taille constante.
 *
 * Les événements ne sont disponibles que pour le mois réel en cours (calculé
 * côté app) : en naviguant vers un autre mois, la grille reste exacte mais
 * sans pastilles.
 */
public class OrbitCalendarWidgetProvider extends AppWidgetProvider {

    private static final String ACTION_PREV_MONTH = "io.karelisio.orbit.CAL_WIDGET_PREV";
    private static final String ACTION_NEXT_MONTH = "io.karelisio.orbit.CAL_WIDGET_NEXT";

    private static final String[] WEEKDAYS = {"L", "M", "M", "J", "V", "S", "D"};

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

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (!ACTION_PREV_MONTH.equals(action) && !ACTION_NEXT_MONTH.equals(action)) return;

        int appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return;

        SharedPreferences prefs = context.getSharedPreferences(OrbitWidgetPrefs.NAME, Context.MODE_PRIVATE);
        String offsetKey = OrbitWidgetPrefs.KEY_CAL_MONTH_OFFSET_PREFIX + appWidgetId;
        int offset = prefs.getInt(offsetKey, 0) + (ACTION_PREV_MONTH.equals(action) ? -1 : 1);
        prefs.edit().putInt(offsetKey, offset).apply();

        updateWidget(context, AppWidgetManager.getInstance(context), appWidgetId);
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        SharedPreferences.Editor editor = context.getSharedPreferences(OrbitWidgetPrefs.NAME, Context.MODE_PRIVATE).edit();
        for (int id : appWidgetIds) {
            editor.remove(OrbitWidgetPrefs.KEY_CAL_MONTH_OFFSET_PREFIX + id);
        }
        editor.apply();
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, int appWidgetId, Bundle newOptions) {
        updateWidget(context, appWidgetManager, appWidgetId);
    }

    static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            appWidgetManager.updateAppWidget(appWidgetId, buildViews(context, appWidgetId));
        } catch (Throwable e) {
            // Un widget qui n'a pas pu être rendu reste affiché tel quel et,
            // surtout, sans action au clic : on pousse au minimum une tuile
            // qui ouvre l'app plutôt que de laisser une carte morte.
            try {
                RemoteViews fallback = new RemoteViews(context.getPackageName(), R.layout.widget_calendar);
                fallback.setTextViewText(R.id.widget_cal_month, "Orbit");
                fallback.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context, appWidgetId));
                appWidgetManager.updateAppWidget(appWidgetId, fallback);
            } catch (Throwable ignored) {
                // plus rien à tenter
            }
        }
    }

    private static RemoteViews buildViews(Context context, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(OrbitWidgetPrefs.NAME, Context.MODE_PRIVATE);
        String eventsCsv = prefs.getString(OrbitWidgetPrefs.KEY_EVENTS_THIS_MONTH, "");
        String periodDaysCsv = prefs.getString(OrbitWidgetPrefs.KEY_PERIOD_DAYS_THIS_MONTH, "");
        int offset = prefs.getInt(OrbitWidgetPrefs.KEY_CAL_MONTH_OFFSET_PREFIX + appWidgetId, 0);

        OrbitWidgetTheme theme = OrbitWidgetTheme.from(prefs);
        int onPrimaryContainer = theme.color(OrbitWidgetPrefs.KEY_COLOR_ON_PRIMARY_CONTAINER, "#21005D");
        int onSurface = theme.color(OrbitWidgetPrefs.KEY_COLOR_ON_SURFACE, "#1C1B1F");
        int onSurfaceVariant = theme.color(OrbitWidgetPrefs.KEY_COLOR_ON_SURFACE_VARIANT, "#79747E");
        int primary = theme.color(OrbitWidgetPrefs.KEY_COLOR_PRIMARY, "#6750A4");
        int onPrimary = theme.color(OrbitWidgetPrefs.KEY_COLOR_ON_PRIMARY, "#FFFFFF");

        Calendar shownMonth = Calendar.getInstance();
        shownMonth.add(Calendar.MONTH, offset);
        String monthLabel = new SimpleDateFormat("MMMM yyyy", Locale.FRENCH).format(shownMonth.getTime());
        monthLabel = monthLabel.substring(0, 1).toUpperCase(Locale.FRENCH) + monthLabel.substring(1);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar);
        // Choisi à partir de la même donnée que la couleur du texte
        // (onSurfaceColor), jamais par la résolution jour/nuit d'Android :
        // voir OrbitWidgetTheme.isDarkTheme(). Posé sur une ImageView dédiée
        // (widget_cal_background), pas sur widget_root : cette dernière porte
        // aussi le clic plein-tuile ET les cases de jour cliquables, et les
        // deux ne doivent jamais partager la même vue (voir widget_calendar.xml).
        views.setImageViewResource(
            R.id.widget_cal_background,
            theme.isDarkTheme() ? R.drawable.widget_background_dark : R.drawable.widget_background_light
        );

        views.setTextViewText(R.id.widget_cal_month, monthLabel);
        views.setTextColor(R.id.widget_cal_month, onPrimaryContainer);
        views.setTextColor(R.id.widget_cal_prev, onPrimaryContainer);
        views.setTextColor(R.id.widget_cal_next, onPrimaryContainer);

        String todayLabel = new SimpleDateFormat("EEEE d MMMM", Locale.FRENCH).format(Calendar.getInstance().getTime());
        todayLabel = todayLabel.substring(0, 1).toUpperCase(Locale.FRENCH) + todayLabel.substring(1);
        views.setTextViewText(R.id.widget_cal_subtitle, "Aujourd'hui : " + todayLabel);
        views.setTextColor(R.id.widget_cal_subtitle, onSurfaceVariant);
        views.setOnClickPendingIntent(R.id.widget_cal_prev, navIntent(context, appWidgetId, ACTION_PREV_MONTH));
        views.setOnClickPendingIntent(R.id.widget_cal_next, navIntent(context, appWidgetId, ACTION_NEXT_MONTH));
        // Clic sur la tuile entière (et pas seulement sur la grille) : les
        // flèches gardent leur propre action, le reste ouvre l'app.
        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context, appWidgetId));

        views.removeAllViews(R.id.widget_cal_weekdays);
        for (String weekday : WEEKDAYS) {
            RemoteViews label = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_weekday);
            label.setTextViewText(R.id.widget_weekday_label, weekday);
            label.setTextColor(R.id.widget_weekday_label, onSurfaceVariant);
            views.addView(R.id.widget_cal_weekdays, label);
        }

        // Les événements et les jours de règles ne sont calculés côté app que
        // pour le mois réel en cours.
        Map<Integer, List<DayEvent>> events = offset == 0 ? parseEvents(eventsCsv) : new HashMap<>();
        Set<Integer> periodDays = offset == 0 ? parseDayList(periodDaysCsv) : new HashSet<>();

        Calendar today = Calendar.getInstance();
        boolean isCurrentMonth = offset == 0;
        int todayDay = today.get(Calendar.DAY_OF_MONTH);
        int daysInMonth = shownMonth.getActualMaximum(Calendar.DAY_OF_MONTH);

        Calendar firstOfMonth = (Calendar) shownMonth.clone();
        firstOfMonth.set(Calendar.DAY_OF_MONTH, 1);
        // Calendar.DAY_OF_WEEK : dimanche=1..samedi=7 ; on veut lundi=0..dimanche=6.
        int firstWeekday = (firstOfMonth.get(Calendar.DAY_OF_WEEK) + 5) % 7;
        int weekCount = (int) Math.ceil((firstWeekday + daysInMonth) / 7.0);

        views.removeAllViews(R.id.widget_cal_grid);
        for (int week = 0; week < weekCount; week++) {
            RemoteViews weekRow = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_week);

            for (int column = 0; column < 7; column++) {
                int day = week * 7 + column - firstWeekday + 1;
                RemoteViews cell = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_cell);

                if (day < 1 || day > daysInMonth) {
                    cell.setTextViewText(R.id.widget_cell_day, "");
                    weekRow.addView(R.id.widget_cal_week, cell);
                    continue;
                }

                // Quadrillage discret : un contour translucide par case, teinté
                // à la couleur du thème (voir widget_cell_grid.xml).
                cell.setInt(R.id.widget_cell_root, "setBackgroundResource", R.drawable.widget_cell_grid);
                theme.tintBackground(cell, R.id.widget_cell_root, onSurfaceVariant);
                cell.setOnClickPendingIntent(R.id.widget_cell_root, dayIntent(context, appWidgetId, shownMonth, day));

                cell.setTextViewText(R.id.widget_cell_day, String.valueOf(day));
                if (isCurrentMonth && day == todayDay) {
                    cell.setInt(R.id.widget_cell_day, "setBackgroundResource", R.drawable.widget_today_circle);
                    theme.tintBackground(cell, R.id.widget_cell_day, primary);
                    cell.setTextColor(R.id.widget_cell_day, onPrimary);
                } else {
                    cell.setTextColor(R.id.widget_cell_day, onSurface);
                }

                cell.setViewVisibility(R.id.widget_cell_period_dot, periodDays.contains(day) ? View.VISIBLE : View.GONE);

                cell.removeAllViews(R.id.widget_cell_events);
                List<DayEvent> dayEvents = events.get(day);
                if (dayEvents != null) {
                    for (DayEvent event : dayEvents) {
                        RemoteViews chip = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_event_chip);
                        chip.setTextViewText(R.id.widget_cell_event_chip, event.title);
                        theme.tintBackground(chip, R.id.widget_cell_event_chip, event.color);
                        cell.addView(R.id.widget_cell_events, chip);
                    }
                }

                weekRow.addView(R.id.widget_cal_week, cell);
            }

            views.addView(R.id.widget_cal_grid, weekRow);
        }

        return views;
    }

    private static final class DayEvent {
        final String title;
        final int color;

        DayEvent(String title, int color) {
            this.title = title;
            this.color = color;
        }
    }

    /**
     * Format : "jour:titre:couleurHexSansDièse;jour:titre:couleur;..." (voir
     * WidgetSync.tsx). Plusieurs entrées peuvent partager le même jour
     * (jusqu'à 2, plafonnées côté JS) : chacune devient une pastille
     * empilée dans la case.
     */
    private static Map<Integer, List<DayEvent>> parseEvents(String csv) {
        Map<Integer, List<DayEvent>> map = new HashMap<>();
        if (TextUtils.isEmpty(csv)) return map;
        for (String entry : csv.split(";")) {
            String[] fields = entry.split(":", 3);
            if (fields.length < 3) continue;
            try {
                int day = Integer.parseInt(fields[0].trim());
                int color = OrbitWidgetTheme.parseColorOr("#" + fields[2].trim(), "#7D5260");
                map.computeIfAbsent(day, k -> new ArrayList<>()).add(new DayEvent(fields[1], color));
            } catch (NumberFormatException ignored) {
                // entrée invalide : on l'ignore simplement
            }
        }
        return map;
    }

    /** Format : "jour;jour;..." (voir WidgetSync.tsx). */
    private static Set<Integer> parseDayList(String csv) {
        Set<Integer> days = new HashSet<>();
        if (TextUtils.isEmpty(csv)) return days;
        for (String entry : csv.split(";")) {
            try {
                days.add(Integer.parseInt(entry.trim()));
            } catch (NumberFormatException ignored) {
                // entrée invalide : on l'ignore simplement
            }
        }
        return days;
    }

    /** Ouvre l'app directement sur ce jour (voir deepLink.ts : hôte "calendar"). */
    static PendingIntent dayIntent(Context context, int appWidgetId, Calendar shownMonth, int day) {
        Calendar date = (Calendar) shownMonth.clone();
        date.set(Calendar.DAY_OF_MONTH, day);
        String iso = new SimpleDateFormat("yyyy-MM-dd", Locale.FRENCH).format(date.getTime());

        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("io.karelisio.orbit://calendar?date=" + iso), context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int requestCode = appWidgetId * 2000 + date.get(Calendar.YEAR) * 400 + date.get(Calendar.MONTH) * 32 + day;
        return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static PendingIntent navIntent(Context context, int appWidgetId, String action) {
        Intent intent = new Intent(context, OrbitCalendarWidgetProvider.class);
        intent.setAction(action);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        int requestCode = appWidgetId * 10 + (ACTION_PREV_MONTH.equals(action) ? 1 : 2);
        return PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
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
        ComponentName component = new ComponentName(context, OrbitCalendarWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) {
            try {
                updateWidget(context, manager, id);
            } catch (Throwable ignored) {
            }
        }
    }
}
