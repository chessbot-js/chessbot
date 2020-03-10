$(document).ready(function () {
	$('.url-container').on('click', function(){
		chrome.tabs.create({'url': $(this).data('url')});
	});
	/*
	To send data to this port:
	var port = chrome.runtime.connect({name: "chessbot"});
	port.postMessage({moves: ["c2c4"], isWhiteTurn: true}); // Send data to the popup window
	port.onMessage.addListener(function(msg) {
		// Handle information from the popup
	});
	*/
	var moves // Moves made
	var isWhiteTurn // Whether it is white's turn or not
	chrome.runtime.onConnect.addListener(function(port) {
		console.assert(port.name == "chessbot");
  		port.onMessage.addListener(function(msg) {
			isWhiteTurn = msg.isWhiteTurn
			moves = msg.moves
  		});
	});
	$('.event').on('click', function() {
		$('.content').text("Best move: Thinking...")
        // ToDo: Analyze and display best move.
	// Moves shall be contained in :moves: and :isWhiteTurn: shall contain a boolean value as to whether
	// it is white's turn to move or not.
	});
});
