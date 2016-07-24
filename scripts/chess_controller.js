/*eslint-env browser*/
/* global chrome, CMD_START_BOT, bot */

var Bot = function ($) {
    var engine = {},
        b_console = { log : function (a) { } },
        bot_enable_debug = !('update_url' in chrome.runtime.getManifest());
    
    if (bot_enable_debug && console) {
        b_console =  console;
    }

    var g_backgroundEngineValid = true,
        g_backgroundEngine,
        g_analyzing = false,
        blob = null;

    /*
     var element = document.getElementById(request.query);
     dispatchMouseEvent(element, 'click', true, true);
    */

    var dispatchMouseEvent = function(target, var_args) {
            var e = document.createEvent("MouseEvents");
            e.initEvent.apply(e, Array.prototype.slice.call(arguments, 1));
            target.dispatchEvent(e);
    };

    function init (afterInit) {
        try {
            $.get("https://raw.githubusercontent.com/recoders/chessbot/master/scripts/garbochess-b.js", {},
                function (workerCode) {
                    blob = new Blob([workerCode], {type : 'javascript/worker'});
                    if (afterInit) {
                        b_console.log('Chess engine load correctly.');
                        afterInit();
                    }
            });
        } catch (error) {
            b_console.log('Chess engine not load correctly.');
            g_backgroundEngineValid = false;
        }
    }

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
            console.error("Error move:" + move);
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
                            var data_raw = e.data.replace('pv ', '');
                            var data = JSON.parse(data_raw);
                            b_console.log('Next moves: ' + data.humanMoves);
                            MakeMove(data);
                        } else if (e.data.match("^message") == "message") {
                            EnsureAnalysisStopped();
                        } else {
                            // I dont know what could be happened here:
                            // UIPlayMove(GetMoveFromString(e.data), null);
                        }
                    };
                    g_backgroundEngine.error = function (e) {
                        console.error("Error from background worker:" + e.message);
                    };
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
        }
    };

    // Live moves
    var movesMaded = 0;
    var getNextMove = function (movesArray) {
        if (movesArray.length > 0) {
            for(var i = 0; i < movesArray.length; i++) {
                if (i === movesMaded && movesArray[i].innerText !== '' && movesArray[i].innerText.indexOf('0') === -1) {
                    movesMaded++;
                    // b_console.log("Move: " + move);
                    return movesArray[i].innerText;
                }
            }
        }
        return false;
    };

    function regularMove (move) {
        if (g_backgroundEngine) {
            g_backgroundEngine.postMessage(move);
        } else {
            b_console.error('Engine is stopped. Suggestion cant be possible in live mode without working engine.');
        }
    }

    function analyze() {
        if (g_backgroundEngine) {
            b_console.log('Analyzing started.');
            g_backgroundEngine.postMessage("analyze");
        } else {
            b_console.log('Cant analyze: engine is stopped.');
        }
    }

    engine.makeLiveSuggest = function (movesArray) {
        // Terminate engine
        if (g_backgroundEngine != null) {
            g_backgroundEngine.terminate();
            g_backgroundEngine = null;
        }
        InitializeBackgroundEngine(function(){
            movesMaded = 0;
            var nextMove = getNextMove(movesArray);
            while (nextMove) {
                regularMove(nextMove);
                nextMove = getNextMove(movesArray);
            }
            analyze();
        });
    };

    engine.moveFound = null;

    init(InitializeBackgroundEngine);
    
    return engine;
}
bot = new Bot(jQuery);

var CookieMonster = function () {
    var cookieMonster = {};
    cookieMonster.get = function ( name ) {
        var cSIndex = document.cookie.indexOf( name );
        if (cSIndex == -1) return false;
        cSIndex = document.cookie.indexOf( name + "=" )
        if (cSIndex == -1) return false;
        var cEIndex = document.cookie.indexOf( ";", cSIndex + ( name + "=" ).length );
        if (cEIndex == -1) cEIndex = document.cookie.length;
        return document.cookie.substring( cSIndex + ( name + "=" ).length, cEIndex );
    };

    cookieMonster.del = function ( name ) {
        if ( getCookie( name )) {
            document.cookie = name + "=; expires=Thu, 01-Jan-70 00:00:01 GMT";
        }
    };

    cookieMonster.set = function ( name, value, expire ) {
        var time = new Date();
        time.setTime( time.getTime() + expire );
        document.cookie = name + "=" + value + "; expires=" + time.toGMTString();
        return true;
    };
    
    return cookieMonster;
}
var cookie = new CookieMonster();

var PageManager = function($, window, cookieManager){
    var page = page || {};
    const CURRENT_BOT_STANDART = 'bot_standart';
    const CURRENT_BOT_LIVE = 'bot_live';
    const CURRENT_BOT_SIMPLE = 'bot_simple';
    const CURRENT_BOT_COLOR_WHITE = 0;
    const CURRENT_BOT_COLOR_BLACK = 1;
    var currentBot = CURRENT_BOT_STANDART,
        enableSuggestion = true,
        eChessCookie = 'chessbot-echess-enabled',
        liveChessCookie = 'chessbot-live-enabled',
        currentColor = CURRENT_BOT_COLOR_WHITE,
        isBetaDesign = false;

    function toggleSuggestionLive(element) {
        enableSuggestion = !enableSuggestion;
        if (enableSuggestion) {
            $('#robot_message').show();
            $('#robot_enabled_message').text('Enabled');
            $(element).children('img').attr('src', 'https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png');
            $pinkSquare.show();
            $pinkSquare2.show();
            cookieManager.set(liveChessCookie, '1');
        } else {
            $('#robot_message').hide();
            $('#robot_enabled_message').text('Disabled');
            $(element).children('img').attr('src', 'https://raw.githubusercontent.com/recoders/chessbot/master/images/norobot-20.png');
            $pinkSquare.hide();
            $pinkSquare2.hide();
            cookieManager.set(liveChessCookie, '0');
        }
    }

    function livePagePreparations(engine) {
        var targets = isBetaDesign ? '.game-controls.game.playing div.notationVertical a.gotomove' : '.dijitVisible #moves div.notation .gotomove';
        // Robot icon actions
        $('#robot_message')
            .css('cursor', 'pointer')
            .on('click', function() {
                engine.makeLiveSuggest($(targets));
            });
        
        var clickTarget = '#robot_enabled_message';
        if (isBetaDesign) { clickTarget = "#robot_icon"; }
        
        $(clickTarget)
            .on('click', function(e) {
                toggleSuggestionLive(this);
                return false;
            });

        var previousMovesCount = 0;
        function movesObserver () {
            // fired when a mutation occurs
            var currentMovesCount = $(targets).filter(function () {
                return !!this.innerText;
            }).length;
            if (currentMovesCount > 0) {
                if (currentMovesCount != previousMovesCount) {
                    currentColor = currentMovesCount % 2 == 0 ? CURRENT_BOT_COLOR_WHITE : CURRENT_BOT_COLOR_BLACK;
                    previousMovesCount = currentMovesCount;
                    $('#robot_message').text('Thinking...');
                    // Possible new at each fire.
                    // var subtargetName = isBetaDesign ? '.dijitVisible #moves div.notation' : '.dijitVisible #moves div.notation';
                    engine.makeLiveSuggest($(targets));
                }
            } else {
                $('#robot_message').text('Game not available.');
            }
        }

        setInterval(movesObserver, 1000);
        // And go!
        // enableSuggestion = false; // Fix trouble with cookie removing after refresh. // cookieManager.get(liveChessCookie) == '0';
        // toggleSuggestionLive($('#robot_link')[0]);
        
    }
    
    currentBot = CURRENT_BOT_LIVE;
    
    page.createLiveBot = function (botEngine, isBeta) {
        isBetaDesign = isBeta == true;
        if (!isBeta) {
            $('#top_bar_settings').after('<span id="robot_enabled_message" title="Switch on/off." style="cursor: pointer; color: #fff; float: right; margin-right: 10px;">Enabled</span>'
                + '<a id="robot_link" href="http://re-coders.com/chessbot" target="_blank">'
                + '<img style="float: right; background-color: white; margin-right: 5px;" alt="Chess.bot icon" src="https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png" /></a>');
            $("#game_container_splitter").before('<img style="float: right; background-color: white; margin-right: 5px;" alt="Chess.bot icon" src="https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png" />'
                + '<span id="robot_message" style="cursor: pointer;font-size: 20px;position: relative;top: -60px;left: 45px;"></span>');
        } else {
            $('ul.nav-vertical').append('<li nav-item-hide="">'
                                        + '<a id="robot_icon" class="list-item" href="http://re-coders.com/chessbot" target="_blank">'
                                        + '<span class="nav-icon-wrapper">'
                                        + '<img style="background-color: white;" alt="Chess.bot icon" title="Enabled" src="https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png" />'
                                        + '</span>'
                                        + '<span id="robot_enabled_message"  class="item-label">Enabled</span>'
                                        + '</a></li>');
            $("#LiveChessMainContainer").prepend('<div id="robot_message" style="margin-right: 100px; z-index: 1000; position: relative; background-color: white; font-size: 20px; border-radius: 4px; padding: 6px;">Game not available.</div>')
        }
        currentBot = CURRENT_BOT_LIVE;
        livePagePreparations(botEngine);
    }

    page.createSimpleBot = function (botEngine) {
        $('.more').parent().after('<li><span id="robot_message" style="color: #fff; float: right; margin-right: 10px;">Hi there!</span>'
            + '<a id="robot_link" style="background-color: #5d873b;" href="http://re-coders.com/chessbot" title="Switch robot on/off. To open source - right click, then open in new tab.">'
            + '<img style="float: right; background-color: white; margin-right: 5px;" alt="Chess.bot icon" src="https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png" />'
            + '</a></li>');
        currentBot = CURRENT_BOT_SIMPLE;
        livePagePreparations(botEngine);
    }

    function toggleSuggestionStandart(control) {
        enableSuggestion = !enableSuggestion;
        if (enableSuggestion) {
            $('#robot_text').show();
            $(control).addClass('success')
                .children('img').attr('src', 'https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png');
            cookie.set(eChessCookie, '1');
        } else {
            $('#robot_text').hide();
            $(control).removeClass('success')
                .children('img').attr('src', 'https://raw.githubusercontent.com/recoders/chessbot/master/images/norobot-20.png');
            cookie.set(eChessCookie, '0');
        }
    }

    function standartPagePreparations(engine) {
        $('#robot_notice')
            .on('click', function(e) {
                toggleSuggestionStandart(this);
                return false;
            });

        enableSuggestion = cookieManager.get(eChessCookie) == '0';
        toggleSuggestionStandart($('#robot_notice')[0]);
    }

    page.createStandartBot = function (botEngine) {
        // eChess version
        $('.title.bottom-4')
            .before('<div id="robot_notice" title="Click me to enable/disable bot suggestions." class="notice bottom-8" style="cursor: pointer; height: 20px;"><span id="robot_text"></span></div>');
        $('#robot_text')
            .before($('<img>', {
                'id': 'robot_icon',
                'style': 'float: left; cursor: pointer;',
                'alt': 'ChessBot icon',
                'src': 'https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png',
                'title': 'Click me to enable/disable bot suggestions.'
            }));
        currentBot = CURRENT_BOT_STANDART;
        standartPagePreparations(botEngine);
    }


    // Suggestion squares
    var $pinkSquare = $('<div>', {
        'id': 'pinkSquare',
        'style': 'position: absolute; z-index: 1; opacity: 0.5; background-color: #7ef502;'
    }), $pinkSquare2 = $('<div>', {
        'id': 'pinkSquare',
        'style': 'position: absolute; z-index: 1; opacity: 0.5; background-color: #f55252;'
    });

    function madeMachineMove(move) {
        if (!move) return;
        var fromSquare = move.substring(0,2),
            toSquare = move.substring(2,4),
            // Find board container
            $boardContainer = isBetaDesign 
                    ? $('.tab-pane.active:not(.ng-hide) .game-board-container')
                    : $('.boardContainer').not('.visibilityHidden').not('.chess_com_hidden'),
            // Find board
            $board = isBetaDesign 
                    ? $boardContainer.find('.chessboard')
                    : $boardContainer.find('.chess_viewer'),
            // Calculate sizes
            boardHeight = $board.height(),
            boardWidth = $board.width(),
            betaSizeCorrection = isBetaDesign ? 1 : 2,
            pieceHeight = (boardHeight - betaSizeCorrection) / 8,
            pieceWidth = (boardWidth - betaSizeCorrection) / 8,
            // Is flipped?
            is_flipped = isBetaDesign ? $boardContainer.parent().find(".player-info.black.bottom").length > 0 : $board.hasClass('chess_boardFlipped'),
            betaPositionFix = isBetaDesign ? (is_flipped ? -1 : 1 ) : 0,
            betaVerticalFix = isBetaDesign ? (is_flipped ? boardHeight / 55 : -boardHeight / 55 ) : 1,
            betaHorizontalFix = isBetaDesign ? 0 : 1;
        
        /*
        // I keep this unusefull code to remember how can i made it fully automattic
        $board.find('.chess_com_piece.pinked').css('background-color', '');
        $board.find("img[id^=img_chessboard_][id$=_" + fromSquare+ "]").addClass('pinked').css('background-color', 'pink');
        */
        // Move pinkSquares to the right place
        $boardArea = $board.find("div[id^=chessboard_][id$=_boardarea]");

        function placeSquareToPoint($square, point) {
            var pinkTop, pinkLeft;
            if (!is_flipped) {
                pinkTop = $boardArea[0].offsetTop + (boardHeight - pieceHeight * (parseInt(point[1], 10) + betaPositionFix)) - betaVerticalFix; // 1 pixel from border
                pinkLeft = $boardArea[0].offsetLeft + pieceWidth * (point.charCodeAt(0) - 97) + betaHorizontalFix; // 'a'.charCodeAt(0) == 97
            } else {
                pinkTop = $boardArea[0].offsetTop + (pieceHeight * (parseInt(point[1], 10) - 1 + betaPositionFix)) + betaVerticalFix; // 1 pixel from border
                pinkLeft = $boardArea[0].offsetLeft + (boardWidth - pieceWidth * (point.charCodeAt(0) - 96)) - betaHorizontalFix; // 'a'.charCodeAt(0) == 97
            }

            $square.css({
                    'width': pieceWidth + 'px',
                    'height': pieceHeight + 'px',
                    'top': pinkTop + 'px',
                    'left': pinkLeft + 'px'
                });
            $square.appendTo($board);
        }

        placeSquareToPoint($pinkSquare, fromSquare);
        placeSquareToPoint($pinkSquare2, toSquare);
    }
    
    

    page.showMove = function (data) {        
        var move = (data || {}).nextMove;
        if (currentBot == CURRENT_BOT_STANDART) {
            $('#robot_text').text('Best move: '  + move);
        } else {
            // Live and simple version are same
            var humanMoves = (data || {}).humanMoves; 
            if (humanMoves != '') {
                humanMoves = humanMoves.split(' ');
                for (hm in humanMoves) {
                    if (hm == 0) { continue; }
                    humanMoves[hm] = ((parseInt(hm) + currentColor) % 2 == 0 ? '↑' : '↓') + humanMoves[hm];
                }
                move = (currentColor % 2 == 0 ? '↑' : '↓') + humanMoves.slice(0,5).join(' ');
            }
            
            $('#robot_message').text('Best move: '  + (move != '' ? move : ' : nothing =('));
            if (enableSuggestion) {
                madeMachineMove(data.machineMove);
            }
        }
    }
    
    return page;
};

var pageManager = new PageManager(jQuery, this, cookie);

// Startup code
$(document).ready(function() {
    if (window.location.pathname === '/live' || window.location.pathname === '/simple') {
        if (window.location.pathname === '/simple') {
            pageManager.createSimpleBot(bot);
        } else {
            setTimeout(function(){
                var betaDesign = $('#top_bar_settings').length == 0;
                pageManager.createLiveBot(bot, betaDesign);
            }, 5000);
        }
        bot.moveFound = pageManager.showMove;

    } else {

        pageManager.createStandartBot();
        bot.moveFound = pageManager.showMove;

        var fen = bot.getCurrentFen();
        bot.makeMove(fen);
    }
});
