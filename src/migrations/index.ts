import * as migration_20260911_001344 from './20260911_001344';

export const migrations = [
  {
    up: migration_20260911_001344.up,
    down: migration_20260911_001344.down,
    name: '20260911_001344'
  },
];
