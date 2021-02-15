/*! @file CBTBrowserTab.m
    @brief Browser tab plugin for Cordova
    @copyright
        Copyright 2016 Google Inc. All Rights Reserved.
    @copydetails
        Licensed under the Apache License, Version 2.0 (the "License");
        you may not use this file except in compliance with the License.
        You may obtain a copy of the License at
        http://www.apache.org/licenses/LICENSE-2.0
        Unless required by applicable law or agreed to in writing, software
        distributed under the License is distributed on an "AS IS" BASIS,
        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
        See the License for the specific language governing permissions and
        limitations under the License.
 */

#import "CordovaPluginSharescreen.h"
#import <ReplayKit/ReplayKit.h>
#import <WebRTC/WebRTC.h>

#define IS_SEND_TO_PLUGIN YES

@implementation CordovaPluginSharescreen {
    SignalingClient *signalClient;
    NSString *shareCallback;
    NSString *signalCallback;
    NSString *stopCallback;
}

- (void)echo:(CDVInvokedUrlCommand *)command {
  NSString *message =  command.arguments[0];
  CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:message];
  [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
}

- (void)stopScreenShare:(CDVInvokedUrlCommand *)command {
    self->stopCallback = command.callbackId;
    [self opneScreenSharePickerView];
}

- (void)sendSignal:(CDVInvokedUrlCommand *)command {
    NSString *answerString = [[command arguments] objectAtIndex:0];
    NSError *error = nil;
    NSDictionary *answerDict = [NSJSONSerialization
                          JSONObjectWithData:[answerString dataUsingEncoding:NSUTF8StringEncoding]
                          options:0
                          error:&error];
    if([answerDict objectForKey:@"serverUrl"] != nil) {
        RTCIceCandidate *candidate = [[RTCIceCandidate alloc] initWithSdp:[answerDict objectForKey:@"candidate"] sdpMLineIndex:[[answerDict objectForKey:@"sdpMLineIndex"] intValue] sdpMid:[answerDict objectForKey:@"sdpMid"]];
        [self->signalClient sendWithCandidate:candidate];
    } else if([answerDict objectForKey:@"type"] != nil && [@"ANSWER" isEqualToString:[answerDict objectForKey:@"type"]]) {
        RTCSessionDescription *answer = [[RTCSessionDescription alloc] initWithType:RTCSdpTypeAnswer sdp:[answerDict objectForKey:@"description"]];
        [self->signalClient sendWithSdp:answer];
    }
}


- (void)startScreenShare:(CDVInvokedUrlCommand *)command {
  // Show broadcats picker
    if (@available(iOS 12.0, *)) {
        self->shareCallback = command.callbackId;
        self->signalClient = [[SignalingClient alloc] initWithIsLocal:NO];
     
        [self->signalClient setDelegate:self];
        [self->signalClient enable];
        
        [self opneScreenSharePickerView];
    } else {
        CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Screen share available starting from iOS 12"];
        [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
    }
}

-(void) opneScreenSharePickerView {
    RPSystemBroadcastPickerView *pickerView = [[RPSystemBroadcastPickerView alloc] initWithFrame:CGRectZero];
    [pickerView setPreferredExtension:@"com.qbix.widgetapp.shareextension"];
    for(UIView *view in [pickerView subviews]) {
        if([view isKindOfClass:[UIButton class]]) {
            [((UIButton*)view) sendActionsForControlEvents:UIControlEventTouchUpInside];
            break;
        }
    }
}

- (void) sendDataToJS:(NSString*) it {
    if(self->shareCallback != nil) {
        CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:it];
        [result setKeepCallback:[NSNumber numberWithBool:YES]];
        [self.commandDelegate sendPluginResult:result callbackId:self->shareCallback];
    }
}

- (void)signalOnBoradcastFinished:(SignalingClient *)signalClient {
    if(self->stopCallback != nil) {
        CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:result callbackId:self->stopCallback];
    }
}

- (void)signalStop:(SignalingClient *)signalClient {
    
}

- (void)signalClient:(SignalingClient *)signalClient didReceiveCandidate:(RTCIceCandidate *)candidate {
    [self sendDataToJS:[self convertRTCIceCandidate:candidate]];

}

- (NSString*) convertRTCIceCandidate:(RTCIceCandidate *) candidate {
    NSDictionary *candidateDict = @{
        @"sdp":candidate.sdp,
        @"sdpMid":candidate.sdpMid,
        @"serverUrl":(candidate.serverUrl == nil) ? @"":candidate.serverUrl,
        @"sdpMLineIndex":@(candidate.sdpMLineIndex)
    };
    NSError *error;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:candidateDict
                                                       options:NSJSONWritingPrettyPrinted
                                                         error:&error];
    NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    return jsonString;
}

-(NSString*) convertRTCSessionDescription:(RTCSessionDescription *)sdp {
    NSString *typeOffer = @"";
    if(sdp.type == RTCSdpTypeOffer) {
        typeOffer = @"OFFER";
    } else if(sdp.type == RTCSdpTypeAnswer) {
        typeOffer = @"ANSWER";
    }
    NSDictionary *localSDPDict = @{
        @"type":typeOffer,
        @"description":sdp.sdp
    };
    NSError *jsonEerror;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:localSDPDict
                                                       options:NSJSONWritingPrettyPrinted
                                                         error:&jsonEerror];
    NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    return jsonString;
}


- (void)signalClient:(SignalingClient *)signalClient didReceiveRemoteSdp:(RTCSessionDescription *)sdp {
    if(sdp.type != RTCSdpTypeOffer) {
        return;
    }
    
    [self sendDataToJS:[self convertRTCSessionDescription:sdp]];
}

@end
