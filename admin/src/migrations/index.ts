import * as storageBudget from './20261109_190300_storage_budget';
import * as migration_20261109_190255_initial from './20261109_190255_initial';

export const migrations = [
  {
    up: migration_20261109_190255_initial.up,
    down: migration_20261109_190255_initial.down,
    name: '20261109_190255_initial'
  },
  { up: storageBudget.up, down: storageBudget.down, name: '20261109_190300_storage_budget' },
];
