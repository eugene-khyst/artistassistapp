/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

const SCALING_FACTOR = 32;

export type Score = [number, number];

export class Player<T = any> {
  constructor(
    public data: T,
    public id = 0,
    public rating = 1500
  ) {}
}

const comparePlayersByRating = ({rating: a}: Player, {rating: b}: Player) => a - b;

function probability({rating: rating1}: Player, {rating: rating2}: Player) {
  return 1.0 / (1.0 + Math.pow(10, (rating1 - rating2) / 400));
}

function game(player1: Player, player2: Player, [scoreA, scoreB]: Score): void {
  const probabilityB = probability(player1, player2);
  const probabilityA = probability(player2, player1);
  player1.rating = player1.rating + SCALING_FACTOR * (scoreA - probabilityA);
  player2.rating = player2.rating + SCALING_FACTOR * (scoreB - probabilityB);
}

export class Game<T> {
  finished = false;

  constructor(
    public player1: Player<T>,
    public player2: Player<T>
  ) {}

  setScore(score: Score): void {
    if (this.finished) {
      return;
    }
    this.finished = true;
    game(this.player1, this.player2, score);
  }
}

export class Tournament<T> {
  players: Player<T>[] = [];
  games: Game<T>[] = [];
  private nextId = 0;

  constructor(players: Player<T>[] = []) {
    for (const player of players) {
      this.addPlayer(player);
    }
  }

  addPlayer(player: Player<T>) {
    player.id = this.nextId++;
    this.players.push(player);
    for (const player1 of this.players) {
      if (player1 !== player) {
        this.games.push(new Game<T>(player1, player));
      }
    }
  }

  getPlayersByRating(): Player<T>[] {
    return [...this.players].sort(comparePlayersByRating).reverse();
  }

  getUnfinishedGames(): Game<T>[] {
    return this.games.filter(({finished}) => !finished);
  }
}
