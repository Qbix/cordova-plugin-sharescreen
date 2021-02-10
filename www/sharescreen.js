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

const IS_ANDROID = true;


let startTime = null;

let remoteStream;
let remotePeerConnection;

function handleSignal(data) {
    trace("remoteSocket Received data " + data);
    const description = JSON.parse(data);
    if(description.hasOwnProperty("candidate") || description.hasOwnProperty("serverUrl")) {
        if(IS_ANDROID) {
            description["candidate"] = description["sdp"];
        }
        //addIceCandidate
        const iceCandidate = new RTCIceCandidate(description);
        console.log("remote ice candidate "+JSON.stringify(iceCandidate));
        remotePeerConnection.addIceCandidate(iceCandidate)
            .then(() => {
                handleConnectionSuccess(remotePeerConnection);
            }).catch((error) => {
            handleConnectionFailure(remotePeerConnection, error);
        });
    } else if(description.hasOwnProperty("type") && (description["type"]==="offer" || description["type"]==="OFFER")) {
        //offerReceived
        console.log("remote offer");
        trace('remotePeerConnection setRemoteDescription start.');
        if(IS_ANDROID) {
            description["type"] = description["type"].toLowerCase();
            description["sdp"] = description["description"]
        }
        remotePeerConnection.setRemoteDescription(description)
            .then(() => {
                setRemoteDescriptionSuccess(remotePeerConnection);
            }).catch(setSessionDescriptionError);

        trace('remotePeerConnection createAnswer start.');
        remotePeerConnection.createAnswer()
            .then(createdAnswer)
            .catch(setSessionDescriptionError);
    } else if(description.hasOwnProperty("type") && (description["type"]==="answer"|| description["type"]==="ANSWER")) {
        //answreReceived
        console.log("remote answer");
        if(IS_ANDROID) {
            description["type"] = description["type"].toLowerCase();
            description["sdp"] = description["description"]
        }
        trace('remotePeerConnection setRemoteDescription start.');
        remotePeerConnection.setRemoteDescription(description)
            .then(() => {
                setRemoteDescriptionSuccess(remotePeerConnection);
            }).catch(setSessionDescriptionError);
    }
}

const IS_SEND_VIA_PLUGIN = true;

var remoteSocket = new WebSocket("ws://192.168.0.119:8080/connect");
//remoteSocket.onopen = function() {
//    trace("remoteSocket Соединение установлено.");
//};
//
//remoteSocket.onclose = function(event) {
//    if (event.wasClean) {
//        trace('remoteSocket Соединение закрыто чисто');
//    } else {
//        trace('remoteSocket Обрыв соединения'); // например, "убит" процесс сервера
//    }
//    trace('remoteSocket Код: ' + event.code + ' причина: ' + event.reason);
//};
//
//remoteSocket.onmessage = function(event) {
//    handleSignal(event.data);
//};
//
//remoteSocket.onerror = function(error) {
//    trace("remoteSocket Ошибка " + error.message);
//};


// Connects with new peer candidate.
function handleConnection(event) {
    const peerConnection = event.target;
    const iceCandidate = event.candidate;
    if (iceCandidate) {
        const newIceCandidate = new RTCIceCandidate(iceCandidate);
        if(IS_SEND_VIA_PLUGIN) {
            exports.sendSignal(newIceCandidate)
        } else {
            remoteSocket.send(JSON.stringify(newIceCandidate))
        }

        trace(`ICE candidate:\n` +
            `${event.candidate.candidate}.`);
    }
}

// Logs that the connection succeeded.
function handleConnectionSuccess(peerConnection) {
    trace(`addIceCandidate success.`);
};

// Logs that the connection failed.
function handleConnectionFailure(peerConnection, error) {
    trace(`failed to add ICE Candidate:\n`+
        `${error.toString()}.`);
}

// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
    trace(`Failed to create session description: ${error.toString()}.`);
}

// Logs success when setting session description.
function setDescriptionSuccess(peerConnection, functionName) {
    trace(`${functionName} complete.`);
}

// Logs success when localDescription is set.
function setLocalDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

// Logs success when remoteDescription is set.
function setRemoteDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}

//// Logs offer creation and sets peer connection session descriptions.
//function createdOffer(description) {
//    trace('remotePeerConnection setLocalDescription start.');
//    remotePeerConnection.setLocalDescription(description)
//        .then(() => {
//            setLocalDescriptionSuccess(remotePeerConnection);
//        }).catch(setSessionDescriptionError);
//    socket.send(JSON.stringify(description));
//}

// Logs answer to offer creation and sets peer connection session descriptions.
function createdAnswer(description) {
    trace(`Answer from remotePeerConnection:\n${description.sdp}.`);

    trace('remotePeerConnection setLocalDescription start.');
    remotePeerConnection.setLocalDescription(description)
        .then(() => {
            setLocalDescriptionSuccess(remotePeerConnection);
        }).catch(setSessionDescriptionError);


    const newDescription = {
        "description":description.sdp,
        "type":"ANSWER"
    }
    if(IS_SEND_VIA_PLUGIN) {
        exports.sendSignal(newDescription)
    } else {
        remoteSocket.send(JSON.stringify(newDescription));
    }
}

exports.startScreenShare = function(success, onStream, error) {
    startTime = window.performance.now();

    let servers = {
        "iceServers": [{"urls": "stun:stun.l.google.com:19302"}],
        "sdpSemantics":"plan-b"
    };
    var pc_constraints = {};
    remotePeerConnection = new RTCPeerConnection(servers,pc_constraints);
    trace('Created remote peer connection object remotePeerConnection.');

    remotePeerConnection.addEventListener('icecandidate', handleConnection);
    remotePeerConnection.addEventListener('iceconnectionstatechange', function (event) {
          const peerConnection = event.target;
          console.log('ICE state change event: ', event);
          trace(`ICE state: ` +
              `${peerConnection.iceConnectionState}.`);
      });
    remotePeerConnection.addEventListener('addstream', function (event) {
        onStream(event.stream);
   });

    exec(function(rawData){
        console.log(rawData);
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
