/*
 * Copyright 2017 Qbix Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing permissions and
 * limitations under the License.
 */

var exec = require('cordova/exec');

var PLUGIN_NAME = "CordovaPluginSharescreen"

function trace(text) {
  text = text.trim();
  const now = (window.performance.now() / 1000).toFixed(3);

  console.log(now, text);
}

let startTime = null;
let remoteStream;
let remotePeerConnection;
               
function handleSignal(data) {
    trace("remoteSocket Received data " + data);
    const description = JSON.parse(data);
    if(description.hasOwnProperty("candidate") || description.hasOwnProperty("serverUrl")) {
        description["candidate"] = description["sdp"];
        const iceCandidate = new RTCIceCandidate(description);
        console.log("remote ice candidate "+JSON.stringify(iceCandidate));
        remotePeerConnection.addIceCandidate(iceCandidate)
            .then(() => {
                trace(`addIceCandidate success.`);
            }).catch((error) => {
                trace(`failed to add ICE Candidate:\n`+`${error.toString()}.`);
            });
    } else if(description.hasOwnProperty("type") && (description["type"]==="offer" || description["type"]==="OFFER")) {
        //offerReceived
        console.log("remote offer");
        trace('remotePeerConnection setRemoteDescription start.');
        description["type"] = description["type"].toLowerCase();
        description["sdp"] = description["description"]
        remotePeerConnection.setRemoteDescription(description)
            .then(() => {
                console.log("setRemoteDescription success");
            }).catch(() => {
                trace(`Failed to create session description: ${error.toString()}.`);
            });

        trace('remotePeerConnection createAnswer start.');
        remotePeerConnection.createAnswer()
            .then(createdAnswer)
            .catch(()=>{
                trace(`Failed to create session description: ${error.toString()}.`);
            });
    } else if(description.hasOwnProperty("type") && (description["type"]==="answer"|| description["type"]==="ANSWER")) {
        //answreReceived
        console.log("remote answer");
        description["type"] = description["type"].toLowerCase();
        description["sdp"] = description["description"]
        trace('remotePeerConnection setRemoteDescription start.');
        remotePeerConnection.setRemoteDescription(description)
            .then(() => {
                console.log("setRemoteDescription success");
            }).catch(()=>{
                trace(`Failed to create session description: ${error.toString()}.`);
            });
    }
}
               
// Logs answer to offer creation and sets peer connection session descriptions.
function createdAnswer(description) {
    trace(`Answer from remotePeerConnection:\n${description.sdp}.`);

    trace('remotePeerConnection setLocalDescription start.');
    remotePeerConnection.setLocalDescription(description)
        .then(() => {
            console.log("setLocalDescription success");
        }).catch(() => {
            trace(`Failed to create session description: ${error.toString()}.`);
        });


    const newDescription = {
        "description":description.sdp,
        "type":"ANSWER"
    }
    
    exports.sendSignal(newDescription)
}

exports.startScreenShare = function(onStream, error) {
    startTime = window.performance.now();

    let servers = {
        "iceServers": [{"urls": "stun:stun.l.google.com:19302"}],
        "sdpSemantics":"unified-plan"
    };
    var pc_constraints = {};
    remotePeerConnection = new RTCPeerConnection(servers,pc_constraints);
    trace('Created remote peer connection object remotePeerConnection.');

      remotePeerConnection.addEventListener('signalingstatechange', function(event){
          const peerConnection = event.target;
          console.log('onsignalingstatechange: ', event);
          trace(`onsignalingstatechange state: ` +`${peerConnection.signalingState}.`);
      });
      remotePeerConnection.addEventListener('connectionstatechange', function(event){
          const peerConnection = event.target;
          console.log('onconnectionstatechange: ', event);
          trace(`onconnectionstatechange state: ` +`${peerConnection.connectionState}.`);
      });
      remotePeerConnection.addEventListener('icecandidate', function(event) {
          const peerConnection = event.target;
          const iceCandidate = event.candidate;
          if (iceCandidate) {
            const newIceCandidate = new RTCIceCandidate(iceCandidate);
            exports.sendSignal(newIceCandidate)

            trace(`ICE candidate:\n` +`${event.candidate.candidate}.`);
          }
      });
      remotePeerConnection.addEventListener('iceconnectionstatechange', function (event) {
          const peerConnection = event.target;
          console.log('ICE state change event: ', event);
          trace(`ICE state: ` +`${peerConnection.iceConnectionState}.`);
      });
      if("ontrack" in remotePeerConnection) {
          remotePeerConnection.addEventListener('track', function (event) {
              console.log("track", event)
              onStream(event);
          });
      } else {
          remotePeerConnection.addEventListener('addstream', function (event) {
              console.log("addstream", event)
              onStream(event);
          });
      }

    exec(function(rawData){
        handleSignal(rawData);
    }, error, PLUGIN_NAME, 'startScreenShare', []);
};

exports.stopScreenShare = function(success, error) {
    remotePeerConnection.close();
    remotePeerConnection = null;
    exec(success, error, PLUGIN_NAME, 'stopScreenShare', []);
}

exports.sendSignal = function(signal,success, error) {
   exec(success, error, PLUGIN_NAME, 'sendSignal', [JSON.stringify(signal)]);
};