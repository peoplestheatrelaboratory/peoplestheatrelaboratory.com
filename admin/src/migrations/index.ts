import * as migration_20261109_190255_initial from './20261109_190255_initial';
import * as migration_20261109_190300_storage_budget from './20261109_190300_storage_budget';
import * as migration_20261109_203902_site_settings from './20261109_203902_site_settings';
import * as migration_20261109_204534_event_performers from './20261109_204534_event_performers';
import * as migration_20261110_062228_homepage_quotes from './20261110_062228_homepage_quotes';

export const migrations = [
  {
    up: migration_20261109_190255_initial.up,
    down: migration_20261109_190255_initial.down,
    name: '20261109_190255_initial',
  },
  {
    up: migration_20261109_190300_storage_budget.up,
    down: migration_20261109_190300_storage_budget.down,
    name: '20261109_190300_storage_budget',
  },
  {
    up: migration_20261109_203902_site_settings.up,
    down: migration_20261109_203902_site_settings.down,
    name: '20261109_203902_site_settings',
  },
  {
    up: migration_20261109_204534_event_performers.up,
    down: migration_20261109_204534_event_performers.down,
    name: '20261109_204534_event_performers',
  },
  {
    up: migration_20261110_062228_homepage_quotes.up,
    down: migration_20261110_062228_homepage_quotes.down,
    name: '20261110_062228_homepage_quotes'
  },
];
