package com.salamence.music;

import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.lang.ref.WeakReference;

@CapacitorPlugin(name = "MusicControls")
public class MusicControlsPlugin extends Plugin {
    private static WeakReference<MusicControlsPlugin> instanceRef;

    @Override
    public void load() {
        instanceRef = new WeakReference<>(this);
    }

    public static void emitAction(final String action, final long positionMs) {
        new Handler(Looper.getMainLooper()).post(() -> {
            MusicControlsPlugin plugin = instanceRef != null ? instanceRef.get() : null;
            if (plugin != null) {
                JSObject data = new JSObject();
                data.put("action", action);
                if (positionMs >= 0) {
                    data.put("positionMs", positionMs);
                }
                plugin.notifyListeners("mediaAction", data);
            }
        });
    }

    @PluginMethod
    public void updateMetadata(PluginCall call) {
        String title = call.getString("title", "Salamence music");
        String artist = call.getString("artist", "");
        String album = call.getString("album", "");
        long durationMs = call.getLong("durationMs", 0L);
        String coverBase64 = call.getString("coverBase64", null);

        Bitmap cover = null;
        if (coverBase64 != null && !coverBase64.isEmpty()) {
            try {
                String clean = coverBase64;
                int comma = clean.indexOf(',');
                if (comma >= 0) {
                    clean = clean.substring(comma + 1);
                }
                byte[] bytes = Base64.decode(clean, Base64.DEFAULT);
                cover = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            } catch (Exception ignored) {
                cover = null;
            }
        }

        MusicService.setMetadata(title, artist, album, cover, durationMs);
        Context ctx = getContext();
        Intent intent = new Intent(ctx, MusicService.class);
        intent.setAction(MusicService.ACTION_REFRESH);
        if (MusicService.isRunning()) {
            ctx.startService(intent);
        } else if (MusicService.isPlayingState()) {
            ContextCompat.startForegroundService(ctx, intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void updateState(PluginCall call) {
        boolean isPlaying = Boolean.TRUE.equals(call.getBoolean("isPlaying", false));
        long positionMs = call.getLong("positionMs", 0L);
        Long durationObj = call.getLong("durationMs", -1L);
        long durationMs = durationObj != null ? durationObj : -1L;

        MusicService.setPlaybackState(isPlaying, positionMs, durationMs);
        Context ctx = getContext();
        Intent intent = new Intent(ctx, MusicService.class);
        intent.setAction(MusicService.ACTION_REFRESH);
        if (MusicService.isRunning()) {
            ctx.startService(intent);
        } else if (isPlaying) {
            ContextCompat.startForegroundService(ctx, intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        Context ctx = getContext();
        ctx.stopService(new Intent(ctx, MusicService.class));
        call.resolve();
    }
}
