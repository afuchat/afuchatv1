-- Update the mini-app-apks bucket to enforce 50MB file size limit
UPDATE storage.buckets 
SET file_size_limit = 52428800 -- 50MB in bytes
WHERE id = 'mini-app-apks';