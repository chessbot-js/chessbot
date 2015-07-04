/* global chrome, CMD_START_BOT, bot */

var bot = {};

(function(engine){
    var g_backgroundEngineValid = true;
    var g_backgroundEngine;
    var g_analyzing = false;
    
    // CopyPaste from garbochess.js
    function FormatSquare(square) {
        var letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        return letters[(square & 0xF) - 4] + ((9 - (square >> 4)) + 1);
    }

    function FormatMove(move) {
        var result = FormatSquare(move & 0xFF) + FormatSquare((move >> 8) & 0xFF);
        if (move & moveflagPromotion) {
            if (move & moveflagPromoteBishop) result += "b";
            else if (move & moveflagPromoteKnight) result += "n";
            else if (move & moveflagPromoteQueen) result += "q";
            else result += "r";
        }
        return result;
    }

    function GetMoveFromString(moveString) {
        var moves = GenerateValidMoves();
        for (var i = 0; i < moves.length; i++) {
            if (FormatMove(moves[i]) == moveString) {
                return moves[i];
            }
        }
        alert("busted! ->" + moveString + " fen:" + GetFen());
    }
    // End of copypaste
    
    function EnsureAnalysisStopped() {
        if (g_analyzing && g_backgroundEngine != null) {
            g_backgroundEngine.terminate();
            g_backgroundEngine = null;
        }
    }
    
    function MakeMove(move) {
        if (engine.moveFound != null) {
            engine.moveFound(move);
        } else {
            alert(move);
        }
    }

    function InitializeBackgroundEngine(success) {
        if (!g_backgroundEngineValid) {
            return false;
        }

        if (g_backgroundEngine == null) {
            // g_backgroundEngineValid = true;
            try {
                $.get("https://raw.githubusercontent.com/glinscott/Garbochess-JS/master/js/garbochess.js", {},
                    function (workerCode) {
                        try {
                            var blob = new Blob([workerCode], {type : 'javascript/worker'});
                            
                            g_backgroundEngine = new Worker(window.URL.createObjectURL(blob));
                            g_backgroundEngine.onmessage = function (e) {
                                if (e.data.match("^pv") == "pv") {
                                    // Ready Move
                                    var move = e.data.substr(e.data.lastIndexOf('NPS:'));
                                    move = move.substr(move.indexOf(' ') + 2);
                                    move = move.substr(0, move.indexOf(' '));
                                    MakeMove(move);
                                } else if (e.data.match("^message") == "message") {
                                    EnsureAnalysisStopped();
                                    console.log(e.data.substr(8, e.data.length - 8));
                                } else {
                                    // I dont now what could be happened here:
                                    // UIPlayMove(GetMoveFromString(e.data), null);
                                }
                            }
                            g_backgroundEngine.error = function (e) {
                                alert("Error from background worker:" + e.message);
                            }
                            g_backgroundEngine.postMessage("position " + GetFen());
                            if (success) {
                                success();
                            }
                        } catch (error) {
                            g_backgroundEngineValid = false;
                        }
                    }
                );
            } catch (error) {
                g_backgroundEngineValid = false;
            }
        }

        return g_backgroundEngineValid;
    }
    
    engine.getCurrentFen = function () {
        return $('.moveactions input').val();
    };
    
    engine.makeMove = function (fen) {
        if (g_backgroundEngine) {
            g_backgroundEngine.postMessage("position " + fen);
            g_backgroundEngine.postMessage("analyze");
      
        } else { 
            InitializeBackgroundEngine(function(){
                g_backgroundEngine.postMessage("position " + fen);
                g_backgroundEngine.postMessage("analyze");
            });
        };
    };
    
    engine.moveFound = null;

    InitializeBackgroundEngine();
})(bot);

bot.moveFound = function (move) {
    $('.title.bottom-4').text('I suggest: '  + move);
};

$(document).ready(function() {
    $('.title.bottom-4').before('<a href="https://github.com/recoders/chrome-bot" title="Open source"><img style="float: left;" alt="Chess.bot icon" src="https://raw.githubusercontent.com/recoders/chrome-bot/master/images/robot-20.png" /></a>');
    var fen = bot.getCurrentFen();
    bot.makeMove(fen);
});

chrome.runtime.onMessage.addListener(function(request, data, sendResponse) {

    switch (request) {
        case CMD_START_BOT:
            var fen = bot.getCurrentFen();
            bot.makeMove(fen);
            break;
    }

});