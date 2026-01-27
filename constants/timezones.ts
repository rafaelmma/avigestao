// Lista de timezones mais usadas
// Evita consultar pg_timezone_names a cada request
export const TIMEZONES = [
  'UTC',
  'America/Sao_Paulo',
  'America/Fortaleza',
  'America/Manaus',
  'America/Recife',
  'America/Rio_Branco',
  'America/Noronha',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
] as const;

export type Timezone = typeof TIMEZONES[number];
