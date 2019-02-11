"use strict";
const trays_count = 8;
const slots_count = 3;

var solutionStates = [];

/**
 * State containing trays, slots, action, etc.
 */
class State {
    /**
     * Create new state
     * @param {State|null} prevState Previous state
     * @param {Array|null} action
     * @param {any[][][]} customTrays
     */
    constructor(prevState = null, action = null, customTrays = [[], [], [], [], [], [], [], []]) {
        if (prevState == null) {
            this.trays = customTrays;
            this.slots = [null, null, null];
            this.step = 0;
        } else {
            let prevTrays = prevState.trays;
            this.trays = [];
            for (var i = 0; i < trays_count; i++) {
                this.trays[i] = prevTrays[i].slice(0);
            }
            this.slots = prevState.slots.slice(0);
            this.step = prevState.step + 1;
        }
        this.prevState = prevState;
        if (action != null) {
            let cardsToBeMoved = [];
            if ("collapse" in action) {
                let target = action.collapse;
                for (let i = 0; i < trays_count; i++) {
                    if (this.trays[i].length == 0)
                        continue;
                    let lastCard = this.trays[i].last();
                    if (lastCard[0] == target[0] && lastCard[1] == target[1])
                        this.trays[i].pop();
                }
                for (let i = 0; i < slots_count; i++) {
                    if (this.slots[i] == null)
                        continue;
                    if (this.slots[i][0] == target[0] && this.slots[i][1] == target[1])
                        this.slots[i] = null;
                }
                for (let i = 0; i < slots_count; i++) {
                    if (this.slots[i] == null) {
                        this.slots[i] = 'F';
                        break;
                    }
                }
            } else if ("pop" in action) {
                this.trays[action.pop].pop();
            } else {
                if ("tray" in action.from) {
                    for (let i = 0; i < action.from.count; i++)
                        cardsToBeMoved.push(this.trays[action.from.tray].pop());
                } else {
                    cardsToBeMoved.push(this.slots[action.from.slot]);
                    this.slots[action.from.slot] = null;
                }
                if ("tray" in action.to) {
                    while (cardsToBeMoved.length > 0) {
                        this.trays[action.to.tray].push(cardsToBeMoved.pop());
                    }
                } else {
                    this.slots[action.to.slot] = cardsToBeMoved[0];
                }
            }
        }
        
        this.auto_remove_cards();
        this.action = action;   
        this.remainingCards = 0;
        for (let i = 0; i < trays_count; i++)
            this.remainingCards += this.trays[i].length;
        for (let i = 0; i < slots_count; i++)
            if (this.slots[i] != "F" && this.slots[i] != null)
                this.remainingCards++;
        this.priority = this.calcPriority();
    }
    
    /**
     * Automatically removing cards
     */
    auto_remove_cards() {
        // some logics taken from Nickardson/shenzhen-solitaire
        this.lowestPerSuit = {'R': 10, 'G': 10, 'B': 10};
        var callAgain = false;
        for (let i = 0; i < trays_count; i++) {
            if (this.trays[i].length == 0)
                continue;
            let tray = this.trays[i];
            let last_card = tray.last();
            if (last_card == "F" || last_card[1] == 1) { //if flower and card with value 1, remove it
                tray.pop();
                callAgain = true;
            }
            for (let j = 0; j < tray.length; j++) {
                let card = tray[j];
                if (card.length == 2 && card[0] != "D")
                    if (card[1] < this.lowestPerSuit[card[0]])
                        this.lowestPerSuit[card[0]] = card[1];
            }
        }
        for (let i = 0; i < slots_count; i++) {
            if (this.slots[i] == null)
                continue;
            let card = this.slots[i];
            if (card[0] != "D" && card[1] < this.lowestPerSuit[card[0]])
                this.lowestPerSuit[card[0]] = card[1];
        }
        for (let i = 0; i < trays_count; i++) {
            if (this.trays[i].length == 0)
                continue;
            let card = this.trays[i].last();
            if (card[0] == "D")
                continue;
            let value = card[1];
            if (value > 2) {
                if (value <= this.lowestPerSuit['R'] && value <= this.lowestPerSuit['G'] && value <= this.lowestPerSuit['B']) {
                    this.trays[i].pop();
                    callAgain = true;
                }
            } else if (value == 2 && value == this.lowestPerSuit[card[0]]) {
                this.trays[i].pop();
                callAgain = true;
            }
        }
        for (let i = 0; i < slots_count; i++) {
            if (this.slots[i] == null)
                continue;
            let card = this.slots[i];
            if (card[0] == "D")
                continue;
            let value = card[1];
            if (value > 2) {
                if (value <= this.lowestPerSuit['R'] && value <= this.lowestPerSuit['G'] && value <= this.lowestPerSuit['B']) {
                    this.slots[i] = null;
                    callAgain = true;
                }
            } else if (value == 2 && value == this.lowestPerSuit[card[0]]) {
                this.slots[i] = null;
                callAgain = true;
            }
        }
        if (callAgain) {
            console.log("panggil lagi");
            this.auto_remove_cards();
        }
    }

    /**
     * Get every valid steps for this state (excluding slots)
     * @return {Array}
     */
    valid_steps() {
        var trays = this.trays;
        var ret = [];
        var exposedDragons = {'R': 0, 'G': 0, 'W': 0};
        for (var i = 0; i < trays_count; i++) { //for each tray in trays
            var tray = trays[i];
            var j = tray.length - 1;
            if (tray.length < 1)
                continue;

            var card = tray.last();
            if (card[0] == 'D') //if it's dragon exposed
                exposedDragons[card[1]]++;
            if (this.lowestPerSuit[card[0]] == card[1]) //if the card with lower value already out, remove this card
                ret.push({pop: i});
            for (j = tray.length - 1; j >= 0; j--) { //for each card in tray, from bottom to up
                card = tray[j];
                for (let k = 0; k < trays_count; k++) { //for each tray in trays, but not the current tray, get last card
                    if (i == k) 
                        continue;
                    if (trays[k].length > 0) { //if the target tray not empty
                        var target = trays[k].last();
                        if (can_be_stacked(card, target)) {
                            ret.push({from: {tray: i, count: tray.length - j}, to: {tray: k}});
                        }
                    } else if (tray.length > 1 && j > 0) { //if the target tray empty and not moving entire tray
                        ret.push({from: {tray: i, count: tray.length - j}, to: {tray: k}});
                    }
                }
                if (j > 0 && !can_be_stacked(card, tray[j - 1]))
                    break;
            }
        }
        let slotAvailableForDragon = false;
        var slotAvailableForSpecificDragon = {'R': false, 'G': false, 'W': false};
        for (var i = 0; i < slots_count; i++) { //check every possible steps from slots
            if (this.slots[i] == null) {  //if it's available, skip
                slotAvailableForDragon = true;
                continue;
            }
            if (this.slots[i][0] == 'F') //if it's full, from collapsed dragon, skip
                continue;
            
            var card = this.slots[i];
            for (var j = 0; j < trays_count; j++) {
                if (trays[j].length > 0) {
                    var target = trays[j].last();
                    if (can_be_stacked(this.slots[i], target))
                        ret.push({from: {slot: i}, to: {tray: j}});
                } else {
                    ret.push({from: {slot: i}, to: {tray: j}});
                }
            }
            if (card[0] == 'D') {
                slotAvailableForSpecificDragon[card[1]] = true;
                exposedDragons[card[1]]++;
            }
        }

        if (exposedDragons.G == 4 && (slotAvailableForDragon || slotAvailableForSpecificDragon.G))
            ret.push({collapse: 'DG'});
        if (exposedDragons.R == 4 && (slotAvailableForDragon || slotAvailableForSpecificDragon.R))
            ret.push({collapse: 'DR'});
        if (exposedDragons.W == 4 && (slotAvailableForDragon || slotAvailableForSpecificDragon.W))
            ret.push({collapse: 'DW'});
        
        return ret;
    }

    /**
     * Get every valid slot steps for this state
     * @return {Array}
     */
    valid_slot_steps() {
        let ret = [];
        for (let i = 0; i < trays_count; i++) { //for each tray in trays
            if (this.trays[i].length == 0) //this tray have no cards, skip!
                continue;
            for (let k = 0; k < slots_count; k++) { //for each slot in slots
                if (this.slots[k] == null)
                    ret.push({from: {tray: i, count: 1}, to: {slot: k}});
            }
        }
        return ret;
    }

    /**
     * Calculate prority for this state
     * @return {Number}
     */
    calcPriority() {
        let stackedCards = 0;
        for (let i = 0; i < trays_count; i++) {
            let tray = this.trays[i];
            if (tray.length == 0)
                continue;
            let localStackedCards = 0;
            for (let j = tray.length - 1; j > 0; j--) {
                if (can_be_stacked(tray[j], tray[j - 1]))
                    localStackedCards++;
            }
            if (localStackedCards == tray.length - 1)
                if (tray.last()[1] == 9)
                    stackedCards += localStackedCards * 1.2;
                else stackedCards += localStackedCards * 1.1;
            else stackedCards += localStackedCards;
        }
        return this.remainingCards + this.step * 0.1 - stackedCards;
    }

    /**
     * Generate hash for this state
     * @return {String}
     */
    hash() {
        let ret = "";
        for (let i = 0; i < trays_count; i++)
            ret += this.trays[i].toString() + ";"
        ret += "|" + this.slots.toString();
        return XXH.h32(ret, 0).toString();
    }
}


/**
 * Can this card be stacked?
 * @param {Array} from
 * @param {Array} to
 */
function can_be_stacked(from, to) {
    switch (from[0]) {
        case 'D': //Dragon cannot be stacked into any other cards
        case 'F': //Flower cannot too
            return false; 
    }
    switch (to[0]) {
        case 'D': //Dragon cannot be stacked by any other cards
        case 'F': //Flower cannot too
            return false;
    }
    if (from[0] == to[0]) //if it's same color, it cannot be stacked
        return false;
    return (from[1] + 1 == to[1]) //is it in order?
}

/**
 * Begin to solve the problem
 */
function solve() {
    let comparator = function (a, b) {
        return a.priority < b.priority;
    }
    let queue = new PriorityQueue(comparator);
    let trays = load_from_dom();
    if (trays.flat().length == 0)
        return; //if there's no cards, do not try to solve!
    let currentState = new State(null, null, trays);
    queue.push(currentState);
    let iteration = 0;
    let visitedStates = [currentState.hash()];
    while (iteration < 50000 && !queue.isEmpty()) {
        currentState = queue.pop();
        if (currentState.remainingCards == 0) {
            console.log("Solution found after " + iteration + " iterations");
            let solutionStates = get_actions_to_this_state(currentState);
            console.log(solutionStates);
            prepare_solution(solutionStates);
            return;
        }
        let actions = currentState.valid_steps();
        if (verify_unique_state(queue, visitedStates, currentState, actions) == 0) {
            actions = currentState.valid_slot_steps();
            verify_unique_state(queue, visitedStates, currentState, actions);
        }
        if (iteration % 100 == 0)
            console.log(iteration, visitedStates.length, queue.size(), currentState.remainingCards, currentState.priority);
        iteration++;
    }
    console.log(queue);
    console.log("fail?", currentState);
    alert("Oops, it's unsolveable.");
}

/**
 * Verify if the actions leads to unique states, returns a number of unique states
 * @param {ProrityQueue} queue 
 * @param {Array} visitedStates 
 * @param {*} actions 
 * @returns int
 */
function verify_unique_state(queue, visitedStates, currentState, actions) {
    let valid_actions = 0;
    for (let i = 0; i < actions.length; i++) {
        let newState = new State(currentState, actions[i]);
        let stateHash = newState.hash();
        if (visitedStates.includes(stateHash))
            continue;
        valid_actions++;
        queue.push(newState);
        visitedStates.push(stateHash);
    }
    return valid_actions;
}

/**
 * Print actions to get to this state
 * @param {State} state 
 * @return {Array}
 */
function get_actions_to_this_state(state) {
    let ret = [];
    if (state.prevState != null)
        ret = get_actions_to_this_state(state.prevState);
    if (state.action == null) {
        console.log(state.step, state.remainingCards);
        return [];
    }
    ret.push(state)
    if ("from" in state.action)
        console.log(state.step, state.remainingCards, state.action.from, state.action.to, state);
    else console.log(state.step, state.remainingCards, state.action.collapse, state);
    return ret;
}