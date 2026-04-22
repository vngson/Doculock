interface RateLimitOptions {
  max: number;
  windowMs: number;
}

interface RequestLog {
  count: number;
  resetTime: number;
}

const requests = new Map<string, RequestLog>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export function rateLimit(request: Request, options: RateLimitOptions): Response | null {
  const ip = getClientIp(request);
  const now = Date.now();
  const record = requests.get(ip);

  // Clean expired entries periodically
  if (Math.random() < 0.01) {
    for (const [key, value] of requests.entries()) {
      if (now > value.resetTime) requests.delete(key);
    }
  }

  if (!record || now > record.resetTime) {
    requests.set(ip, { count: 1, resetTime: now + options.windowMs });
    return null;
  }

  record.count++;

  if (record.count > options.max) {
    return new Response(
      JSON.stringify({ error: 'Too many requests', code: 'RATE_LIMITED' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(options.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(record.resetTime),
          'Retry-After': String(Math.ceil((record.resetTime - now) / 1000)),
        },
      }
    );
  }

  return null;
}
