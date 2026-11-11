-- Retire only the known superseded defaults. Existing purchases remain untouched.
-- Review custom offerings in the trainer dashboard before enabling the new plans.
update training_package_types
set active = false, updated_at = now()
where active = true
  and ((lower(name) = 'session bundles' and session_count = 10 and price_cents = 110000)
    or (lower(name) = 'monthly training' and session_count = 8 and price_cents = 84000)
    or (lower(name) = 'partner training' and session_count = 10 and price_cents = 160000));

-- Activate only untouched drafts created by the previous catalog revision.
update training_package_types
set session_count = case price_cents when 84000 then 8 else 4 end,
    active = true,
    internal_notes = null,
    updated_at = now()
where kind = 'one_on_one' and active = false and session_count is null
  and internal_notes = 'Draft: confirm session entitlement before activation.'
  and ((name = 'Individual training - $840' and price_cents = 84000)
    or (name = 'Individual training - $550' and price_cents = 55000));

-- Correct only the untouched partner default from the earlier draft; purchases are unchanged.
update training_package_types
set price_cents = 128000,
    billing_terms = '$1,280 per month combined ($640 per person). Payment upfront by cash, check, or Zelle. No automatic renewal.',
    updated_at = now()
where kind = 'partner_training' and name = 'Partner training - monthly'
  and session_count = 4 and price_cents = 64000
  and billing_terms = '$640 per month. Payment upfront by cash, check, or Zelle. No automatic renewal.';
