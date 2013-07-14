/**
 * System commands
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * These are system commands - commands required for Pokemon Showdown
 * to run. A lot of these are sent by the client.
 *
 * If you'd like to modify commands, please go to config/commands.js,
 * which also teaches you how to use commands.
 *
 * @license MIT license
 */

if (typeof tour == "undefined") tour = new Object();
tour.tiers = new Array();
setTimeout(function() {for (var i in Data.base.Formats) {tour.tiers.push(i);}}, 1000);
if (typeof tour.timers == "undefined") tour.timers = new Object();
tour.timerLoop = function() {
	setTimeout(function() {
		tour.currentSeconds += 1;
		for (var i in tour.timers) {
			var c = tour.timers[i];
			var secondsNeeded = c.time * 60;
			var secondsElapsed = tour.currentSeconds - c.startTime;
			var difference = secondsNeeded - secondsElapsed;
			var percent = secondsElapsed / secondsNeeded * 100;
			function sendIt(end) {
				if (end) {
					Rooms.rooms[i].addRaw("<h3>The tournament was canceled because of lack of players.</h3>");
					return;
				}
				Rooms.rooms[i].addRaw("<i>The tournament will begin in " + difference + " seconds.</i>");
			}
			if (percent == 25 || percent == 50 || percent == 75) {
				sendIt();
			}
			if (percent >= 100) {
				if (tour[i].players.length < 3) {
					tour.reset(i);
					sendIt(true);
				}
				else {
					if (tour[i].status == 1) {
						tour[i].size = tour[i].players.length;
						tour.start(i);
					}
				}
				delete tour.timers[i];
			}
		}
		tour.timerLoop();
	}, 1000);
};
if (typeof tour.currentSeconds == "undefined") {
	tour.currentSeconds = 0;
	tour.timerLoop();
}
tour.reset = function(rid) {
	tour[rid] = {
		status: 0,
		tier: undefined,
		size: 0,
		roundNum: 0,
		players: new Array(),
		winners: new Array(),
		losers: new Array(),
		round: new Array(),
		history: new Array(),
		byes: new Array()
	};
};
tour.shuffle = function(list) {
  var i, j, t;
  for (i = 1; i < list.length; i++) {
    j = Math.floor(Math.random()*(1+i));  // choose j in [0..i]
    if (j != i) {
      t = list[i];                        // swap list[i] and list[j]
      list[i] = list[j];
      list[j] = t;
    }
  }
  return list;
};
tour.splint = function(target) {
	//splittyDiddles
	var cmdArr =  target.split(",");
	for(var i = 0; i < cmdArr.length; i++) {
		cmdArr[i] = cmdArr[i].trim();
	}
	return cmdArr;
};
tour.join = function(uid, rid) {
	var players = tour[rid].players;
	var init = 0;
	for (var i in players) {
		if (players[i] == uid) {
			init = 1;
		}
	}
	if (init) {
		return false;
	}
	players.push(uid);
	return true;
};
tour.leave = function(uid, rid) {
	var players = tour[rid].players;
	var init = 0;
	var key;
	for (var i in players) {
		if (players[i] == uid) {
			init = 1;
			key = i;
		}
	}
	if (!init) {
		return false;
	}
	players.splice(key, 1);
	return true;
};
tour.lose = function(uid, rid) {
	/*
		if couldn't disqualify return false
		if could disqualify return the opponents userid
	*/
	var r = tour[rid].round;
	for (var i in r) {
		if (r[i][0] == uid) {
			var key = i;
			var p = 0;
		}
		if (r[i][1] == uid) {
			var key = i;
			var p = 1;
		}
	}
	if (!key) {
		//user not in tour
		return -1;
	}
	else {
		if (r[key][1] == undefined) {
			//no opponent
			return 0;
		}
		if (r[key][2] != undefined && r[key][2] != -1) {
			//already did match
			return 1;
		}
		var winner = 0;
		var loser = 1;
		if (p == 0) {
			winner = 1;
			loser = 0;
		}
		r[key][2] = r[key][winner];
		tour[rid].winners.push(r[key][winner]);
		tour[rid].losers.push(r[key][loser]);
		tour[rid].history.push(r[key][winner] + "|" + r[key][loser]);
		return r[key][winner];
	}
};
tour.start = function(rid) {
	var isValid = false;
	var numByes = 0;
	if (tour[rid].size <= 4) {
        	if (tour[rid].size % 2 == 0) {
            		isValid = true;
        	} else {
            		isValid = true;
            		numByes = 1;
		}
	}
		do
		{
			var numPlayers = ((tour[rid].size - numByes) / 2 + numByes);
			do
			{
					numPlayers = numPlayers / 2;
			}
		while (numPlayers > 1);
		if (numPlayers == 1) {
						isValid = true;
			} else {
						numByes += 1;
			}
		}
	while (isValid == false);
	var r = tour[rid].round;
	var sList = tour[rid].players;
	tour.shuffle(sList);
	var key = 0;
	do
		{
			if (numByes > 0) {
				r.push([sList[key], undefined, sList[key]]);
				tour[rid].winners.push(sList[key]);
				tour[rid].byes.push(sList[key]);
				numByes -= 1
				key++;
			}
		}
	while (numByes > 0);
	do
		{
			var match = new Array(); //[p1, p2, result]
			match.push(sList[key]);
			key++;
			match.push(sList[key]);
			key++;
			match.push(undefined);
			r.push(match);
		}
	while (key != sList.length);
	tour[rid].roundNum++;
	tour[rid].status = 2;
	tour.startRaw(rid);
};
tour.startRaw = function(i) {
	var room = Rooms.rooms[i];
	var html = '<hr /><h3><font color="green">Round '+ tour[room.id].roundNum +'!</font></h3><font color="blue"><b>TIER:</b></font> ' + Data.base.Formats[tour[room.id].tier].name + "<hr /><center>";
	var round = tour[room.id].round;
	var firstMatch = false;
	for (var i in round) {
		if (!round[i][1]) {
				var p1n = round[i][0];
				if (Users.get(p1n)) p1n = Users.get(p1n).name;
				if (p1n.split('Guest ').length - 1 > 0) p1n = round[i][0];
				html += "<font color=\"red\">" + clean(p1n) + " has received a bye!</font><br />";
		}
		else {
			var p1n = round[i][0];
			var p2n = round[i][1];
			if (Users.get(p1n)) p1n = Users.get(p1n).name;
			if (Users.get(p2n)) p2n = Users.get(p2n).name;
			if (p1n.split('Guest ').length - 1 > 0) p1n = round[i][0];
			if (p2n.split('Guest ').length - 1 > 0) p2n = round[i][1];
			var tabla = "";if (!firstMatch) {var tabla = "</center><table align=center cellpadding=0 cellspacing=0>";firstMatch = true;}
			html += tabla + "<tr><td align=right>" + clean(p1n) + "</td><td>&nbsp;VS&nbsp;</td><td>" + clean(p2n) + "</td></tr>";
		}
	}
	room.addRaw(html + "</table>");
};
tour.nextRound = function(rid) {
	var w = tour[rid].winners;
	var l = tour[rid].losers;
	var b = tour[rid].byes;
	tour[rid].roundNum++;
	tour[rid].history.push(tour[rid].round);
	tour[rid].round = new Array();
	tour[rid].losers = new Array();
	tour[rid].winners = new Array();
	var firstMatch = false;
	if (w.length == 1) {
		//end tour
		Rooms.rooms[rid].addRaw('<h2><font color="green">Congratulations <font color="black">' + Users.users[w[0]].name + '</font>!  You have won the ' + Data.base.Formats[tour[rid].tier].name + ' Tournament!</font></h2>' + '<br><font color="blue"><b>SECOND PLACE:</b></font> ' + Users.users[l[0]].name + '<hr />');
		tour[rid].status = 0;
	}
	else {
		var html = '<hr /><h3><font color="green">Round '+ tour[rid].roundNum +'!</font></h3><font color="blue"><b>TIER:</b></font> ' + Data.base.Formats[tour[rid].tier].name + "<hr /><center>";
		var pBye = new Array();
		var pNorm = new Array();
		var p = new Array();
		for (var i in w) {
			var byer = false;
			for (var x in b) {
				if (b[x] == w[i]) {
					byer = true;
					pBye.push(w[i]);
				}
			}
			if (!byer) {
				pNorm.push(w[i]);
			}
		}
		for (var i in pBye) {
			p.push(pBye[i]);
			if (typeof pNorm[i] != "undefined") {
				p.push(pNorm[i]);
				pNorm.splice(i, 1);
			}
		}
		for (var i in pNorm) {
			p.push(pNorm[i]);
		}
		for (var i = 0; p.length / 2 > i; i++) {
			var p1 = i * 2;
			var p2 = p1 + 1;
			tour[rid].round.push([p[p1], p[p2], undefined]);
			var p1n = p[p1];
			var p2n = p[p2];
			if (Users.get(p1n)) p1n = Users.get(p1n).name;
			if (Users.get(p2n)) p2n = Users.get(p2n).name;
			if (p1n.split('Guest ').length - 1 > 0) p1n = p[p1];
			if (p2n.split('Guest ').length - 1 > 0) p2n = p[p2];
			var tabla = "";if (!firstMatch) {var tabla = "</center><table align=center cellpadding=0 cellspacing=0>";firstMatch = true;}
			html += tabla + "<tr><td align=right>" + clean(p1n) + "</td><td>&nbsp;VS&nbsp;</td><td>" + clean(p2n) + "</td></tr>";
		}
		Rooms.rooms[rid].addRaw(html + "</table>");
	}
};
for (var i in Rooms.rooms) {
	if (Rooms.rooms[i].type == "chat" && !tour[i]) {
		tour[i] = new Object();
		tour.reset(i);
	}
}
function clean(string) {
	var entityMap = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': '&quot;',
		"'": '&#39;',
		"/": '&#x2F;'
	};
	return String(string).replace(/[&<>"'\/]/g, function (s) {
		return entityMap[s];
	});
}

//spamroom
if (typeof spamroom == "undefined") {
	spamroom = new Object();
}
if (!Rooms.rooms.spamroom) {
	Rooms.rooms.spamroom = new Rooms.ChatRoom("spamroom", "spamroom");
	Rooms.rooms.spamroom.isPrivate = true;
	tour.reset("spamroom");
}

//tells
if (typeof tells === 'undefined') {
	tells = {};
}

var crypto = require('crypto');
var poofeh = true;
var aList = ["kupo","panpaw","corn","stevoduhhero","fallacie","imanalt","ipad","orivexes","treecko","theimmortal","talktakestime","oriv","v4","ipad","jac"];
var canTalk;

var commands = exports.commands = {

/**** tour commands, also by StevoDuhHero ****/
	tour: function(target, room, user, connection) {
		if (!user.can('broadcast')) {
			return this.sendReply('You do not have enough authority to use this command.');
		}
		if (tour[room.id].status != 0) {
			return this.sendReply('There is already a tournament running, or there is one in a signup phase.');
		}
		if (!target) {
			return this.sendReply('Proper syntax for this command: /tour tier, size');
		}
		var targets = tour.splint(target);
		var tierMatch = false;
		var tempTourTier = '';
		for (var i = 0; i < tour.tiers.length; i++) {
			if ((targets[0].trim().toLowerCase()) == tour.tiers[i].trim().toLowerCase()) {
			tierMatch = true;
			tempTourTier = tour.tiers[i];
			}
		}
		if (!tierMatch) {
			return this.sendReply('Please use one of the following tiers: ' + tour.tiers.join(','));
		}
		if (targets[1].split('minut').length - 1 > 0) {
			targets[1] = parseInt(targets[1]);
			if (isNaN(targets[1]) || !targets[1]) {
				return this.sendReply('/tour tier, NUMBER minutes');
			}
			targets[1] = Math.ceil(targets[1]);
			tour.timers[room.id] = {
				time: targets[1],
				startTime: tour.currentSeconds
			};
			targets[1] = 128;
		}
		else {
			targets[1] = parseInt(targets[1]);
		}
		if (isNaN(targets[1])) {
			return this.sendReply('Proper syntax for this command: /tour tier, size');
		}
		if (targets[1] < 3) {
			return this.sendReply('Tournaments must contain 3 or more people.');
		}

		tour.reset(room.id);
		tour[room.id].tier = tempTourTier;
		tour[room.id].size = targets[1];
		tour[room.id].status = 1;
		tour[room.id].players = new Array();		

		room.addRaw('<hr /><h2><font color="green">' + sanitize(user.name) + ' has started a ' + Data.base.Formats[tempTourTier].name + ' Tournament.</font> <font color="red">/j</font> <font color="green">to join!</font></h2><b><font color="blueviolet">PLAYERS:</font></b> ' + targets[1] + '<br /><font color="blue"><b>TIER:</b></font> ' + Data.base.Formats[tempTourTier].name + '<hr />');
		if (tour.timers[room.id]) {
			room.addRaw('<i>The tournament will begin in ' + tour.timers[room.id].time + ' minute(s).<i>');
		}
	},

	endtour: function(target, room, user, connection) {
		if (!user.can('broadcast')) {
			return this.sendReply('You do not have enough authority to use this command.');
		}
		if (tour[room.id] == undefined || tour[room.id].status == 0) {
			return this.sendReply('There is no active tournament.');
		}
		tour[room.id].status = 0;
		delete tour.timers[room.id];
		room.addRaw('<h2><b>' + user.name + '</b> has ended the tournament.</h2>');
	},

	toursize: function(target, room, user, connection) {
		if (!user.can('broadcast')) {
			return this.sendReply('You do not have enough authority to use this command.');
		}
		if(tour[room.id] == undefined)
			return this.sendReply('There is no active tournament in this room.');

		if (tour[room.id].status > 1) {
			return this.sendReply('The tournament size cannot be changed now!');
		}
		if (!target) {
			return this.sendReply('Proper syntax for this command: /toursize size');
		}
		target = parseInt(target);
		if (isNaN(target)) {
			return this.sendReply('Proper syntax for this command: /tour size');
		}
		if (target < 3) {
			return this.sendReply('A tournament must have at least 3 people in it.');
		}
		if (target < tour[room.id].players.length) {
			return this.sendReply('Target size must be greater than or equal to the amount of players in the tournament.');
		}
		tour[room.id].size = target;
		room.addRaw('<b>' + user.name + '</b> has changed the tournament size to: ' + target + '. <b><i>' + (target - tour[room.id].players.length) + ' slots remaining.</b></i>');
		if (target == tour[room.id].players.length) {
			tour.start(room.id);
		}
	},

	jt: 'j',
	jointour: 'j',
	j: function(target, room, user, connection) {
		if (tour[room.id] == undefined || tour[room.id].status == 0) {
			return this.sendReply('There is no active tournament to join.');
		}
		if (tour[room.id].status == 2) {
			return this.sendReply('Signups for the current tournament are over.');
		}
		if (tour.join(user.userid, room.id)) {
			room.addRaw('<b>' + user.name + '</b> has joined the tournament. <b><i>' + (tour[room.id].size - tour[room.id].players.length) + ' slots remaining.</b></i>');
			if (tour[room.id].size == tour[room.id].players.length) {
				tour.start(room.id);
			}
		} else {
			return this.sendReply('You could not enter the tournament. You may already be in the tournament. Type /l if you want to leave the tournament.');
		}
	},

	forcejoin: 'fj',
	fj: function(target, room, user, connection) {
		if (!user.can('broadcast')) {
			return this.sendReply('You do not have enough authority to use this command.');
		}
		if (tour[room.id] == undefined || tour[room.id].status == 0 || tour[room.id].status == 2) {
			return this.sendReply('There is no tournament in a sign-up phase.');
		}
		if (!target) {
			return this.sendReply('Please specify a user who you\'d like to participate.');
		}
		var targetUser = Users.get(target);
		if (targetUser) {
			target = targetUser.userid;
		}
		else {
			return this.sendReply('The user \'' + target + '\' doesn\'t exist.');
		}
		if (tour.join(target, room.id)) {
			room.addRaw(user.name + ' has forced <b>' + target + '</b> to join the tournament. <b><i>' + (tour[room.id].size - tour[room.id].players.length) + ' slots remaining.</b></i>');
			if (tour[room.id].size == tour[room.id].players.length) {
				tour.start(room.id);
			}
		}
		else {
			return this.sendReply('The user that you specified is already in the tournament.');
		}
	},

	lt: 'l',
	leavetour: 'l',
	l: function(target, room, user, connection) {
		if (tour[room.id] == undefined || tour[room.id].status == 0) {
			return this.sendReply('There is no active tournament to leave.');
		}
		var spotRemover = false;
		if (tour[room.id].status == 1) {
			if (tour.leave(user.userid, room.id)) {
				room.addRaw('<b>' + user.name + '</b> has left the tournament. <b><i>' + (tour[room.id].size - tour[room.id].players.length) + ' slots remaining.</b></i>');
			}
			else {
				return this.sendReply("You're not in the tournament.");
			}
		}
		else {
			var dqopp = tour.lose(user.userid, room.id);
			if (dqopp && dqopp != -1 && dqopp != 1) {
				room.addRaw('<b>' + user.userid + '</b> has left the tournament. <b>' + dqopp + '</b> will advance.');
				var r = tour[room.id].round;
				var c = 0;
				for (var i in r) {
					if (r[i][2] && r[i][2] != -1) {
						c++;
					}
				}
				if (r.length == c) {
					tour.nextRound(room.id);
				}
			}
			else {
				if (dqopp == 1) {
					return this.sendReply("You've already done your match. Wait till next round to leave.");
				}
				if (dqopp == 0 || dqopp == -1) {
					return this.sendReply("You're not in the tournament or your opponent is unavailable.");
				}
			}
		}
	},

	forceleave: 'fl',
	fl: function(target, room, user, connection) {
		if (!user.can('broadcast')) {
			return this.sendReply('You do not have enough authority to use this command.');
		}
		if (tour[room.id] == undefined || tour[room.id].status == 0 || tour[room.id].status == 2) {
			return this.sendReply('There is no tournament in a sign-up phase.  Use /dq username if you wish to remove someone in an active tournament.');
		}
		if (!target) {
			return this.sendReply('Please specify a user to kick from this signup.');
		}
		var targetUser = Users.get(target);
		if (targetUser) {
			target = targetUser.userid;
		}
		else {
			return this.sendReply('The user \'' + target + '\' doesn\'t exist.');
		}
		if (tour.leave(target, room.id)) {
			room.addRaw(user.name + ' has forced <b>' + target + '</b> to leave the tournament. <b><i>' + (tour[room.id].size - tour[room.id].players.length) + ' slots remaining.</b></i>');
		}
		else {
			return this.sendReply('The user that you specified is not in the tournament.');
		}
	},

	remind: function(target, room, user, connection) {
		if (!user.can('broadcast')) {
			return this.sendReply('You do not have enough authority to use this command.');
		}
		if(tour[room.id] == undefined)
			return this.sendReply('There is no active tournament in this room.');

		if (tour[room.id].status != 1) {
			return this.sendReply('There is no tournament in its sign up phase.');
		}
		room.addRaw('<hr /><h2><font color="green">Please sign up for the ' + Data.base.Formats[tour[room.id].tier].name + ' Tournament.</font> <font color="red">/j</font> <font color="green">to join!</font></h2><b><font color="blueviolet">PLAYERS:</font></b> ' + tour[room.id].size + '<br /><font color="blue"><b>TIER:</b></font> ' + Data.base.Formats[tour[room.id].tier].name + '<hr />');
	},

	viewround: 'vr',
	vr: function(target, room, user, connection) {
		if (!this.canBroadcast()) return;
		if(tour[room.id] == undefined)
			return this.sendReply('There is no active tournament in this room.');

		if (tour[room.id].status < 2) {
				return this.sendReply('There is no tournament out of its signup phase.');
		}
		var html = '<hr /><h3><font color="green">Round '+ tour[room.id].roundNum + '!</font></h3><font color="blue"><b>TIER:</b></font> ' + Data.base.Formats[tour[room.id].tier].name + "<hr /><center><small><font color=red>Red</font> = lost, <font color=green>Green</font> = won, <b>Bold</b> = battling</small><center>";
		var r = tour[room.id].round;
		var firstMatch = false;
		for (var i in r) {
			if (!r[i][1]) {
				//bye
				var byer = r[i][0];
				if (Users.get(r[i][0])) {
					byer = Users.get(r[i][0]).name;
				}
				html += "<font color=\"red\">" + clean(byer) + " has received a bye.</font><br />";
			}
			else {
				if (r[i][2] == undefined) {
					//haven't started
					var p1n = r[i][0];
					var p2n = r[i][1];
					if (Users.get(p1n)) p1n = Users.get(p1n).name;
					if (Users.get(p2n)) p2n = Users.get(p2n).name;
					if (p1n.split('Guest ').length - 1 > 0) p1n = r[i][0];
					if (p2n.split('Guest ').length - 1 > 0) p2n = r[i][1];
					var tabla = "";if (!firstMatch) {var tabla = "</center><table align=center cellpadding=0 cellspacing=0>";firstMatch = true;}
					html += tabla + "<tr><td align=right>" + clean(p1n) + "</td><td>&nbsp;VS&nbsp;</td><td>" + clean(p2n) + "</td></tr>";
				}
				else if (r[i][2] == -1) {
					//currently battling
					var p1n = r[i][0];
					var p2n = r[i][1];
					if (Users.get(p1n)) p1n = Users.get(p1n).name;
					if (Users.get(p2n)) p2n = Users.get(p2n).name;
					if (p1n.split('Guest ').length - 1 > 0) p1n = r[i][0];
					if (p2n.split('Guest ').length - 1 > 0) p2n = r[i][1];
					var tabla = "";if (!firstMatch) {var tabla = "</center><table align=center cellpadding=0 cellspacing=0>";firstMatch = true;}
					html += tabla + "<tr><td align=right><b>" + clean(p1n) + "</b></td><td><b>&nbsp;VS&nbsp;</b></td><td><b>" + clean(p2n) + "</b></td></tr>";
				}
				else {
					//match completed
					var p1 = "red";
					var p2 = "green";
					if (r[i][2] == r[i][0]) {
						p1 = "green";
						p2 = "red";
					}
					var p1n = r[i][0];
					var p2n = r[i][1];
					if (Users.get(p1n)) p1n = Users.get(p1n).name;
					if (Users.get(p2n)) p2n = Users.get(p2n).name;
					if (p1n.split('Guest ').length - 1 > 0) p1n = r[i][0];
					if (p2n.split('Guest ').length - 1 > 0) p2n = r[i][1];
					var tabla = "";if (!firstMatch) {var tabla = "</center><table align=center cellpadding=0 cellspacing=0>";firstMatch = true;}
					html += tabla + "<tr><td align=right><b><font color=\"" + p1 + "\">" + clean(p1n) + "</font></b></td><td><b>&nbsp;VS&nbsp;</b></td><td><font color=\"" + p2 + "\"><b>" + clean(p2n) + "</b></font></td></tr>";
				}
			}
		}
		this.sendReply("|raw|" + html + "</table>");
	},

	disqualify: 'dq',
	dq: function(target, room, user, connection) {
		if (!user.can('broadcast')) {
			return this.sendReply('You do not have enough authority to use this command.');
		}
		if (!target) {
			return this.sendReply('Proper syntax for this command is: /dq username');
		}
		if(tour[room.id] == undefined){
			return this.sendReply('There is no active tournament in this room.');
		}
		if (tour[room.id].status < 2) {
			return this.sendReply('There is no tournament out of its sign up phase.');
		}
		var targetUser = Users.get(target);
		if (!targetUser) {
			var dqGuy = sanitize(target.toLowerCase());
		} else {
			var dqGuy = toId(target);
		}
		var error = tour.lose(dqGuy, room.id);
		if (error == -1) {
			return this.sendReply('The user \'' + target + '\' was not in the tournament.');
		}
		else if (error == 0) {
			return this.sendReply('The user \'' + target + '\' was not assigned an opponent. Wait till next round to disqualify them.');
		}
		else if (error == 1) {
			return this.sendReply('The user \'' + target + '\' already played their battle. Wait till next round to disqualify them.');
		}
		else {
			room.addRaw('<b>' + dqGuy + '</b> was disqualified by ' + user.name + ' so ' + error + ' advances.');
			var r = tour[room.id].round;
			var c = 0;
			for (var i in r) {
				if (r[i][2] && r[i][2] != -1) {
					c++;
				}
			}
			if (r.length == c) {
				tour.nextRound(room.id);
			}
		}
	},

	replace: function(target, room, user, connection) {
		if (!user.can('broadcast')) {
			return this.sendReply('You do not have enough authority to use this command.');
		}
		if (tour[room.id] == undefined || tour[room.id].status != 2) {
			return this.sendReply('The tournament is currently in a sign-up phase or is not active, and replacing users only works mid-tournament.');
		}
		if (!target) {
			return this.sendReply('Proper syntax for this command is: /replace user1, user2.  User 2 will replace User 1 in the current tournament.');
		}
		var t = tour.splint(target);
		if (!t[1]) {
			return this.sendReply('Proper syntax for this command is: /replace user1, user2.  User 2 will replace User 1 in the current tournament.');
		}
		var userOne = Users.get(t[0]); 
		var userTwo = Users.get(t[1]);
		if (!userTwo) {
			return this.sendReply('Proper syntax for this command is: /replace user1, user2.  The user you specified to be placed in the tournament is not present!');
		} else {
			t[1] = toId(t[1]);
		}
		if (userOne) {
			t[0] = toId(t[0]);
		}
		var rt = tour[room.id];
		var init1 = false;
		var init2 = false;
		var players = rt.players;
		//check if replacee in tour
		for (var i in players) {
			if (players[i] ==  t[0]) {
				init1 = true;
			}
		}
		//check if replacer in tour
		for (var i in players) {
			if (players[i] ==  t[1]) {
				init2 = true;
			}
		}
		if (!init1) {
			return this.sendReply(t[0]  + ' cannot be replaced by ' + t[1] + " because they are not in the tournament.");
		}
		if (init2) {
			return this.sendReply(t[1] + ' cannot replace ' + t[0] + ' because they are already in the tournament.');
		}
		var outof = ["players", "winners", "losers", "round"];
		for (var x in outof) {
			for (var y in rt[outof[x]]) {
				var c = rt[outof[x]][y];
				if (outof[x] == "round") {
					if (c[0] == t[0]) {
						c[0] = t[1];
					}
					if (c[1] == t[0]) {
						c[1] = t[1];
					}
					if (c[2] == t[0]) {
						c[2] = t[1];
					}
				}
				else {
					if (c == t[0]) {
						rt[outof[x]][y] = t[1];
					}
				}
			}
		}
		rt.history.push(t[0] + "->" + t[1]);
		room.addRaw('<b>' + t[0] +'</b> has left the tournament and is replaced by <b>' + t[1] + '</b>.');
	},
	
	tours: function(target, room, user, connection) {
		if (!this.canBroadcast()) return;
		var oghtml = "<hr /><h2>Tournaments In Their Signup Phase:</h2>";
		var html = oghtml;
		for (var i in tour) {
			var c = tour[i];
			if (typeof c == "object") {
				if (c.status == 1) html += '<button name="joinRoom" value="' + i + '">' + Rooms.rooms[i].title + ' - ' + c.tier + '</button>';
			}
		}
		if (html == oghtml) html += "There are currently no tournaments in their signup phase.";
		this.sendReply('|raw|' + html + "<hr />");
	},

	/**** normal stuff ****/
	poker: function(target, room, user) {
		if (!this.canBroadcast()) return;
		this.sendReplyBox('<div class="infobox">Play Poker Online:<br />&nbsp;&nbsp;- <a href="http://www.pogo.com/games/free-online-poker" target="_blank">Play Poker</a><img src="http://www.picgifs.com/sport-graphics/sport-graphics/playing-cards/sport-graphics-playing-cards-590406.gif" style="float: left;" height="30px" /></div>');
	},
	
	version: function(target, room, user) {
		if (!this.canBroadcast()) return;
		this.sendReplyBox('Server version: <b>'+CommandParser.package.version+'</b> <small>(<a href="http://pokemonshowdown.com/versions#' + CommandParser.serverVersion + '">' + CommandParser.serverVersion.substr(0,10) + '</a>)</small>');
	},

	me: function(target, room, user, connection) {
		canTalk = this.canTalk(target);
		if (!canTalk || (canTalk && !target)) return;

		var message = '/me ' + target;
		// if user is not in spamroom
		if (spamroom[user.userid] === undefined) {
			// check to see if an alt exists in list
			for (var u in spamroom) {
				if (Users.get(user.userid) === Users.get(u)) {
					// if alt exists, add new user id to spamroom, break out of loop.
					spamroom[user.userid] = true;
					break;
				}
			}
		}

		if (user.userid in spamroom) {
			this.sendReply('|c|' + user.getIdentity() + '|' + message);
			return Rooms.rooms['spamroom'].add('|c|' + user.getIdentity() + '|' + message);
		} else {
			return message;
		}
	},

	mee: function(target, room, user, connection) {
		canTalk = this.canTalk(target);
		if (!canTalk || (canTalk && !target)) return;

		var message = '/mee ' + target;
		// if user is not in spamroom
		if (spamroom[user.userid] === undefined) {
			// check to see if an alt exists in list
			for (var u in spamroom) {
				if (Users.get(user.userid) === Users.get(u)) {
					// if alt exists, add new user id to spamroom, break out of loop.
					spamroom[user.userid] = true;
					break;
				}
			}
		}

		if (user.userid in spamroom) {
			this.sendReply('|c|' + user.getIdentity() + '|' + message);
			return Rooms.rooms['spamroom'].add('|c|' + user.getIdentity() + '|' + message);
		} else {
			return message;
		}
	},

	avatar: function(target, room, user) {
		if (!target) return this.parse('/avatars');
		var parts = target.split(',');
		var avatar = parseInt(parts[0]);
		if (!avatar || avatar > 294 || avatar < 1) {
			if (!parts[1]) {
				this.sendReply("Invalid avatar.");
			}
			return false;
		}

		user.avatar = avatar;
		if (!parts[1]) {
			this.sendReply("Avatar changed to:\n" +
					'|raw|<img src="//play.pokemonshowdown.com/sprites/trainers/'+avatar+'.png" alt="" width="80" height="80" />');
		}
	},

	logout: function(target, room, user) {
		user.resetName();
	},

	r: 'reply',
	reply: function(target, room, user) {
		if (!target) return this.parse('/help reply');
		if (!user.lastPM) {
			return this.sendReply('No one has PMed you yet.');
		}
		return this.parse('/msg '+(user.lastPM||'')+', '+target);
	},

	pm: 'msg',
	whisper: 'msg',
	w: 'msg',
	msg: function(target, room, user) {
		if (!target) return this.parse('/help msg');
		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!target) {
			this.sendReply('You forgot the comma.');
			return this.parse('/help msg');
		}
		if (!targetUser || !targetUser.connected) {
			if (!target) {
				this.sendReply('User '+this.targetUsername+' not found. Did you forget a comma?');
			} else {
				this.sendReply('User '+this.targetUsername+' not found. Did you misspell their name?');
			}
			return this.parse('/help msg');
		}

		if (user.locked && !targetUser.can('lock', user)) {
			return this.popupReply('You can only private message members of the moderation team (users marked by %, @, &, or ~) when locked.');
		}
		if (targetUser.locked && !user.can('lock', targetUser)) {
			return this.popupReply('This user is locked and cannot PM.');
		}

		target = this.canTalk(target, null);
		if (!target) return false;

		var message = '|pm|'+user.getIdentity()+'|'+targetUser.getIdentity()+'|'+target;
		user.send(message);
		// if user is not in spamroom
		if(spamroom[user.userid] === undefined){
			// check to see if an alt exists in list
			for(var u in spamroom){
				if(Users.get(user.userid) === Users.get(u)){
					// if alt exists, add new user id to spamroom, break out of loop.
					spamroom[user.userid] = true;
					break;
				}
			}
		}
		
		if (user.userid in spamroom) {
			Rooms.rooms.spamroom.add('|c|' + user.getIdentity() + '|(__Private to ' + targetUser.getIdentity()+ "__) " + target );
		} else {
			if (targetUser !== user) targetUser.send(message);
			targetUser.lastPM = user.userid;
		}
		user.lastPM = targetUser.userid;
	},

	makechatroom: function(target, room, user) {
		if (!this.can('makeroom')) return;
		var id = toId(target);
		if (Rooms.rooms[id]) {
			return this.sendReply("The room '"+target+"' already exists.");
		}
		if (Rooms.global.addChatRoom(target)) {
			return this.sendReply("The room '"+target+"' was created.");
		}
		return this.sendReply("An error occurred while trying to create the room '"+target+"'.");
	},

	privateroom: function(target, room, user) {
		if (!this.can('makeroom')) return;
		if (target === 'off') {
			delete room.isPrivate;
			this.addModCommand(user.name+' made the room public.');
			if (room.chatRoomData) {
				delete room.chatRoomData.isPrivate;
				Rooms.global.writeChatRoomData();
			}
		} else {
			room.isPrivate = true;
			this.addModCommand(user.name+' made the room private.');
			if (room.chatRoomData) {
				room.chatRoomData.isPrivate = true;
				Rooms.global.writeChatRoomData();
			}
		}
	},

	roomowner: function(target, room, user) {
		if (!room.chatRoomData) {
			this.sendReply("/roommod - This room isn't designed for per-room moderation to be added");
		}
		var target = this.splitTarget(target, true);
		var targetUser = this.targetUser;

		if (!targetUser) return this.sendReply("User '"+this.targetUsername+"' is not online.");

		if (!this.can('makeroom', targetUser, room)) return false;

		if (!room.auth) room.auth = room.chatRoomData.auth = {};

		var name = targetUser.name;

		room.auth[targetUser.userid] = '#';
		this.addModCommand(''+name+' was appointed Room Owner by '+user.name+'.');
		room.onUpdateIdentity(targetUser);
		Rooms.global.writeChatRoomData();
	},

	roomdesc: function(target, room, user) {
		if (!target) {
			if (!this.canBroadcast()) return;
			this.sendReply('The room description is: '+room.desc);
			return;
		}
		if (!this.can('roommod', null, room)) return false;
		if (target.length > 80) {
			return this.sendReply('Error: Room description is too long (must be at most 80 characters).');
		}

		room.desc = target;
		this.sendReply('(The room description is now: '+target+')');

		if (room.chatRoomData) {
			room.chatRoomData.desc = room.desc;
			Rooms.global.writeChatRoomData();
		}
	},

	roommod: function(target, room, user) {
		if (!room.auth) {
			this.sendReply("/roommod - This room isn't designed for per-room moderation");
			return this.sendReply("Before setting room mods, you need to set it up with /roomowner");
		}
		var target = this.splitTarget(target, true);
		var targetUser = this.targetUser;

		if (!targetUser) return this.sendReply("User '"+this.targetUsername+"' is not online.");

		if (!this.can('roommod', null, room)) return false;

		var name = targetUser.name;

		if (room.auth[targetUser.userid] === '#') {
			if (!this.can('roomowner', null, room)) return false;
		}
		room.auth[targetUser.userid] = '%';
		this.add(''+name+' was appointed Room Moderator by '+user.name+'.');
		targetUser.updateIdentity();
		if (room.chatRoomData) {
			Rooms.global.writeChatRoomData();
		}
	},

	roomdemod: 'deroommod',
	deroommod: function(target, room, user) {
		if (!room.auth) {
			this.sendReply("/roommod - This room isn't designed for per-room moderation");
			return this.sendReply("Before setting room mods, you need to set it up with /roomowner");
		}
		var target = this.splitTarget(target, true);
		var targetUser = this.targetUser;
		var name = this.targetUsername;
		var userid = toId(name);

		if (room.auth[userid] !== '%') return this.sendReply("User '"+name+"' is not a room mod.");
		if (!this.can('roommod', null, room)) return false;

		delete room.auth[userid];
		this.sendReply('('+name+' is no longer Room Moderator.)');
		if (targetUser) targetUser.updateIdentity();
		if (room.chatRoomData) {
			Rooms.global.writeChatRoomData();
		}
	},
	
	rk: 'rkick',
	rkick: function(target, room, user){
		if(!room.auth) return this.sendReply('/rkick is designed for rooms with their own auth.');
		if(!this.can('roommod', null, room)) return this.sendReply('/rkick - Access Denied.');
		var targetUser = Users.get(target);
		if(targetUser == undefined) return this.sendReply('User not found.');
		targetUser.popup('You have been kicked from room '+ room.title + '.');
		targetUser.leaveRoom(room);
		room.add('|raw|'+ targetUser.name + ' has been kicked from room by '+ user.name + '.');
		this.logModCommand(targetUser.name + ' has been kicked from room by '+ user.name + '.');
		
	},
	
	adultroom: function(target, room, user) {
		if(!user.can('makeroom')) return;
		if(target === 'off'){
			room.isAdult = false;
			return this.addModCommand(user.name + ' has made the room available to everyone.');
		} else {
			room.isAdult = true;
			return this.addModCommand(user.name + ' has made the room available to adults.');
		}
	},

	roomvoice: function(target, room, user) {
		if (!room.auth) {
			this.sendReply("/roomvoice - This room isn't designed for per-room moderation");
			return this.sendReply("Before setting room voices, you need to set it up with /roomowner");
		}
		var target = this.splitTarget(target, true);
		var targetUser = this.targetUser;

		if (!targetUser) return this.sendReply("User '"+this.targetUsername+"' is not online.");

		if (!this.can('roomvoice', null, room)) return false;

		var name = targetUser.name;

		if (room.auth[targetUser.userid] === '%') {
			if (!this.can('roommod', null, room)) return false;
		} else if (room.auth[targetUser.userid]) {
			if (!this.can('roomowner', null, room)) return false;
		}
		room.auth[targetUser.userid] = '+';
		this.add(''+name+' was appointed Room Voice by '+user.name+'.');
		targetUser.updateIdentity();
		if (room.chatRoomData) {
			Rooms.global.writeChatRoomData();
		}
	},

	roomdevoice: 'deroomvoice',
	deroomvoice: function(target, room, user) {
		if (!room.auth) {
			this.sendReply("/roomdevoice - This room isn't designed for per-room moderation");
			return this.sendReply("Before setting room voices, you need to set it up with /roomowner");
		}
		var target = this.splitTarget(target, true);
		var targetUser = this.targetUser;
		var name = this.targetUsername;
		var userid = toId(name);

		if (room.auth[userid] !== '+') return this.sendReply("User '"+name+"' is not a room voice.");
		if (!this.can('roomvoice', null, room)) return false;

		delete room.auth[userid];
		this.sendReply('('+name+' is no longer Room Voice.)');
		if (targetUser) targetUser.updateIdentity();
		if (room.chatRoomData) {
			Rooms.global.writeChatRoomData();
		}
	},

	join: function(target, room, user, connection) {
		if(!target)return this.sendReply('/join room - joins the specified room');
		var targetRoom = Rooms.get(target) || Rooms.get(toId(target));
		if (targetRoom == undefined) {
			return connection.sendTo(target, "|noinit|nonexistent|The room '"+target+"' does not exist.");
		}
		if (targetRoom && !targetRoom.battle && targetRoom !== Rooms.lobby && !user.named) {
			return connection.sendTo(target, "|noinit|namerequired|You must have a name in order to join the room '"+target+"'.");
		}
		if (target.toLowerCase() == "staff" && !user.can('warn')) {
			return this.sendReply("Out peasant. OUT! This room is for staff ONLY!");
		}
		if(targetRoom.isAdult && aList.indexOf(user.userid) === -1){
			return this.sendReply("You are not old enough to join this room. If you believe you are, contact a staff member.");
		}
		if (!user.joinRoom(targetRoom || room, connection)) {
			// This condition appears to be impossible for now.
			return connection.sendTo(target, "|noinit|joinfailed|The room '"+target+"' could not be joined.");
		}
	},

	leave: 'part',
	part: function(target, room, user, connection) {
		if (room.id === 'global') return false;
		var targetRoom = Rooms.get(target);
		if (target && !targetRoom) {
			return this.sendReply("The room '"+target+"' does not exist.");
		}
		user.leaveRoom(targetRoom || room, connection);
	},

	poof: 'd',
	d: function(target, room, user){
		if(room.id !== 'lobby') return false;
		var btags = '<strong><font color='+hashColor(Math.random().toString())+'" >';
		var etags = '</font></strong>'
		var targetid = toUserid(user);
		if(!user.muted && target){
			var tar = toUserid(target);
			var targetUser = Users.get(tar);
			if(user.can('poof', targetUser)){
				
				if(!targetUser){
					user.emit('console', 'Cannot find user ' + target + '.', socket);	
				}else{
					if(poofeh)
						Rooms.rooms.lobby.addRaw(btags + '~~ '+targetUser.name+' was slaughtered by ' + user.name +'! ~~' + etags);
					targetUser.disconnectAll();
					return	this.logModCommand(targetUser.name+ ' was poofed by ' + user.name);
				}
				
			} else {
				return this.sendReply('/poof target - Access denied.');
			}
		}
		if(poofeh && !user.muted){
			Rooms.rooms.lobby.addRaw(btags + getRandMessage(user)+ etags);
			user.disconnectAll();	
		}else{
			return this.sendReply('poof is currently disabled.');
		}
	},

	poofoff: 'nopoof',
	nopoof: function(target, room, user){
		if(!user.can('warn'))
			return this.sendReply('/nopoof - Access denied.');
		if(!poofeh)
			return this.sendReply('poof is currently disabled.');
		poofeh = false;
		return this.sendReply('poof is now disabled.');
	},
	
	poofon: function(target, room, user){
		if(!user.can('warn'))
			return this.sendReply('/poofon - Access denied.');
		if(poofeh)
			return this.sendReply('poof is currently enabled.');
		poofeh = true;
		return this.sendReply('poof is now enabled.');
	},
	
	cpoof: function(target, room, user){
		if(!user.can('broadcast'))
			return this.sendReply('/cpoof - Access Denied');
		
		if(poofeh)
		{
			var btags = '<strong><font color="'+hashColor(Math.random().toString())+'" >';
			var etags = '</font></strong>'
			Rooms.rooms.lobby.addRaw(btags + '~~ '+user.name+' '+target+'! ~~' + etags);
			this.logModCommand(user.name + ' used a custom poof message: \n "'+target+'"');
			user.disconnectAll();	
		}else{
			return this.sendReply('Poof is currently disabled.');
		}
	},

	alist: function(target, room, user){
		if(!user.can('makeroom')) return;
		target = tour.splint(target);
		if (target[0].toLowerCase() === 'list') {
			var aListStr = '';
			for (var u in aList) {
				if(aList[u] != undefined)
					aListStr += aList[u] + ', ';
			}
			aListStr = aListStr.substring(0, aListStr.length-2);
			return this.sendReply("Users currently in the list of adults: " + aListStr);
		}
		if(Object.size(target) < 2){
			return this.sendReply('Insufficient parameters.');
		}
		var tarUser = Users.get(target[1]);
		if(tarUser === undefined){
			return this.sendReply('User not found.');
		}
		if (target[0].toLowerCase() === 'add') {
			var size = Object.size(aList);
			aList[size] = tarUser.userid
			return this.sendReply(tarUser.name + ' has been added to the aList.');
		}
		if (target[0].toLowerCase() === 'remove') {
			var index = aList.indexOf(tarUser.userid);
			if(index === -1){
				return this.sendReply('User not found on aList.');
			} else {
				for (var room in Rooms.rooms) {
					if (Rooms.rooms[room].isAdult) {
							tarUser.leaveRoom(room);
					};
				};
				delete aList[index];
				tarUser.sendTo('lobby', 'You have been removed from the alist and all adult rooms. If you feel this was unjustified, please contact an administrator.');
				return this.sendReply(tarUser.name + ' has been removed from the aList.');
			}
		} else {
			return this.sendReply("Unknown command. Allowable commands are: list, add, remove.");
		}
	},
	
	showpic: function(target, room, user) {
		if (!target) return this.sendReply('/showpic [url], [size] - Adds a picture to the room. Size of 100 is the width of the room (100%).');
		if (aList.indexOf(user.userid) === -1) return this.sendReply('You must be on the alist to use this command.');

		if (!this.canTalk()) return;

		if (!room.isAdult) return this.sendReply('You can only do this in adult rooms.');
		target = tour.splint(target);
		var picSize = '';
		if (target[1]) {
			if (target[1] < 1 || target[1] > 100) return this.sendReply('Size must be between 1 and 100.');
			picSize = ' height=' + target[1] + '% width=' + target[1]+ '%';
		}
		this.add('|raw|<div class="broadcast-blue"><img src=' + target[0] + picSize + '></div>');
		this.logModCommand(user.name +' added the image ' + target);
	},
	
	tell: function(target, room, user) {
		if (user.locked) return this.sendReply('You cannot use this command while locked.');
		if (user.forceRenamed) return this.sendReply('You cannot use this command while under a name that you have been forcerenamed to.');
		if (!target) return this.parse('/help tell');
		
		var targets = target.split(',');
		if (!targets[1]) return this.parse('/help tell');
		var targetUser = toId(targets[0]);

		if (targetUser.length > 18) {
			return this.sendReply('The name of user "' + this.targetUsername + '" is too long.');
		}

		if (!tells[targetUser]) tells[targetUser] = [];
		if (tells[targetUser].length === 5) return this.sendReply('User ' + targetUser + ' has too many tells queued.');

		var date = Date();
		var message = '|raw|' + date.substring(0, date.indexOf('GMT') - 1) + ' - <b>' + user.getIdentity() + '</b> said: ' + targets[1].trim();
		tells[targetUser].add(message);

		return this.sendReply('Message "' + targets[1].trim() + '" sent to ' + targetUser + '.');
	},
	
	punt: function (target, room, user) {
		if (!target) return this.sendReply('You must select a user to punt.\n/punt [user] - punts the selected user.');
		if (!this.canBroadcast()) return false;
		if (!this.broadcasting) return this.sendReply('This command can only be used by broadcasting it.');
		var targetUser = Users.get(target);

		if (!targetUser) return this.sendReply('User "' + target.trim() + '" could not be found.');

		room.add('|c|' + user.getIdentity() + '|/me punts ' + targetUser.name);
		return room.add('|c|' + targetUser.getIdentity() + '|/me is punted by ' + user.name);
	},
	
	/*
	kupkup: function(target, room, user){
		if(!user.can('root')) return this.sendReply('/kupkup - Access denied.');
		for(var i = 0; i < 5; i++)
			for(var u in room.users) 
				if(Users.get(u) != undefined && u.toLowerCase().indexOf('guest') != 0 && Users.get(u).connected) 
					this.add('|c|' + Users.get(u).getIdentity() + '|THE KUPKUP CHANT: ♪kupo kupo kupochu~♫');
		return;
	},*/

	/*********************************************************
	 * Moderating: Punishments
	 *********************************************************/
	spam: 'spamroom',
	spammer: 'spamroom',
	spamroom: function(target, room, user, connection) {
		var target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser || !targetUser.connected) {
			return this.sendReply('The user \'' + this.targetUsername + '\' does not exist.');
		}
		if (!this.can('mute', targetUser)) {
			return false;
		}
		if (spamroom[targetUser]) {
			return this.sendReply('That user\'s messages are already being redirected to the spamroom.');
		}
		spamroom[targetUser] = true;
		Rooms.rooms['spamroom'].add('|raw|<b>' + this.targetUsername + ' was added to the spamroom list.</b>');
		this.logModCommand(targetUser + ' was added to spamroom by ' + user.name);
		return this.sendReply(this.targetUsername + ' was successfully added to the spamroom list.');
	},
	
	unspam: 'unspamroom',
	unspammer: 'unspamroom',
	unspamroom: function(target, room, user, connection) {
		var target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser || !targetUser.connected) {
			return this.sendReply('The user \'' + this.targetUsername + '\' does not exist.');
		}
		if (!this.can('mute', targetUser)) {
			return false;
		}
		if (!spamroom[targetUser]) {
			return this.sendReply('That user is not in the spamroom list.');
		}
		for(var u in spamroom)
			if(targetUser == Users.get(u))
				delete spamroom[u];
		Rooms.rooms['spamroom'].add('|raw|<b>' + this.targetUsername + ' was removed from the spamroom list.</b>');
		this.logModCommand(targetUser + ' was removed from spamroom by ' + user.name);
		return this.sendReply(this.targetUsername + ' and their alts were successfully removed from the spamroom list.');
	},

	k: 'warn',
	kick: 'warn',
	warn: function(target, room, user) {
		if (!target) return this.parse('/help warn');

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser || !targetUser.connected) {
			return this.sendReply('User '+this.targetUsername+' not found.');
		}
		if (!this.can('warn', targetUser)) return false;

		this.addModCommand(''+targetUser.name+' was warned by '+user.name+'.' + (target ? " (" + target + ")" : ""));
		targetUser.send('|c|~|/warn '+target);
	},

	redirect: 'redir',
	redir: function (target, room, user, connection) {
		if (!target) return this.parse('/help redir');
		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!target) return this.sendReply('You need to input a room name!');
		var targetRoom = Rooms.get(target);
		if (target && !targetRoom) {
			return connection.sendTo(user, "|noinit|nonexistent|The room '" + target + "' does not exist.");
		}
		if (!user.can('kick', targetUser, room)) return false;
		if (!targetUser || !targetUser.connected) {
			return this.sendReply('User '+this.targetUsername+' not found.');
		}
		if (targetRoom.isAdult) {
			return this.sendReply('You cannot redirect to an adult room.');
		}
		var roomName = (targetRoom.isPrivate)? 'a private room' : ' the room "' + target + '"';
		this.addModCommand(targetUser.name + ' was forcibly redirected to ' + roomName + ' by ' + user.name + '.');
		targetUser.leaveRoom(room);
		targetUser.joinRoom(target);
	},

	m: 'mute',
	mute: function(target, room, user) {
		if (!target) return this.parse('/help mute');

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser) {
			return this.sendReply('User '+this.targetUsername+' not found.');
		}
		if (!this.can('mute', targetUser, room)) return false;
		if (targetUser.mutedRooms[room.id] || targetUser.locked || !targetUser.connected) {
			var problem = ' but was already '+(!targetUser.connected ? 'offline' : targetUser.locked ? 'locked' : 'muted');
			if (!target) {
				return this.privateModCommand('('+targetUser.name+' would be muted by '+user.name+problem+'.)');
			}
			return this.addModCommand(''+targetUser.name+' would be muted by '+user.name+problem+'.' + (target ? " (" + target + ")" : ""));
		}

		targetUser.popup(user.name+' has muted you for 7 minutes. '+target);
		this.addModCommand(''+targetUser.name+' was muted by '+user.name+' for 7 minutes.' + (target ? " (" + target + ")" : ""));
		var alts = targetUser.getAlts();
		if (alts.length) this.addModCommand(""+targetUser.name+"'s alts were also muted: "+alts.join(", "));

		targetUser.mute(room.id, 7*60*1000);
	},

	hm: 'hourmute',
	hourmute: function(target, room, user) {
		if (!target) return this.parse('/help hourmute');

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser) {
			return this.sendReply('User '+this.targetUsername+' not found.');
		}
		if (!this.can('mute', targetUser, room)) return false;

		if (((targetUser.mutedRooms[room.id] && (targetUser.muteDuration[room.id]||0) >= 50*60*1000) || targetUser.locked) && !target) {
			var problem = ' but was already '+(!targetUser.connected ? 'offline' : targetUser.locked ? 'locked' : 'muted');
			return this.privateModCommand('('+targetUser.name+' would be muted by '+user.name+problem+'.)');
		}

		targetUser.popup(user.name+' has muted you for 60 minutes. '+target);
		this.addModCommand(''+targetUser.name+' was muted by '+user.name+' for 60 minutes.' + (target ? " (" + target + ")" : ""));
		var alts = targetUser.getAlts();
		if (alts.length) this.addModCommand(""+targetUser.name+"'s alts were also muted: "+alts.join(", "));

		targetUser.mute(room.id, 60*60*1000, true);
	},

	um: 'unmute',
	unmute: function(target, room, user) {
		if (!target) return this.parse('/help something');
		var targetid = toUserid(target);
		var targetUser = Users.get(target);
		if (!targetUser) {
			return this.sendReply('User '+target+' not found.');
		}
		if (!this.can('mute', targetUser, room)) return false;

		if (!targetUser.mutedRooms[room.id]) {
			return this.sendReply(''+targetUser.name+' isn\'t muted.');
		}

		this.addModCommand(''+targetUser.name+' was unmuted by '+user.name+'.');

		targetUser.unmute(room.id);
	},

	ipmute: 'lock',
	lock: function(target, room, user) {
		if (!target) return this.parse('/help lock');

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser) {
			return this.sendReply('User '+this.targetUser+' not found.');
		}
		if (!user.can('lock', targetUser)) {
			return this.sendReply('/lock - Access denied.');
		}

		if ((targetUser.locked || Users.checkBanned(targetUser.latestIp)) && !target) {
			var problem = ' but was already '+(targetUser.locked ? 'locked' : 'banned');
			return this.privateModCommand('('+targetUser.name+' would be locked by '+user.name+problem+'.)');
		}

		targetUser.popup(user.name+' has locked you from talking in chats, battles, and PMing regular users.\n\n'+target+'\n\nIf you feel that your lock was unjustified, you can still PM staff members (%, @, &, and ~) to discuss it.');

		this.addModCommand(""+targetUser.name+" was locked from talking by "+user.name+"." + (target ? " (" + target + ")" : ""));
		var alts = targetUser.getAlts();
		if (alts.length) this.addModCommand(""+targetUser.name+"'s alts were also locked: "+alts.join(", "));
		this.add('|unlink|' + targetUser.userid);

		targetUser.lock();
	},

	unlock: function(target, room, user) {
		if (!target) return this.parse('/help unlock');
		if (!this.can('lock')) return false;

		var unlocked = Users.unlock(target);

		if (unlocked) {
			var names = Object.keys(unlocked);
			this.addModCommand('' + names.join(', ') + ' ' +
					((names.length > 1) ? 'were' : 'was') +
					' unlocked by ' + user.name + '.');
		} else {
			this.sendReply('User '+target+' is not locked.');
		}
	},

	b: 'ban',
	ban: function(target, room, user) {
		if (!target) return this.parse('/help ban');

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser) {
			return this.sendReply('User '+this.targetUsername+' not found.');
		}
		if (!this.can('ban', targetUser)) return false;

		if (Users.checkBanned(targetUser.latestIp) && !target && !targetUser.connected) {
			var problem = ' but was already banned';
			return this.privateModCommand('('+targetUser.name+' would be banned by '+user.name+problem+'.)');
		}

		targetUser.popup(user.name+" has banned you." + (config.appealurl ? ("  If you feel that your banning was unjustified you can appeal the ban:\n" + config.appealurl) : "") + "\n\n"+target);

		this.addModCommand(""+targetUser.name+" was banned by "+user.name+"." + (target ? " (" + target + ")" : ""));
		var alts = targetUser.getAlts();
		if (alts.length) {
			this.addModCommand(""+targetUser.name+"'s alts were also banned: "+alts.join(", "));
			for (var i = 0; i < alts.length; ++i) {
				this.add('|unlink|' + toId(alts[i]));
			}
		}

		this.add('|unlink|' + targetUser.userid);
		targetUser.ban();
	},

	unban: function(target, room, user) {
		if (!target) return this.parse('/help unban');
		if (!user.can('ban')) {
			return this.sendReply('/unban - Access denied.');
		}

		var name = Users.unban(target);

		if (name) {
			this.addModCommand(''+name+' was unbanned by '+user.name+'.');
		} else {
			this.sendReply('User '+target+' is not banned.');
		}
	},

	unbanall: function(target, room, user) {
		if (!user.can('ban')) {
			return this.sendReply('/unbanall - Access denied.');
		}
		// we have to do this the hard way since it's no longer a global
		for (var i in Users.bannedIps) {
			delete Users.bannedIps[i];
		}
		for (var i in Users.lockedIps) {
			delete Users.lockedIps[i];
		}
		this.addModCommand('All bans and locks have been lifted by '+user.name+'.');
	},

	banip: function(target, room, user) {
		target = target.trim();
		if (!target) {
			return this.parse('/help banip');
		}
		if (!this.can('rangeban')) return false;

		Users.bannedIps[target] = '#ipban';
		this.addModCommand(user.name+' temporarily banned the '+(target.charAt(target.length-1)==='*'?'IP range':'IP')+': '+target);
	},

	unbanip: function(target, room, user) {
		target = target.trim();
		if (!target) {
			return this.parse('/help unbanip');
		}
		if (!this.can('rangeban')) return false;
		if (!Users.bannedIps[target]) {
			return this.sendReply(''+target+' is not a banned IP or IP range.');
		}
		delete Users.bannedIps[target];
		this.addModCommand(user.name+' unbanned the '+(target.charAt(target.length-1)==='*'?'IP range':'IP')+': '+target);
	},

	/*********************************************************
	 * Moderating: Other
	 *********************************************************/
	
	fjs: 'forcejoinstaff',
	forcejoinstaff: function(target, room, user){
		if(!user.can('declare')) return false;
		if(Rooms.rooms['staff'] == undefined){
			Rooms.rooms['staff'] = new Rooms.ChatRoom('staff', 'staff');
			Rooms.rooms['staff'].isPrivate = true;
			this.sendReply('The private room \'staff\' was created.');
		}
		for(var u in Users.users)
			if(Users.users[u].connected && config.groupsranking.indexOf(Users.users[u].group) >= 2)
				Users.users[u].joinRoom('staff');
		return this.sendReply('Staff has been gathered.');
	},
	 
	hide: 'hideauth',
	hideauth: function(target, room, user){
		if(!user.can('hideauth'))
			return this.sendReply( '/hideauth - access denied.');
		
		var tar = ' ';
		if(target){
			target = target.trim();
			if(config.groupsranking.indexOf(target) > -1){
				if( config.groupsranking.indexOf(target) <= config.groupsranking.indexOf(user.group)){
					tar = target;
				}else{
					this.sendReply('The group symbol you have tried to use is of a higher authority than you have access to. Defaulting to \' \' instead.');
				}
			}else{
				this.sendReply('You have tried to use an invalid character as your auth symbol. Defaulting to \' \' instead.');
			}
		}
	
		user.getIdentity = function(){
			if(this.muted)
				return '!' + this.name;
			if(this.locked)
				return '#' + this.name;
			return tar + this.name;
		};
		user.updateIdentity();
		this.sendReply( 'You are now hiding your auth symbol as \''+tar+ '\'.');
		return this.logModCommand(user.name + ' is hiding auth symbol as \''+ tar + '\'');
	},
	
	showauth: function(target, room, user){
		if(!user.can('hideauth'))
			return	this.sendReply( '/showauth - access denied.');
		
		delete user.getIdentity;
		user.updateIdentity();
		this.sendReply('You have now revealed your auth symbol.');
		return this.logModCommand(user.name + ' has revealed their auth symbol.');
	},

	modnote: function(target, room, user, connection, cmd) {
		if (!target) return this.parse('/help note');
		if (!this.can('mute')) return false;
		return this.privateModCommand('(' + user.name + ' notes: ' + target + ')');
	},
	
	demote: 'promote',
	promote: function(target, room, user, connection, cmd) {
		if (!target) return this.parse('/help promote');
		var target = this.splitTarget(target, true);
		var targetUser = this.targetUser;
		var userid = toUserid(this.targetUsername);
		var name = targetUser ? targetUser.name : this.targetUsername;

		var currentGroup = ' ';
		if (targetUser) {
			currentGroup = targetUser.group;
		} else if (Users.usergroups[userid]) {
			currentGroup = Users.usergroups[userid].substr(0,1);
		}

		var nextGroup = target ? target : Users.getNextGroupSymbol(currentGroup, cmd === 'demote');
		if (target === 'deauth') nextGroup = config.groupsranking[0];
		if (!config.groups[nextGroup]) {
			return this.sendReply('Group \'' + nextGroup + '\' does not exist.');
		}
		if (!user.checkPromotePermission(currentGroup, nextGroup)) {
			return this.sendReply('/promote - Access denied.');
		}

		var isDemotion = (config.groups[nextGroup].rank < config.groups[currentGroup].rank);
		if (!Users.setOfflineGroup(name, nextGroup)) {
			return this.sendReply('/promote - WARNING: This user is offline and could be unregistered. Use /forcepromote if you\'re sure you want to risk it.');
		}
		var groupName = (config.groups[nextGroup].name || nextGroup || '').trim() || 'a regular user';
		if (isDemotion) {
			this.privateModCommand('('+name+' was demoted to ' + groupName + ' by '+user.name+'.)');
			if (targetUser) {
				targetUser.popup('You were demoted to ' + groupName + ' by ' + user.name + '.');
			}
		} else {
			this.addModCommand(''+name+' was promoted to ' + groupName + ' by '+user.name+'.');
		}
		if (targetUser) {
			targetUser.updateIdentity();
		}
	},

	forcepromote: function(target, room, user) {
		// warning: never document this command in /help
		if (!this.can('forcepromote')) return false;
		var target = this.splitTarget(target, true);
		var name = this.targetUsername;
		var nextGroup = target ? target : Users.getNextGroupSymbol(' ', false);

		if (!Users.setOfflineGroup(name, nextGroup, true)) {
			return this.sendReply('/forcepromote - Don\'t forcepromote unless you have to.');
		}
		var groupName = config.groups[nextGroup].name || nextGroup || '';
		this.addModCommand(''+name+' was promoted to ' + (groupName.trim()) + ' by '+user.name+'.');
	},

	deauth: function(target, room, user) {
		return this.parse('/demote '+target+', deauth');
	},

	modchat: function(target, room, user) {
		if (!target) {
			return this.sendReply('Moderated chat is currently set to: '+room.modchat);
		}
		if (!this.can('modchat', null, room) || !this.canTalk()) return false;

		target = target.toLowerCase();
		switch (target) {
		case 'on':
		case 'true':
		case 'yes':
		case 'registered':
			this.sendReply("Modchat registered has been removed.");
			this.sendReply("If you're dealing with a spammer, make sure to run /loadbanlist.");
			return false;
			break;
		case 'off':
		case 'false':
		case 'no':
			room.modchat = false;
			break;
		default:
			if (!config.groups[target]) {
				return this.parse('/help modchat');
			}
			if (config.groupsranking.indexOf(target) > 1 && !user.can('modchatall')) {
				return this.sendReply('/modchat - Access denied for setting higher than ' + config.groupsranking[1] + '.');
			}
			room.modchat = target;
			break;
		}
		if (room.modchat === true) {
			this.add('|raw|<div class="broadcast-red"><b>Moderated chat was enabled!</b><br />Only registered users can talk.</div>');
		} else if (!room.modchat) {
			this.add('|raw|<div class="broadcast-blue"><b>Moderated chat was disabled!</b><br />Anyone may talk now.</div>');
		} else {
			var modchat = sanitize(room.modchat);
			this.add('|raw|<div class="broadcast-red"><b>Moderated chat was set to '+modchat+'!</b><br />Only users of rank '+modchat+' and higher can talk.</div>');
		}
		this.logModCommand(user.name+' set modchat to '+room.modchat);
	},

	declare: function(target, room, user) {
		if (!target) return this.parse('/help declare');
		if (!this.can('declare', null, room)) return false;

		if (!this.canTalk()) return;

		this.add('|raw|<div class="broadcast-blue"><b>'+target+'</b></div>');
		this.logModCommand(user.name+' declared '+target);
	},

	wall: 'announce',
	announce: function(target, room, user) {
		if (!target) return this.parse('/help announce');

		if (!this.can('announce', null, room)) return false;

		target = this.canTalk(target);
		if (!target) return;

		return '/announce '+target;
	},

	fr: 'forcerename',
	forcerename: function(target, room, user) {
		if (!target) return this.parse('/help forcerename');
		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser) {
			return this.sendReply('User '+this.targetUsername+' not found.');
		}
		if (!this.can('forcerename', targetUser)) return false;

		if (targetUser.userid === toUserid(this.targetUser)) {
			var entry = ''+targetUser.name+' was forced to choose a new name by '+user.name+'.' + (target ? " (" + target + ")" : "");
			this.logModCommand(entry);
			Rooms.lobby.sendAuth('(' + entry + ')');
			if (room.id !== 'lobby') {
				this.add(entry);
			} else {
				this.logEntry(entry);
			}
			targetUser.resetName();
			targetUser.send('|nametaken||'+user.name+" has forced you to change your name. "+target);
		} else {
			this.sendReply("User "+targetUser.name+" is no longer using that name.");
		}
	},

	frt: 'forcerenameto',
	forcerenameto: function(target, room, user) {
		if (!target) return this.parse('/help forcerenameto');
		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser) {
			return this.sendReply('User '+this.targetUsername+' not found.');
		}
		if (!target) {
			return this.sendReply('No new name was specified.');
		}
		if (!this.can('forcerenameto', targetUser)) return false;

		if (targetUser.userid === toUserid(this.targetUser)) {
			var entry = ''+targetUser.name+' was forcibly renamed to '+target+' by '+user.name+'.';
			this.logModCommand(entry);
			Rooms.lobby.sendAuth('(' + entry + ')');
			if (room.id !== 'lobby') {
				room.add(entry);
			} else {
				room.logEntry(entry);
			}
			targetUser.forceRename(target, undefined, true);
		} else {
			this.sendReply("User "+targetUser.name+" is no longer using that name.");
		}
	},

	modlog: function(target, room, user, connection) {
		if (!this.can('modlog')) return false;
		var lines = 0;
		if (!target.match('[^0-9]')) { 
			lines = parseInt(target || 15, 10);
			if (lines > 100) lines = 100;
		}
		var filename = 'logs/modlog.txt';
		var command = 'tail -'+lines+' '+filename;
		var grepLimit = 100;
		if (!lines || lines < 0) { // searching for a word instead
			if (target.match(/^["'].+["']$/)) target = target.substring(1,target.length-1);
			command = "awk '{print NR,$0}' "+filename+" | sort -nr | cut -d' ' -f2- | grep -m"+grepLimit+" -i '"+target.replace(/\\/g,'\\\\\\\\').replace(/["'`]/g,'\'\\$&\'').replace(/[\{\}\[\]\(\)\$\^\.\?\+\-\*]/g,'[$&]')+"'";
		}

		require('child_process').exec(command, function(error, stdout, stderr) {
			if (error && stderr) {
				connection.popup('/modlog erred - modlog does not support Windows');
				console.log('/modlog error: '+error);
				return false;
			}
			if (lines) {
				if (!stdout) {
					connection.popup('The modlog is empty. (Weird.)');
				} else {
					connection.popup('Displaying the last '+lines+' lines of the Moderator Log:\n\n'+stdout);
				}
			} else {
				if (!stdout) {
					connection.popup('No moderator actions containing "'+target+'" were found.');
				} else {
					connection.popup('Displaying the last '+grepLimit+' logged actions containing "'+target+'":\n\n'+stdout);
				}
			}
		});
	},

	bw: 'banword',
	banword: function(target, room, user) {
		if (!this.can('declare')) return false;
		target = toId(target);
		if (!target) {
			return this.sendReply('Specify a word or phrase to ban.');
		}
		Users.addBannedWord(target);
		this.sendReply('Added \"'+target+'\" to the list of banned words.');
	},

	ubw: 'unbanword',
	unbanword: function(target, room, user) {
		if (!this.can('declare')) return false;
		target = toId(target);
		if (!target) {
			return this.sendReply('Specify a word or phrase to unban.');
		}
		Users.removeBannedWord(target);
		this.sendReply('Removed \"'+target+'\" from the list of banned words.');
	},

	/*********************************************************
	 * Server management commands
	 *********************************************************/

	hotpatch: function(target, room, user) {
		if (!target) return this.parse('/help hotpatch');
		if (!this.can('hotpatch')) return false;

		Rooms.lobby.logEntry(user.name + ' used /hotpatch ' + target);

		if (target === 'chat') {

			CommandParser.uncacheTree('./command-parser.js');
			CommandParser = require('./command-parser.js');
			return this.sendReply('Chat commands have been hot-patched.');

		} else if (target === 'battles') {

			Simulator.SimulatorProcess.respawn();
			return this.sendReply('Battles have been hotpatched. Any battles started after now will use the new code; however, in-progress battles will continue to use the old code.');

		} else if (target === 'formats') {

			// uncache the tools.js dependency tree
			CommandParser.uncacheTree('./tools.js');
			// reload tools.js
			Data = {};	
			Tools = require('./tools.js'); // note: this will lock up the server for a few seconds
			// rebuild the formats list
			Rooms.global.formatListText = Rooms.global.getFormatListText();
			// respawn simulator processes
			Simulator.SimulatorProcess.respawn();
			// broadcast the new formats list to clients
			Rooms.global.send(Rooms.global.formatListText);

			return this.sendReply('Formats have been hotpatched.');

		}
		this.sendReply('Your hot-patch command was unrecognized.');
	},

	savelearnsets: function(target, room, user) {
		if (this.can('hotpatch')) return false;
		fs.writeFile('data/learnsets.js', 'exports.BattleLearnsets = '+JSON.stringify(BattleLearnsets)+";\n");
		this.sendReply('learnsets.js saved.');
	},

	disableladder: function(target, room, user) {
		if (!this.can('disableladder')) return false;
		if (LoginServer.disabled) {
			return this.sendReply('/disableladder - Ladder is already disabled.');
		}
		LoginServer.disabled = true;
		this.logModCommand('The ladder was disabled by ' + user.name + '.');
		this.add('|raw|<div class="broadcast-red"><b>Due to high server load, the ladder has been temporarily disabled</b><br />Rated games will no longer update the ladder. It will be back momentarily.</div>');
	},

	enableladder: function(target, room, user) {
		if (!this.can('disableladder')) return false;
		if (!LoginServer.disabled) {
			return this.sendReply('/enable - Ladder is already enabled.');
		}
		LoginServer.disabled = false;
		this.logModCommand('The ladder was enabled by ' + user.name + '.');
		this.add('|raw|<div class="broadcast-green"><b>The ladder is now back.</b><br />Rated games will update the ladder now.</div>');
	},

	lockdown: function(target, room, user) {
		if (!this.can('lockdown')) return false;

		Rooms.global.lockdown = true;
		for (var id in Rooms.rooms) {
			if (id !== 'global') Rooms.rooms[id].addRaw('<div class="broadcast-red"><b>The server is restarting soon.</b><br />Please finish your battles quickly. No new battles can be started until the server resets in a few minutes.</div>');
			if (Rooms.rooms[id].requestKickInactive) Rooms.rooms[id].requestKickInactive(user, true);
		}

		Rooms.lobby.logEntry(user.name + ' used /lockdown');

	},

	endlockdown: function(target, room, user) {
		if (!this.can('lockdown')) return false;

		Rooms.global.lockdown = false;
		for (var id in Rooms.rooms) {
			if (id !== 'global') Rooms.rooms[id].addRaw('<div class="broadcast-green"><b>The server shutdown was canceled.</b></div>');
		}

		Rooms.lobby.logEntry(user.name + ' used /endlockdown');

	},

	kill: function(target, room, user) {
		if (!this.can('lockdown')) return false;

		if (!Rooms.global.lockdown) {
			return this.sendReply('For safety reasons, /kill can only be used during lockdown.');
		}

		if (CommandParser.updateServerLock) {
			return this.sendReply('Wait for /updateserver to finish before using /kill.');
		}

		Rooms.lobby.destroyLog(function() {
			Rooms.lobby.logEntry(user.name + ' used /kill');
		}, function() {
			process.exit();
		});

		// Just in the case the above never terminates, kill the process
		// after 10 seconds.
		setTimeout(function() {
			process.exit();
		}, 10000);
	},

	loadbanlist: function(target, room, user, connection) {
		if (!this.can('modchat')) return false;

		connection.sendTo(room, 'Loading ipbans.txt...');
		fs.readFile('config/ipbans.txt', function (err, data) {
			if (err) return;
			data = (''+data).split("\n");
			var count = 0;
			for (var i=0; i<data.length; i++) {
				data[i] = data[i].split('#')[0].trim();
				if (data[i] && !Users.bannedIps[data[i]]) {
					Users.bannedIps[data[i]] = '#ipban';
					count++;
				}
			}
			if (!count) {
				connection.sendTo(room, 'No IPs were banned; ipbans.txt has not been updated since the last time /loadbanlist was called.');
			} else {
				connection.sendTo(room, ''+count+' IPs were loaded from ipbans.txt and banned.');
			}
		});
	},

	refreshpage: function(target, room, user) {
		if (!this.can('hotpatch')) return false;
		Rooms.lobby.send('|refresh|');
		Rooms.lobby.logEntry(user.name + ' used /refreshpage');
	},

	gitpull: 'updateserver',
	updateserver: function(target, room, user, connection) {
		if (!user.checkConsolePermission(connection)) {
			return this.sendReply('/updateserver - Access denied.');
		}

		if (CommandParser.updateServerLock) {
			return this.sendReply('/updateserver - Another update is already in progress.');
		}

		CommandParser.updateServerLock = true;

		var logQueue = [];
		logQueue.push(user.name + ' used /updateserver');

		connection.sendTo(room, 'updating...');

		var exec = require('child_process').exec;
		exec('git diff-index --quiet HEAD --', function(error) {
			var cmd = 'git pull --rebase';
			if (error) {
				if (error.code === 1) {
					// The working directory or index have local changes.
					cmd = 'git stash;' + cmd + ';git stash pop';
				} else {
					// The most likely case here is that the user does not have
					// `git` on the PATH (which would be error.code === 127).
					connection.sendTo(room, '' + error);
					logQueue.push('' + error);
					logQueue.forEach(Rooms.lobby.logEntry.bind(Rooms.lobby));
					CommandParser.updateServerLock = false;
					return;
				}
			}
			var entry = 'Running `' + cmd + '`';
			connection.sendTo(room, entry);
			logQueue.push(entry);
			exec(cmd, function(error, stdout, stderr) {
				('' + stdout + stderr).split('\n').forEach(function(s) {
					connection.sendTo(room, s);
					logQueue.push(s);
				});
				logQueue.forEach(Rooms.lobby.logEntry.bind(Rooms.lobby));
				CommandParser.updateServerLock = false;
			});
		});
	},

	crashfixed: function(target, room, user) {
		if (!Rooms.global.lockdown) {
			return this.sendReply('/crashfixed - There is no active crash.');
		}
		if (!this.can('hotpatch')) return false;

		Rooms.global.lockdown = false;
		Rooms.lobby.modchat = false;
		Rooms.lobby.addRaw('<div class="broadcast-green"><b>We fixed the crash without restarting the server!</b><br />You may resume talking in the lobby and starting new battles.</div>');
		Rooms.lobby.logEntry(user.name + ' used /crashfixed');
	},

	crashlogged: function(target, room, user) {
		if (!Rooms.global.lockdown) {
			return this.sendReply('/crashlogged - There is no active crash.');
		}
		if (!this.can('declare')) return false;

		Rooms.global.lockdown = false;
		Rooms.lobby.modchat = false;
		Rooms.lobby.addRaw('<div class="broadcast-green"><b>We have logged the crash and are working on fixing it!</b><br />You may resume talking in the lobby and starting new battles.</div>');
		Rooms.lobby.logEntry(user.name + ' used /crashlogged');
	},

	eval: function(target, room, user, connection, cmd, message) {
		if (!user.checkConsolePermission(connection)) {
			return this.sendReply("/eval - Access denied.");
		}
		if (!this.canBroadcast()) return;

		if (!this.broadcasting) this.sendReply('||>> '+target);
		try {
			var battle = room.battle;
			var me = user;
			this.sendReply('||<< '+eval(target));
		} catch (e) {
			this.sendReply('||<< error: '+e.message);
			var stack = '||'+(''+e.stack).replace(/\n/g,'\n||');
			connection.sendTo(room, stack);
		}
	},

	evalbattle: function(target, room, user, connection, cmd, message) {
		if (!user.checkConsolePermission(connection)) {
			return this.sendReply("/evalbattle - Access denied.");
		}
		if (!this.canBroadcast()) return;
		if (!room.battle) {
			return this.sendReply("/evalbattle - This isn't a battle room.");
		}

		room.battle.send('eval', target.replace(/\n/g, '\f'));
	},

	/*********************************************************
	 * Battle commands
	 *********************************************************/

	concede: 'forfeit',
	surrender: 'forfeit',
	forfeit: function(target, room, user) {
		if (!room.battle) {
			return this.sendReply("There's nothing to forfeit here.");
		}
		if (!room.forfeit(user)) {
			return this.sendReply("You can't forfeit this battle.");
		}
	},

	savereplay: function(target, room, user, connection) {
		if (!room || !room.battle) return;
		var logidx = 2; // spectator log (no exact HP)
		if (room.battle.ended) {
			// If the battle is finished when /savereplay is used, include
			// exact HP in the replay log.
			logidx = 3;
		}
		var data = room.getLog(logidx).join("\n");
		var datahash = crypto.createHash('md5').update(data.replace(/[^(\x20-\x7F)]+/g,'')).digest('hex');

		LoginServer.request('prepreplay', {
			id: room.id.substr(7),
			loghash: datahash,
			p1: room.p1.name,
			p2: room.p2.name,
			format: room.format
		}, function(success) {
			connection.send('|queryresponse|savereplay|'+JSON.stringify({
				log: data,
				room: 'lobby',
				id: room.id.substr(7)
			}));
		});
	},

	mv: 'move',
	attack: 'move',
	move: function(target, room, user) {
		if (!room.decision) return this.sendReply('You can only do this in battle rooms.');

		room.decision(user, 'choose', 'move '+target);
	},

	sw: 'switch',
	switch: function(target, room, user) {
		if (!room.decision) return this.sendReply('You can only do this in battle rooms.');

		room.decision(user, 'choose', 'switch '+parseInt(target,10));
	},

	choose: function(target, room, user) {
		if (!room.decision) return this.sendReply('You can only do this in battle rooms.');

		room.decision(user, 'choose', target);
	},

	undo: function(target, room, user) {
		if (!room.decision) return this.sendReply('You can only do this in battle rooms.');

		room.decision(user, 'undo', target);
	},

	team: function(target, room, user) {
		if (!room.decision) return this.sendReply('You can only do this in battle rooms.');

		room.decision(user, 'choose', 'team '+target);
	},

	joinbattle: function(target, room, user) {
		if (!room.joinBattle) return this.sendReply('You can only do this in battle rooms.');

		room.joinBattle(user);
	},

	partbattle: 'leavebattle',
	leavebattle: function(target, room, user) {
		if (!room.leaveBattle) return this.sendReply('You can only do this in battle rooms.');

		room.leaveBattle(user);
	},

	kickbattle: function(target, room, user) {
		if (!room.leaveBattle) return this.sendReply('You can only do this in battle rooms.');

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser || !targetUser.connected) {
			return this.sendReply('User '+this.targetUsername+' not found.');
		}
		if (!this.can('kick', targetUser)) return false;

		if (room.leaveBattle(targetUser)) {
			this.addModCommand(''+targetUser.name+' was kicked from a battle by '+user.name+'' + (target ? " (" + target + ")" : ""));
		} else {
			this.sendReply("/kickbattle - User isn\'t in battle.");
		}
	},

	kickinactive: function(target, room, user) {
		if (room.requestKickInactive) {
			room.requestKickInactive(user);
		} else {
			this.sendReply('You can only kick inactive players from inside a room.');
		}
	},

	timer: function(target, room, user) {
		target = toId(target);
		if (room.requestKickInactive) {
			if (target === 'off' || target === 'stop') {
				room.stopKickInactive(user, user.can('timer'));
			} else if (target === 'on' || !target) {
				room.requestKickInactive(user, user.can('timer'));
			} else {
				this.sendReply("'"+target+"' is not a recognized timer state.");
			}
		} else {
			this.sendReply('You can only set the timer from inside a room.');
		}
	},

	forcetie: 'forcewin',
	forcewin: function(target, room, user) {
		if (!this.can('forcewin')) return false;
		if (!room.battle) {
			this.sendReply('/forcewin - This is not a battle room.');
			return false;
		}

		room.battle.endType = 'forced';
		if (!target) {
			room.battle.tie();
			this.logModCommand(user.name+' forced a tie.');
			return false;
		}
		target = Users.get(target);
		if (target) target = target.userid;
		else target = '';

		if (target) {
			room.battle.win(target);
			this.logModCommand(user.name+' forced a win for '+target+'.');
		}

	},

	/*********************************************************
	 * Challenging and searching commands
	 *********************************************************/

	cancelsearch: 'search',
	search: function(target, room, user) {
		if (Rooms.global.lockdown) {
			return this.popupReply("The server is shutting down. Battles cannot be started at this time.");
		}

		if (target) {
			Rooms.global.searchBattle(user, target);
		} else {
			Rooms.global.cancelSearch(user);
		}
	},

	chall: 'challenge',
	challenge: function(target, room, user) {
		if (Rooms.global.lockdown) {
			return this.popupReply("The server is shutting down. Battles cannot be started at this time.");
		}

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser || !targetUser.connected) {
			return this.popupReply("The user '"+this.targetUsername+"' was not found.");
		}
		if (targetUser.blockChallenges && !user.can('bypassblocks', targetUser)) {
			return this.popupReply("The user '"+this.targetUsername+"' is not accepting challenges right now.");
		}
		if (typeof target !== 'string') target = 'customgame';
		var problems = Tools.validateTeam(user.team, target);
		if (problems) {
			return this.popupReply("Your team was rejected for the following reasons:\n\n- "+problems.join("\n- "));
		}
		user.makeChallenge(targetUser, target);
	},

	away: 'blockchallenges',
	idle: 'blockchallenges',
	blockchallenges: function(target, room, user) {
		user.blockChallenges = true;
		this.sendReply('You are now blocking all incoming challenge requests.');
	},

	back: 'allowchallenges',
	allowchallenges: function(target, room, user) {
		user.blockChallenges = false;
		this.sendReply('You are available for challenges from now on.');
	},

	cchall: 'cancelChallenge',
	cancelchallenge: function(target, room, user) {
		user.cancelChallengeTo(target);
	},

	accept: function(target, room, user) {
		var userid = toUserid(target);
		var format = '';
		if (user.challengesFrom[userid]) format = user.challengesFrom[userid].format;
		if (!format) {
			this.popupReply(target+" cancelled their challenge before you could accept it.");
			return false;
		}
		var problems = Tools.validateTeam(user.team, format);
		if (problems) {
			this.popupReply("Your team was rejected for the following reasons:\n\n- "+problems.join("\n- "));
			return false;
		}
		user.acceptChallengeFrom(userid);
	},

	reject: function(target, room, user) {
		user.rejectChallengeFrom(toUserid(target));
	},

	saveteam: 'useteam',
	utm: 'useteam',
	useteam: function(target, room, user) {
		try {
			user.team = JSON.parse(target);
		} catch (e) {
			this.popupReply('Not a valid team.');
		}
	},

	/*********************************************************
	 * Low-level
	 *********************************************************/

	cmd: 'query',
	query: function(target, room, user, connection) {
		var spaceIndex = target.indexOf(' ');
		var cmd = target;
		if (spaceIndex > 0) {
			cmd = target.substr(0, spaceIndex);
			target = target.substr(spaceIndex+1);
		} else {
			target = '';
		}
		if (cmd === 'userdetails') {

			var targetUser = Users.get(target);
			if (!targetUser) {
				connection.send('|queryresponse|userdetails|'+JSON.stringify({
					userid: toId(target),
					rooms: false
				}));
				return false;
			}
			var roomList = {};
			for (var i in targetUser.roomCount) {
				if (i==='global') continue;
				var targetRoom = Rooms.get(i);
				if (!targetRoom || targetRoom.isPrivate) continue;
				var roomData = {};
				if (targetRoom.battle) {
					var battle = targetRoom.battle;
					roomData.p1 = battle.p1?' '+battle.p1:'';
					roomData.p2 = battle.p2?' '+battle.p2:'';
				}
				roomList[i] = roomData;
			}
			if (!targetUser.roomCount['global']) roomList = false;
			var userdetails = {
				userid: targetUser.userid,
				avatar: targetUser.avatar,
				rooms: roomList
			};
			if (user.can('ip', targetUser)) {
				var ips = Object.keys(targetUser.ips);
				if (ips.length === 1) {
					userdetails.ip = ips[0];
				} else {
					userdetails.ips = ips;
				}
			}
			connection.send('|queryresponse|userdetails|'+JSON.stringify(userdetails));

		} else if (cmd === 'roomlist') {

			connection.send('|queryresponse|roomlist|'+JSON.stringify({
				rooms: Rooms.global.getRoomList(true)
			}));

		} else if (cmd === 'rooms') {

			connection.send('|queryresponse|rooms|'+JSON.stringify(
				Rooms.global.getRooms()
			));

		}
	},

	trn: function(target, room, user, connection) {
		var commaIndex = target.indexOf(',');
		var targetName = target;
		var targetAuth = false;
		var targetToken = '';
		if (commaIndex >= 0) {
			targetName = target.substr(0,commaIndex);
			target = target.substr(commaIndex+1);
			commaIndex = target.indexOf(',');
			targetAuth = target;
			if (commaIndex >= 0) {
				targetAuth = !!parseInt(target.substr(0,commaIndex),10);
				targetToken = target.substr(commaIndex+1);
			}
		}
		user.rename(targetName, targetToken, targetAuth, connection);
	},

};


function getRandMessage(user){
	var numMessages = 44; // numMessages will always be the highest case # + 1
	var message = '~~ ';
	switch(Math.floor(Math.random()*numMessages)){
		case 0: message = message + user.name + ' has vanished into nothingness!';
			break;
		case 1: message = message + user.name + ' visited kupo\'s bedroom and never returned!';
			break;
		case 2: message = message + user.name + ' used Explosion!';
			break;
		case 3: message = message + user.name + ' fell into the void.';
			break;
		case 4: message = message + user.name + ' was squished by pandaw\'s large behind!';
			break;	
		case 5: message = message + user.name + ' became EnerG\'s slave!';
			break;
		case 6: message = message + user.name + ' became kupo\'s love slave!';
			break;
		case 7: message = message + user.name + ' has left the building.';
			break;
		case 8: message = message + user.name + ' felt Thundurus\'s wrath!';
			break;
		case 9: message = message + user.name + ' died of a broken heart.';
			break;
		case 10: message = message + user.name + ' got lost in a maze!';
			break;
		case 11: message = message + user.name + ' was hit by Magikarp\'s Revenge!';
			break;
		case 12: message = message + user.name + ' was sucked into a whirlpool!';
			break;
		case 13: message = message + user.name + ' got scared and left the server!';
			break;
		case 14: message = message + user.name + ' fell off a cliff!';
			break;
		case 15: message = message + user.name + ' got eaten by a bunch of piranhas!';
			break;
		case 16: message = message + user.name + ' is blasting off again!';
			break;
		case 17: message = message + 'A large spider descended from the sky and picked up ' + user.name + '.';
			break;
		case 18: message = message + user.name + ' tried to touch RisingPokeStar!';
			break;
		case 19: message = message + user.name + ' got their sausage smoked by Charmanderp!';
			break;
		case 20: message = message + user.name + ' was forced to give mpea an oil massage!';
			break;
		case 21: message = message + user.name + ' took an arrow to the knee... and then one to the face.';
			break;
		case 22: message = message + user.name + ' peered through the hole on Shedinja\'s back';
			break;
		case 23: message = message + user.name + ' recieved judgment from the almighty Arceus!';
			break;
		case 24: message = message + user.name + ' used Final Gambit and missed!';
			break;
		case 25: message = message + user.name + ' pissed off a Gyarados!';
			break;
		case 26: message = message + user.name + ' was taken away in Neku\'s black van!';
			break;
		case 27: message = message + user.name + ' was actually a 12 year and was banned for COPPA.';
			break;
		case 28: message = message + user.name + ' got lost in the illusion of reality.';
			break;
		case 29: message = message + user.name + ' was unfortunate and didn\'t get a cool message.';
			break;
		case 30: message = message + 'The Immortal accidently kicked ' + user.name + ' from the server!';
			break;
		case 31: message = message + user.name + ' was knocked out cold by Fallacies!';
			break;
		case 32: message = message + user.name + ' died making love to an Excadrill!';
			break;
		default: message = message + user.name + ' was Pan Hammered!';
	};
	message = message + ' ~~';
	return message;
}

function MD5(f){function i(b,c){var d,e,f,g,h;f=b&2147483648;g=c&2147483648;d=b&1073741824;e=c&1073741824;h=(b&1073741823)+(c&1073741823);return d&e?h^2147483648^f^g:d|e?h&1073741824?h^3221225472^f^g:h^1073741824^f^g:h^f^g}function j(b,c,d,e,f,g,h){b=i(b,i(i(c&d|~c&e,f),h));return i(b<<g|b>>>32-g,c)}function k(b,c,d,e,f,g,h){b=i(b,i(i(c&e|d&~e,f),h));return i(b<<g|b>>>32-g,c)}function l(b,c,e,d,f,g,h){b=i(b,i(i(c^e^d,f),h));return i(b<<g|b>>>32-g,c)}function m(b,c,e,d,f,g,h){b=i(b,i(i(e^(c|~d),
f),h));return i(b<<g|b>>>32-g,c)}function n(b){var c="",e="",d;for(d=0;d<=3;d++)e=b>>>d*8&255,e="0"+e.toString(16),c+=e.substr(e.length-2,2);return c}var g=[],o,p,q,r,b,c,d,e,f=function(b){for(var b=b.replace(/\r\n/g,"\n"),c="",e=0;e<b.length;e++){var d=b.charCodeAt(e);d<128?c+=String.fromCharCode(d):(d>127&&d<2048?c+=String.fromCharCode(d>>6|192):(c+=String.fromCharCode(d>>12|224),c+=String.fromCharCode(d>>6&63|128)),c+=String.fromCharCode(d&63|128))}return c}(f),g=function(b){var c,d=b.length;c=
d+8;for(var e=((c-c%64)/64+1)*16,f=Array(e-1),g=0,h=0;h<d;)c=(h-h%4)/4,g=h%4*8,f[c]|=b.charCodeAt(h)<<g,h++;f[(h-h%4)/4]|=128<<h%4*8;f[e-2]=d<<3;f[e-1]=d>>>29;return f}(f);b=1732584193;c=4023233417;d=2562383102;e=271733878;for(f=0;f<g.length;f+=16)o=b,p=c,q=d,r=e,b=j(b,c,d,e,g[f+0],7,3614090360),e=j(e,b,c,d,g[f+1],12,3905402710),d=j(d,e,b,c,g[f+2],17,606105819),c=j(c,d,e,b,g[f+3],22,3250441966),b=j(b,c,d,e,g[f+4],7,4118548399),e=j(e,b,c,d,g[f+5],12,1200080426),d=j(d,e,b,c,g[f+6],17,2821735955),c=
j(c,d,e,b,g[f+7],22,4249261313),b=j(b,c,d,e,g[f+8],7,1770035416),e=j(e,b,c,d,g[f+9],12,2336552879),d=j(d,e,b,c,g[f+10],17,4294925233),c=j(c,d,e,b,g[f+11],22,2304563134),b=j(b,c,d,e,g[f+12],7,1804603682),e=j(e,b,c,d,g[f+13],12,4254626195),d=j(d,e,b,c,g[f+14],17,2792965006),c=j(c,d,e,b,g[f+15],22,1236535329),b=k(b,c,d,e,g[f+1],5,4129170786),e=k(e,b,c,d,g[f+6],9,3225465664),d=k(d,e,b,c,g[f+11],14,643717713),c=k(c,d,e,b,g[f+0],20,3921069994),b=k(b,c,d,e,g[f+5],5,3593408605),e=k(e,b,c,d,g[f+10],9,38016083),
d=k(d,e,b,c,g[f+15],14,3634488961),c=k(c,d,e,b,g[f+4],20,3889429448),b=k(b,c,d,e,g[f+9],5,568446438),e=k(e,b,c,d,g[f+14],9,3275163606),d=k(d,e,b,c,g[f+3],14,4107603335),c=k(c,d,e,b,g[f+8],20,1163531501),b=k(b,c,d,e,g[f+13],5,2850285829),e=k(e,b,c,d,g[f+2],9,4243563512),d=k(d,e,b,c,g[f+7],14,1735328473),c=k(c,d,e,b,g[f+12],20,2368359562),b=l(b,c,d,e,g[f+5],4,4294588738),e=l(e,b,c,d,g[f+8],11,2272392833),d=l(d,e,b,c,g[f+11],16,1839030562),c=l(c,d,e,b,g[f+14],23,4259657740),b=l(b,c,d,e,g[f+1],4,2763975236),
e=l(e,b,c,d,g[f+4],11,1272893353),d=l(d,e,b,c,g[f+7],16,4139469664),c=l(c,d,e,b,g[f+10],23,3200236656),b=l(b,c,d,e,g[f+13],4,681279174),e=l(e,b,c,d,g[f+0],11,3936430074),d=l(d,e,b,c,g[f+3],16,3572445317),c=l(c,d,e,b,g[f+6],23,76029189),b=l(b,c,d,e,g[f+9],4,3654602809),e=l(e,b,c,d,g[f+12],11,3873151461),d=l(d,e,b,c,g[f+15],16,530742520),c=l(c,d,e,b,g[f+2],23,3299628645),b=m(b,c,d,e,g[f+0],6,4096336452),e=m(e,b,c,d,g[f+7],10,1126891415),d=m(d,e,b,c,g[f+14],15,2878612391),c=m(c,d,e,b,g[f+5],21,4237533241),
b=m(b,c,d,e,g[f+12],6,1700485571),e=m(e,b,c,d,g[f+3],10,2399980690),d=m(d,e,b,c,g[f+10],15,4293915773),c=m(c,d,e,b,g[f+1],21,2240044497),b=m(b,c,d,e,g[f+8],6,1873313359),e=m(e,b,c,d,g[f+15],10,4264355552),d=m(d,e,b,c,g[f+6],15,2734768916),c=m(c,d,e,b,g[f+13],21,1309151649),b=m(b,c,d,e,g[f+4],6,4149444226),e=m(e,b,c,d,g[f+11],10,3174756917),d=m(d,e,b,c,g[f+2],15,718787259),c=m(c,d,e,b,g[f+9],21,3951481745),b=i(b,o),c=i(c,p),d=i(d,q),e=i(e,r);return(n(b)+n(c)+n(d)+n(e)).toLowerCase()};



var colorCache = {};

function hashColor(name) {
	if (colorCache[name]) return colorCache[name];
	
	var hash = MD5(name);
	var H = parseInt(hash.substr(4, 4), 16) % 360;
	var S = parseInt(hash.substr(0, 4), 16) % 50 + 50;
	var L = parseInt(hash.substr(8, 4), 16) % 20 + 25;
	
	var m1, m2, hue;
	var r, g, b
	S /=100;
	L /= 100;
	if (S == 0)
		r = g = b = (L * 255).toString(16);
	else {
		if (L <= 0.5)
			m2 = L * (S + 1);
		else
			m2 = L + S - L * S;
		m1 = L * 2 - m2;
		hue = H / 360;
		r = HueToRgb(m1, m2, hue + 1/3);
		g = HueToRgb(m1, m2, hue);
		b = HueToRgb(m1, m2, hue - 1/3);
	}
	
	
	colorCache[name] = '#' + r + g + b;
	return colorCache[name];
}

function HueToRgb(m1, m2, hue) {
	var v;
	if (hue < 0)
		hue += 1;
	else if (hue > 1)
		hue -= 1;

	if (6 * hue < 1)
		v = m1 + (m2 - m1) * hue * 6;
	else if (2 * hue < 1)
		v = m2;
	else if (3 * hue < 2)
		v = m1 + (m2 - m1) * (2/3 - hue) * 6;
	else
		v = m1;

	return (255 * v).toString(16);
}
