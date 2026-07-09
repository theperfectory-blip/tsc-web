package web.teamsubscup.app;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int BRAND_DARK = Color.parseColor("#0C0F14");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        // Fondo de la ventana oscuro ANTES de que el tema/contenido se
        // asiente — evita cualquier resquicio blanco entre el splash nativo
        // y el primer frame del WebView, además de lo que ya cubre el theme.
        getWindow().setBackgroundDrawable(new ColorDrawable(BRAND_DARK));
        super.onCreate(savedInstanceState);
        // Cinturón y tirantes: capacitor.config.json ya trae backgroundColor
        // (Bridge.initWebView() lo aplica), pero fijarlo también acá no tiene
        // costo y cubre el WebView incluso si esa config no llegara a aplicarse.
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(BRAND_DARK);
        }
    }
}
