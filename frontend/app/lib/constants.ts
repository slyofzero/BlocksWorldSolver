import { Episode } from './types';

/**
 * Built-in sample tutorial episode from the prompt.
 */
export const DEFAULT_TUTORIAL_EPISODES: Episode[] = [
  {
    episode_id: 0,
    name: 'Prompt Tutorial: Stacking B onto C',
    total_steps: 4,
    trajectory: [
      ['onTable(A)', 'on(B,A)', 'clear(B)', 'onTable(C)', 'clear(C)', 'armempty'],
      ['onTable(A)', 'clear(A)', 'holding(B)', 'onTable(C)', 'clear(C)'],
      ['onTable(A)', 'clear(A)', 'on(B,C)', 'clear(B)', 'armempty'],
      ['onTable(A)', 'clear(A)', 'on(B,C)', 'clear(B)', 'armempty'],
    ],
    actions: ['initial_state', 'unstack(B,A)', 'stack(B,C)', 'goal_reached'],
  },
];
