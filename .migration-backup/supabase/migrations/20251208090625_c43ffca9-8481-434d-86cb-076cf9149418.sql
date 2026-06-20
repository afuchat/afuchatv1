-- Clear duplicate phone numbers (keep the first account, clear others)
UPDATE public.profiles 
SET phone_number = NULL 
WHERE phone_number = '+256703464913' 
AND id != '629333cf-087e-4283-8a09-a44282dda98b';

-- Now add unique constraint on phone_number to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_number_unique 
ON public.profiles (phone_number) 
WHERE phone_number IS NOT NULL;