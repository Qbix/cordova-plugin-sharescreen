// @ts-check

var elementTree = require('elementtree');
var fs = require('fs');
var path = require('path');
var plist = require('plist');
var Q = require('q');
var xcode = require('xcode');


function removeDuplicateSubsequentLines(string) {
  var lineArray = string.split('\n');
  return lineArray.filter((line, idx) => {
    return idx === 0 || ( line !== lineArray[idx - 1] )
  }).join('\n');
}

function replacePlaceholdersInPlist(plistPath, placeHolderValues) {
    var plistContents = fs.readFileSync(plistPath, 'utf8');
    console.log("Before content: "+plistContents)
    for (var i = 0; i < placeHolderValues.length; i++) {
        var placeHolderValue = placeHolderValues[i],
            regexp = new RegExp(placeHolderValue.placeHolder, "g");
        plistContents = plistContents.replace(regexp, placeHolderValue.value);
        plistContents = removeDuplicateSubsequentLines(plistContents);
    }
    console.log("After content: "+plistContents)
    fs.writeFileSync(plistPath, plistContents);
}

console.log(
  'Running fixAppEntitlements hook, fixing the app entitlements 🦄 ',
  'start'
);

module.exports = function (context) {
  var deferral = new Q.defer();

  if (context.opts.cordova.platforms.indexOf('ios') < 0) {
    console.log('You have to add the ios platform before adding this plugin!', 'error');
  }

  var contents = fs.readFileSync(
    path.join(context.opts.projectRoot, 'config.xml'),
    'utf-8'
  );

  if (contents) {
    contents = contents.substring(contents.indexOf('<'));
  }

  // Get the bundle-id from config.xml
  var etree = elementTree.parse(contents);
  var bundleId = etree.getroot().get('id');

  var iosFolder = context.opts.cordova.project
    ? context.opts.cordova.project.root
    : path.join(context.opts.projectRoot, 'platforms/ios/');

  fs.readdir(iosFolder, function (err, data) {
    var projectFolder
    var projectName;
    var run = function () {
      var placeHolderValues = [
        {
          placeHolder: '__APP_IDENTIFIER__',
          value: bundleId
        }
      ];

      // Update app entitlements
      ['Debug', 'Release'].forEach(config => {
        var entitlementsPath = path.join(iosFolder, projectName, 'Entitlements-' + config + '.plist');
        replacePlaceholdersInPlist(entitlementsPath, placeHolderValues);
      });
      console.log('Successfully added app group information to the app entitlement files!', 'success');
      deferral.resolve();
    };

    if (err) {
      console.log(err, 'error');
    }

    // Find the project folder by looking for *.xcodeproj
    if (data && data.length) {
      data.forEach(function (folder) {
        if (folder.match(/\.xcodeproj$/)) {
          projectFolder = path.join(iosFolder, folder);
          projectName = path.basename(folder, '.xcodeproj');
        }
      });
    }

    if (!projectFolder || !projectName) {
      console.log('Could not find an *.xcodeproj folder in: ' + iosFolder, 'error');
    }

    run();
  });

  return deferral.promise;
};
