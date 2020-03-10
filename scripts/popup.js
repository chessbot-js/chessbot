/*
 * This script receives the best move and displays it, thatway we don't have to edit the page. If we edit the 
 * page, we can be detected, so we display the best move in this popup window. We don't actually calculate the
 * best move here, the background.js script does that and then sends us the best move.
**/

/*
 * To send data to this script:
 *
 * var port = chrome.runtime.connect({name: "chessbot"});
 * port.postMessage({bestMove: "e2e4"}); // Example of how to send best move to the popup window
 * port.onMessage.addListener(function(msg) {
 *	return;
 * });
*/

$(document).ready(function () {
	$('.url-container').on('click', function(){
		chrome.tabs.create({'url': $(this).data('url')});
	});
	var bestMove
	/*
	chrome.runtime.onConnect.addListener(function(port) {
		console.assert(port.name == "chessbot");
  		port.onMessage.addListener(function(msg) {
			bestMove=msg.bestMove;
  		});
	}); */
	chrome.runtime.onConnectExternal.addListener(function(port) {
		console.assert(port.name == "chessbot");
  		port.onMessage.addListener(function(msg) {
			bestMove=msg.bestMove;
  		});
	});
	$('.event').on('click', function() {
		$('.content').text(bestMove);
	});
});
