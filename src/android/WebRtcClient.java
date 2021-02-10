package com.qbix.sharescreen;

import android.content.Context;

import org.webrtc.DataChannel;
import org.webrtc.DefaultVideoDecoderFactory;
import org.webrtc.DefaultVideoEncoderFactory;
import org.webrtc.EglBase;
import org.webrtc.IceCandidate;
import org.webrtc.MediaConstraints;
import org.webrtc.MediaStream;
import org.webrtc.PeerConnection;
import org.webrtc.PeerConnectionFactory;
import org.webrtc.RtpReceiver;
import org.webrtc.RtpTransceiver;
import org.webrtc.ScreenCapturerAndroid;
import org.webrtc.SdpObserver;
import org.webrtc.SessionDescription;

import android.content.Intent;
import android.media.projection.MediaProjection;
import android.util.Log;

import org.webrtc.SurfaceTextureHelper;
import org.webrtc.SurfaceViewRenderer;
import org.webrtc.VideoCapturer;
import org.webrtc.VideoSource;
import org.webrtc.VideoTrack;

import java.util.ArrayList;

public class WebRtcClient {
    private final String LOCAL_TRACK_ID = "local_track";
    private final String LOCAL_STREAM_ID = "local_track";

    private EglBase rootEglBase = EglBase.create();
    PeerConnectionFactory peerConnectionFactory;
    PeerConnection peerConnection;
    VideoSource localVideoSource;

    private Context context;
    PeerConnection.Observer observer;

    public WebRtcClient(Context context, PeerConnection.Observer observer) {
        this.context = context;
        this.observer = observer;

        initPeerConnectionFactory(context);
        peerConnectionFactory = buildPeerConnectionFactory();
        peerConnection = buildPeerConnection(observer);
    }

    private void initPeerConnectionFactory(Context context) {
        PeerConnectionFactory.InitializationOptions options = PeerConnectionFactory.InitializationOptions.builder(context)
                .setEnableInternalTracer(true)
                .setFieldTrials("WebRTC-H264HighProfile/Enabled/")
                .createInitializationOptions();
        PeerConnectionFactory.initialize(options);
    }

    private PeerConnectionFactory buildPeerConnectionFactory()  {
        PeerConnectionFactory.Options options = new PeerConnectionFactory.Options();
        return PeerConnectionFactory
                .builder()
                .setVideoDecoderFactory(new DefaultVideoDecoderFactory(rootEglBase.getEglBaseContext()))
                .setVideoEncoderFactory(new DefaultVideoEncoderFactory(rootEglBase.getEglBaseContext(), true, true))
                .setOptions(options)
            .createPeerConnectionFactory();
    }

    private PeerConnection buildPeerConnection(PeerConnection.Observer observer) {
        return  peerConnectionFactory.createPeerConnection(
                new ArrayList<>(),
                observer
        );
    }

    public void stop() {
        if(peerConnection != null) {
            peerConnection.close();
        }
    }

    private VideoCapturer videoCapturer;

    void startLocalVideoCapture(SurfaceViewRenderer localVideoOutput, Context context, Intent shareScreenResultData) {
        SurfaceTextureHelper surfaceTextureHelper = SurfaceTextureHelper.create(Thread.currentThread().getName(), rootEglBase.getEglBaseContext());
        videoCapturer = new ScreenCapturerAndroid(shareScreenResultData, new MediaProjection.Callback() {
            @Override
            public void onStop() {
                Log.e("Error","User revoked permission to capture the screen.");
            }
        });

        localVideoSource = peerConnectionFactory.createVideoSource(videoCapturer.isScreencast());
        videoCapturer.initialize(surfaceTextureHelper, context, localVideoSource.getCapturerObserver());
        videoCapturer.startCapture(320, 240, 60);
        VideoTrack localVideoTrack = peerConnectionFactory.createVideoTrack(LOCAL_TRACK_ID, localVideoSource);

        localVideoTrack.addSink(localVideoOutput);
        MediaStream localStream = peerConnectionFactory.createLocalMediaStream(LOCAL_STREAM_ID);
        localStream.addTrack(localVideoTrack);
        peerConnection.addStream(localStream);
    }

    void call(SdpObserver sdpObserver) {
        MediaConstraints constraints = new MediaConstraints();
        constraints.mandatory.add(new MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"));

        peerConnection.createOffer(new SdpObserver() {
            @Override
            public void onCreateSuccess(SessionDescription sessionDescription) {
                peerConnection.setLocalDescription(new SdpObserver() {
                    @Override
                    public void onCreateSuccess(SessionDescription sessionDescription) {

                    }

                    @Override
                    public void onSetSuccess() {

                    }

                    @Override
                    public void onCreateFailure(String s) {

                    }

                    @Override
                    public void onSetFailure(String s) {

                    }
                }, sessionDescription);
                sdpObserver.onCreateSuccess(sessionDescription);
            }

            @Override
            public void onSetSuccess() {

            }

            @Override
            public void onCreateFailure(String s) {

            }

            @Override
            public void onSetFailure(String s) {

            }
        }, constraints);
    }

    void answer(SdpObserver sdpObserver) {
        MediaConstraints constraints = new MediaConstraints();
        constraints.mandatory.add(new MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"));

        peerConnection.createAnswer(new SdpObserver() {
            @Override
            public void onCreateSuccess(SessionDescription sessionDescription) {
                peerConnection.setLocalDescription(new SdpObserver() {
                    @Override
                    public void onCreateSuccess(SessionDescription sessionDescription) {

                    }

                    @Override
                    public void onSetSuccess() {

                    }

                    @Override
                    public void onCreateFailure(String s) {

                    }

                    @Override
                    public void onSetFailure(String s) {

                    }
                }, sessionDescription);
                sdpObserver.onCreateSuccess(sessionDescription);
            }

            @Override
            public void onSetSuccess() {

            }

            @Override
            public void onCreateFailure(String s) {

            }

            @Override
            public void onSetFailure(String s) {

            }
        }, constraints);
    }

    void onRemoteSessionReceived(SessionDescription sessionDescription) {
        peerConnection.setRemoteDescription(new SdpObserver() {
            @Override
            public void onCreateSuccess(SessionDescription sessionDescription) {

            }

            @Override
            public void onSetSuccess() {

            }

            @Override
            public void onCreateFailure(String s) {

            }

            @Override
            public void onSetFailure(String s) {

            }
        }, sessionDescription);
    }

    void addIceCandidate(IceCandidate iceCandidate) {
        peerConnection.addIceCandidate(iceCandidate);
    }

    public static class PeerConnectionObserver implements PeerConnection.Observer {
        @Override
        public void onSignalingChange(PeerConnection.SignalingState signalingState) {

        }

        @Override
        public void onIceConnectionChange(PeerConnection.IceConnectionState iceConnectionState) {

        }

        @Override
        public void onIceConnectionReceivingChange(boolean b) {

        }

        @Override
        public void onIceGatheringChange(PeerConnection.IceGatheringState iceGatheringState) {

        }

        @Override
        public void onIceCandidate(IceCandidate iceCandidate) {

        }

        @Override
        public void onIceCandidatesRemoved(IceCandidate[] iceCandidates) {

        }

        @Override
        public void onAddStream(MediaStream mediaStream) {

        }

        @Override
        public void onRemoveStream(MediaStream mediaStream) {

        }

        @Override
        public void onDataChannel(DataChannel dataChannel) {

        }

        @Override
        public void onRenegotiationNeeded() {

        }

        @Override
        public void onAddTrack(RtpReceiver rtpReceiver, MediaStream[] mediaStreams) {

        }

        @Override
        public void onConnectionChange(PeerConnection.PeerConnectionState newState) {

        }

        @Override
        public void onTrack(RtpTransceiver transceiver) {

        }
    }

    public static class AppSdpObserver implements SdpObserver {
        @Override
        public void onCreateSuccess(SessionDescription sessionDescription) {

        }

        @Override
        public void onSetSuccess() {

        }

        @Override
        public void onCreateFailure(String s) {

        }

        @Override
        public void onSetFailure(String s) {

        }
    }

    public interface SignalingServerListener {

        void onOfferReceived(SessionDescription description);

        void onAnswerReceived(SessionDescription description);

        void onIceCandidateReceived(IceCandidate iceCandidate);
    }
}
