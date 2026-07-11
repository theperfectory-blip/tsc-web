package web.teamsubscup.app;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Iconos de la status bar / navigation bar según el tema de la app (claro u
 * oscuro) — con targetSdkVersion 36 Android fuerza edge-to-edge y el color de
 * fondo de las barras (statusBarColor/navigationBarColor) queda ignorado en
 * runtime; el único control real es el color de los iconos, vía
 * WindowInsetsControllerCompat (androidx.core, ver variables.gradle).
 *
 * También ajusta el fondo de ventana/WebView (BG_DARK/BG_LIGHT, mismos tonos
 * que --bg en tsc-src/css/variables.css) — MainActivity.onCreate() hardcodea
 * BRAND_DARK para el anti-flash del cold start; sin esto, esa franja oscura
 * quedaba pegada detrás de las barras incluso en tema claro, bajando el
 * contraste de los iconos ya corregidos arriba. Solo se toca en runtime
 * (esta llamada corre después de que setTheme() en ui-utils.js ya leyó
 * tsc_theme), nunca el default nativo de styles.xml/MainActivity — el
 * anti-flash del arranque ya cumplió su función para cuando esto se invoca.
 *
 * Sin JS wrapper propio: Capacitor expone cualquier plugin nativo registrado
 * directamente en window.Capacitor.Plugins.SystemBars — ver setTheme() en
 * tsc-src/js/ui-utils.js.
 */
@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {
    private static final int BG_DARK = Color.parseColor("#0C0F14");
    private static final int BG_LIGHT = Color.parseColor("#F4F4F0");

    @PluginMethod
    public void setBarsTheme(PluginCall call) {
        String theme = call.getString("theme", "dark");
        boolean isLight = "light".equals(theme);
        int bg = isLight ? BG_LIGHT : BG_DARK;

        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
            controller.setAppearanceLightStatusBars(isLight);
            controller.setAppearanceLightNavigationBars(isLight);

            window.setBackgroundDrawable(new ColorDrawable(bg));
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().setBackgroundColor(bg);
            }
        });

        call.resolve();
    }
}
