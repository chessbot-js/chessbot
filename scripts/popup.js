/* 
 * This file is licensed under Mozilla Public License
 * For more information visit: http://opensource.org/licenses/MPL-2.0.
 * © jfkz
 * http://jfkz.ru
 */
/* global chrome, CMD_START_BOT */

window.onload = function () {
    document.getElementById("finish-button").onclick = function () {
        // Do NOT forget that the method is ASYNCHRONOUS
        chrome.tabs.query({
            active: true,               // Select active tabs
            windowId: chrome.windows.WINDOW_ID_CURRENT     // In the current window
        }, function(array_of_Tabs) {
            // Since there can only be one active tab in one active window, 
            // the array has only one element
            var tab = array_of_Tabs[0];
            var tabId = tab.id;
            chrome.tabs.sendMessage(tabId, CMD_START_BOT, {}, function(result) {
                
            });
        });
    };
};
/**/


