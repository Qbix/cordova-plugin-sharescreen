
module.exports = function(context) {
    var child_process = require('child_process');
    var fs = require("fs");
    var path = require("path");
    var CONSTANTS = require('./const_params');

	var cordova_util = context.requireCordovaModule('cordova-lib/src/cordova/util');
	var ConfigParser = context.requireCordovaModule('cordova-common').ConfigParser;
	var projectRoot = cordova_util.isCordova()
	var xml = cordova_util.projectConfig(projectRoot)
    var cfg = new ConfigParser(xml)

    var projectName = cfg.name()
    var androidPlatformPath = path.join(projectRoot, 'platforms', 'android')
    var iosPlatformPath = path.join(projectRoot, 'platforms', 'ios')
    var packageName = cfg.packageName()

	replaceContent(path.join(iosPlatformPath, projectName, "Plugins/cordova-plugin-sharescreen","SignalingClient.swift"), "<SHARE_GROUP_NAME>",'"'+CONSTANTS.APP_GROUP_PREFIX+'.'+packageName+'"');
    replaceContent(path.join(iosPlatformPath, projectName, "Plugins/cordova-plugin-sharescreen","CordovaPluginSharescreen.h"), "<app_name_swift_header>",'"'+projectName+'-Swift.h'+'"');
    replaceContent(path.join(iosPlatformPath, projectName, "Plugins/cordova-plugin-sharescreen","CordovaPluginSharescreen.m"), "<SHARE_GROUP_NAME>", packageName+CONSTANTS.BUNDLE_SUFFIX);


    function replaceContent(sourceFile, findString, replaceString) {
        var content = fs.readFileSync(sourceFile, 'utf-8');;
        content = content.replace(findString, replaceString)
        fs.writeFileSync(sourceFile, content, 'utf-8');
    }
}
