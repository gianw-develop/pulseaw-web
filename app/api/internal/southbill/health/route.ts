import { workerAuthorized } from '../../../../../server/southbill/runtime.ts';
import { connectDatabase } from '../../../../../server/southbill/database.ts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export async function POST(request: Request) {
  if (!workerAuthorized(request.headers.get('authorization')))
    return Response.json({error:'UNAUTHORIZED'}, {status:401});
  const url = process.env.SOUTHBILL_DATABASE_URL;
  if (!url) return Response.json({error:'DATABASE_NOT_CONFIGURED'}, {status:503});
  let db: ReturnType<typeof connectDatabase> | undefined;
  try {
    db = connectDatabase(url);
    const result = await db.query("SELECT count(*)::integer AS count FROM information_schema.tables WHERE table_schema='pulseaw_southbill' AND table_name IN ('agreements','events','payment_records','invoice_plans')");
    if (result.rows[0]?.count !== 4) throw new Error('SCHEMA_INCOMPLETE');
    return Response.json({database:'connected',schema:'ready',receiverEnabled:process.env.SOUTHBILL_ENABLED==='true'}, {headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({error:'DATABASE_UNAVAILABLE'}, {status:503});
  } finally { await db?.close(); }
}
