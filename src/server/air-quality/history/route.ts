import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({ results: z.array(z.object({
  value: z.number(), parameter: z.object({ name: z.string(), units: z.string() }),
  flagInfo: z.object({ hasFlags: z.boolean() }).optional(),
  period: z.object({ datetimeTo: z.object({ utc: z.string() }) }),
})) });

export async function GET(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get('sensor'));
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid sensor' }, { status: 400 });
  if (!process.env.OPENAQ_API_KEY) return NextResponse.json({ error: 'OpenAQ key is not configured' }, { status: 503 });
  try {
    const from = new Date(Date.now() - 48 * 3600000).toISOString();
    const response = await fetch(`https://api.openaq.org/v3/sensors/${id}/hours?limit=100&datetime_from=${encodeURIComponent(from)}`, {
      headers: { 'X-API-Key': process.env.OPENAQ_API_KEY }, next: { revalidate: 600 }, signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`OpenAQ history returned HTTP ${response.status}`);
    const data = schema.parse(await response.json());
    const history = data.results.filter(r => r.parameter.name === 'pm25' && r.parameter.units === 'µg/m³' && r.value >= 0 && !r.flagInfo?.hasFlags)
      .map(r => ({ time: r.period.datetimeTo.utc, value: r.value })).sort((a, b) => a.time.localeCompare(b.time));
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'History unavailable' }, { status: 502 });
  }
}
