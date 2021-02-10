//
//  SampleHandler.swift
//  Sharescreen
//
//  Created by Igor Martsekha on 21.01.2021.
//

import ReplayKit
import WebRTC

class SampleHandler: RPBroadcastSampleHandler {
    private var hasLocalSdp: Bool = false
    private var webRTCClient: WebRTCClient? = nil
    private var signalClient:SignalingClient? = nil;
    private var localCandidateCount: Int = 0;
    private var signalingConnected: Bool = false;
    private var hasRemoteSdp: Bool = false;
    private var remoteCandidateCount: Int = 0;
    
    override func broadcastStarted(withSetupInfo setupInfo: [String : NSObject]?) {
        self.webRTCClient = WebRTCClient()
        self.signalClient = SignalingClient(isLocal: true)
        
        self.webRTCClient?.delegate = self
        self.signalClient?.delegate = self
        self.signalClient?.enable()
        
        self.webRTCClient?.offer { (sdp) in
            self.hasLocalSdp = true
            self.signalClient?.send(sdp: sdp)
        }
        // User has requested to start the broadcast. Setup info from the UI extension can be supplied but optional.
    }
    
    override func broadcastPaused() {
        // User has requested to pause the broadcast. Samples will stop being delivered.
    }
    
    override func broadcastResumed() {
        // User has requested to resume the broadcast. Samples delivery will resume.
    }
    
    override func broadcastFinished() {
        self.signalClient?.sendOnBroadcastFinished()
    }
    
    override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleBufferType: RPSampleBufferType) {
        switch sampleBufferType {
        case RPSampleBufferType.video:
            guard let imageBuffer: CVImageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
                break
            }
            let rtcpixelBuffer = RTCCVPixelBuffer(pixelBuffer: imageBuffer)
            let timeStampNs: Int64 = Int64(CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sampleBuffer)) * 1000000000)
            let videoFrame =  RTCVideoFrame(buffer: rtcpixelBuffer, rotation: RTCVideoRotation._0, timeStampNs: timeStampNs)
            print(videoFrame)
            self.webRTCClient?.handleFrameVideo(videoFrame: videoFrame);
            
            break
        case RPSampleBufferType.audioApp:
            // Handle audio sample buffer for app audio
            break
        case RPSampleBufferType.audioMic:
            // Handle audio sample buffer for mic audio
            break
        @unknown default:
            // Handle other sample buffer types
            fatalError("Unknown type of sample buffer")
        }
    }
}

extension SampleHandler: SignalClientDelegate {
    func signalClientDidConnect(_ signalClient: SignalingClient) {
        self.signalingConnected = true
    }
    
    func signalClientDidDisconnect(_ signalClient: SignalingClient) {
        self.signalingConnected = false
    }
    
    func signalOnBoradcastFinished(_ signalClient: SignalingClient) {
        
    }
    
    func signalStop(_ signalClient: SignalingClient) {
        if(webRTCClient != nil) {
            
        }
        let err =  NSError(domain:"", code:111, userInfo:nil)
        self.finishBroadcastWithError(err);
    }
    
    func signalClient(_ signalClient: SignalingClient, didReceiveRemoteSdp sdp: RTCSessionDescription) {
        if sdp.type != RTCSdpType.answer {
            return;
        }
        print("Received remote sdp")
        self.webRTCClient?.set(remoteSdp: sdp) { (error) in
            self.hasRemoteSdp = true
        }
    }
    
    func signalClient(_ signalClient: SignalingClient, didReceiveCandidate candidate: RTCIceCandidate) {
        print("Received remote candidate")
        self.remoteCandidateCount += 1
        self.webRTCClient?.set(remoteCandidate: candidate)
    }
}

extension SampleHandler: WebRTCClientDelegate {
    
    func webRTCClient(_ client: WebRTCClient, didDiscoverLocalCandidate candidate: RTCIceCandidate) {
        print("discovered local candidate")
        self.localCandidateCount += 1
        self.signalClient?.send(candidate: candidate)
    }
    
    func webRTCClient(_ client: WebRTCClient, didChangeConnectionState state: RTCIceConnectionState) {

    }
    
    func webRTCClient(_ client: WebRTCClient, didReceiveData data: Data) {
        DispatchQueue.main.async {
            let message = String(data: data, encoding: .utf8) ?? "(Binary: \(data.count) bytes)"
            print(message);
        }
    }
}
