/*eslint-env browser*/
/* global chrome */

var Bot = function($) {
  var engine = {},
    b_console = {
      log: function(a) {}
    },
    bot_enable_debug = !('update_url' in chrome.runtime.getManifest());

  if (bot_enable_debug && console) {
    b_console = console;
  }

  var g_backgroundEngineValid = true,
    g_backgroundEngine = null,
    g_analyzing = false,
    blob = null;

  function init(afterInit) {
    try {
      $.get("https://raw.githubusercontent.com/recoders/chessbot/master/scripts/garbochess-b.js", {},
        function(workerCode) {
          blob = new Blob([workerCode], {
            type: 'javascript/worker'
          });
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
    if (g_analyzing && g_backgroundEngine !== null) {
      g_backgroundEngine.terminate();
      g_backgroundEngine = null;
    }
  }

  function MakeMove(move) {
    if (engine.moveFound !== null) {
      engine.moveFound(move);
    } else {
      console.error("Error move:" + move);
    }
  }

  function InitializeBackgroundEngine(success) {
    if (!blob || !g_backgroundEngineValid) {
      return false;
    }

    if (g_backgroundEngine === null) {
      // g_backgroundEngineValid = true;
      try {
        g_backgroundEngine = new Worker(window.URL.createObjectURL(blob));
        g_backgroundEngine.onmessage = function(e) {
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
        g_backgroundEngine.error = function(e) {
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

  engine.makeMove = function(fen) {
    if (g_backgroundEngine) {
      g_backgroundEngine.postMessage("position " + fen);
      g_backgroundEngine.postMessage("analyze");

    } else {
      InitializeBackgroundEngine(function() {
        g_backgroundEngine.postMessage("position " + fen);
        g_backgroundEngine.postMessage("analyze");
      });
    }
  };

  // Live moves
  var movesMaded = 0;
  var getNextMove = function(movesArray) {
    if (movesArray.length > 0) {
      for (var i = 0; i < movesArray.length; i++) {
        if (i === movesMaded && movesArray[i].innerText !== '' && movesArray[i].innerText.indexOf('0') === -1) {
          movesMaded++;
          // b_console.log("Move: " + move);
          return movesArray[i].innerText.replace('O-O+', 'O-O').replace('х', 'x'); // Sometimes it was happened
        }
      }
    }
    return false;
  };

  function regularMove(move) {
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

  engine.makeLiveSuggest = function(movesArray) {
    // Terminate engine
    if (g_backgroundEngine !== null) {
      g_backgroundEngine.terminate();
      g_backgroundEngine = null;
    }
    InitializeBackgroundEngine(function() {
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

var CookieMonster = function(cookiePrefix) {
  cookiePrefix = cookiePrefix || 'hi-thibault-dont-forget-to-upgrade-your-site';
  var cookieMonster = {};
  cookieMonster.get = function(name) {
    name = cookiePrefix + '-' + name;
    var cSIndex = document.cookie.indexOf(name);
    if (cSIndex == -1) return false;
    cSIndex = document.cookie.indexOf(name + "=")
    if (cSIndex == -1) return false;
    var cEIndex = document.cookie.indexOf(";", cSIndex + (name + "=").length);
    if (cEIndex == -1) cEIndex = document.cookie.length;
    return document.cookie.substring(cSIndex + (name + "=").length, cEIndex);
  };

  cookieMonster.del = function(name) {
    name = cookiePrefix + '-' + name;
    if (getCookie(name)) {
      document.cookie = name + "=; expires=Thu, 01-Jan-70 00:00:01 GMT";
    }
  };

  cookieMonster.set = function(name, value, expire) {
    name = cookiePrefix + '-' + name;
    var time = new Date();
    time.setTime(time.getTime() + expire);
    document.cookie = name + "=" + value + "; expires=" + time.toGMTString();
    return true;
  };

  return cookieMonster;
}

var PageManager = function($, window, cookieManager) {
  if (!cookieManager) {
    cookieManager = new CookieMonster(makeid())
  }
  var page = page || {};
  const CURRENT_BOT_STANDART = 'bot_standart';
  const CURRENT_BOT_LIVE = 'bot_live';
  const CURRENT_BOT_SIMPLE = 'bot_simple';
  const CURRENT_BOT_LICHESS = 'bot_lichess';
  const CURRENT_BOT_CHESSKID_SIMPLE = 'bot_chesskid_simple';
  const CURRENT_BOT_CHESSKID_STANDART = 'bot_chesskid_standart';
  const CURRENT_BOT_COLOR_WHITE = 0;
  const CURRENT_BOT_COLOR_BLACK = 1;
  var botLinkId = makeid(),
    botImgId = makeid(),
    botIconId = makeid(),
    botMessageId = makeid(),
    botTextId = makeid(),
    botNoticeId = makeid(),
    botMessageEnabledId = makeid(),
    greenSquareId = makeid(),
    pinkSquareId = makeid(),

    currentBot = CURRENT_BOT_STANDART,
    enableSuggestion = true,
    eChessCookie = 'chessbot-echess-enabled',
    liveChessCookie = 'chessbot-live-enabled',
    currentColor = CURRENT_BOT_COLOR_WHITE,
    isBetaDesign = false;

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var size = Math.floor(Math.random() * 30) + 10;

    for (var i = 0; i < size; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    text = possible.charAt(Math.floor(Math.random() * 25)) + text;

    return text;
  }

  page.getCurrentFen = function() {
    return $('.moveactions input').val();
  };

  function toggleSuggestionLive(element) {
    enableSuggestion = !enableSuggestion;
    if (enableSuggestion) {
      $('#' + botMessageId).show();
      $('#' + botMessageEnabledId).text('Enabled');
      $(element).children('img').attr('src', 'https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png');
      $greenSquare.show();
      $pinkSquare.show();
      cookieManager.set(liveChessCookie, '1');
    } else {
      $('#' + botMessageId).hide();
      $('#' + botMessageEnabledId).text('Disabled');
      $(element).children('img').attr('src', 'https://raw.githubusercontent.com/recoders/chessbot/master/images/norobot-20.png');
      $greenSquare.hide();
      $pinkSquare.hide();
      cookieManager.set(liveChessCookie, '0');
    }
  }

  function livePagePreparations(engine) {
    var targets;
    switch (currentBot) {
      case CURRENT_BOT_LICHESS:
        targets = '.lichess_ground .moves move';
        break;
      case CURRENT_BOT_CHESSKID_SIMPLE:
        targets = '#moves div.notation .gotomove';
        break;
      default:
        targets = isBetaDesign ? '.game-controls div.move-list-container a.gotomove' : '.dijitVisible #moves div.notation .gotomove';
        break;
    }

    // Robot icon actions
    $('#' + botMessageId)
      .css('cursor', 'pointer')
      .on('click', function() {
        engine.makeLiveSuggest($(targets));
      });

    var clickTarget = '#' + botMessageEnabledId;
    if (isBetaDesign) {
      clickTarget = "#" + botIconId;
    }

    $(clickTarget)
      .on('click', function(e) {
        toggleSuggestionLive(this);
        return false;
      });

    var previousMovesCount = 0;
    var MutationObserverClass = MutationObserver || window.MutationObserver || window.WebKitMutationObserver;
    var observer = new MutationObserverClass(function(mutations, observer) {
      // fired when a mutation occurs
      var currentMovesCount = $(targets).filter(function() {
        return !!this.innerText;
      }).length;
      if (currentMovesCount > 0) {
        if (currentMovesCount != previousMovesCount) {
          currentColor = currentMovesCount % 2 == 0 ? CURRENT_BOT_COLOR_WHITE : CURRENT_BOT_COLOR_BLACK;
          previousMovesCount = currentMovesCount;
          $('#' + botMessageId).text('Thinking...');
          // Possible new at each fire.
          // var subtargetName = isBetaDesign ? '.dijitVisible #moves div.notation' : '.dijitVisible #moves div.notation';
          engine.makeLiveSuggest($(targets));
        }
      } else {
        $('#' + botMessageId).text('Game not available.');
      }
    });

    var observeReadyInterval = setInterval(function() {
      var observeTarget;
      switch (currentBot) {
        case CURRENT_BOT_LICHESS:
          observeTarget = $('.moves');
          break;
        case CURRENT_BOT_LIVE:
          observeTarget = isBetaDesign ? $('.game-controls .move-list-container') : $('#chess_boards');
          break;
        case CURRENT_BOT_CHESSKID_SIMPLE:
          observeTarget = $('#moves');
          break;
      }
      if (observeTarget.length > 0) {
        observer.observe(observeTarget[0], {
          subtree: true,
          attributes: false,
          childList: true
        });
        clearInterval(observeReadyInterval);
      }
    }, 5000);
    // And go!
    // enableSuggestion = false; // Fix trouble with cookie removing after refresh. // cookieManager.get(liveChessCookie) == '0';
    // toggleSuggestionLive($('#robot_link')[0]);

  }

  currentBot = CURRENT_BOT_LIVE;

  var attachButtonInNewDesign = function(isLive) {
    $('div.top-level-nav').after( // '<div class="top-level-nav">' +
      '<a id="' + botIconId + '" class="menu-link" href="http://re-coders.com/chessbot/" target="_blank">' +
      '<img id="' + botImgId + '" style="background-color: white;" alt="Chess.bot icon" title="Enabled" src="https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png" />' +
      '<b id="' + botMessageEnabledId + '" class="item-label">Enabled</b>' +
      '</a>');
  }

  page.createLiveBot = function(botEngine, isBeta) {
    isBetaDesign = isBeta == true;
    if (!isBeta) {
      $('#top_bar_settings').after('<span id="' + botMessageEnabledId + '" title="Switch on/off." style="cursor: pointer; color: #fff; float: right; margin-right: 10px;">Enabled</span>' +
        '<a id="' + botLinkId + '" href="http://re-coders.com/chessbot/" target="_blank">' +
        '<img style="float: right; background-color: white; margin-right: 5px;" alt="Chess.bot icon" src="https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png" /></a>');
      $("#game_container_splitter").before('<img style="float: right; background-color: white; margin-right: 5px;" alt="Chess.bot icon" src="https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png" />' +
        '<span id="' + botMessageId + '" style="cursor: pointer;font-size: 20px;position: relative;top: -60px;left: 45px;"></span>');
    } else {
      attachButtonInNewDesign(true);
      $("div.live-app div.sidebar").prepend('<div id="' + botMessageId + '" style="margin-right: 100px; z-index: 1000; position: relative; background-color: white; font-size: 20px; border-radius: 4px; padding: 6px;">Game not available.</div>')
    }
    currentBot = CURRENT_BOT_LIVE;
    livePagePreparations(botEngine);
  }

  page.createSimpleBot = function(botEngine) {
    $('.more').parent().after('<li><span id="' + botMessageId + '" style="color: #fff; float: right; margin-right: 10px;">Hi there!</span>' +
      '<a id="' + botLinkId + '" style="background-color: #5d873b;" href="http://re-coders.com/chessbot/" title="Switch robot on/off. To open source - right click, then open in new tab.">' +
      '<img style="float: right; background-color: white; margin-right: 5px;" alt="Chess.bot icon" src="https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png" />' +
      '</a></li>');
    currentBot = CURRENT_BOT_SIMPLE;
    livePagePreparations(botEngine);
  }

  page.createLiChessBot = function(botEngine) {
    // LiChess version
    var link1 = 'http://re-coders.com/chessbot/?' + getRandomInt(10000, 99999),
        link2 = 'https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png?' + getRandomInt(10000, 99999);
    if ($('.lichess_game').hasClass('variant_standard')) {
      $.get('https://chess.re-coders.com/c.php?u=' + link1, function(data1) {
        $.get('https://chess.re-coders.com/c.php?u=' + link2, function(data2) {
          $('#topmenu > section:last-child').after('<a id="' + botLinkId + '" href="' + data1 + '" target="_blank">' +
            '<img style="background-color: white; margin: 5px 5px 0px 0px;" alt="Chess.bot icon" src="' + data2.replace('http', 'https') + '" /></a>' +
            '<span id="' + botMessageEnabledId + '" title="Switch on/off." style="cursor: pointer; color: #fff; position: relative; top: -4px; font-size: 16px;">Enabled</span>');
        });
      });
      $(".lichess_ground > div:first-child").before('<span id="' + botMessageId + '" style="cursor: pointer; font-size: 20px; background-color: white; border-radius: 5px; padding: 5px;">Bot ready</span>');
      currentBot = CURRENT_BOT_LICHESS;
      livePagePreparations(botEngine);
    }
  }

  page.createChessKidBot = function(botEngine) {
    // ChessKid version
    $('.logo').after('<a id="' + botLinkId + '" href="http://re-coders.com/chessbot/" target="_blank"><img style="background-color: white;margin: 0px 2px 0px 10px;width: 38px;vertical-align: middle;border-radius: 4px;" alt="Chess.bot icon" src="https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png"></a>' +
      '<span id="' + botMessageEnabledId + '" title="Switch on/off." style="vertical-align: middle; cursor: pointer;color: #2c2c2c;margin-right: 10px;background-color: #fff;padding: 10px;border-radius: 2px;font-weight: bold;">Enabled</span>');
    $("#chess_board").before('<span id="' + botMessageId + '" style="cursor: pointer;font-size: 20px;position: relative;top: -3px;left: 133px;background-color: #fff;padding: 5px 10px;border-radius: 3px;">Bot ready</span>');

    currentBot = CURRENT_BOT_CHESSKID_SIMPLE;
    livePagePreparations(botEngine);
  }

  function toggleSuggestionStandart(control) {
    enableSuggestion = !enableSuggestion;
    var ableText = enableSuggestion ? 'Enabled' : 'Disabled';
    var ableIcon = enableSuggestion ? 'robot-20.png' : 'norobot-20.png';
    if (isBetaDesign) {
      $('#' + botMessageEnabledId).text(ableText);
      $('#' + botImgId)
        .attr('title', ableText)
        .attr('src', 'https://raw.githubusercontent.com/recoders/chessbot/master/images/' + ableIcon);
      if (enableSuggestion) {
        $('#' + botTextId).show();
      } else {
        $('#' + botTextId).hide();
      }
    } else {
      $(control).addClass('success')
        .children('img').attr('src', 'https://raw.githubusercontent.com/recoders/chessbot/master/images/' + ableIcon);
    }
    cookieManager.set(eChessCookie, enableSuggestion ? '1' : '0');
  }

  function standartPagePreparations(engine) {
    var buttonId = isBetaDesign ? botIconId : botNoticeId;
    $('#' + buttonId)
      .on('click', function(e) {
        toggleSuggestionStandart(this);
        return false;
      });

    enableSuggestion = cookieManager.get(eChessCookie) == '0';
    toggleSuggestionStandart($('#' + botNoticeId)[0]);
  }

  page.createStandartBot = function(botEngine, isBeta) {
    // eChess version
    isBetaDesign = isBeta == true;
    if (isBetaDesign) {
      attachButtonInNewDesign(true);
      $('#topPlayer div.user-tagline')
        .after('<div id="' + botTextId + '" style="font-size: 115%; font-weight: bolder;">Best move: calculating...</div>');
    } else {
      $('.title.bottom-4')
        .before('<div id="' + botNoticeId + '" title="Click me to enable/disable bot suggestions." class="notice bottom-8" style="cursor: pointer; height: 20px;"><span id="' + botTextId + '"></span></div>');
      $('#' + botTextId)
        .before($('<img>', {
          'id': botIconId,
          'style': 'float: left; cursor: pointer;',
          'alt': 'ChessBot icon',
          'src': 'https://raw.githubusercontent.com/recoders/chessbot/master/images/robot-20.png',
          'title': 'Click me to enable/disable bot suggestions.'
        }));
    }
    currentBot = CURRENT_BOT_STANDART;
    standartPagePreparations(botEngine);
  }

  // Suggestion squares
  var $greenSquare = $('<div>', {
      'id': greenSquareId,
      'style': 'position: absolute; z-index: 1; opacity: 0.5; background-color: #7ef502;'
    }),
    $pinkSquare = $('<div>', {
      'id': pinkSquareId,
      'style': 'position: absolute; z-index: 1; opacity: 0.5; background-color: #f55252;'
    });

  function madeMachineMove(move) {
    if (!move) return;
    var fromSquare = move.substring(0, 2),
      toSquare = move.substring(2, 4),
      // Find board container
      $boardContainer = isBetaDesign ?
      $('.main-board .chessboard-container'):
      $('.boardContainer').not('.visibilityHidden').not('.chess_com_hidden'),
      // Find board
      $board = currentBot == CURRENT_BOT_LICHESS ? $('.content .cg-board') : (
        isBetaDesign ?
        $boardContainer.find('.chessboard') :
        $boardContainer.find('.chess_viewer')
      ),
      // Calculate sizes
      boardHeight = $board.height(),
      boardWidth = $board.width(),
      betaSizeCorrection = isBetaDesign || currentBot == CURRENT_BOT_CHESSKID_SIMPLE ? 1 : 2,
      pieceHeight = (boardHeight - betaSizeCorrection) / 8,
      pieceWidth = (boardWidth - betaSizeCorrection) / 8,
      // Is flipped?
      is_flipped = currentBot == CURRENT_BOT_LICHESS ? $board.parent().hasClass('orientation-black') : (
        isBetaDesign ? $boardContainer.parent().parent().find(".board-player.black.bottom").length > 0 : $board.hasClass('chess_boardFlipped')
      ),
      betaPositionFix = 0,
      betaVerticalFix = isBetaDesign ? 0 : 1,
      betaHorizontalFix = isBetaDesign ? 0 : 1,
      chessKidVerticalFix = currentBot == CURRENT_BOT_CHESSKID_SIMPLE ? -12 : 0,
      chessKidHorizontalFix = currentBot == CURRENT_BOT_CHESSKID_SIMPLE ? -16 : 0,
      $boardArea = currentBot === CURRENT_BOT_LICHESS ? $board : $board;

    // Move pinkSquares to the right place
    function placeSquareToPointChessCom($square, point) {
      $('#' + $square.attr('id')).remove(); // Fix for: https://github.com/recoders/chessbot/issues/20
      var pinkTop, pinkLeft;
      if (!is_flipped) {
        pinkTop = $boardArea[0].offsetTop + (boardHeight - pieceHeight * (parseInt(point[1], 10) + betaPositionFix)) + betaVerticalFix + chessKidVerticalFix; // 1 pixel from border
        pinkLeft = $boardArea[0].offsetLeft + pieceWidth * (point.charCodeAt(0) - 97) + betaHorizontalFix + chessKidHorizontalFix; // 'a'.charCodeAt(0) == 97
      } else {
        pinkTop = $boardArea[0].offsetTop + (pieceHeight * (parseInt(point[1], 10) - 1 + betaPositionFix)) + betaVerticalFix + chessKidVerticalFix; // 1 pixel from border
        pinkLeft = $boardArea[0].offsetLeft + (boardWidth - pieceWidth * (point.charCodeAt(0) - 96)) - betaHorizontalFix + chessKidHorizontalFix; // 'a'.charCodeAt(0) == 97
      }

      $square.css({
        'width': pieceWidth + 'px',
        'height': pieceHeight + 'px',
        'top': pinkTop + 'px',
        'left': pinkLeft + 'px'
      });
      $square.appendTo($board);
    }

    placeSquareToPointChessCom($greenSquare, fromSquare);
    placeSquareToPointChessCom($pinkSquare, toSquare);
  }

  page.showMove = function(data) {
    var humanMovesModificator = function(humanMoves) {
      if (humanMoves != '') {
        humanMoves = humanMoves.split(' ');
        for (hm in humanMoves) {
          if (hm == 0) {
            continue;
          }
          humanMoves[hm] = ((parseInt(hm, 10) + currentColor) % 2 == 0 ? '↑' : '↓') + humanMoves[hm];
        }
        move = (currentColor % 2 == 0 ? '↑' : '↓') + humanMoves.slice(0, 5).join(' ');
      }
      return move;
    }
    var move = (data || {}).nextMove;
    var humanMoves = (data || {}).humanMoves;
    if (currentBot == CURRENT_BOT_STANDART) {
      if (isBetaDesign) {
        move = humanMovesModificator(humanMoves);
        $('#' + botTextId).text('=>: ' + (move != '' ? move : ' : nothing =('));
      } else {
        $('#' + botTextId).text('Best move: ' + move);
      }
    } else {
      // Live and simple version are same
      move = humanMovesModificator(humanMoves);
      $('#' + botMessageId).text('Best move: ' + (move != '' ? move : ' : nothing =('));
      if (enableSuggestion) {
        madeMachineMove(data.machineMove);
      }
    }
  }

  return page;
};

var pageManager = new PageManager(jQuery, this);

var BotFactory = function($, window, bot, pageManager) {
  var factory = {};

  factory.const = [{
      name: 'chess_com_simple',
      host: 'chess.com',
      path: '/simple'
    },
    {
      name: 'chess_com_live',
      host: 'chess.com',
      path: '/live'
    },
    {
      name: 'chess_com_standart',
      host: 'chess.com',
      nopath: ''
    },
    {
      name: 'lichess_live',
      host: 'lichess.org',
      nopath: ''
    },
    {
      name: 'chesskid_live',
      host: 'chesskid.com',
      path: '/simple'
    }
  ];


  factory.selectBot = function() {
    var botType;
    factory.const.forEach(function(item, i, arr) {
      if (window.location.hostname.indexOf(item.host) > -1) {
        if (botType) {
          return;
        }
        if (item.path !== undefined && window.location.pathname === item.path) {
          botType = item.name;
        } else
        if (item.nopath !== undefined && window.location.pathname !== item.nopath) {
          botType = item.name;
        }
      }
    });
    return botType;
  }

  factory.createBot = function(botType) {
    console.log(botType);
    switch (botType) {
      case 'chess_com_simple':
        pageManager.createSimpleBot(bot);
        bot.moveFound = pageManager.showMove;
        break;
      case 'chess_com_live':
        setTimeout(function() {
          pageManager.createLiveBot(bot, $('#top_bar_settings').length == 0);
        }, 5000);
        bot.moveFound = pageManager.showMove;
        break;
      case 'chess_com_standart':
        var betaDesign = $('#EmailChessGame').length == 0;

        pageManager.createStandartBot(bot, betaDesign);
        bot.moveFound = pageManager.showMove;

        if (betaDesign) {
          setTimeout(function() {
            bot.makeLiveSuggest($('div.notationVertical a.gotomove'));
          }, 3000);
        } else {
          var fen = pageManager.getCurrentFen();
          bot.makeMove(fen);
        }
        break;
      case 'lichess_live':
        pageManager.createLiChessBot(bot);
        bot.moveFound = pageManager.showMove;
        break;
      case 'chesskid_live':
        pageManager.createChessKidBot(bot);
        bot.moveFound = pageManager.showMove;
        break;
    }
  }

  return factory;
}

// Startup code
$(document).ready(function() {
  var botFactory = new BotFactory(jQuery, this, bot, pageManager);
  botFactory.createBot(botFactory.selectBot());
});
