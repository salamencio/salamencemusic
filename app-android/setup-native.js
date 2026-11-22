const fs = require("fs");
const path = require("path");

const androidRoot = path.join(__dirname, "android");
const javaDest = path.join(androidRoot, "app", "src", "main", "java", "com", "salamence", "music");
const nativeSrc = path.join(__dirname, "native-android");
const manifestPath = path.join(androidRoot, "app", "src", "main", "AndroidManifest.xml");

if (!fs.existsSync(androidRoot)) {
  console.error("No existe app-android/android. Ejecuta primero: npx cap add android");
  process.exit(1);
}

fs.mkdirSync(javaDest, { recursive: true });
for (const file of ["MainActivity.java", "MusicControlsPlugin.java", "MusicService.java"]) {
  fs.copyFileSync(path.join(nativeSrc, file), path.join(javaDest, file));
}

let manifest = fs.readFileSync(manifestPath, "utf8");

const permissions = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.WAKE_LOCK"
];

for (const perm of permissions) {
  if (!manifest.includes(perm)) {
    manifest = manifest.replace(
      "<application",
      `    <uses-permission android:name="${perm}" />\n\n    <application`
    );
  }
}

if (!manifest.includes("com.salamence.music.MusicService") && !manifest.includes('android:name=".MusicService"')) {
  manifest = manifest.replace(
    "</application>",
    `        <service\n            android:name=".MusicService"\n            android:exported="false"\n            android:foregroundServiceType="mediaPlayback" />\n    </application>`
  );
}

fs.writeFileSync(manifestPath, manifest, "utf8");
console.log("Controles nativos de Android (persianita tipo Spotify y segundo plano) configurados.");
