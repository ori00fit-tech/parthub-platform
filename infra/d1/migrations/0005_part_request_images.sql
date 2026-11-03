-- ============================================================
-- Part requests: up to 3 buyer photos per request.
-- `images` is a JSON array of /api/v1/media/... URLs; `image_url`
-- keeps the first one for older clients.
-- ============================================================

ALTER TABLE part_requests ADD COLUMN images TEXT NOT NULL DEFAULT '[]';

UPDATE part_requests
SET images = json_array(image_url)
WHERE image_url IS NOT NULL AND image_url != '' AND images = '[]';
