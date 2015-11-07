/* global chrome, CMD_START_BOT, bot */

var bot = {};

(function(engine){
    var b_console = console || { log : function (a) { ; } };
    
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
                            var move = e.data.substr(e.data.lastIndexOf('NPS:'));
                            move = move.substr(move.indexOf(' ') + 2);
                            if (move.indexOf(' ') > -1) {
                                move = move.substr(0, move.indexOf(' '));
                            }
                            if (move == 'heckmate') {
                                move = 'Checkmate';
                            }
                            MakeMove(move);
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
            b_console.log('Analyzing');
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
})(bot);

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


$(document).ready(function() {
    if (window.location.pathname === '/live' || window.location.pathname === '/simple') {
        if (window.location.pathname === '/simple') {
            $('.more').parent().after('<li><span id="robot_message" style="color: #fff; float: right; margin-right: 10px;">Hi there!</span>'
                + '<a id="robot_link" style="background-color: #5d873b;" href="http://re-coders.com/chessbot" title="Switch robot on/off. To open source - right click, then open in new tab.">' 
                + '<img style="float: right; background-color: white; margin-right: 5px;" alt="Chess.bot icon" src="https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png" />'
                + '</a></li>');
        } else {
            $('#top_bar_settings').after('<span id="robot_message" style="color: #fff; float: right; margin-right: 10px;">Hi there!</span>'
                + '<a id="robot_link" href="http://re-coders.com/chessbot" title="Switch on/off. To open source - right click, then open in new tab.">' 
                + '<img style="float: right; background-color: white; margin-right: 5px;" alt="Chess.bot icon" src="https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png" /></a>');
        }
        // Live chess version
        bot.moveFound = function (move) {
            $('#robot_message').text('I suggest: '  + (move != '' ? move : ' : nothing =('));
        };

        $('#robot_message')
            .css('cursor', 'pointer')
            .on('click', function() {
                bot.makeLiveSuggest($('.dijitVisible #moves div.notation')[0]);
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
                    bot.makeLiveSuggest($('.dijitVisible #moves div.notation')[0]);
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
        
    } else {
        var eChessCookie = 'chessbot-echess-enabled';
        
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
        
        bot.moveFound = function (move) {
            $('#robot_text').text('I suggest: '  + move);
        };
        var fen = bot.getCurrentFen();
        bot.makeMove(fen);
    }
});
