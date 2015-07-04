// When the extension is installed or upgraded ...
chrome.runtime.onInstalled.addListener(function() {
    // Replace all rules ...
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        // With a new rule ...
	chrome.declarativeContent.onPageChanged.addRules([
        {
            // That fires when a page's URL contains a 'chess.com/echess' ...
	    conditions: [
	        new chrome.declarativeContent.PageStateMatcher({
	            pageUrl: { urlContains: 'chess.com/echess/game' },
	          })
            ],
            // And shows the extension's page action.
            // Unused now
            actions: [ new chrome.declarativeContent.ShowPageAction() ]
        }
        ]);
    });
});