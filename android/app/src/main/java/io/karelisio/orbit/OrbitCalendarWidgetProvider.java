package io.karelisio.orbit;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.text.TextUtils;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Widget "Calendrier" : une vraie mini-grille du mois en cours (comme le
 * widget calendrier natif d'Android), avec le jour du jour surligné et un
 * petit point sous les jours qui ont un événement. Un RemoteViews ne peut
 * pas héberger de vue custom : la grille est dessinée sur un Bitmap (même
 * technique que le widget "Orbite" de Wenn) puis affichée dans un ImageView.
 */
public class OrbitCalendarWidgetProvider extends AppWidgetProvider {

    private static final int BITMAP_W = 320;
    private static final int BITMAP_H = 220;

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(OrbitWidgetPrefs.NAME, Context.MODE_PRIVATE);
        String eventDaysCsv = prefs.getString(OrbitWidgetPrefs.KEY_EVENT_DAYS_THIS_MONTH, "");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar);
        views.setImageViewBitmap(R.id.widget_calendar_image, drawMonthGrid(eventDaysCsv));
        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context, appWidgetId));
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static Set<Integer> parseDays(String csv) {
        Set<Integer> days = new HashSet<>();
        if (TextUtils.isEmpty(csv)) return days;
        for (String part : csv.split(",")) {
            try {
                days.add(Integer.parseInt(part.trim()));
            } catch (NumberFormatException ignored) {
                // valeur invalide : on l'ignore simplement
            }
        }
        return days;
    }

    private static Bitmap drawMonthGrid(String eventDaysCsv) {
        Set<Integer> eventDays = parseDays(eventDaysCsv);
        Bitmap bitmap = Bitmap.createBitmap(BITMAP_W, BITMAP_H, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        Calendar today = Calendar.getInstance();
        int todayDay = today.get(Calendar.DAY_OF_MONTH);
        int daysInMonth = today.getActualMaximum(Calendar.DAY_OF_MONTH);

        Calendar firstOfMonth = (Calendar) today.clone();
        firstOfMonth.set(Calendar.DAY_OF_MONTH, 1);
        // Calendar.DAY_OF_WEEK : dimanche=1..samedi=7 ; on veut lundi=0..dimanche=6.
        int firstWeekday = (firstOfMonth.get(Calendar.DAY_OF_WEEK) + 5) % 7;

        float headerHeight = BITMAP_H * 0.17f;
        float weekdayRowHeight = BITMAP_H * 0.15f;
        float gridTop = headerHeight + weekdayRowHeight;
        float gridHeight = BITMAP_H - gridTop;
        int rows = (int) Math.ceil((firstWeekday + daysInMonth) / 7.0);
        float cellW = BITMAP_W / 7f;
        float cellH = gridHeight / rows;

        Paint headerPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        headerPaint.setColor(Color.parseColor("#21005D"));
        headerPaint.setTextSize(BITMAP_H * 0.12f);
        headerPaint.setFakeBoldText(true);
        headerPaint.setTextAlign(Paint.Align.CENTER);
        String monthLabel = new SimpleDateFormat("MMMM yyyy", Locale.FRENCH).format(today.getTime());
        monthLabel = monthLabel.substring(0, 1).toUpperCase(Locale.FRENCH) + monthLabel.substring(1);
        canvas.drawText(monthLabel, BITMAP_W / 2f, headerHeight * 0.7f, headerPaint);

        Paint weekdayPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        weekdayPaint.setColor(Color.parseColor("#79747E"));
        weekdayPaint.setTextSize(BITMAP_H * 0.09f);
        weekdayPaint.setTextAlign(Paint.Align.CENTER);
        String[] weekdays = {"L", "M", "M", "J", "V", "S", "D"};
        for (int i = 0; i < 7; i++) {
            canvas.drawText(weekdays[i], cellW * i + cellW / 2f, headerHeight + weekdayRowHeight * 0.75f, weekdayPaint);
        }

        Paint dayPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        dayPaint.setColor(Color.parseColor("#1C1B1F"));
        dayPaint.setTextSize(BITMAP_H * 0.1f);
        dayPaint.setTextAlign(Paint.Align.CENTER);

        Paint todayCirclePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        todayCirclePaint.setColor(Color.parseColor("#6750A4"));
        todayCirclePaint.setStyle(Paint.Style.FILL);

        Paint todayTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        todayTextPaint.setColor(Color.WHITE);
        todayTextPaint.setTextSize(BITMAP_H * 0.1f);
        todayTextPaint.setFakeBoldText(true);
        todayTextPaint.setTextAlign(Paint.Align.CENTER);

        Paint eventDotPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        eventDotPaint.setColor(Color.parseColor("#7D5260"));
        eventDotPaint.setStyle(Paint.Style.FILL);

        for (int day = 1; day <= daysInMonth; day++) {
            int cellIndex = firstWeekday + day - 1;
            int col = cellIndex % 7;
            int row = cellIndex / 7;
            float cx = cellW * col + cellW / 2f;
            float cy = gridTop + cellH * row + cellH / 2f;

            boolean isToday = day == todayDay;
            if (isToday) {
                canvas.drawCircle(cx, cy, Math.min(cellW, cellH) * 0.36f, todayCirclePaint);
                canvas.drawText(String.valueOf(day), cx, cy + BITMAP_H * 0.035f, todayTextPaint);
            } else {
                canvas.drawText(String.valueOf(day), cx, cy + BITMAP_H * 0.035f, dayPaint);
            }

            if (eventDays.contains(day)) {
                canvas.drawCircle(cx, cy + cellH * 0.32f, BITMAP_H * 0.018f, eventDotPaint);
            }
        }

        return bitmap;
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
            updateWidget(context, manager, id);
        }
    }
}
