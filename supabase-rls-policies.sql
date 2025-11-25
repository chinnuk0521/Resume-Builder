-- ============================================
-- UPDATED RLS POLICIES WITH AUTH.UID()
-- Run these AFTER enabling email auth in Supabase
-- ============================================

-- First, update user_profiles table to link with auth.users
-- Make sure user_id references auth.users(id)
ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- Add foreign key constraint to auth.users
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- 1. USER_PROFILES POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON user_profiles;
DROP POLICY IF EXISTS "Allow public insert" ON user_profiles;
DROP POLICY IF EXISTS "Allow public update" ON user_profiles;
DROP POLICY IF EXISTS "Allow public delete" ON user_profiles;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 2. EXPERIENCES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow public read access" ON experiences;
DROP POLICY IF EXISTS "Allow public insert" ON experiences;
DROP POLICY IF EXISTS "Allow public update" ON experiences;
DROP POLICY IF EXISTS "Allow public delete" ON experiences;

CREATE POLICY "Users can view own experiences" ON experiences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = experiences.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own experiences" ON experiences
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = experiences.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own experiences" ON experiences
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = experiences.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = experiences.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own experiences" ON experiences
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = experiences.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

-- ============================================
-- 3. EDUCATION POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow public read access" ON education;
DROP POLICY IF EXISTS "Allow public insert" ON education;
DROP POLICY IF EXISTS "Allow public update" ON education;
DROP POLICY IF EXISTS "Allow public delete" ON education;

CREATE POLICY "Users can view own education" ON education
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = education.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own education" ON education
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = education.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own education" ON education
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = education.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = education.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own education" ON education
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = education.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

-- ============================================
-- 4. SKILLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow public read access" ON skills;
DROP POLICY IF EXISTS "Allow public insert" ON skills;
DROP POLICY IF EXISTS "Allow public update" ON skills;
DROP POLICY IF EXISTS "Allow public delete" ON skills;

CREATE POLICY "Users can view own skills" ON skills
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = skills.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own skills" ON skills
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = skills.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own skills" ON skills
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = skills.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = skills.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own skills" ON skills
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = skills.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

-- ============================================
-- 5. PROJECTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow public read access" ON projects;
DROP POLICY IF EXISTS "Allow public insert" ON projects;
DROP POLICY IF EXISTS "Allow public update" ON projects;
DROP POLICY IF EXISTS "Allow public delete" ON projects;

CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = projects.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = projects.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = projects.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = projects.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = projects.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

-- ============================================
-- 6. ACHIEVEMENTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow public read access" ON achievements;
DROP POLICY IF EXISTS "Allow public insert" ON achievements;
DROP POLICY IF EXISTS "Allow public update" ON achievements;
DROP POLICY IF EXISTS "Allow public delete" ON achievements;

CREATE POLICY "Users can view own achievements" ON achievements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = achievements.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own achievements" ON achievements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = achievements.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own achievements" ON achievements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = achievements.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = achievements.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own achievements" ON achievements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = achievements.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

-- ============================================
-- 7. CERTIFICATIONS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow public read access" ON certifications;
DROP POLICY IF EXISTS "Allow public insert" ON certifications;
DROP POLICY IF EXISTS "Allow public update" ON certifications;
DROP POLICY IF EXISTS "Allow public delete" ON certifications;

CREATE POLICY "Users can view own certifications" ON certifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = certifications.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own certifications" ON certifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = certifications.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own certifications" ON certifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = certifications.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = certifications.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own certifications" ON certifications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = certifications.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

-- ============================================
-- 8. OPTIMIZED_RESUMES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow public read access" ON optimized_resumes;
DROP POLICY IF EXISTS "Allow public insert" ON optimized_resumes;
DROP POLICY IF EXISTS "Allow public update" ON optimized_resumes;
DROP POLICY IF EXISTS "Allow public delete" ON optimized_resumes;

CREATE POLICY "Users can view own optimized resumes" ON optimized_resumes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = optimized_resumes.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own optimized resumes" ON optimized_resumes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = optimized_resumes.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own optimized resumes" ON optimized_resumes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = optimized_resumes.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = optimized_resumes.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own optimized resumes" ON optimized_resumes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = optimized_resumes.user_profile_id 
      AND user_profiles.user_id = auth.uid()
    )
  );

