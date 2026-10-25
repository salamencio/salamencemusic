# Salamence music  (versión 1.1.1)

Reproductor de música local con interfaz oscura estilo streaming. Sin cuentas, sin anuncios, sin conexión.

## Qué hace
- Importa archivos o carpetas enteras (también arrastrando a la ventana).
- **Guarda la biblioteca** (IndexedDB), las listas, los favoritos, el orden, volumen, aleatorio/repetición y la última canción con su posición.
- Lee etiquetas de MP3 (ID3v2.2/2.3/2.4) y FLAC: título, artista, álbum y carátula.
- **Álbumes**: sección propia; crea álbumes eligiendo canciones de tu biblioteca o importando archivos nuevos, con nombre, artista y portada. Cada canción enlaza a su álbum.
- **Editar detalles** de cada canción (título, artista, álbum, portada) desde el menú ⋯ o clic derecho.
- **Portadas automáticas**: si una canción no tiene portada, se usa un Pokémon al azar de las generaciones 1 a 3 (los de un mismo álbum comparten Pokémon). Se descargan de PokeAPI la primera vez con conexión y se guardan para verlos sin internet; sin conexión y sin descargar, se muestra el logo.
- Listas: crear, renombrar, eliminar, añadir/quitar canciones desde el menú ⋯ o clic derecho.
- **Cola** (botón del reproductor o tecla Q): ves lo que suena ahora, tu cola y lo que viene después. Puedes añadir canciones (menú ⋯, selección o botón Añadir), quitarlas y reordenarlas arrastrando. Lo que añades suena antes de seguir con la lista.
- **Aleatorio real**: se baraja la lista (Fisher-Yates), suena cada canción una vez por vuelta y la cola muestra el orden exacto. Repetir: desactivado / toda la cola / una canción.
- **Selección múltiple**: la barra de selección solo aparece con 2 o más canciones (Ctrl+clic) y flota sin mover la pantalla; un clic simple solo resalta la fila. Clic selecciona, Ctrl+clic suma o quita, Mayús+clic selecciona un rango, Ctrl+A todo; doble clic o Intro reproduce. Con varias seleccionadas: reproducir, añadir a la cola, favoritos, poner álbum, añadir a lista o eliminar (barra superior, ⋯ o clic derecho).
- Búsqueda sin acentos, ordenar por reciente/título/artista/duración, navegación atrás/adelante.
- Teclas multimedia y controles del sistema (Media Session).
- **Foto de las listas**: botón de editar (lápiz) o clic sobre la foto de la lista para cambiar el nombre y la imagen. Las imágenes que subes se reducen a 640 px para no gastar espacio.
- **Orden personalizado**: en cada lista, «Ordenar por» (mi orden, título, artista, álbum, duración, últimas añadidas) y, en «Mi orden», arrastra canciones para colocarlas o usa «Mover…» en el menú ⋯. «Guardar este orden como mío» fija un orden ordenado. Las listas de la barra lateral se arrastran, tienen menú con clic derecho y un botón para ordenarlas (A–Z, Z–A, más canciones primero, invertir).
- Arrastrar elementos de la propia app (fotos, filas, listas, cola) nunca se interpreta como importar música.
- **Duplicar listas y combinarlas**: en una lista, el botón de copiar crea una copia (con su foto) y el de «lista con +» añade todas sus canciones a otra lista, o a una nueva. También con clic derecho (o pulsación larga en el móvil) sobre la lista. Los álbumes tienen el mismo botón para pasarlos a una lista.
- **Arrastrar música a una lista**: con una lista abierta, suelta archivos o carpetas y entran a la lista y a la biblioteca (si ya estaban en la biblioteca, solo se añaden a la lista). El botón «Añadir música» dentro de la lista hace lo mismo, también en el móvil.
- **Copia de seguridad** (icono de base de datos de la barra superior): exporta a un archivo `.salamence` las listas (con su orden y foto), favoritos, álbumes, títulos/artistas editados y portadas propias, o todo con los audios. Importar combina con lo que ya hay. Si faltan canciones en el dispositivo, quedan "pendientes" y se enlazan solas a sus listas al añadirlas (coincidencia por nombre de archivo y tamaño).
- **Android**: se instala como app desde el navegador (PWA, con service worker y manifiesto) o, de forma opcional, como APK compilado con Capacitor y GitHub Actions (`app-android/` y `.github/workflows/android.yml`). Ver `ANDROID-LEEME.txt`. En pantallas pequeñas hay barra inferior, mini reproductor, reproductor a pantalla completa, vista «Listas», selección táctil (menú ⋯ > «Seleccionar varias») y el botón Atrás de Android.
- Atajos de teclado (ver LEEME-PRIMERO.txt).

## Estructura
- `index.html`, `app.js`, `styles.css`, `assets/` — la aplicación (funciona abriendo index.html).
- `main.js`, `package.json`, `build/` — envoltorio de escritorio con Electron.
- `manifest.webmanifest`, `sw.js` — instalación como app (PWA) y uso sin conexión.
- `app-android/`, `.github/workflows/android.yml` — empaquetado opcional como APK.
- `CREAR-INSTALADOR.bat` — genera el instalador `.exe` (NSIS) en `dist/`.
- `ABRIR-COMO-APP.bat` — abre la app en ventana propia usando Edge/Chrome.

## Desarrollo
```
npm install
npm start          # abre la app de escritorio
npm run dist       # instalador de Windows
npm run dist:mac   # .dmg (hay que ejecutarlo en un Mac)
npm run dist:linux # AppImage (en Linux)
```

## Limitaciones
- Las canciones se **copian** al almacenamiento de la app, así que ocupan espacio extra y, si borras el original, la app sigue funcionando.
- Etiquetas de M4A/OGG no se leen (se usa el nombre del archivo). La compatibilidad de formatos (FLAC, WMA…) depende del motor Chromium.
- No hay sincronización entre dispositivos ni listas compartidas.

## Novedades 1.1.1
- En pantallas táctiles los menús aparecen como panel inferior y no se cierran solos al redimensionar/desplazar.
- Las listas tienen botones con texto (Duplicar, Añadir a otra lista) y botón ⋯ en cada tarjeta de la vista «Listas».
- La app instalada (PWA) se actualiza de forma fiable y muestra su versión en «Copia de seguridad».
