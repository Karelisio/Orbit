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
import android.text.TextPaint;
import android.text.TextUtils;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Widget "Calendrier" : une vraie mini-grille du mois (comme le widget
 * calendrier natif d'Android), colorée dynamiquement avec le thème Material
 * You courant de l'app (couleurs poussées par WidgetSync.tsx), navigable
 * mois par mois (flèches natives), avec le titre du premier événement de
 * chaque jour affiché dans une pastille colorée — un RemoteViews ne peut pas
 * héberger de vue custom : la grille elle-même est dessinée sur un Bitmap
 * (même technique que le widget "Orbite" de Wenn), l'en-tête et les flèches
 * sont des TextView RemoteViews classiques par-dessus.
 *
 * Les événements ne sont disponibles que pour le mois réel en cours (calculé
 * côté app) : en navigant vers un autre mois, la grille reste exacte mais
 * sans pastilles.
 */
public class OrbitCalendarWidgetProvider extends AppWidgetProvider {

    private static final int BITMAP_W = 320;
    private static final int BITMAP_H = 340;

    private static final String ACTION_PREV_MONTH = "io.karelisio.orbit.CAL_WIDGET_PREV";
    private static final String ACTION_NEXT_MONTH = "io.karelisio.orbit.CAL_WIDGET_NEXT";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
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

    static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(OrbitWidgetPrefs.NAME, Context.MODE_PRIVATE);
        String eventsCsv = prefs.getString(OrbitWidgetPrefs.KEY_EVENTS_THIS_MONTH, "");
        int offset = prefs.getInt(OrbitWidgetPrefs.KEY_CAL_MONTH_OFFSET_PREFIX + appWidgetId, 0);

        int onPrimaryContainer = parseColorOr(prefs.getString(OrbitWidgetPrefs.KEY_COLOR_ON_PRIMARY_CONTAINER, null), "#21005D");

        Calendar shownMonth = Calendar.getInstance();
        shownMonth.add(Calendar.MONTH, offset);
        String monthLabel = new SimpleDateFormat("MMMM yyyy", Locale.FRENCH).format(shownMonth.getTime());
        monthLabel = monthLabel.substring(0, 1).toUpperCase(Locale.FRENCH) + monthLabel.substring(1);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar);
        views.setTextViewText(R.id.widget_cal_month, monthLabel);
        views.setTextColor(R.id.widget_cal_month, onPrimaryContainer);
        views.setTextColor(R.id.widget_cal_prev, onPrimaryContainer);
        views.setTextColor(R.id.widget_cal_next, onPrimaryContainer);
        views.setOnClickPendingIntent(R.id.widget_cal_prev, navIntent(context, appWidgetId, ACTION_PREV_MONTH));
        views.setOnClickPendingIntent(R.id.widget_cal_next, navIntent(context, appWidgetId, ACTION_NEXT_MONTH));

        views.setImageViewBitmap(R.id.widget_calendar_image, drawMonthGrid(prefs, offset, eventsCsv));
        views.setOnClickPendingIntent(R.id.widget_calendar_image, openAppIntent(context, appWidgetId));
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static int parseColorOr(String hex, String fallbackHex) {
        try {
            return Color.parseColor(hex != null ? hex : fallbackHex);
        } catch (IllegalArgumentException e) {
            return Color.parseColor(fallbackHex);
        }
    }

    private static final class DayEvent {
        final String title;
        final int color;

        DayEvent(String title, int color) {
            this.title = title;
            this.color = color;
        }
    }

    /** Format : "jour:titre:couleurHexSansDièse;jour:titre:couleur;..." (voir WidgetSync.tsx). */
    private static Map<Integer, DayEvent> parseEvents(String csv) {
        Map<Integer, DayEvent> map = new HashMap<>();
        if (TextUtils.isEmpty(csv)) return map;
        for (String entry : csv.split(";")) {
            String[] fields = entry.split(":", 3);
            if (fields.length < 3) continue;
            try {
                int day = Integer.parseInt(fields[0].trim());
                String title = fields[1];
                int color = parseColorOr("#" + fields[2].trim(), "#7D5260");
                map.put(day, new DayEvent(title, color));
            } catch (NumberFormatException ignored) {
                // entrée invalide : on l'ignore simplement
            }
        }
        return map;
    }

    private static Bitmap drawMonthGrid(SharedPreferences prefs, int offset, String eventsCsv) {
        // Les événements ne sont calculés côté app que pour le mois réel en cours.
        Map<Integer, DayEvent> events = offset == 0 ? parseEvents(eventsCsv) : new HashMap<>();

        int primary = parseColorOr(prefs.getString(OrbitWidgetPrefs.KEY_COLOR_PRIMARY, null), "#6750A4");
        int onPrimary = parseColorOr(prefs.getString(OrbitWidgetPrefs.KEY_COLOR_ON_PRIMARY, null), "#FFFFFF");
        int onSurface = parseColorOr(prefs.getString(OrbitWidgetPrefs.KEY_COLOR_ON_SURFACE, null), "#1C1B1F");
        int onSurfaceVariant = parseColorOr(prefs.getString(OrbitWidgetPrefs.KEY_COLOR_ON_SURFACE_VARIANT, null), "#79747E");

        Bitmap bitmap = Bitmap.createBitmap(BITMAP_W, BITMAP_H, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        Calendar today = Calendar.getInstance();
        int todayDay = today.get(Calendar.DAY_OF_MONTH);

        Calendar shownMonth = Calendar.getInstance();
        shownMonth.add(Calendar.MONTH, offset);
        boolean isCurrentMonth = offset == 0;
        int daysInMonth = shownMonth.getActualMaximum(Calendar.DAY_OF_MONTH);

        Calendar firstOfMonth = (Calendar) shownMonth.clone();
        firstOfMonth.set(Calendar.DAY_OF_MONTH, 1);
        // Calendar.DAY_OF_WEEK : dimanche=1..samedi=7 ; on veut lundi=0..dimanche=6.
        int firstWeekday = (firstOfMonth.get(Calendar.DAY_OF_WEEK) + 5) % 7;

        float weekdayRowHeight = BITMAP_H * 0.07f;
        float gridTop = weekdayRowHeight;
        float gridHeight = BITMAP_H - gridTop;
        int rows = (int) Math.ceil((firstWeekday + daysInMonth) / 7.0);
        float cellW = BITMAP_W / 7f;
        float cellH = gridHeight / rows;

        Paint weekdayPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        weekdayPaint.setColor(onSurfaceVariant);
        weekdayPaint.setTextSize(BITMAP_H * 0.045f);
        weekdayPaint.setTextAlign(Paint.Align.CENTER);
        String[] weekdays = {"L", "M", "M", "J", "V", "S", "D"};
        for (int i = 0; i < 7; i++) {
            canvas.drawText(weekdays[i], cellW * i + cellW / 2f, weekdayRowHeight * 0.7f, weekdayPaint);
        }

        Paint dayPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        dayPaint.setColor(onSurface);
        dayPaint.setTextSize(cellH * 0.34f);
        dayPaint.setTextAlign(Paint.Align.CENTER);

        Paint todayCirclePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        todayCirclePaint.setColor(primary);
        todayCirclePaint.setStyle(Paint.Style.FILL);

        Paint todayTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        todayTextPaint.setColor(onPrimary);
        todayTextPaint.setTextSize(cellH * 0.34f);
        todayTextPaint.setFakeBoldText(true);
        todayTextPaint.setTextAlign(Paint.Align.CENTER);

        Paint chipPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        chipPaint.setStyle(Paint.Style.FILL);

        TextPaint chipTextPaint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
        chipTextPaint.setColor(Color.WHITE);
        chipTextPaint.setTextSize(cellH * 0.24f);
        chipTextPaint.setTextAlign(Paint.Align.CENTER);

        for (int day = 1; day <= daysInMonth; day++) {
            int cellIndex = firstWeekday + day - 1;
            int col = cellIndex % 7;
            int row = cellIndex / 7;
            float cellLeft = cellW * col;
            float cellTop = gridTop + cellH * row;
            float cx = cellLeft + cellW / 2f;
            float numberCy = cellTop + cellH * 0.32f;

            boolean isToday = isCurrentMonth && day == todayDay;
            if (isToday) {
                canvas.drawCircle(cx, numberCy - cellH * 0.1f, Math.min(cellW, cellH) * 0.26f, todayCirclePaint);
                canvas.drawText(String.valueOf(day), cx, numberCy + cellH * 0.02f, todayTextPaint);
            } else {
                canvas.drawText(String.valueOf(day), cx, numberCy + cellH * 0.02f, dayPaint);
            }

            DayEvent event = events.get(day);
            if (event != null) {
                float chipLeft = cellLeft + cellW * 0.08f;
                float chipRight = cellLeft + cellW * 0.92f;
                float chipTop = cellTop + cellH * 0.5f;
                float chipBottom = cellTop + cellH * 0.86f;
                float radius = (chipBottom - chipTop) * 0.3f;

                chipPaint.setColor(event.color);
                canvas.drawRoundRect(chipLeft, chipTop, chipRight, chipBottom, radius, radius, chipPaint);

                float maxTextWidth = (chipRight - chipLeft) * 0.86f;
                CharSequence label = TextUtils.ellipsize(event.title, chipTextPaint, maxTextWidth, TextUtils.TruncateAt.END);
                canvas.drawText(label.toString(), cx, (chipTop + chipBottom) / 2f + cellH * 0.08f, chipTextPaint);
            }
        }

        return bitmap;
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
            updateWidget(context, manager, id);
        }
    }
}
