/* global chrome, CMD_START_BOT, bot */

var bot = {};

(function(engine){
    engine.getCurrentFen = function () {
        return $('.moveactions input').val();
        
        // Code below can be used in live version
        var figures = [];
        $("div.brd > div:not([id*=dummy]) img.chess_com_piece").each(function(i, o, e){
            var col = o.id.charCodeAt(o.id.lastIndexOf('_') + 1) - 96; // 'a'.charCodeAt(0) - 1
            var row = o.id.substr(o.id.lastIndexOf('_') + 2);
            var figure = o.src.substr(o.src.lastIndexOf('/') + 1, 2);
            if (!figures[row]) {
                figures[row] = [];
            }
            figures[row][col] = figure;
        });
        var board = '';
        for (var l = 8; l > 0; l--) {
            var spaces = 0;
            board += '/';
            if (figures[l]) {
                for (var i = 1; i <= 8; i++) {
                    if (figures[l][i]) {
                        if (spaces !== 0) {
                            board += spaces.toString();
                            spaces = 0;
                        }
                        if (figures[l][i][0] === 'w') {
                           board += figures[l][i][1].toUpperCase();
                        } else {
                            board += figures[l][i][1];
                        }
                    } else {
                        spaces++;
                    }
                }
                if (spaces !== 0) {
                    board += spaces.toString();
                }
            } else {
                board += '8';
            }
        }
        // Remove first slash
        board = board.substr(1);
        var lastMove = $('#notation .mhl > a').text();
        var movesCount = $('#notation span > a').length;
        var halfMovesCount = movesCount / 2; 
        var lastColor = movesCount % 2 === 0 ? 'b' : 'w';
        // rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR b KQkq d6 1 2
        board += ' ' + lastColor + ' KQkq ' + lastMove + ' ' + halfMovesCount + ' ' + (lastColor === 'b' ?  halfMovesCount + 1 : halfMovesCount);
    };
    
    engine.makeDecision = function (fen) {
        
    };
    
    engine.makeMove = function (nextMove) {
        
    };
    
})(bot);

chrome.runtime.onMessage.addListener(function(request, data, sendResponse) {

    switch (request) {
        case CMD_START_BOT:
            var fen = bot.getCurrentFen();
            var nextMove = bot.makeDecision(fen);
            bot.makeMove(nextMove);
            break;
    }

});