/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import type {StateCreator} from 'zustand';

import type {Game, Player, Score} from '~/src/services/rating/rating';
import {Tournament} from '~/src/services/rating/rating';

export interface TournamentSlice {
  tournament: Tournament<File>;
  unfinishedGamesSize: number;
  nextGame: Game<File> | null;
  playersByRating: Player<File>[];

  updateTournament: () => void;
  addPlayer: (player: Player<File>) => void;
  setScore: (score: Score) => void;
  newTournament: () => void;
}

export const createTournamentSlice: StateCreator<TournamentSlice, [], [], TournamentSlice> = (
  set,
  get
) => ({
  tournament: new Tournament(),
  unfinishedGamesSize: 0,
  nextGame: null,
  playersByRating: [],

  updateTournament: (): void => {
    const {tournament} = get();
    const unfinishedGames = tournament.getUnfinishedGames();
    set({
      unfinishedGamesSize: unfinishedGames.length,
      nextGame: unfinishedGames[0],
      playersByRating: tournament.getPlayersByRating(),
    });
  },
  addPlayer: (player: Player<File>): void => {
    get().tournament.addPlayer(player);
    get().updateTournament();
  },
  setScore: (score: Score): void => {
    get().nextGame?.setScore(score);
    get().updateTournament();
  },
  newTournament: (): void => {
    set({tournament: new Tournament()});
    get().updateTournament();
  },
});
