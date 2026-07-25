package web.teamsubscup.app;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.Log;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

/**
 * Auto-actualizador de la app: chequea/pide el permiso de "instalar apps
 * desconocidas", descarga el APK nuevo y dispara el instalador nativo de
 * Android. El chequeo de versión y la UI viven en JS (Slice C) — este plugin
 * es solo la capa nativa que JS no puede tocar directamente.
 *
 * Sin JS wrapper propio: Capacitor expone cualquier plugin nativo registrado
 * directamente en window.Capacitor.Plugins.AppUpdater — mismo criterio que
 * SystemBarsPlugin.
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private static final String TAG = "AppUpdaterPlugin";

    // El parámetro `url` viene de JS (en definitiva, de un manifiesto de
    // versión leído por el Slice C). Si algún día hay un XSS en el WebView,
    // una URL arbitraria acá sería un vector para instalar un APK arbitrario
    // — se restringe a https + exactamente el host de GitHub, que es el canal
    // de distribución real del proyecto (GitHub Releases, migrado el 16/07;
    // el asset TEAM-SUBS-CUP.apk del release ya se descarga desde ahí en
    // producción — ver tsc-src/js/apk-promo.js). DownloadManager sigue solo
    // los redirects (github.com -> release-assets.githubusercontent.com con
    // URL firmada) sin que el host de entrada cambie, así que validar
    // "github.com" alcanza. A propósito NO se agrega
    // release-assets.githubusercontent.com a la allowlist: es un detalle
    // interno de GitHub con URLs firmadas que expiran, meterlo debilitaría la
    // validación sin ganar nada (igual la sigue DownloadManager solo).
    private static final String ALLOWED_HOST = "github.com";
    private static final String APK_SUBDIR = "updates";
    private static final String APK_FILENAME = "tsc-update.apk";

    // Cada cuánto se re-consulta DownloadManager mientras una descarga está
    // en curso (ver checkDownloadStatus). 1.5s es lo bastante seguido para
    // que el timeout de abajo se note rápido, sin generar tráfico de más.
    private static final long POLL_INTERVAL_MS = 1500;

    // Tope global de espera. DownloadManager puede quedar en STATUS_PAUSED
    // (WAITING_TO_RETRY/WAITING_FOR_NETWORK/QUEUED_FOR_WIFI) indefinidamente
    // sin emitir nunca ACTION_DOWNLOAD_COMPLETE — depender solo del broadcast
    // deja la promesa de JS colgada para siempre en ese caso (bug real,
    // reproducido con flakiness TLS del emulador: la descarga terminaba de
    // escribir el archivo entero en disco y aun así nunca pasaba a
    // STATUS_SUCCESSFUL). Con un piso conservador de ~200 KB/s en datos
    // móviles (peor que un 4G típico, pero no un caso extremo), un APK de
    // ~85 MB tarda ~7 min; 10 min deja margen sobre eso sin dejar al usuario
    // esperando sin salida si la red nunca da abasto.
    private static final long MAX_WAIT_MS = 10 * 60 * 1000;

    // Estado de la descarga en curso — como el poll (Handler del main looper)
    // y el BroadcastReceiver corren en el mismo hilo (main), no hace falta
    // sincronización explícita: alcanza con que ambos caminos converjan en
    // checkDownloadStatus() y que esta limpie el estado antes de resolver.
    private PluginCall pendingDownloadCall;
    private BroadcastReceiver downloadReceiver;
    private long pendingDownloadId = -1;
    private long pollStartedAt;
    private final Handler pollHandler = new Handler(Looper.getMainLooper());
    private Runnable pollRunnable;

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ret.put("granted", getContext().getPackageManager().canRequestPackageInstalls());
        } else {
            // API < 26: no existe el permiso especial "instalar apps
            // desconocidas" — en esas versiones la instalación de APKs de
            // origen externo se controla con un toggle global de sistema,
            // no por-app, así que no hay nada que chequear acá.
            ret.put("granted", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Este permiso no tiene diálogo runtime estándar (no es como
            // cámara/ubicación) — es "acceso especial": solo se puede llevar
            // al usuario a la pantalla de Configuración y que mueva el
            // toggle a mano.
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        if (pendingDownloadCall != null) {
            // Rechazar en vez de cancelar la anterior en silencio: si el
            // caller (Slice C) dispara una segunda descarga mientras la
            // primera sigue viva, lo más probable es un doble-tap o un bug
            // del lado JS (el botón debería deshabilitarse mientras hay una
            // en curso) — fallar fuerte acá lo hace visible enseguida en vez
            // de esconderlo cancelando de más.
            call.reject("Ya hay una descarga en curso");
            return;
        }

        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Falta el parámetro 'url'");
            return;
        }

        Uri parsed = Uri.parse(url);
        String scheme = parsed.getScheme();
        String host = parsed.getHost();
        if (!"https".equals(scheme) || !ALLOWED_HOST.equals(host)) {
            call.reject("URL no permitida — debe ser https://" + ALLOWED_HOST + "/...");
            return;
        }

        Context ctx = getContext();

        // Limpiar el APK de la descarga anterior antes de encolar la nueva —
        // si no, cada actualización deja ~85 MB huérfanos en el storage de la app.
        File dir = ctx.getExternalFilesDir(APK_SUBDIR);
        if (dir != null) {
            File old = new File(dir, APK_FILENAME);
            if (old.exists()) {
                old.delete();
            }
        }

        DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
        if (dm == null) {
            call.reject("DownloadManager no disponible en este dispositivo");
            return;
        }

        DownloadManager.Request request = new DownloadManager.Request(parsed);
        request.setDestinationInExternalFilesDir(ctx, APK_SUBDIR, APK_FILENAME);
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setTitle("TSC — actualización");

        // El PluginCall no sobrevive a la descarga (downloadAndInstall vuelve
        // enseguida, la descarga tarda) — hay que mantenerlo vivo y
        // resolverlo/rechazarlo recién desde checkDownloadStatus().
        call.setKeepAlive(true);
        pendingDownloadCall = call;
        pendingDownloadId = -1; // se completa apenas enqueue() devuelva el id real, más abajo

        downloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long finishedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (finishedId != pendingDownloadId) {
                    // Puede haber otras descargas del sistema en vuelo — solo
                    // nos importa la nuestra.
                    return;
                }
                // Atajo del caso feliz: no esperamos al próximo tick del
                // polling. El polling sigue siendo la fuente de verdad — si
                // por lo que sea este broadcast nunca llega (es exactamente
                // el bug que motivó el polling), el tick de abajo lo cubre
                // igual.
                //
                // Se pasa `ctx` (el mismo Context con el que se registró este
                // receiver) y NO el `context` que trae onReceive ni su
                // getApplicationContext(): unregisterReceiver() tiene que
                // correr sobre el MISMO Context del registro o tira
                // IllegalArgumentException. Como acá getContext() es la
                // Activity (Bridge.context es un AppCompatActivity), pasar el
                // application context hacía que la limpieza fallara en
                // silencio — el catch de unregisterDownloadReceiver() se
                // tragaba la excepción y el receiver quedaba registrado,
                // filtrando una Activity por descarga.
                checkDownloadStatus(ctx, dm, finishedId);
            }
        };

        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        // ACTION_DOWNLOAD_COMPLETE es un broadcast del SISTEMA (lo manda
        // DownloadManager, no esta app) — con targetSdk 36 hay que declarar
        // explícitamente RECEIVER_EXPORTED. RECEIVER_NOT_EXPORTED compila y
        // no crashea, pero el receiver nunca dispara porque el broadcast no
        // se considera "de la propia app".
        //
        // Se registra ANTES de encolar (enqueue) a propósito: si el orden
        // fuera al revés habría una ventana, por chica que sea, en la que la
        // descarga ya está en curso pero nadie está escuchando el broadcast
        // todavía.
        ContextCompat.registerReceiver(ctx, downloadReceiver, filter, ContextCompat.RECEIVER_EXPORTED);

        pendingDownloadId = dm.enqueue(request);
        pollStartedAt = SystemClock.elapsedRealtime();
        schedulePoll(ctx, dm);
    }

    private void schedulePoll(Context ctx, DownloadManager dm) {
        pollRunnable = () -> {
            if (pendingDownloadCall == null) {
                // Ya se resolvió por el otro camino (el receiver) entre que
                // se agendó este tick y que corrió — nada que hacer.
                return;
            }
            checkDownloadStatus(ctx, dm, pendingDownloadId);
            if (pendingDownloadCall != null) {
                pollHandler.postDelayed(pollRunnable, POLL_INTERVAL_MS);
            }
        };
        pollHandler.postDelayed(pollRunnable, POLL_INTERVAL_MS);
    }

    /**
     * Punto único de verdad sobre el estado de la descarga — lo llaman tanto
     * el BroadcastReceiver (atajo del caso feliz) como el poll periódico
     * (fuente de verdad real, cubre los casos en que el broadcast nunca
     * llega). Ambos caminos corren en el main thread, así que el chequeo de
     * `pendingDownloadCall == null` al entrar alcanza para que la descarga
     * se resuelva una sola vez sin importar cuál de los dos dispara primero.
     */
    private void checkDownloadStatus(Context ctx, DownloadManager dm, long id) {
        if (pendingDownloadCall == null) {
            return;
        }

        DownloadManager.Query query = new DownloadManager.Query();
        query.setFilterById(id);
        try (Cursor cursor = dm.query(query)) {
            if (cursor == null || !cursor.moveToFirst()) {
                // La fila desapareció (por ejemplo, se removió a mano) — se
                // trata como fallo terminal, no como algo transitorio.
                finishWithError(ctx, "No se pudo leer el estado de la descarga");
                return;
            }

            int statusIdx = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
            int status = statusIdx >= 0 ? cursor.getInt(statusIdx) : -1;

            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                finishWithSuccess(ctx);
                return;
            }

            if (status == DownloadManager.STATUS_FAILED) {
                // "Terminó" no es lo mismo que "salió bien" — hay que
                // chequear el estado real antes de asumir éxito.
                int reasonIdx = cursor.getColumnIndex(DownloadManager.COLUMN_REASON);
                int reason = reasonIdx >= 0 ? cursor.getInt(reasonIdx) : -1;
                finishWithError(ctx, "La descarga falló (reason=" + reason + ")");
                return;
            }

            if (status == DownloadManager.STATUS_PAUSED) {
                // NO es terminal — DownloadManager puede quedar así
                // (sin wifi, reintentando por un error de red/TLS, etc.)
                // durante un buen rato sin que sea un fallo real todavía.
                // Se loguea el motivo puntual para poder diferenciar
                // "esperando wifi" de "reintentando" al diagnosticar, pero
                // seguimos esperando — el timeout de abajo es el que corta.
                int reasonIdx = cursor.getColumnIndex(DownloadManager.COLUMN_REASON);
                int reason = reasonIdx >= 0 ? cursor.getInt(reasonIdx) : -1;
                Log.d(TAG, "downloadAndInstall: pausado (" + describePauseReason(reason) + ")");
            }
            // STATUS_PENDING / STATUS_RUNNING: sigue en curso, no hacer nada.
        }

        if (SystemClock.elapsedRealtime() - pollStartedAt >= MAX_WAIT_MS) {
            dm.remove(id); // corta la descarga colgada, libera el espacio parcial
            finishWithError(ctx, "Tiempo de espera agotado descargando la actualización — probá con mejor señal o wifi");
        }
    }

    private static String describePauseReason(int reason) {
        switch (reason) {
            case DownloadManager.PAUSED_WAITING_TO_RETRY:
                return "WAITING_TO_RETRY";
            case DownloadManager.PAUSED_WAITING_FOR_NETWORK:
                return "WAITING_FOR_NETWORK";
            case DownloadManager.PAUSED_QUEUED_FOR_WIFI:
                return "QUEUED_FOR_WIFI";
            case DownloadManager.PAUSED_UNKNOWN:
                return "UNKNOWN";
            default:
                return "reason=" + reason;
        }
    }

    private void finishWithSuccess(Context ctx) {
        PluginCall call = pendingDownloadCall;
        pendingDownloadCall = null;
        stopPolling();
        unregisterDownloadReceiver(ctx);
        if (call == null) {
            return;
        }

        File dir = ctx.getExternalFilesDir(APK_SUBDIR);
        File apk = dir != null ? new File(dir, APK_FILENAME) : null;
        if (apk == null || !apk.exists()) {
            call.reject("La descarga terminó pero el archivo no está");
            return;
        }

        Uri apkUri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", apk);
        Intent install = new Intent(Intent.ACTION_VIEW);
        install.setDataAndType(apkUri, "application/vnd.android.package-archive");
        install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(install);

        call.resolve();
    }

    private void finishWithError(Context ctx, String message) {
        PluginCall call = pendingDownloadCall;
        pendingDownloadCall = null;
        stopPolling();
        unregisterDownloadReceiver(ctx);
        if (call != null) {
            call.reject(message);
        }
    }

    private void stopPolling() {
        if (pollRunnable != null) {
            pollHandler.removeCallbacks(pollRunnable);
            pollRunnable = null;
        }
    }

    private void unregisterDownloadReceiver(Context ctx) {
        // No dejar el receiver colgado una vez que ya cumplió su función (o
        // que se lo reemplaza por una limpieza de timeout/destroy).
        if (downloadReceiver != null) {
            try {
                ctx.unregisterReceiver(downloadReceiver);
            } catch (IllegalArgumentException ignored) {
                // Ya estaba desregistrado — no hay nada que hacer.
            }
            downloadReceiver = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        // Si la Activity muere con una descarga en curso (proceso matado por
        // el sistema, swipe-kill, etc.) no hay que dejar el receiver
        // registrado ni el polling corriendo contra un Context que ya no
        // sirve.
        stopPolling();
        Context ctx = getContext();
        if (ctx != null) {
            unregisterDownloadReceiver(ctx);
        }
        if (pendingDownloadCall != null) {
            PluginCall call = pendingDownloadCall;
            pendingDownloadCall = null;
            call.reject("La app se cerró antes de terminar la descarga");
        }
    }
}
