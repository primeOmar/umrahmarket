-- Insert test packages for homepage testing
-- Run this in your Supabase SQL Editor

-- Insert test packages for homepage testing
-- Run this in your Supabase SQL Editor

INSERT INTO public.packages (
  name, type, location, price, original_price, discount, duration,
  description, agent_name, agent_number, status, image_urls,
  makkah_hotel_name, makkah_hotel_rating, makkah_hotel_distance,
  madinah_hotel_name, madinah_hotel_rating, madinah_hotel_distance,
  highlights, inclusions, exclusions
) VALUES
(
  'Premium Umrah Package - 7 Days',
  'umrah',
  'makkah',
  2500.00,
  3000.00,
  17,
  7,
  'Experience a spiritual journey with our premium Umrah package including 5-star hotels and VIP transportation.',
  'Al-Haram Travel Agency',
  '+254712345678',
  'Active',
  ARRAY['https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800'],
  'Hilton Makkah',
  '5',
  '500m from Haram',
  'Sheraton Madinah',
  '5',
  '300m from Masjid Nabawi',
  '["VIP Transportation", "5-Star Hotels", "Guided Tours", "Zamzam Water"]'::jsonb,
  '["Hotel Accommodation", "Transportation", "Meals", "Visa Assistance", "Guided Tours"]'::jsonb,
  '["International Flights", "Personal Expenses", "Travel Insurance"]'::jsonb
),
(
  'Economy Umrah Package - 5 Days',
  'umrah',
  'makkah',
  1800.00,
  2200.00,
  18,
  5,
  'Affordable Umrah package with comfortable 4-star hotels and reliable transportation.',
  'Mecca Tours Ltd',
  '+254798765432',
  'Active',
  ARRAY['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800', 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800'],
  'Ibis Styles Makkah',
  '4',
  '1km from Haram',
  'Holiday Inn Madinah',
  '4',
  '800m from Masjid Nabawi',
  '["Comfortable Hotels", "Group Transportation", "Spiritual Guidance"]'::jsonb,
  '["Hotel Accommodation", "Transportation", "Daily Meals", "Visa Processing"]'::jsonb,
  '["International Flights", "Personal Expenses", "Optional Tours"]'::jsonb
),
(
  'Deluxe Hajj Package - 14 Days',
  'hajj',
  'makkah',
  4500.00,
  5500.00,
  18,
  14,
  'Complete Hajj pilgrimage with premium accommodations and comprehensive services.',
  'Sacred Journeys',
  '+254723456789',
  'Active',
  ARRAY['https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800'],
  'Raffles Makkah Palace',
  '5',
  '200m from Haram',
  'The St. Regis Madinah',
  '5',
  '150m from Masjid Nabawi',
  '["Luxury Accommodation", "Private Transportation", "Personal Guide", "VIP Access"]'::jsonb,
  '["Premium Hotels", "Private Transport", "All Meals", "Complete Visa Service", "Personal Guide"]'::jsonb,
  '["International Flights", "Personal Expenses", "Health Insurance"]'::jsonb
);

-- Verify the packages were inserted
SELECT id, name, price, status, created_at FROM public.packages ORDER BY created_at DESC;