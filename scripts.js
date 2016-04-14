
var maxRounds = 99;
var maxShuffles = 99;
var numDecks = 6;
var minBet = 10;
var shuffleThreshhold = 6;
var maxSplitHands = 4;
var doubleAfterSplit = true;
var hitOnAceSplit = false; // Rare to find games that allow hitting split aces
var bjFactor = 2.5;
var houseGain = 0;
var cardCount = 0;
var lastCardCount = 0;

var players = [ 
	{ name:"Aa", bank:1000, bet:bet0, play:play0 }, 
	{ name:"Bb", bank:1000, bet:bet0, play:play0 }, 
	{ name:"Cc", bank:1000, bet:bet0, play:play0 },
	{ name:"Dd", bank:1000, bet:bet1, play:play1 },
	{ name:"Ee", bank:1000, bet:bet1, play:play1 },
	{ name:"Ff", bank:1000, bet:bet1, play:play1 } 
];
for (var i in players)
{
	players[i].start = players[i].bank;
}

var rounds = 0;
var numShuffles = 0;

var deck = [];

window.onload = function() {
	console.log("---- START ----");
	while(thereArePlayers() && numShuffles<maxShuffles && rounds<maxRounds)
	{ // If there are players
		// shuffle deck
		console.log("-shuffling-");
		deck = buildDeck(numDecks);
		cardCount = 0;
		numShuffles++;

		while(deck.length > (numDecks * 52)/shuffleThreshhold && rounds<maxRounds && thereArePlayers()) 
		{ // while there's more than a 1/threshhold (1/4) portion of the deck
			rounds++;
			console.log("\nRound " + rounds);
			var dealerCards = [];
			var hands = [];

			//// Player buy in - build hands
			for (var i in players)
			{
				if(players[i].bank >= minBet)
				{
					var thisBet = players[i].bet(players[i].bank);
					if(thisBet > 0)
					{
						hands.push({ cards:[], playerId: i, bet: thisBet, status:"play"});
						players[i].bank -= thisBet;
						houseGain += thisBet; // Assuming that when players bet it goes to the house.
					}
				}
			}

			//// Deal initial cards 
			for (var i in hands)
			{
				hands[i].cards.push(dealCard());
				hands[i].cards.push(dealCard());
			}
			dealerCards.push(dealCard()); // Dealer's first card, [0], is considered face down
			dealerCards.push(dealCard());

			//// Display cards
			//
			console.log("Dealer [ " + printDealerHand(dealerCards) + "]");
			console.log("last card count: " + lastCardCount);
			for (var i in hands)
			{
				console.log(players[hands[i].playerId].name + " [ " 
						+ printHand(hands[i].cards) + " ] "
						+ hands[i].bet + "|"
						+ players[hands[i].playerId].bank
						); 

			}

			//// Checking for dealer blackjack - if ace is showing or if ten is showing.
			// If Ace showing
			if(dealerCards[1].face == "A")
			{
				console.log("* Ace showing - No current routine for insurance.");
				// TODO insurance // not doing it right now
				/*// Roll through each hand to check for insur
				for (var i in hands)
				{
					var thePlayer = players[hands[i].playerId];
					var theHand = hands[i];
					if (thePlayer.insur)
					{
					}
				}*/
				if(["10","J","K","Q"].indexOf(dealerCards[0].face) > -1)
				{
					console.log("* Dealer Blackjack");
					// loop through players. if any are 21 then push. (remove and refund)
					for (var i in hands)
					{
						var theHand = hands[i];
						var thePlayer = players[theHand.playerId];
						if (handValue(theHand.cards) == 21)
						{
							console.log("  " + thePlayer.name + " push");
							theHand.status = "push";
							thePlayer.bank += theHand.bet;
							houseGain -= theHand.bet;
						} else {
							console.log("  " + thePlayer.name + " lost");
							theHand.status = "lost";
						}
					}
					hands = [];
					console.log("------------------");
				}
			} 
			// If Ten showing
			else if(["10","J","K","Q"].indexOf(dealerCards[1].face) > -1)
			{
				console.log("* Ten showing.");
				// Player decision
				if (dealerCards[0].face == "A")
				{
					console.log("* Dealer Blackjack");
					// loop through players. if any are 21 then push. (remove and refund)
					for (var i in hands)
					{
						var theHand = hands[i];
						var thePlayer = players[theHand.playerId];
						if (handValue(theHand.cards) == 21)
						{
							console.log("  " + thePlayer.name + " *push");
							theHand.status = "push";
							thePlayer.bank += theHand.bet;
							houseGain -= theHand.bet;
						} else {
							console.log("  " + thePlayer.name + " lost");
							theHand.status = "lost";
						}
					}
					hands = [];
					console.log("------------------");
				}
			}
			////

			//// Settle player blackjacks
			var handIndex = 0;
			while (handIndex < hands.length)
			{
				var theHand = hands[handIndex];
				var thePlayer = players[theHand.playerId];
				if(handValue(theHand.cards) == 21)
				{
					// house pays player
					houseGain -= theHand.bet * bjFactor;
					thePlayer.bank += theHand.bet * bjFactor;
					console.log("> " + thePlayer.name + " Blackjack " + thePlayer.bank); 
					hands.splice(handIndex, 1);
					handIndex--;
				}
				handIndex++;
			}
			////
			
			console.log("-- Play");
			//// Play (includes splits and doubledowns
			handIndex = 0;
			while (handIndex < hands.length)
			{
				var theHand = hands[handIndex];
				if(theHand.status == "stand")
				{
					handIndex++;
				} else {
					var theHandCards = theHand.cards;
					var thePlayer = players[theHand.playerId];
					
					var options = { split:false, ddown:false, hit:true};
					
					//// Check for split or ddown availability
					if(theHandCards.length == 2)
					{
						// check if can double
						if(thePlayer.bank >= theHand.bet) 
						{
							// Double on split is allowed
							options.ddown = true;
						}
						// check if can split
						if( (theHandCards[0].face == theHandCards[1].face) || 
								(["10","J","Q","K"].indexOf(theHandCards[0].face) > -1 
									&& ["10","J","Q","K"].indexOf(theHandCards[1].face) > -1)
								&& thePlayer.bank >= theHand.bet
								&& !hasMaxSplit(thePlayer, hands)
								)
						{
							//console.log("> " + thePlayer.name + " can split");
							options.split = true;
						}
					}

					// Make player choice
					var dealerShow = dealerCards[1];

					switch(thePlayer.play(theHand,dealerShow, options))
					{
						case "split":
							// Make a new hand
							hands.splice(handIndex+1,0,{ cards:[theHand.cards[1]], playerId: theHand.playerId, bet: theHand.bet, status:"play"});
							hands[handIndex+1].cards.push(dealCard());

							// Reformat old hand
							theHand.cards[1] = dealCard();

							// account for split bet
							thePlayer.bank -= theHand.bet;
							houseGain += theHand.bet;

							console.log("> " + thePlayer.name + " split [ " + printHand(theHand.cards) + " ] ");
							console.log("           [ " + printHand(hands[handIndex+1].cards) + " ] " + theHand.bet + "|" + thePlayer.bank);

							// Split aces require that you stand so if the head
							// of the hand is an ace then stand on the hand.
							if(hands[handIndex].cards[0].face == "A")
							{
								hands[handIndex].status = "stand";
								//handIndex++;
							}
							if(hands[handIndex+1].cards[0].face == "A")
							{
								hands[handIndex+1].status = "stand";
								//handIndex++;
							}
							break;
						case "ddown":
							var newCard = dealCard();
							theHandCards.push(newCard);
							theHand.bet += theHand.bet;
							thePlayer.bank -= theHand.bet;
							houseGain += theHand.bet;
							// Only allowed one more card on ddown
							theHand.status = "stand";
							handIndex++;
							console.log("> " + thePlayer.name + " ddown [ " + printHand(theHandCards) + " ] " + theHand.bet + "|" + thePlayer.bank);
							break;
						case "hit":
							// Add a card
							theHandCards.push(dealCard());
							if (handValue(theHandCards) > 21)
							{
								console.log(thePlayer.name + " *bust [ " + printHand(theHandCards) + " ]");
								theHand.status = "bust";
								handIndex++;
							}
							break;
						default:
						case "stand":
							console.log(thePlayer.name + " stand [ " + printHand(theHandCards) + " ]");
							theHand.status = "stand";
							handIndex++;
							break;
					}
				}
			}
			////

			//// Dealer plays

			var dealerBust = false;
			while(dealerHits(dealerCards))
			{ // while the dealer wants to hit (true)
				// Add a card to the player's hand
				var deal = dealCard();
				dealerCards.push(deal);
				if (handValue(dealerCards) > 21) 
				{
					dealerBust = true;
					break;
				}
			}
			if(dealerBust)
			{
				// Payout is handled in the compare routine.
				console.log("-- Dealer *bust [ " + printHand(dealerCards) + " ]");
			} else {
				console.log("-- Dealer play [ " + printHand(dealerCards) + " ]");
			}
			////

			//// Compare remaining hands to dealer
			for (var i in hands)
			{
				// Compare hands with dealer
				var dh = handValue(dealerCards);
				var ph = handValue(hands[i].cards);
				var theHand = hands[i];
				var thePlayer = players[theHand.playerId];

				//console.log(thePlayer.name + " " + theHand.status );
				if(["stand"].indexOf(theHand.status) > -1 )
				{
					var playS = thePlayer.name + "(" + thePlayer.bank + ") " + printHand(theHand.cards);
					if (ph > dh || dealerBust)
					{
						// Player won. Give player back double the bet
						thePlayer.bank += hands[i].bet * 2;
						houseGain -= hands[i].bet * 2;
						console.log(thePlayer.name + " won! [ " + printHand(theHand.cards) 
								+ " ] " + thePlayer.bank);
					} 
					else if (ph == dh)
					{
						// Push. Give player back bet.
						thePlayer.bank += hands[i].bet;
						houseGain -= hands[i].bet;
						console.log(thePlayer.name + " push [ " + printHand(theHand.cards) 
							+ " ] " + thePlayer.bank);
					}
					else
					{
						console.log(thePlayer.name + " lost [ " + printHand(theHand.cards) 
							+ " ] " + thePlayer.bank);
					}
				}
			}
			////
			console.log("running card count: " + cardCount);
			lastCardCount = cardCount;
		}
	}

	//// Display results
	document.getElementById("output").innerHTML = "<div>"
		+ "<p id='rounds'>rounds: </p>"
		+ "<p id='shuffles'>shuffles: </p>"
		+ "<p id='houseGain'>houseGain: </p>"
		+ "<ul id='players'>PLAYERS</ul>"
		+ "<p id='playersGain'>playersGain</p>"
		+ "</div>";
	console.log("==========");
	console.log("rounds: " + rounds);
	document.getElementById("rounds").innerHTML = "rounds: " + rounds;
	console.log("shuffles: " + numShuffles);
	document.getElementById("shuffles").innerHTML = "shuffles: " + numShuffles;
	console.log("houseGain: $" + houseGain);
	document.getElementById("houseGain").innerHTML = "houseGain: " + houseGain;
	var pt = 0;
	for (var i=0; i<players.length; i++)
	{
		var pp = players[i].bank - players[i].start;
		pt += pp;
		var perc = Math.round((pp/players[i].start) * 1000)/10;
		var info = players[i].name + " :: " + players[i].bank + " (" + perc + "%) " + pp;
		console.log(info);
		document.getElementById("players").innerHTML += "<li>" + info + "</li>";
	}
	console.log("pt: $" + pt);
	document.getElementById("playersGain").innerHTML = "playersGain: " + pt;
	////////////////////
};

function thereArePlayers()
{
	var playersExist = false;
	for (var i=0; i<players.length; i++)
	{
		if (players[i].bank > 0) 
		{
			playersExist = true;
		}
	}
	return playersExist;
}

function buildDeck(num)
{
	var suits = ["S","H","D","C"];
	var faces = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
	var nd = [];
	for (var n=0; n<num; n++)
	{
		for (var i=0; i<suits.length; i++)
		{
			for (var j=0; j<faces.length; j++)
			{
				nd.push({ face: faces[j], suit: suits[i]});
			}
		}
	}
	return nd;
}

function dealCard()
{
	var nc = deck.splice(Math.floor(Math.random()*deck.length), 1); 
	cardCount1(nc[0]);
	return nc[0];
}

function cardCount1(c)
{
	if(["10","J","Q","K","A"].indexOf(c.face) > -1)
	{
		cardCount--;
	} else if(["2","3","4","5","6"].indexOf(c.face) > -1) {
		cardCount++;
	}
}

function handValue(h)
{
	// Return highest value of cards (without going over?)
	var faces = 0;
	var aces = 0;
	for (var i in h)
	{
		// Remove Aces
		if(h[i].face == "A") 
		{
			aces++;
		} else {
			// Parse JQK
			if("JQK".indexOf(h[i].face) > -1 )
			{
				// If it's a 10
				faces = faces + 10;
			} else {
				// If it's a number less than 10
				faces = faces + Number(h[i].face);
			}
		}
	}

	if(aces > 0 && (faces + aces-1) <= 10) 
	{ // there's room for 11
		faces += 11 + aces - 1;
	} else { // there's no room for 11
		faces += aces;
	}
	return faces;
}

function isSoft17(h)
{
	var itsSoft = false;
	var ch = [];
	for( var i in h)
	{
		ch.push(h[i]);
	}
	if(handValue(ch) == 17)
	{
		ch.push({face:"5"}); // If you add 5 card to blow out 21
		if(handValue(ch) > 21)
		{
			itsSoft = false;
		} else {
			itsSoft = true;
		}
	}
	return itsSoft;
}

function dealerHits(dh)
{
	var hitit=false;
	var dv = handValue(dh);
	if (dv < 17) // always hit if 16 or below
	{
		hitit = true;
	}
	//else if (dv == 17 && dh.indexOf("A") > -1) // don't hit on soft 17
	else if (dv == 17 && isSoft17(dh)) // don't hit on soft 17
	{
		hitit = false;
	}
	return hitit;
}

function hasMaxSplit(pl, h)
{
	maxedOut = false;
	pcount = 0;
	for(var i in h)
	{
		if(players[h[i].playerId].name == pl.name) pcount++;
	}
	if (pcount >= 4)
	{
		maxedOut = true;
	}
	return maxedOut;
}

function printHand(h)
{
	var hs = "";
	for (var i in h)
	{
		hs = hs + h[i].face + h[i].suit + " ";
	}
	hs += "(" + handValue(h) + ")";
	return hs;
}

function printDealerHand(h)
{
	//var hs = "<" + h[0].face + h[0].suit + "> ";
	var hs = "XX ";
	for (var i = 1; i<h.length; i++)
	{
		hs = hs + h[i].face + h[i].suit + " ";
	}
	return hs;
}

function insur1(pc)
{
	var insurit = false;
	// Insure only if have a 21
	//if (handValue(pc) == 20 || handValue(pc)) insurit = true;
	return insurit
}

function bet0(bank)
{
	// Normal bet
	var betit = minBet;
	return betit;
}

function bet1(bank)
{
	// l33t bet
	var betit = minBet;
	if (lastCardCount > 2) 
	{
		var newbet = minBet * 2;
		if(bank > newbet) betit = newbet;
	}
	if (lastCardCount > 10) 
	{
		var newbet = minBet * 10;
		if(bank > newbet) betit = newbet;
	}
	return betit;
}

function bet2(bank)
{
	// Crazy bet
	var betit = minBet;
	if (lastCardCount > 2) 
	{
		var newbet = minBet * 1.5;
		if(bank > newbet) betit = newbet;
	}
	if (lastCardCount < -2)
	{
		betit = 0;
	}
	return betit;
}

function play0(ph, dshow, op)
{
	// Normal play
	var pv = handValue(ph.cards);
	var decision = "stand";

	if (pv < 17) decision = "hit";

	if (pv == 11 && op.ddown ) decision = "ddown";

	if (["A","8"].indexOf(ph.cards[0].face)>-1 && op.split) decision = "split"; 

	return decision;
}

function play1(ph, dshow, op)
{
	// l33t play
	var pv = handValue(ph.cards);
	var decision = "stand";

	var da0 = [
	// S - Stand, H - Hit, D - Double, P - Split
	// Hard totals (excluding pairs)
	//					 2,  3,  4,  5,  6,  7,  8,  9, 10,  A
		["H", "17-20",	"S","S","S","S","S","S","S","S","S","S"],
		["H", "16",		"S","S","S","S","S","H","H","H","H","H"],
		["H", "15",		"S","S","S","S","S","H","H","H","H","H"],
		["H", "13-14",	"S","S","S","S","S","H","H","H","H","H"],
		["H", "12",		"H","H","S","S","S","H","H","H","H","H"],
		["H", "11",		"D","D","D","D","D","D","D","D","D","H"],
		["H", "10",		"D","D","D","D","D","D","D","D","H","H"],
		["H", "9",		"H","D","D","D","D","H","H","H","H","H"],
		["H", "5-8",	"H","H","H","H","H","H","H","H","H","H"],
	// Soft totals
	//					 2,  3,  4,  5,  6,  7,  8,  9, 10,  A
		["S", "A,8-A,9","S","S","S","S","S","S","S","S","S","S"],
		["S", "A,7",	"S","D","D","D","D","S","S","H","H","H"],
		["S", "A,6",	"H","D","D","D","D","H","H","H","H","H"],
		["S", "A,4-A,5","H","H","D","D","D","H","H","H","H","H"],
		["S", "A,2-A,3","H","H","H","D","D","H","H","H","H","H"],
	// Pairs
	//					 2,  3,  4,  5,  6,  7,  8,  9, 10,  A
		["P", "A,A",	"P","P","P","P","P","P","P","P","P","P"],
		["P", "10,10",	"S","S","S","S","S","S","S","S","S","S"],
		["P", "9,9",	"P","P","P","P","P","S","P","P","S","S"],
		["P", "8,8",	"P","P","P","P","P","P","P","P","P","P"],
		["P", "7,7",	"P","P","P","P","P","P","H","H","H","H"],
		["P", "6,6",	"P","P","P","P","P","H","H","H","H","H"],
		["P", "5,5",	"D","D","D","D","D","D","D","D","H","H"],
		["P", "4,4",	"H","H","H","P","P","H","H","H","H","H"],
		["P", "2,2-3,3","P","P","P","P","P","P","H","H","H","H"]
		];

	da = da0;

	var getFromArray = function(ph, dh)
	{
		var dec = "stand";
		var dhix = dh.face;
		if (["J","Q","K"].indexOf(dhix) > -1) dhix = "10";
		if (dhix=="A") dhix = "11";
		dhix = Number(dhix);

		// Set to handValue first
		var aix = handValue(ph.cards);
		if(aix >=5 && aix <= 8) aix = "5-8";
		if(aix >= 13 && aix <=14) aix = "13-14";
		if(aix >=17 && aix <= 20) aix = "17-20";

		// then see if it's soft
		if(ph.cards[0].face == "A" || ph.cards[1].face == "A")
		{
			if(ph.cards[0].face == "A" && ph.cards[1].face == "A")
			{
				// just go on to pairs
			} else {
				var face = (ph.cards[0].face == "A") ? ph.cards[1].face : ph.cards[0].face;
				if (["J","Q","K"].indexOf(face) > -1) face = "10";
				switch( "A,"+face)
				{
					case "A,8":
					case "A,9":
						aix = "A,8-A,9";
						break;
					case "A,7":
					case "A,6":
						aix = "A,"+face;
						break;
					case "A,5":
					case "A,4":
						aix = "A,4-A,5";
						break;
					case "A,3":
					case "A,2":
						aix = "A,2-A,3";
						break;
					default:
				}
			}
		}
		// or if pairs
		if(ph.cards[0].face == ph.cards[1].face || 
			(["J","Q","K"].indexOf(ph.cards[0].face) > -1 
			 	&&["J","Q","K"].indexOf(ph.cards[1].face)>-1))
		{
			switch(ph.cards[0].face+","+ph.cards[1].face)
			{
				case "K,K":
				case "Q,Q":
				case "J,J":
					aix = "10,10";
					break;
				case "2,2":
				case "3,3":
					aix = "2,2-3,3";
					break;
				default:
					aix = ph.cards[0].face+","+ph.cards[1].face;
					break;
			}
		}

		// Now find the right decision
		for (var i in da)
		{
			var aval = "";
			if(da[i][1] == aix) 
			{
				aval = da[i][dhix];
				switch(aval)
				{
					case "H":
						dec = "hit";
						break;
					case "D":
						dec = "ddown";
						break;
					case "P":
						dec = "split";
						break;
					default:
					case "S":
						dec = "stand";
						break;
				}
			}
		}
		console.log( ">> " + players[ph.playerId].name + " [ " + printHand(ph.cards) + " ] a(" + aix + ")d(" + dhix + ") *" + dec + "*");
		return dec;
	}

	// If first two cards
	if (ph.cards.length == 2)
	{
		decision = getFromArray(ph, dshow);
	} else {
		// In a hit-to-win situation
		decision = "stand";
		// A breakdown of the "H" terms in da0
		if (pv >= 5 && pv <= 11) decision = "hit";
		if (pv == 12) decision = "hit";
		if (pv == 12 && ["4","5","6"].indexOf(dshow) > -1) decision="stand";
		if (pv >= 13 && pv <=16 && ["7","8","9","10","J","Q","K","A"].indexOf(dshow) > -1) decision="hit";
	}
	
	return decision;
}

function play2(ph, dshow, op)
{
	// Crazy play
	var pv = handValue(ph.cards);
	var decision = "stand";

	if (pv < 17 && op.hit) decision = "hit";

	if (["2","3","4","5","6"].indexOf(dshow.face) > -1)
	{// Standing on low showing cards
		decision = "stand";
	}

	//if (pv == 11 && op.ddown ) //basic
	if (pv == 11 || (pv == 10 && ["2","3","4","5","6"].indexOf(dshow.face) > -1) ) // 10s against low
	//if ( (pv == 11 && ["10","J","Q","K"].indexOf(dshow.face) == -1 )|| (pv == 10 && ["2","3","4","5","6"].indexOf(dshow.face) > -1) ) // safe against 10s
	{
		decision = "ddown";
	}

	if (op.split)
	{
		if(["A","8"].indexOf(ph.cards[0].face)>-1)
		{
			decision = "split";
		} else {
			decision = "hit";
		}
	}

	return decision;
}

