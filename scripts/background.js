// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
    var newURL = "http://chessbot-jfkz.c9users.io/installed.html";
    // var newURL = "http://re-coders.com/chessbot/installed.html";
    var hash = "#thisVersion=" + chrome.runtime.getManifest().version;;
    if(details.reason == "install"){
        hash += "&action=install";
        chrome.tabs.create({ url: newURL + hash });
    } else if(details.reason == "update"){
        hash += "&action=update&previousVersion=" +  details.previousVersion;
        chrome.tabs.create({ url: newURL + hash});
    }
});
