import * as migration_20260911_001821 from './20260911_001821';

export const migrations = [
  {
    up: migration_20260911_001821.up,
    down: migration_20260911_001821.down,
    name: '20260911_001821'
  },
];
