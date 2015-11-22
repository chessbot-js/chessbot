/* global chrome, CMD_START_BOT, bot */

var bot = {};
var bot_enable_debug =  false;

(function(engine, $){
    var b_console = { log : function (a) { ; } };
    if (bot_enable_debug && console) {
        b_console =  console;
    }

    var g_backgroundEngineValid = true;
    var g_backgroundEngine;
    var g_analyzing = false;
    var blob = null;

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
            $.get("https://raw.githubusercontent.com/recoders/chessbot/master/scripts/garbochess-m.js", {},
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
                        alert("Error from background worker:" + e.message);
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
            b_console.error('Engine is stopped. Suggestion cant be possible in live mode without working engine.');
        };
    };

    function analyze() {
        if (g_backgroundEngine) {
            b_console.log('Analyzing started.');
            g_backgroundEngine.postMessage("analyze");
        } else {
            b_console.log('Cant analyze: engine is stopped.');
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
})(bot, jQuery);

var cookie = {};
(function(cookieMonster){
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
        time = new Date();
        time.setTime( time.getTime() + expire );
        document.cookie = name + "=" + value + "; expires=" + time.toGMTString();
        return true;
    };


})(cookie);

var pageManager = {};
(function(page, $, window){
    page = page || {};
    const CURRENT_BOT_STANDART = 'bot_standart';
    const CURRENT_BOT_LIVE = 'bot_live';
    const CURRENT_BOT_SIMPLE = 'bot_simple';
    var currentBot = CURRENT_BOT_STANDART;

    function livePagePreparations(engine) {
        // Robot icon actions
        $('#robot_message')
            .css('cursor', 'pointer')
            .on('click', function() {
                engine.makeLiveSuggest($('.dijitVisible #moves div.notation')[0]);
            });

        $('#robot_link')
            .on('click', function(e) {
                $('#robot_message').toggle();
                $this = $(this);
                if ($this.hasClass('norobot')) {
                    $this.children('img').attr('src', 'https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png');
                    $this.removeClass('norobot');
                } else {
                    $this.children('img').attr('src', 'https://raw.githubusercontent.com/recoders/chessbot/master/images/norobot-20.png');
                    $this.addClass('norobot');
                }
                return false;
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
                    engine.makeLiveSuggest($('.dijitVisible #moves div.notation')[0]);
                }
            } else {
                $('#robot_message').text('Hi there!');
            }
        });

        observer.observe($('#chess_boards')[0], {
          subtree: true,
          attributes: false,
          childList: true
        });
    }

    function standartPagePreparations(engine) {
        var eChessCookie = 'chessbot-echess-enabled';
        $('#robot_notice')
            .on('click', function(e) {
                $('#robot_text').toggle();
                var $this = $(this);
                if ($this.hasClass('norobot')) {
                    $this.children('img').attr('src', 'https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png');
                    $this.removeClass('norobot').addClass('success');
                    cookie.set(eChessCookie, '1');
                } else {
                    $this.children('img').attr('src', 'https://raw.githubusercontent.com/recoders/chessbot/master/images/norobot-20.png');
                    $this.addClass('norobot').removeClass('success');
                    cookie.set(eChessCookie, '0');
                }
                return false;
            });

        (function(){
            var $this = $('#robot_notice');
            if (cookie.get(eChessCookie) == '0') {
                $this.children('img').attr('src', 'https://raw.githubusercontent.com/recoders/chessbot/master/images/norobot-20.png');
                $this.addClass('norobot').removeClass('success');
                $('#robot_text').hide();
            } else {
                $this.children('img').attr('src', 'https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png');
                $this.removeClass('norobot').addClass('success');
                $('#robot_text').show();
            }
        })();
    }

    page.createLiveBot = function (botEngine) {
        $('#top_bar_settings').after('<span id="robot_message" style="color: #fff; float: right; margin-right: 10px;">Hi there!</span>'
            + '<a id="robot_link" href="http://re-coders.com/chessbot" title="Switch on/off. To open source - right click, then open in new tab.">'
            + '<img style="float: right; background-color: white; margin-right: 5px;" alt="Chess.bot icon" src="https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png" /></a>');
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
        'style': 'position: absolute; z-index: 1; opacity: 0.5; background-color: pink;',
    });
    var $pinkSquare2 = $('<div>', {
        'id': 'pinkSquare',
        'style': 'position: absolute; z-index: 1; opacity: 0.5; background-color: pink;',
    });

    function madeMachineMove(move) {
        if (!move) return;
        var fromSquare = move.substring(0,2);
        var toSquare = move.substring(2,4);
        // Find board container
        var $boardContainer = $('.boardContainer').not('.visibilityHidden').not('.chess_com_hidden');
        // Find board
        var $board = $boardContainer.find('.chess_viewer');
        // Calculate sizes
        var boardHeight = $board.height();
        var boardWidth = $board.width();
        var pieceHeight = (boardHeight - 2) / 8;
        var pieceWidth = (boardWidth - 2) / 8;
        // Is flipped?
        var is_flipped = $board.hasClass('chess_boardFlipped');
        /*
        // I keep this unusefull code to remember how can i made it fully automattic
        $board.find('.chess_com_piece.pinked').css('background-color', '');
        $board.find("img[id^=img_chessboard_][id$=_" + fromSquare+ "]").addClass('pinked').css('background-color', 'pink');
        */
        // Move pinkSquares to the right place
        $boardArea = $board.find("div[id^=chessboard_][id$=_boardarea]");

        function placeSquareToPoint($square, point) {
            if (!is_flipped) {
                var pinkTop = $boardArea[0].offsetTop + (boardHeight - pieceHeight * point[1]) - 1; // 1 pixel from border
                var pinkLeft = $boardArea[0].offsetLeft + pieceWidth * (point.charCodeAt(0) - 97) + 1; // 'a'.charCodeAt(0) == 97
            } else {
                var pinkTop = $boardArea[0].offsetTop + (pieceHeight * (point[1] - 1)) + 1; // 1 pixel from border
                var pinkLeft = $boardArea[0].offsetLeft + (boardWidth - pieceWidth * (point.charCodeAt(0) - 96)) - 1; // 'a'.charCodeAt(0) == 97
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
        move = (data || {}).nextMove;
        if (currentBot == CURRENT_BOT_STANDART) {
            $('#robot_text').text('I suggest: '  + move.nextMove);
        } else {
            // Live and simple version are same
            $('#robot_message').text('I suggest: '  + (move != '' ? move : ' : nothing =('));
            madeMachineMove(data.machineMove);
        }
    }

})(pageManager, jQuery, this);

$(document).ready(function() {
    if (window.location.pathname === '/live' || window.location.pathname === '/simple') {
        if (window.location.pathname === '/simple') {
            pageManager.createSimpleBot(bot);
        } else {
            pageManager.createLiveBot(bot);
        }

        bot.moveFound = pageManager.showMove;

    } else {

        pageManager.createStandartBot();
        bot.moveFound = pageManager.showMove;

        var fen = bot.getCurrentFen();
        bot.makeMove(fen);
    }
});
