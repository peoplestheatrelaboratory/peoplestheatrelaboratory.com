/** Thin re-export so older imports keep working; content lives in ./content. */
export {
  events,
  getEvent,
  eventsSorted as getEvents,
  upcomingEvents as getUpcoming,
  pastEvents as getPast,
  formatDate,
  formatPlace,
  SERIES,
  seriesOf,
  isUpcoming,
} from './content';
export type { Event, Series } from './content';
