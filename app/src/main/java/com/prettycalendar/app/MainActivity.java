/* SPDX-License-Identifier: Apache-2.0
 * Copyright 2026 Jack
 */
package com.prettycalendar.app;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONArray;
import java.util.Calendar;
import java.util.Date;
import java.util.GregorianCalendar;
import java.text.SimpleDateFormat;
import java.util.Locale;

public final class MainActivity extends Activity {
    private WebView web;
    private SharedPreferences preferences;
    private BroadcastReceiver clockReceiver;
    private boolean resumed;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        preferences = getSharedPreferences("pretty_calendar", MODE_PRIVATE);
        updateBars(Calendar.getInstance().get(Calendar.HOUR_OF_DAY) >= 21 || Calendar.getInstance().get(Calendar.HOUR_OF_DAY) < 7);
        web = new WebView(this);
        web.setBackgroundColor(Color.TRANSPARENT);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(false);
        // Packaged android_asset resources remain accessible with general file access off.
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setTextZoom(100);
        settings.setBlockNetworkLoads(true);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Bridge(), "PrettyNative");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return true; }
            @Override public void onPageFinished(WebView view, String url) {
                view.evaluateJavascript("if(window.prettySetPaused)window.prettySetPaused(" + !resumed + ")", null);
            }
        });
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
        clockReceiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) { refreshClock(); }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_TIME_CHANGED);
        filter.addAction(Intent.ACTION_TIMEZONE_CHANGED);
        filter.addAction(Intent.ACTION_TIME_TICK);
        filter.addAction(Intent.ACTION_DATE_CHANGED);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(clockReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(clockReceiver, filter);
    }

    private void refreshClock() {
        if (web != null && resumed) web.evaluateJavascript("if(window.prettyRefresh)window.prettyRefresh()", null);
    }

    @Override protected void onResume() {
        super.onResume();
        resumed = true;
        if (web != null) {
            web.onResume();
            web.evaluateJavascript("if(window.prettySetPaused)window.prettySetPaused(false)", null);
        }
    }
    @Override protected void onPause() {
        resumed = false;
        if (web != null) {
            web.evaluateJavascript("if(window.prettySetPaused)window.prettySetPaused(true)", null);
            web.onPause();
        }
        super.onPause();
    }
    @Override protected void onDestroy() {
        if (clockReceiver != null) unregisterReceiver(clockReceiver);
        if (web != null) { web.removeJavascriptInterface("PrettyNative"); web.destroy(); web = null; }
        super.onDestroy();
    }

    @SuppressWarnings("deprecation") private void updateBars(boolean night) {
        int color = Color.parseColor(night ? "#291d31" : "#fff8f2");
        getWindow().setStatusBarColor(color);
        getWindow().setNavigationBarColor(color);
        getWindow().getDecorView().setBackgroundColor(color);
        int flags = night ? 0 : View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(flags);
    }

    private final class Bridge {
        @JavascriptInterface public String loadMarks() {
            try {
                String value = preferences.getString("marks", "[]");
                return value != null && value.length() <= 150000 ? value : "null";
            } catch (ClassCastException ignored) { return "null"; }
        }
        @JavascriptInterface public boolean saveMarks(String value) {
            if (value == null || value.length() > 150000) return false;
            try {
                JSONArray array = new JSONArray(value);
                if (array.length() > 1) return false;
                SimpleDateFormat parser = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                GregorianCalendar calendar = new GregorianCalendar();
                calendar.setGregorianChange(new Date(Long.MIN_VALUE));
                parser.setCalendar(calendar);
                parser.setLenient(false);
                for (int i = 0; i < array.length(); i++) {
                    String date = array.getString(i);
                    if (!date.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}") || date.startsWith("0000-") || !parser.format(parser.parse(date)).equals(date)) return false;
                }
                return preferences.edit().putString("marks", value).commit();
            } catch (Exception ignored) { return false; }
        }
        @JavascriptInterface public void haptic() { runOnUiThread(() -> { if(web != null) web.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS); }); }
        @JavascriptInterface public void setNight(boolean night) { runOnUiThread(() -> updateBars(night)); }
    }
}
