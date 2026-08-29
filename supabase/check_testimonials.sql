-- Check if testimonials table exists and has data
SELECT 
  'Table exists' as check_item,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'testimonials') 
    THEN 'YES' 
    ELSE 'NO' 
  END as result
UNION ALL
SELECT 
  'Row count' as check_item,
  COUNT(*)::text as result
FROM testimonials
UNION ALL
SELECT 
  'Published count' as check_item,
  COUNT(*)::text as result
FROM testimonials WHERE published = true
UNION ALL
SELECT 
  'RLS enabled' as check_item,
  CASE 
    WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'testimonials' AND rowsecurity = true) 
    THEN 'YES' 
    ELSE 'NO' 
  END as result
UNION ALL
SELECT 
  'Sample data' as check_item,
  json_agg(json_build_object(
    'id', id,
    'name', name,
    'published', published,
    'order_index', order_index
  ))::text as result
FROM testimonials
LIMIT 3;
