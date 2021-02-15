# cordova-plugin-sharescreen
  Cordova plugin to share Android&iOS screen to webbrowser.

## Building

Install cordova-plugin-browsertabs plugin:

    cordova plugin add https://github.com/Qbix/cordova-plugin-sharescreen.git

# Platforms

* iOS (since iOS 11)
* Android (since API 21) 

## Usage

Start screenshare 

	cordova.plugins.sharescreen.startScreenShare(function(mediaStream){}, function(error){});

Stop screenshare:

	cordova.plugins.sharescreen.stopScreenShare(function(){}, function(error){});


