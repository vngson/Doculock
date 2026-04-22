const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: any[]) => {
    if (isDev) console.log('[doculock]', ...args);
  },
  info: (...args: any[]) => {
    if (isDev) console.info('[doculock]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn('[doculock]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[doculock]', ...args);
  },
};
