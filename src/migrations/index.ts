import * as migration_20260911_101824_baseline from './20260911_101824_baseline';

export const migrations = [
  {
    up: migration_20260911_101824_baseline.up,
    down: migration_20260911_101824_baseline.down,
    name: '20260911_101824_baseline'
  },
];
