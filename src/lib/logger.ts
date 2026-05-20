const isProd = process.env.NODE_ENV === 'production';

function format(...args: unknown[]) {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      if (typeof a === 'function') return a.toString();
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

export const logger = {
  info: (...args: unknown[]) => {
    if (!isProd) console.info(format(...args));
  },
  warn: (...args: unknown[]) => {
    if (!isProd) console.warn(format(...args));
  },
  error: (...args: unknown[]) => {
    if (!isProd) console.error(format(...args));
  },
  log: (...args: unknown[]) => {
    if (!isProd) console.log(format(...args));
  },
};

export default logger;
