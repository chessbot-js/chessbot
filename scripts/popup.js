$(document).ready(function () {
	$('.url-container').on('click', function(){
		chrome.tabs.create({'url': $(this).data('url')});
	});
	$('.event').on('click', function() {
		$('.content').text("Best move: Thinking...")
        // ToDo: Analyze and display best move.
	});
});
