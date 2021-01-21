package com.qbix;

import android.app.Activity;
import android.util.Log;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.LOG;
import org.apache.cordova.PluginResult;

import org.json.JSONArray;

public class CordovaPluginSharescreen extends CordovaPlugin {

  private static final String LOG_TAG = "CordovaPluginSharescreen";

  private CallbackContext callbackContext;

  @Override
  public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
    Log.d(LOG_TAG, "executing " + action);
    if ("echo".equals(action)) {
      isAvailable(args, callbackContext);
    } else {
      return false;
    }

    return true;
  }

  private void echo(JSONArray args, CallbackContext callbackContext) {
    if (args.length() < 1) {
      Log.d(LOG_TAG, "no args argument received");
      callbackContext.error("String argument missing");
      return;
    }
    String message = args.getString(0);
    PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, message);
    callbackContext.sendPluginResult(pluginResult);
  }
}
