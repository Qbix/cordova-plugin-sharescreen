//
//  SignalingClient.swift
//  Cordova iOSRTC Sample
//
//  Created by Igor Martsekha on 21.01.2021.
//

import Foundation
import WebRTC

@objc protocol SignalClientDelegate: class {
    func signalStop(_ signalClient: SignalingClient)
    func signalOnBoradcastFinished(_ signalClient: SignalingClient)
    func signalClient(_ signalClient: SignalingClient, didReceiveRemoteSdp sdp: RTCSessionDescription)
    func signalClient(_ signalClient: SignalingClient, didReceiveCandidate candidate: RTCIceCandidate)
}

@objc final class SignalingClient: NSObject {
    private let SHARE_GROUP_NAME = <SHARE_GROUP_NAME>;
    private let STOP = "STOP"
    private let BROADCAST_FINISHED = "BROADCAST_FINISHED"
    private let RTC_SDP = "RTC_SDP"
    private let RTC_ICE_CANDIDATE = "RTC_ICE_CANDIDATE"
    private let RTC_ICE_CANDIDATE_REMOTE = "RTC_ICE_CANDIDATE_REMOTE"
    
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()
    private let sharedUserDefaults: UserDefaults
    @objc weak var delegate: SignalClientDelegate?
    @objc var isLocal: Bool = true;
    
    @objc init(isLocal:Bool) {
        self.sharedUserDefaults = UserDefaults(suiteName: SHARE_GROUP_NAME)!
        self.isLocal = isLocal;
        sharedUserDefaults.set(false, forKey: STOP)
        sharedUserDefaults.set(false, forKey: BROADCAST_FINISHED)
        sharedUserDefaults.set("", forKey: RTC_SDP)
        sharedUserDefaults.set("", forKey: RTC_ICE_CANDIDATE)
        sharedUserDefaults.set("", forKey: RTC_ICE_CANDIDATE_REMOTE)
        sharedUserDefaults.synchronize()
    }
    
    @objc func enable() {
        sharedUserDefaults.addObserver(self, forKeyPath: RTC_SDP, options: NSKeyValueObservingOptions.new, context: nil);
        sharedUserDefaults.addObserver(self, forKeyPath: STOP, options: NSKeyValueObservingOptions.new, context: nil);
        sharedUserDefaults.addObserver(self, forKeyPath: BROADCAST_FINISHED, options: NSKeyValueObservingOptions.new, context: nil);
        sharedUserDefaults.addObserver(self, forKeyPath: RTC_ICE_CANDIDATE, options: NSKeyValueObservingOptions.new, context: nil);
        sharedUserDefaults.addObserver(self, forKeyPath: RTC_ICE_CANDIDATE_REMOTE, options: NSKeyValueObservingOptions.new, context: nil);
    }
    
    @objc func send(sdp rtcSdp: RTCSessionDescription) {
        let message = Message.sdp(SessionDescription(from: rtcSdp))
        do {
            let dataMessage = try self.encoder.encode(message)
            sharedUserDefaults.set(dataMessage, forKey: RTC_SDP)
        }
        catch {
            debugPrint("Warning: Could not encode sdp: \(error)")
        }
    }
    
    @objc func sendStopSignal() {
        sharedUserDefaults.set(true, forKey: STOP)
    }
    
    @objc func sendOnBroadcastFinished() {
        sharedUserDefaults.set(true, forKey: BROADCAST_FINISHED)
    }
    
    @objc func send(candidate rtcIceCandidate: RTCIceCandidate) {
        let message = Message.candidate(IceCandidate(from: rtcIceCandidate))
        do {
            let dataMessage = try self.encoder.encode(message)
            if(isLocal) {
                sharedUserDefaults.set(dataMessage, forKey: RTC_ICE_CANDIDATE_REMOTE)
            } else {
                sharedUserDefaults.set(dataMessage, forKey: RTC_ICE_CANDIDATE)
            }
        }
        catch {
            debugPrint("Warning: Could not encode candidate: \(error)")
        }
    }
    
    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if(keyPath == nil || (keyPath != RTC_SDP && keyPath != RTC_ICE_CANDIDATE && keyPath != RTC_ICE_CANDIDATE_REMOTE && keyPath != STOP)) {
            return;
        }
        if(keyPath == STOP) {
            self.delegate?.signalStop(self)
            return;
        }
        if(keyPath == BROADCAST_FINISHED) {
            self.delegate?.signalOnBoradcastFinished(self)
            return;
        }
        
        let data = sharedUserDefaults.object(forKey: keyPath!) as? Data;
        if(data == nil) {
            return;
        }
        let message: Message
        do {
            message = try self.decoder.decode(Message.self, from: data!)
        }
        catch {
            debugPrint("Warning: Could not decode incoming message: \(error)")
            return
        }
        switch message {
            case .candidate(let iceCandidate):
                if((keyPath == RTC_ICE_CANDIDATE_REMOTE && !isLocal) || (keyPath == RTC_ICE_CANDIDATE && isLocal)) {
                    self.delegate?.signalClient(self, didReceiveCandidate: iceCandidate.rtcIceCandidate)
                }
            case .sdp(let sessionDescription):
                self.delegate?.signalClient(self, didReceiveRemoteSdp: sessionDescription.rtcSessionDescription)
        }
    }
}
