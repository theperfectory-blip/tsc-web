package web.teamsubscup.app;

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
 * Sin JS wrapper propio: Capacitor expone cualquier plugin nativo registrado
 * directamente en window.Capacitor.Plugins.SystemBars — ver setTheme() en
 * tsc-src/js/ui-utils.js.
 */
@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {

    @PluginMethod
    public void setBarsTheme(PluginCall call) {
        String theme = call.getString("theme", "dark");
        boolean isLight = "light".equals(theme);

        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
            controller.setAppearanceLightStatusBars(isLight);
            controller.setAppearanceLightNavigationBars(isLight);
        });

        call.resolve();
    }
}
