/*eslint-env browser*/
/* global chrome */

/*
 * This script gets moves from the page and then calculates the best move.
 * It sends the best move to the popup so that there is no way to detect page modifications.
**/

/*
 * We use this to send data to the popup:
 *
 * var port = chrome.runtime.connect({name: "chessbot"});
 * port.postMessage({bestMove: "e2e4"}); // Example of how to send best move to the popup window
 * port.onMessage.addListener(function(msg) {
 *	return;
 * });
**/

console.log("chess_controller reached");

//var Bot = function($) {
var Bot = function() {
  var engine = {},
	b_console = {
	  log: function(a) {}
	},
	bot_enable_debug = !('update_url' in chrome.runtime.getManifest());

  if (bot_enable_debug && console) {
	b_console = console;
  }

  var port = chrome.runtime.connect({name: "chessbot"});

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

//bot = new Bot(jQuery);
bot = new Bot();

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

//var PageManager = function($, window, cookieManager) {
var PageManager = function(window, cookieManager) {
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

  var	currentBot = CURRENT_BOT_STANDART,
	eChessCookie = 'chessbot-echess-enabled',
	liveChessCookie = 'chessbot-live-enabled',
	currentColor = CURRENT_BOT_COLOR_WHITE;

  function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  page.getCurrentFen = function() {
	return $('.moveactions input').val();
  };

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
		targets = '.game-controls-wrapper .move-text-component';
		break;
	}

	var previousMovesCount = 0;
	var MutationObserverClass = MutationObserver || window.MutationObserver || window.WebKitMutationObserver;
	var observer = new MutationObserverClass(function(mutations, observer) {
	  // Fired when a mutation occurs
	  var currentMovesCount = $(targets).filter(function() {
		return !!this.innerText;
	  }).length;
	  if (currentMovesCount > 0) {
		if (currentMovesCount != previousMovesCount) {
		  currentColor = currentMovesCount % 2 == 0 ? CURRENT_BOT_COLOR_WHITE : CURRENT_BOT_COLOR_BLACK;
		  previousMovesCount = currentMovesCount;
		  port.postMessage({bestMove: "Thinking..."});
		  // Possible new at each fire.
		  // var subtargetName = isBetaDesign ? '.dijitVisible #moves div.notation' : '.dijitVisible #moves div.notation';
		  //engine.makeLiveSuggest($(targets)); //TODO: SEND BEST MOVE TO POPUP
		}
	  } else {
		port.postMessage({bestMove: "Game not available."})
	  }
	});

	var observeReadyInterval = setInterval(function() {
	  var observeTarget;
	  switch (currentBot) {
		case CURRENT_BOT_LICHESS:
		  observeTarget = $('.moves');
		  break;
		case CURRENT_BOT_LIVE:
		  observeTarget = $('.game-controls-wrapper');
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

  page.createLiveBot = function(botEngine) {
	currentBot = CURRENT_BOT_LIVE;
  }

  page.createSimpleBot = function(botEngine) {
	currentBot = CURRENT_BOT_SIMPLE;
  }

  page.createLiChessBot = function(botEngine) {
	currentBot = CURRENT_BOT_LICHESS;
  }

  page.createChessKidBot = function(botEngine) {
	currentBot = CURRENT_BOT_CHESSKID_SIMPLE;
  }

  page.createStandartBot = function(botEngine) {
	currentBot = CURRENT_BOT_STANDART;
  }

  function madeMachineMove(move) {
	//var fromSquare = move.substring(0, 2),
	//    toSquare = move.substring(2, 4),
	port.postMessage({bestMove: 'Best move: '+move});
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
		move = humanMovesModificator(humanMoves);
		port.postMessage({bestMove: 'Best move: ' + (move != '' ? move : ' : nothing =(')});
	} else {
	  // Live and simple version are same
	  move = humanMovesModificator(humanMoves);
	  port.postMessage({bestMove: 'Best move: ' + (move != '' ? move : ' : nothing =(')});
	}
  }

  return page;
};

//var pageManager = new PageManager(jQuery, this);
var pageManager = new PageManager(this);

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
		} else if (item.nopath !== undefined && window.location.pathname !== item.nopath) {
		  botType = item.name;
		} else {
		  botType = 'lichess_live';
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
		pageManager.createLiveBot(bot);
		bot.moveFound = pageManager.showMove;
		break;
	  case 'chess_com_standart':
		pageManager.createStandartBot(bot);
		bot.moveFound = pageManager.showMove;
		var fen = pageManager.getCurrentFen();
		bot.makeMove(fen);
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
  //var botFactory = new BotFactory(jQuery, this, bot, pageManager);
  botFactory = new BOtFactory(this, bot, pageManager);
  botFactory.createBot(botFactory.selectBot());
});
