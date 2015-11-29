// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
    var newURL = "http://re-coders.com/chessbot/installed.html";
    var currentVersion = chrome.runtime.getManifest().version;
    var hash = "#thisVersion=" + currentVersion;
    if(details.reason == "install"){
        hash += "&action=install";
        chrome.tabs.create({ url: newURL + hash });
    } else if(details.reason == "update"){
        if (currentVersion !== details.previousVersion) {
            hash += "&action=update&previousVersion=" +  details.previousVersion;
            chrome.tabs.create({ url: newURL + hash});
        }
    }
});
