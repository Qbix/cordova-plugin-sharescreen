package com.qbix.sharescreen;


import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.util.Log;
import android.widget.FrameLayout;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;

import org.json.JSONArray;
import org.json.JSONException;
import org.webrtc.IceCandidate;
import org.webrtc.MediaStream;
import org.webrtc.SessionDescription;
import org.webrtc.SurfaceViewRenderer;


public class CordovaPluginSharescreen extends CordovaPlugin {

  private static final String TAG = "CPSharescreen";
  private final int CAPTURE_PERMISSION_REQUEST_CODE = 1000;
  private Gson gson = new Gson();

  private CallbackContext shareScreenCallback;
  private CallbackContext signalCallback;
  private MediaProjectionManager mediaProjectionManager;

  private Intent mediaProjectionPermissionResultData;

  private WebRtcClient captureRtcClient;
  private WebRtcClient.SignalingServerListener signalingServerListener;

  @Override
  protected void pluginInitialize() {
    super.pluginInitialize();
    mediaProjectionManager = (MediaProjectionManager) cordova.getContext().getSystemService(Context.MEDIA_PROJECTION_SERVICE);
  }

  @Override
  public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
    Log.d(TAG, "executing " + action);
    if("startScreenShare".equals(action)) {
      shareScreenCallback = callbackContext;
      startScreenShare();
    } else if("sendSignal".equals(action)) {
      signalCallback = callbackContext;
      try {
        String payload = args.getString(0);
        JsonObject jsonObject = gson.fromJson(payload, JsonObject.class);
        if(signalingServerListener != null) {
          if (jsonObject.has("serverUrl")) {
            signalingServerListener.onIceCandidateReceived(gson.fromJson(jsonObject, IceCandidate.class));
          } else if (jsonObject.has("type") && jsonObject.get("type").getAsString().equals("ANSWER")) {
            signalingServerListener.onAnswerReceived(gson.fromJson(jsonObject, SessionDescription.class));
          }
        }
      } catch (JSONException e) {
        PluginResult pluginResult = new PluginResult(PluginResult.Status.ERROR, "Error parse parameter");
        pluginResult.setKeepCallback(true);
        signalCallback.sendPluginResult(pluginResult);
      }
    } else if("stopScreenShare".equals(action)){
      stopCapture();
    } else {
      return false;
    }

    return true;
  }

  private void startScreenShare() {
    cordova.startActivityForResult(this, mediaProjectionManager.createScreenCaptureIntent(), CAPTURE_PERMISSION_REQUEST_CODE);
  }

  private void stopCapture() {
    if(mediaProjectionManager != null) {
      MediaProjection mediaProjection = mediaProjectionManager.getMediaProjection(Activity.RESULT_OK, mediaProjectionPermissionResultData);
      if(mediaProjection != null) {
        mediaProjection.stop();
      }
    }
    if(captureRtcClient != null) {
      captureRtcClient.stop();
    }
    captureRtcClient = null;
    signalingServerListener = null;
  }

  private WebRtcClient.AppSdpObserver sdpObserver = new WebRtcClient.AppSdpObserver() {
    @Override
    public void onCreateSuccess(SessionDescription sessionDescription) {
      super.onCreateSuccess(sessionDescription);
      sendDataToJS(gson.toJson(sessionDescription));
    }
  };

  private void startCapture() {
    FrameLayout layout = (FrameLayout) webView.getView().getParent();

    SurfaceViewRenderer surfaceViewRenderer = new SurfaceViewRenderer(layout.getContext());
    captureRtcClient = new WebRtcClient(cordova.getContext().getApplicationContext(), new WebRtcClient.PeerConnectionObserver() {
      @Override
      public void onIceCandidate(IceCandidate iceCandidate) {
        super.onIceCandidate(iceCandidate);
        sendDataToJS(gson.toJson(iceCandidate));
        captureRtcClient.addIceCandidate(iceCandidate);
      }

      @Override
      public void onAddStream(MediaStream mediaStream) {
        super.onAddStream(mediaStream);
      }
    });
    signalingServerListener = createSignallingClientListener( captureRtcClient, sdpObserver);
    captureRtcClient.startLocalVideoCapture(
            surfaceViewRenderer,
            cordova.getContext().getApplicationContext(),
            mediaProjectionPermissionResultData
    );
    captureRtcClient.call(sdpObserver);
  }

  private void sendDataToJS(String it) {
    if(shareScreenCallback != null) {
      PluginResult offerResult = new PluginResult(PluginResult.Status.OK, it);
      offerResult.setKeepCallback(true);
      shareScreenCallback.sendPluginResult(offerResult);
    }
  }


  private WebRtcClient.SignalingServerListener createSignallingClientListener(
          WebRtcClient innerRtcClient,
          WebRtcClient.AppSdpObserver sdpObserver
  ) {
    return new WebRtcClient.SignalingServerListener() {
      @Override
      public void onOfferReceived(SessionDescription description) {
        cordova.getActivity().runOnUiThread(new Runnable() {
          @Override
          public void run() {
            innerRtcClient.onRemoteSessionReceived(description);
            innerRtcClient.answer(sdpObserver);
          }
        });
      }

      @Override
      public void onAnswerReceived(SessionDescription description) {
        cordova.getActivity().runOnUiThread(new Runnable() {
          @Override
          public void run() {
            innerRtcClient.onRemoteSessionReceived(description);
          }
        });
      }

      @Override
      public void onIceCandidateReceived(IceCandidate iceCandidate) {
        cordova.getActivity().runOnUiThread(new Runnable() {
          @Override
          public void run() {
            innerRtcClient.addIceCandidate(iceCandidate);
          }
        });
      }
    };
  }

  @Override
  public void onActivityResult(int requestCode, int resultCode, Intent intent) {
    super.onActivityResult(requestCode, resultCode, intent);
    if (requestCode == CAPTURE_PERMISSION_REQUEST_CODE) {
      if(resultCode == Activity.RESULT_OK) {
        mediaProjectionPermissionResultData = intent;
        startCapture();
      } else {
        if(shareScreenCallback != null) {
          shareScreenCallback.sendPluginResult(new PluginResult(PluginResult.Status.ERROR, "Not allowed by user"));
        }
      }

    }
  }
}