//if you play online version made by Nickardson,
//https://github.com/Nickardson/shenzhen-solitaire or
//http://tgratzer.com/shenzhen-solitaire
//
//you can run code below to export the game state into JSON format
//then, you can import to my solver by running load_from_json([json here]) method

var ret = [];
for (var i = 0; i < 8; i++) {
	var tray = [];
	for (var j = i * 5; j < (i + 1) * 5; j++) {
		var card = [];
    	if ("suit" in cards[j]) {
			switch(cards[j].suit.order) {
                case 1:
					card[0] = "G";
					break;
                case 2:
					card[0] = "B";
					break;
                case 3:
					card[0] = "R";
					break;
            }
			card[1] = cards[j].value;
        } else {
			card[0] = "D"
			switch(cards[j].special.order) {
				case 1:
					card[1] = "G";
					break;
                case 2:
					card[1] = "R";
					break;
                case 3:
					card[1] = "W";
					break;
                case 4:
					card[0] = "F";
            }
        }
		tray.push(card);
	}
	ret.push(tray);

}
JSON.stringify(ret);