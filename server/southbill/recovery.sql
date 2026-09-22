-- PulseAW only. Run as the confirmed Supabase project administrator.
-- Requires a Vault secret named pulseaw_southbill_worker_token, installed privately.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
-- pg_net queue permissions are provider-owned. Queue only a short-lived signature, never the master token.
CREATE OR REPLACE FUNCTION pulseaw_southbill.dispatch_recovery()
RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE worker_token text; request_id bigint; signed_at text; nonce text; signature text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pulseaw_southbill.events
    WHERE merchant_id='pulseaw' AND livemode=true AND (
      (status IN ('queued','retry') AND attempts<8 AND next_attempt_at<=now()) OR
      (status='processing' AND lease_until<now())
    )
  ) THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO worker_token FROM vault.decrypted_secrets
    WHERE name='pulseaw_southbill_worker_token';
  IF worker_token IS NULL OR length(worker_token)<32 THEN
    RAISE EXCEPTION 'PULSEAW_WORKER_SECRET_MISSING';
  END IF;
  signed_at := floor(extract(epoch from clock_timestamp()))::bigint::text;
  nonce := gen_random_uuid()::text;
  signature := encode(extensions.hmac(signed_at || '.' || nonce || '.POST./api/internal/southbill/process', worker_token, 'sha256'), 'hex');
  SELECT net.http_post(
    url:='https://www.pulseaw.com/api/internal/southbill/process',
    headers:=jsonb_build_object('Content-Type','application/json','Pulseaw-Worker-Signature','t=' || signed_at || ',n=' || nonce || ',v1=' || signature),
    body:='{}'::jsonb,
    timeout_milliseconds:=55000
  ) INTO request_id;
  RETURN request_id;
END;
$$;
REVOKE ALL ON FUNCTION pulseaw_southbill.dispatch_recovery() FROM PUBLIC, anon, authenticated, pulseaw_southbill_runtime;
SELECT cron.schedule('pulseaw-southbill-recovery','* * * * *','SELECT pulseaw_southbill.dispatch_recovery();');
-- Retain this job's execution history for seven days; never remove other jobs' history.
SELECT cron.schedule('pulseaw-southbill-recovery-log-retention','17 3 * * *',
  $job$DELETE FROM cron.job_run_details WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname IN ('pulseaw-southbill-recovery','pulseaw-southbill-recovery-log-retention')) AND end_time<now()-interval '7 days';$job$);
COMMIT;
