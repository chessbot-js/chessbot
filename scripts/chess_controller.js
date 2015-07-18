/* global chrome, CMD_START_BOT, bot */

var bot = {};

(function(engine){
    var g_backgroundEngineValid = true;
    var g_backgroundEngine;
    var g_analyzing = false;
    
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
                $.get("https://raw.githubusercontent.com/recoders/chrome-bot/master/scripts/garbochess-m.js", {},
                    function (workerCode) {
                        try {
                            var blob = new Blob([workerCode], {type : 'javascript/worker'});
                            
                            g_backgroundEngine = new Worker(window.URL.createObjectURL(blob));
                            g_backgroundEngine.onmessage = function (e) {
                                console.log(e);
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
    
    // Live moves
    var movesMaded = 0;
    var getNextMove = function (movesContainer) {
        var move = null;
        var children = $(movesContainer).children();
        if (children.length > 0) {
            $(movesContainer).children().find('.gotomove').each(function(i, o){
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
            // g_backgroundEngine.postMessage("analyze");
        } else { 
            InitializeBackgroundEngine(function(){
                g_backgroundEngine.postMessage(move);
                // g_backgroundEngine.postMessage("analyze");
            });
        };
    };
    
    engine.makeLiveMove = function (movesContainer) {
        var nextMove = getNextMove(movesContainer);
        while (nextMove) {
            console.log('Catched move: #' + movesMaded + '. ' + nextMove);
            regularMove(nextMove);
            nextMove = getNextMove(movesContainer);
        }
    };
    
    engine.analyze = function () {
        if (g_backgroundEngine) {
            console.log('Analyzing');
            g_backgroundEngine.postMessage("analyze");
        } else {
            console.log('Cant analyze: engine is broken');
        }
    }
    
    engine.moveFound = null;

    InitializeBackgroundEngine();
})(bot);

bot.moveFound = function (move) {
    $('#robot_message').text('I suggest: '  + move);
};

$(document).ready(function() {
    $('#top_bar_settings').after('<span id="robot_message" style="color: #fff; float: right; margin-right: 10px;">Robot message</span>'
        + '<a href="https://github.com/recoders/chrome-bot" title="Open source">' 
        + '<img style="float: right; background-color: white; margin-right: 5px;" alt="Chess.bot icon" src="https://raw.githubusercontent.com/recoders/chrome-bot/master/images/robot-20.png" /></a>');
    if (window.location.pathname === '/live') {
        
        $('#robot_message').on('click', function() {
            bot.analyze();
        });
        
        // Live chess version
        MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
        var observer = new MutationObserver(function(mutations, observer) {
            // fired when a mutation occurs
            console.log(mutations, observer);
            var movesContainer = mutations[0].target;
            bot.makeLiveMove(movesContainer);
        });

        var movesList = $('.dijitVisible #moves div.notation')[0];
        observer.observe(movesList, {
          subtree: true,
          attributes: false,
          childList: true,
        });
        
        bot.makeLiveMove(movesList);
        
    } else {
        // Online chess version
        var fen = bot.getCurrentFen();
        bot.makeMove(fen);
    }
});
