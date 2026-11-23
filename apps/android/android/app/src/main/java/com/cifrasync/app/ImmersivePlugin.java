package com.cifrasync.app;

import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Tela cheia de verdade no palco: esconde a barra de status e a de navegação.
 * Deslizar a partir da borda mostra as barras por um instante e elas somem de novo.
 */
@CapacitorPlugin(name = "Immersive")
public class ImmersivePlugin extends Plugin {

    @PluginMethod
    public void enter(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, window.getDecorView());
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            controller.hide(WindowInsetsCompat.Type.systemBars());
            call.resolve();
        });
    }

    @PluginMethod
    public void exit(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            WindowCompat.getInsetsController(window, window.getDecorView())
                .show(WindowInsetsCompat.Type.systemBars());
            call.resolve();
        });
    }
}
