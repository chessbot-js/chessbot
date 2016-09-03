$(document).ready(function () {
    $('.url-container').on('click', function(){
        chrome.tabs.create({'url': $(this).data('url')});
    });
});
