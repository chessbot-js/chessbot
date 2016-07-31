$(document).ready(function () {
    $('#startButton').on('click', function () {
        chrome.tabs.create({'url':  'https://www.chess.com/play'});
    });
    $('#gotoWebsite').on('click', function () {
        chrome.tabs.create({'url':  'http://re-coders.com/chessbot'});
    });
    $('#askQuestion').on('click', function () {
        chrome.tabs.create({'url':  'https://github.com/recoders/chessbot/issues/new?title=Question:&body=I+have+a+question+about+your+extension:&labels=question'});
    });
    $('#bugReport').on('click', function () {
        chrome.tabs.create({'url':  'https://github.com/recoders/chessbot/issues/new?title=Bug:&body=Describe+situation+as+full+as+you+can&labels=bug'});
    });
    $('#donate').on('click', function () {
        chrome.tabs.create({'url':  'https://pledgie.com/campaigns/32291'});
    });
});
