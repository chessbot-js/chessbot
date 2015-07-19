/* global chrome, CMD_START_BOT, bot */

var bot = {};

(function(engine){
    var g_backgroundEngineValid = true;
    var g_backgroundEngine;
    var g_analyzing = false;
    var blob = null;
    
    function init (afterInit) {
        try {
        $.get("https://raw.githubusercontent.com/recoders/chrome-bot/master/scripts/garbochess-m.js", {},
            function (workerCode) {
                blob = new Blob([workerCode], {type : 'javascript/worker'});
                if (afterInit) {
                    console.log('Chess engine load correctly.');
                    afterInit();
                }
            });
        } catch (error) {
            console.log('Chess engine not load correctly.');
            g_backgroundEngineValid = false;
        }
    };
    
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
        if (!blob || !g_backgroundEngineValid) {
            return false;
        }

        if (g_backgroundEngine == null) {
            // g_backgroundEngineValid = true;
                try {
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
                        } else {
                            // I dont know what could be happened here:
                            // UIPlayMove(GetMoveFromString(e.data), null);
                        }
                    }
                    g_backgroundEngine.error = function (e) {
                        alert("Error from background worker:" + e.message);
                    }
                    // g_backgroundEngine.postMessage("position rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -");
                    if (success) {
                        success();
                    }
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
    
    // Live moves
    var movesMaded = 0;
    var getNextMove = function (movesContainer) {
        var move = null;
        var children = $(movesContainer).children();
        if (children.length > 0) {
            children.find('.gotomove').each(function(i, o){
                if (i === movesMaded && o.innerText !== '') {
                    move = o.innerText;
                }
            });
            movesMaded++;
        }
        return move;
    };

    function regularMove (move) {
        if (g_backgroundEngine) {
            g_backgroundEngine.postMessage(move);
        } else { 
            console.error('Engine is stopped. Suggestion cant be possible in live mode without working engine.');
        };
    };

    function analyze() {
        if (g_backgroundEngine) {
            console.log('Analyzing');
            g_backgroundEngine.postMessage("analyze");
        } else {
            console.log('Cant analyze: engine is stopped.');
        }
    };
    
    engine.makeLiveSuggest = function (movesContainer) {
        // Terminate engine
        if (g_backgroundEngine != null) {
            g_backgroundEngine.terminate();
            g_backgroundEngine = null;
        }
        InitializeBackgroundEngine(function(){
            movesMaded = 0;
            var nextMove = getNextMove(movesContainer);
            while (nextMove) {
                regularMove(nextMove);
                nextMove = getNextMove(movesContainer);
            }
            analyze();
        });
    };
    
    engine.moveFound = null;

    init(InitializeBackgroundEngine);
})(bot);



$(document).ready(function() {
    $('#top_bar_settings').after('<span id="robot_message" style="color: #fff; float: right; margin-right: 10px;">Hi there!</span>'
        + '<a href="https://github.com/recoders/chrome-bot" title="Open source">' 
        + '<img style="float: right; background-color: white; margin-right: 5px;" alt="Chess.bot icon" src="https://raw.githubusercontent.com/recoders/chrome-bot/master/images/robot-20.png" /></a>');
    if (window.location.pathname === '/live') {
        // Live chess version
        bot.moveFound = function (move) {
            $('#robot_message').text('I suggest: '  + (move != '' ? move : ' : nothing =('));
        };

        $('#robot_message')
            .css('cursor', 'pointer')
            .on('click', function() {
                bot.makeLiveSuggest($('.dijitVisible #moves div.notation')[0]);
            });
        
        var previousMovesCount = 0;
        MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
        var observer = new MutationObserver(function(mutations, observer) {
            // fired when a mutation occurs
            var currentMovesCount = $('.dijitVisible #moves div.notation .gotomove').filter(function () {
                return !!this.innerText;
            }).length;
            if (currentMovesCount > 0) {
                if (currentMovesCount !== previousMovesCount) {
                    previousMovesCount = currentMovesCount;
                    $('#robot_message').text('Thinking...');
                    // Possible new at each fire.
                    bot.makeLiveSuggest($('.dijitVisible #moves div.notation')[0]);
                }
            } else {
                $('#robot_message').text('Hi there!');
            }
        });

        observer.observe($('#chess_boards')[0], {
          subtree: true,
          attributes: false,
          childList: true,
        });
        
        // bot.makeLiveSuggest($('.dijitVisible #moves div.notation')[0]);
        
    } else {
        // eChess version
        $('.title.bottom-4').before('<img style="float: left;" alt="Chess.bot icon" src="https://raw.githubusercontent.com/recoders/chrome-bot/master/images/robot-20.png" /></a>');
        bot.moveFound = function (move) {
            $('.title.bottom-4').text('I suggest: '  + move);
        }
        var fen = bot.getCurrentFen();
        bot.makeMove(fen);
    }
});
