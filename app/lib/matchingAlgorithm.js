// Enhanced job matching algorithm
// Considers multiple factors with weighted scoring

export function calculateJobMatch(jobSeekerData, jobData) {
  if (!jobSeekerData || !jobData) {
    return 0;
  }

  const weights = {
    fieldPreferences: 0.4,    // 40% - Primary factor (field match)
    experienceLevel: 0.3,     // 30% - Experience level compatibility
    educationLevel: 0.2,      // 20% - Education level requirements
    categoryMatch: 0.1        // 10% - Specific category preferences
  };

  let totalScore = 0;
  let applicableWeights = 0;

  // 1. Field Preferences Matching (40%)
  if (jobSeekerData.preferredFields && jobSeekerData.preferredFields.length > 0) {
    const jobCategories = jobData.job_category_list?.map(jcl => 
      jcl.job_category?.category_field?.category_field_id
    ).filter(id => id) || [];

    if (jobCategories.length > 0) {
      const matchingFieldsCount = jobCategories.filter(fieldId => 
        jobSeekerData.preferredFields.includes(fieldId)
      ).length;
      
      const fieldScore = matchingFieldsCount > 0 ? 
        Math.min((matchingFieldsCount / Math.min(jobSeekerData.preferredFields.length, jobCategories.length)) * 100, 100) : 0;
      
      totalScore += fieldScore * weights.fieldPreferences;
      applicableWeights += weights.fieldPreferences;
    }
  }

  // 2. Experience Level Matching (30%)
  if (jobSeekerData.experienceLevelId && jobData.job_experience_level_id) {
    const experienceScore = calculateExperienceLevelMatch(
      jobSeekerData.experienceLevelId, 
      jobData.job_experience_level_id
    );
    totalScore += experienceScore * weights.experienceLevel;
    applicableWeights += weights.experienceLevel;
  }

  // 3. Education Level Matching (20%)
  if (jobSeekerData.educationLevelId) {
    // For jobs without specific education requirements, assume basic requirement
    const educationScore = calculateEducationLevelMatch(
      jobSeekerData.educationLevelId,
      jobData.required_education_level_id // This might not exist in current schema
    );
    totalScore += educationScore * weights.educationLevel;
    applicableWeights += weights.educationLevel;
  }

  // 4. Category-specific Matching (10%)
  if (jobSeekerData.preferredCategories && jobSeekerData.preferredCategories.length > 0) {
    const jobCategoryIds = jobData.job_category_list?.map(jcl => 
      jcl.job_category?.job_category_id
    ).filter(id => id) || [];

    if (jobCategoryIds.length > 0) {
      const matchingCategoriesCount = jobCategoryIds.filter(categoryId => 
        jobSeekerData.preferredCategories.includes(categoryId)
      ).length;
      
      const categoryScore = matchingCategoriesCount > 0 ? 
        (matchingCategoriesCount / jobCategoryIds.length) * 100 : 0;
      
      totalScore += categoryScore * weights.categoryMatch;
      applicableWeights += weights.categoryMatch;
    }
  }

  // Calculate final percentage based on applicable weights
  const finalScore = applicableWeights > 0 ? Math.round(totalScore / applicableWeights) : 0;
  
  // Ensure minimum reasonable score for any job that has at least one matching criteria
  return Math.max(finalScore, applicableWeights > 0 ? 10 : 0);
}

// Experience level compatibility matrix
function calculateExperienceLevelMatch(jobSeekerLevelId, jobRequiredLevelId) {
  // Experience level hierarchy (from SQL schema):
  // 1: Entry Level, 2: Mid Level, 3: Senior Level, 4: Managerial Level, 5: Executive Level
  
  const jobSeekerLevel = parseInt(jobSeekerLevelId);
  const requiredLevel = parseInt(jobRequiredLevelId);
  
  if (jobSeekerLevel === requiredLevel) {
    return 100; // Perfect match
  }
  
  // Job seeker can typically apply for same level or one level below their experience
  if (jobSeekerLevel > requiredLevel) {
    const levelDiff = jobSeekerLevel - requiredLevel;
    if (levelDiff === 1) return 90; // One level above requirement
    if (levelDiff === 2) return 75; // Two levels above
    if (levelDiff === 3) return 60; // Three levels above (might be overqualified)
    return 45; // Significantly overqualified
  }
  
  // Job seeker below required level
  const levelDiff = requiredLevel - jobSeekerLevel;
  if (levelDiff === 1) return 70; // One level below (ambitious but possible)
  if (levelDiff === 2) return 40; // Two levels below (challenging)
  return 20; // Significantly underqualified
}

// Education level compatibility
function calculateEducationLevelMatch(jobSeekerEducationId, jobRequiredEducationId = null) {
  // Education level hierarchy (from SQL schema):
  // 1: High School, 2: Associate, 3: Bachelor's, 4: Master's, 5: Doctorate, 6: PhD, 7: Vocational
  
  // If job doesn't specify education requirement, assume high school minimum
  const requiredLevel = jobRequiredEducationId ? parseInt(jobRequiredEducationId) : 1;
  const jobSeekerLevel = parseInt(jobSeekerEducationId);
  
  // Special case for vocational training (7) - treat as equivalent to Associate (2)
  const normalizedJobSeekerLevel = jobSeekerLevel === 7 ? 2 : jobSeekerLevel;
  const normalizedRequiredLevel = requiredLevel === 7 ? 2 : requiredLevel;
  
  if (normalizedJobSeekerLevel >= normalizedRequiredLevel) {
    return 100; // Meets or exceeds requirements
  }
  
  // Below requirements
  const levelDiff = normalizedRequiredLevel - normalizedJobSeekerLevel;
  if (levelDiff === 1) return 75; // One level below
  if (levelDiff === 2) return 50; // Two levels below
  return 25; // Significantly below requirements
}

// Enhanced data preparation for job seeker
export async function prepareJobSeekerDataForMatching(supabase, accountId, jobSeekerId) {
  try {
    // Get job seeker basic data
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_experience_level_id, job_seeker_education_level_id')
      .eq('account_id', accountId)
      .single();

    if (jobSeekerError) {
      console.error('Error fetching job seeker data:', jobSeekerError);
      return null;
    }

    // Get field preferences
    const { data: fieldPreferences, error: fieldPrefError } = await supabase
      .from('jobseeker_field_preference')
      .select('preferred_job_field_id')
      .eq('jobseeker_id', jobSeekerId);

    if (fieldPrefError) {
      console.error('Error fetching field preferences:', fieldPrefError);
    }

    // Get category preferences
    const { data: categoryPreferences, error: categoryPrefError } = await supabase
      .from('jobseeker_preference')
      .select('preferred_job_category_id')
      .eq('jobseeker_id', jobSeekerId);

    if (categoryPrefError) {
      console.error('Error fetching category preferences:', categoryPrefError);
    }

    return {
      experienceLevelId: jobSeekerData.job_seeker_experience_level_id,
      educationLevelId: jobSeekerData.job_seeker_education_level_id,
      preferredFields: fieldPreferences?.map(p => p.preferred_job_field_id) || [],
      preferredCategories: categoryPreferences?.map(p => p.preferred_job_category_id) || []
    };
  } catch (error) {
    console.error('Error preparing job seeker data for matching:', error);
    return null;
  }
}
