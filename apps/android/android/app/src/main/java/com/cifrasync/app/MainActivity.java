package com.cifrasync.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // plugins do próprio app precisam ser registrados antes do super.onCreate
        registerPlugin(ImmersivePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
