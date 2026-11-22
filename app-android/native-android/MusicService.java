package com.salamence.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

public class MusicService extends Service {
    public static final String ACTION_REFRESH = "com.salamence.music.ACTION_REFRESH";
    public static final String ACTION_PREV = "com.salamence.music.ACTION_PREV";
    public static final String ACTION_PLAY_PAUSE = "com.salamence.music.ACTION_PLAY_PAUSE";
    public static final String ACTION_NEXT = "com.salamence.music.ACTION_NEXT";

    private static final String CHANNEL_ID = "salamence_playback_channel";
    private static final int NOTIFICATION_ID = 4102;

    private static volatile boolean running = false;
    private static volatile String curTitle = "Salamence music";
    private static volatile String curArtist = "";
    private static volatile String curAlbum = "";
    private static volatile Bitmap curCover = null;
    private static volatile long curDurationMs = 0L;
    private static volatile long curPositionMs = 0L;
    private static volatile boolean curPlaying = false;

    private MediaSession mediaSession;
    private PowerManager.WakeLock wakeLock;

    public static boolean isRunning() {
        return running;
    }

    public static boolean isPlayingState() {
        return curPlaying;
    }

    public static void setMetadata(String title, String artist, String album, Bitmap cover, long durationMs) {
        curTitle = (title != null && !title.isEmpty()) ? title : "Salamence music";
        curArtist = artist != null ? artist : "";
        curAlbum = album != null ? album : "";
        curCover = cover;
        if (durationMs >= 0) {
            curDurationMs = durationMs;
        }
    }

    public static void setPlaybackState(boolean isPlaying, long positionMs, long durationMs) {
        curPlaying = isPlaying;
        curPositionMs = Math.max(0L, positionMs);
        if (durationMs >= 0) {
            curDurationMs = durationMs;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        running = true;
        createNotificationChannel();

        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SalamenceMusic::PlaybackLock");
            wakeLock.setReferenceCounted(false);
        }

        mediaSession = new MediaSession(this, "SalamenceMusicSession");
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override
            public void onPlay() {
                MusicControlsPlugin.emitAction("play", -1L);
            }

            @Override
            public void onPause() {
                MusicControlsPlugin.emitAction("pause", -1L);
            }

            @Override
            public void onSkipToNext() {
                MusicControlsPlugin.emitAction("next", -1L);
            }

            @Override
            public void onSkipToPrevious() {
                MusicControlsPlugin.emitAction("previous", -1L);
            }

            @Override
            public void onSeekTo(long pos) {
                curPositionMs = Math.max(0L, pos);
                updateMediaSession();
                MusicControlsPlugin.emitAction("seekTo", curPositionMs);
            }

            @Override
            public void onStop() {
                curPlaying = false;
                MusicControlsPlugin.emitAction("pause", -1L);
                stopForegroundCompat(true);
                stopSelf();
            }
        });
        mediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_REFRESH;
        if (ACTION_PREV.equals(action)) {
            MusicControlsPlugin.emitAction("previous", -1L);
        } else if (ACTION_NEXT.equals(action)) {
            MusicControlsPlugin.emitAction("next", -1L);
        } else if (ACTION_PLAY_PAUSE.equals(action)) {
            MusicControlsPlugin.emitAction(curPlaying ? "pause" : "play", -1L);
        }

        updateWakeLock();
        updateMediaSession();
        Notification notification = buildNotification();

        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        if (!curPlaying) {
            stopForegroundCompat(false);
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIFICATION_ID, notification);
            }
        }
        return START_NOT_STICKY;
    }

    private void updateWakeLock() {
        try {
            if (wakeLock == null) return;
            if (curPlaying && !wakeLock.isHeld()) {
                wakeLock.acquire(4 * 60 * 60 * 1000L);
            } else if (!curPlaying && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {
        }
    }

    private void updateMediaSession() {
        if (mediaSession == null) return;
        MediaMetadata.Builder meta = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, curTitle)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, curArtist)
                .putString(MediaMetadata.METADATA_KEY_ALBUM, curAlbum);
        if (curDurationMs > 0) {
            meta.putLong(MediaMetadata.METADATA_KEY_DURATION, curDurationMs);
        }
        if (curCover != null) {
            meta.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, curCover);
        }
        mediaSession.setMetadata(meta.build());

        long actions = PlaybackState.ACTION_PLAY
                | PlaybackState.ACTION_PAUSE
                | PlaybackState.ACTION_PLAY_PAUSE
                | PlaybackState.ACTION_SKIP_TO_NEXT
                | PlaybackState.ACTION_SKIP_TO_PREVIOUS
                | PlaybackState.ACTION_SEEK_TO
                | PlaybackState.ACTION_STOP;

        int state = curPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED;
        PlaybackState playbackState = new PlaybackState.Builder()
                .setActions(actions)
                .setState(state, curPositionMs, curPlaying ? 1.0f : 0.0f)
                .build();
        mediaSession.setPlaybackState(playbackState);
    }

    private Notification buildNotification() {
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) {
            piFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPi = PendingIntent.getActivity(this, 0, openIntent, piFlags);

        PendingIntent prevPi = serviceActionPi(ACTION_PREV, 1, piFlags);
        PendingIntent playPausePi = serviceActionPi(ACTION_PLAY_PAUSE, 2, piFlags);
        PendingIntent nextPi = serviceActionPi(ACTION_NEXT, 3, piFlags);

        int playPauseIcon = curPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;
        String playPauseLabel = curPlaying ? "Pausar" : "Reproducir";

        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);

        builder.setSmallIcon(getApplicationInfo().icon)
                .setContentTitle(curTitle)
                .setContentText(curArtist)
                .setContentIntent(contentPi)
                .setOngoing(curPlaying)
                .setOnlyAlertOnce(true)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .addAction(new Notification.Action.Builder(android.R.drawable.ic_media_previous, "Anterior", prevPi).build())
                .addAction(new Notification.Action.Builder(playPauseIcon, playPauseLabel, playPausePi).build())
                .addAction(new Notification.Action.Builder(android.R.drawable.ic_media_next, "Siguiente", nextPi).build())
                .setStyle(new Notification.MediaStyle()
                        .setMediaSession(mediaSession.getSessionToken())
                        .setShowActionsInCompactView(0, 1, 2));

        if (!curAlbum.isEmpty()) {
            builder.setSubText(curAlbum);
        }
        if (curCover != null) {
            builder.setLargeIcon(curCover);
        }
        return builder.build();
    }

    private PendingIntent serviceActionPi(String action, int requestCode, int flags) {
        Intent i = new Intent(this, MusicService.class);
        i.setAction(action);
        return PendingIntent.getService(this, requestCode, i, flags);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Reproducción de música",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Controles de reproducción en pantalla de bloqueo y notificaciones");
            channel.setShowBadge(false);
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private void stopForegroundCompat(boolean removeNotification) {
        if (Build.VERSION.SDK_INT >= 24) {
            stopForeground(removeNotification ? STOP_FOREGROUND_REMOVE : STOP_FOREGROUND_DETACH);
        } else {
            stopForeground(removeNotification);
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        if (!curPlaying) {
            stopSelf();
        }
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        running = false;
        curPlaying = false;
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {
        }
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
