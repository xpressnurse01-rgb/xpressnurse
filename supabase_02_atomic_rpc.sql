-- ============================================================================
-- MODULE 2 OF 3: ATOMIC RPC FUNCTIONS (CONCURRENCY-SAFE TRANSACTIONS)
-- Server-side authoritative calculations to eliminate client-side tampering
-- ============================================================================

-- 2.1 Atomic Server-Side Coupon Redemption (Race-condition safe with FOR UPDATE)
CREATE OR REPLACE FUNCTION public.redeem_coupon_atomic(
  p_code text,
  p_order_amount numeric,
  p_user_id text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_coupon record;
  v_discount numeric := 0;
  v_final_amount numeric := p_order_amount;
BEGIN
  -- Strict sanitization
  p_code := upper(trim(p_code));

  -- Lock coupon row for atomic capacity check
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE upper(trim(code)) = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Coupon code not found.');
  END IF;

  IF v_coupon.status <> 'Active' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This promo code is no longer active.');
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This promo code has expired.');
  END IF;

  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.times_used >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Coupon redemption limit has been reached.');
  END IF;

  IF v_coupon.min_order_amount IS NOT NULL AND p_order_amount < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'message', format('Minimum booking value of ₹%s required for this coupon.', round(v_coupon.min_order_amount))
    );
  END IF;

  -- Calculate authoritative server discount
  IF v_coupon.discount_type = 'flat' THEN
    v_discount := least(v_coupon.discount_value, p_order_amount);
  ELSIF v_coupon.discount_type = 'percent' THEN
    v_discount := round(least(
      p_order_amount * (v_coupon.discount_value / 100.0),
      coalesce(v_coupon.max_discount, p_order_amount)
    ), 2);
  ELSE
    v_discount := 0;
  END IF;

  v_final_amount := greatest(0, p_order_amount - v_discount);

  -- Atomic update of times_used
  UPDATE public.coupons
  SET times_used = times_used + 1
  WHERE id = v_coupon.id;

  -- Audit redemption
  PERFORM public.log_audit_event_secure(
    'COUPON_REDEEM',
    'coupons',
    v_coupon.id,
    jsonb_build_object(
      'code', p_code,
      'order_amount', p_order_amount,
      'discount', v_discount,
      'final_amount', v_final_amount,
      'user_id', p_user_id
    )
  );

  RETURN jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount', v_discount,
    'final_amount', v_final_amount,
    'message', format('Applied: ₹%s savings', round(v_discount))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.2 Server-Side Validated Booking Creation
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_patient_name text,
  p_patient_phone text,
  p_service_id text,
  p_area text,
  p_full_address text,
  p_preferred_date text,
  p_preferred_time text,
  p_has_prescription boolean DEFAULT false,
  p_prescription_file_name text DEFAULT NULL,
  p_prescription_url text DEFAULT NULL,
  p_coupon_code text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_patient_age integer DEFAULT NULL,
  p_patient_gender text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_service record;
  v_booking_id text;
  v_estimated_fee numeric;
  v_discount numeric := 0;
  v_final_fee numeric;
  v_coupon_res jsonb;
BEGIN
  -- Validate patient inputs
  IF length(trim(p_patient_name)) < 2 THEN
    RAISE EXCEPTION 'Patient name must be at least 2 characters.';
  END IF;

  IF length(regexp_replace(p_patient_phone, '\D', '', 'g')) < 10 THEN
    RAISE EXCEPTION 'A valid 10-digit phone number is required.';
  END IF;

  -- Fetch service authoritatively from services catalog
  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected service does not exist in clinical catalog.';
  END IF;

  v_estimated_fee := v_service.single_visit_price;

  -- Apply coupon if provided
  IF p_coupon_code IS NOT NULL AND length(trim(p_coupon_code)) > 0 THEN
    v_coupon_res := public.redeem_coupon_atomic(p_coupon_code, v_estimated_fee, p_patient_phone);
    IF (v_coupon_res ->> 'valid')::boolean = true THEN
      v_discount := (v_coupon_res ->> 'discount')::numeric;
    END IF;
  END IF;

  v_final_fee := greatest(0, v_estimated_fee - v_discount);
  v_booking_id := 'BK-' || floor(1000 + random() * 9000)::text;

  INSERT INTO public.bookings (
    id,
    created_at,
    patient_name,
    patient_phone,
    patient_age,
    patient_gender,
    service_id,
    service_title,
    area,
    full_address,
    preferred_date,
    preferred_time,
    has_prescription,
    prescription_file_name,
    prescription_url,
    status,
    estimated_fee,
    discount_rupees,
    final_fee,
    promo_code,
    notes
  ) VALUES (
    v_booking_id,
    now(),
    trim(p_patient_name),
    trim(p_patient_phone),
    p_patient_age,
    p_patient_gender,
    v_service.id,
    v_service.title,
    trim(p_area),
    trim(p_full_address),
    p_preferred_date,
    p_preferred_time,
    p_has_prescription,
    p_prescription_file_name,
    p_prescription_url,
    'Pending',
    v_estimated_fee,
    v_discount,
    v_final_fee,
    p_coupon_code,
    p_notes
  );

  PERFORM public.log_audit_event_secure(
    'BOOKING_CREATE',
    'bookings',
    v_booking_id,
    jsonb_build_object(
      'patient_name', p_patient_name,
      'service_id', p_service_id,
      'final_fee', v_final_fee
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'final_fee', v_final_fee,
    'message', 'Booking created successfully and queued for dispatch.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.3 Server-Side Authorized Nurse Assignment
CREATE OR REPLACE FUNCTION public.assign_nurse_atomic(
  p_booking_id text,
  p_nurse_id text,
  p_assigned_by text DEFAULT 'Operations Dispatcher'
)
RETURNS jsonb AS $$
DECLARE
  v_nurse record;
  v_booking record;
BEGIN
  -- Enforce staff/admin check
  IF NOT public.is_admin() AND public.get_auth_role() <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only administrative dispatchers can assign nurses to bookings.';
  END IF;

  SELECT * INTO v_nurse
  FROM public.nurses
  WHERE id = p_nurse_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nurse not found in registry.';
  END IF;

  IF v_nurse.status <> 'Active' THEN
    RAISE EXCEPTION 'Nurse is currently not in Active status.';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  IF v_booking.status IN ('Completed', 'Cancelled') THEN
    RAISE EXCEPTION 'Cannot reassign a closed or cancelled booking.';
  END IF;

  UPDATE public.bookings
  SET 
    assigned_nurse_id = v_nurse.id,
    assigned_nurse_name = v_nurse.name,
    status = 'Assigned',
    nurse_acceptance_status = 'Pending'
  WHERE id = p_booking_id;

  PERFORM public.log_audit_event_secure(
    'NURSE_ASSIGN',
    'bookings',
    p_booking_id,
    jsonb_build_object(
      'nurse_id', p_nurse_id,
      'nurse_name', v_nurse.name,
      'assigned_by', p_assigned_by
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'nurse_id', p_nurse_id,
    'nurse_name', v_nurse.name,
    'message', 'Nurse assigned successfully.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
