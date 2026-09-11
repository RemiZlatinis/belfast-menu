import * as migration_20260911_001344 from './20260911_001344';
import * as migration_20260911_011833 from './20260911_011833';
import * as migration_20260911_015851 from './20260911_015851';

export const migrations = [
  {
    up: migration_20260911_001344.up,
    down: migration_20260911_001344.down,
    name: '20260911_001344',
  },
  {
    up: migration_20260911_011833.up,
    down: migration_20260911_011833.down,
    name: '20260911_011833',
  },
  {
    up: migration_20260911_015851.up,
    down: migration_20260911_015851.down,
    name: '20260911_015851'
  },
];
