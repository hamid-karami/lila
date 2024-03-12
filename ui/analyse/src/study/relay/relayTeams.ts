import { MaybeVNodes, Redraw, VNode, onInsert, looseH as h } from 'common/snabbdom';
import * as xhr from 'common/xhr';
import { RoundId } from './interfaces';
import { ChapterId } from '../interfaces';
import { Color } from 'chessops';
import { GetCloudEval, MultiCloudEval } from '../multiCloudEval';
import { spinnerVdom as spinner } from 'common/spinner';
import { playerFed } from '../playerBars';
import { gameLinkAttrs, gameLinksListener } from './relayTourView';

interface TeamWithPoints {
  name: string;
  points: number;
}
interface TeamPlayer {
  name: string;
  title?: string;
  rating?: number;
  fed?: string;
}
interface TeamGame {
  id: ChapterId;
  players: [TeamPlayer, TeamPlayer];
  p0Color: Color;
  outcome?: Color | 'draw';
}
interface TeamRow {
  teams: [TeamWithPoints, TeamWithPoints];
  games: TeamGame[];
}
type TeamTable = {
  table: TeamRow[];
};

export default class RelayTeams {
  loading = false;
  teams?: TeamTable;

  constructor(
    private readonly roundId: RoundId,
    readonly multiCloudEval: MultiCloudEval,
    readonly setChapter: (id: ChapterId) => void,
    readonly roundPath: () => string,
    private readonly redraw: Redraw,
  ) {}

  loadFromXhr = async (onInsert?: boolean) => {
    if (this.teams && !onInsert) {
      this.loading = true;
      this.redraw();
    }
    this.teams = await xhr.json(`/broadcast/${this.roundId}/teams`);
    this.redraw();
    this.multiCloudEval.sendRequest();
  };
}

export const teamsView = (ctrl: RelayTeams) =>
  h(
    'div.relay-tour__team-table',
    {
      class: { loading: ctrl.loading, nodata: !ctrl.teams },
      hook: {
        insert: vnode => {
          gameLinksListener(ctrl.setChapter)(vnode);
          ctrl.loadFromXhr(true);
        },
      },
    },
    ctrl.teams ? renderTeams(ctrl.teams, ctrl, ctrl.multiCloudEval.thisIfShowEval()) : [spinner()],
  );

const renderTeams = (teams: TeamTable, ctrl: RelayTeams, cloudEval?: MultiCloudEval): MaybeVNodes =>
  teams.table.map(row =>
    h('div.relay-tour__team-match', [
      h('div.relay-tour__team-match__teams', [
        h('strong.relay-tour__team-match__team', row.teams[0].name),
        h('span.relay-tour__team-match__team__points', [
          h('points', row.teams[0].points.toString()),
          h('vs', 'vs'),
          h('points', row.teams[1].points.toString()),
        ]),
        h('strong.relay-tour__team', row.teams[1].name),
      ]),
      h(
        'div.relay-tour__team-match__games',
        row.games.map(game =>
          h(
            'a.relay-tour__team-match__game',
            {
              attrs: {
                ...gameLinkAttrs(ctrl.roundPath, game),
                'data-id': game.id,
              },
              hook: cloudEval && onInsert(el => cloudEval.observe(el)),
            },
            [
              playerView(game.players[0]),
              statusView(game, ctrl.multiCloudEval.showEval() ? ctrl.multiCloudEval.getCloudEval : undefined),
              playerView(game.players[1]),
            ],
          ),
        ),
      ),
    ]),
  );

const playerView = (p: TeamPlayer) =>
  h('span.relay-tour__team-match__game__player', [
    h('span', [p.fed && playerFed(p.fed), `${p.title ? p.title + ' ' : ''}${p.name}`]),
    p.rating && h('rating', `${p.rating}`),
  ]);

const statusView = (g: TeamGame, cloudEval?: GetCloudEval) =>
  h(
    'span.relay-tour__team-match__game__status',
    g.outcome
      ? g.outcome === 'draw'
        ? '½-½'
        : g.outcome === g.p0Color
        ? '1-0'
        : '0-1'
      : cloudEval
      ? evalGauge(g, cloudEval)
      : '*',
  );

const evalGauge = (game: TeamGame, _cloudEval: GetCloudEval): VNode =>
  h(`span.eval-gauge-horiz.pov-${game.p0Color}`, [
    h(`span.eval-gauge-horiz__black`, {
      hook: {
        // postpatch(old, vnode) {
        // const prevNodeCloud = old.data?.cloud;
        // const cev = (game.fen && cloudEval(game.fen)) || prevNodeCloud;
        // if (cev?.chances != prevNodeCloud?.chances) {
        //   const elm = vnode.elm as HTMLElement;
        //   const gauge = elm.parentNode as HTMLElement;
        //   elm.style.width = `${((1 - (cev?.chances || 0)) / 2) * 100}%`;
        //   if (cev) {
        //     gauge.title = `${renderScore(cev)} at depth ${cev.depth}`;
        //     gauge.classList.add('eval-gauge-horiz--set');
        //   }
        // }
        // vnode.data!.cloud = cev;
        // },
      },
    }),
    h('tick.zero'),
  ]);
