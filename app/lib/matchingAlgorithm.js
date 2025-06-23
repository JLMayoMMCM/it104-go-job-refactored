// Enhanced job matching algorithm
// Considers multiple factors with weighted scoring based on user preferences

export function calculateJobMatch(jobSeekerData, jobData) {
  if (!jobSeekerData || !jobData) {
    return 0;
  }

  const weights = {
    categoryMatch: 0.50,    // 50% - Job category similarity
    experienceLevel: 0.30,  // 30% - Experience level match
    fieldMatch: 0.20        // 20% - Field similarity
  };

  let totalScore = 0;
  let applicableWeights = 0;

  // 1. Category Matching (50%)
  let categoryScore = 0;
  const jobCategoryIds = jobData.job_category_list?.map(jcl => 
    jcl.job_category?.job_category_id
  ).filter(id => id) || [];
  
  if (jobSeekerData.preferredCategories?.length > 0 && jobCategoryIds.length > 0) {
    const hasCategoryMatch = jobCategoryIds.some(categoryId => 
      jobSeekerData.preferredCategories.includes(categoryId)
    );
    
    if (hasCategoryMatch) {
      categoryScore = 50; // Auto 50% for any category match
      totalScore += categoryScore * weights.categoryMatch;
      applicableWeights += weights.categoryMatch;
    }
  }

  // 2. Field Matching (20%)
  let fieldScore = 0;
  const jobFields = jobData.job_category_list?.map(jcl => 
    jcl.job_category?.category_field?.category_field_id
  ).filter(id => id) || [];
  
  if (jobSeekerData.preferredFields?.length > 0 && jobFields.length > 0) {
    const hasFieldMatch = jobFields.some(fieldId => 
      jobSeekerData.preferredFields.includes(fieldId)
    );
    
    if (hasFieldMatch) {
      fieldScore = 20; // Auto 20% for any field match
      totalScore += fieldScore * weights.fieldMatch;
      applicableWeights += weights.fieldMatch;
    }
  }

  // 3. Experience Level Matching (30%)
  // -30% for exact match, -10% per level difference
  let experienceScore = 0;
  if (jobSeekerData.experienceLevelId && jobData.job_experience_level_id) {
    experienceScore = calculateExperienceLevelMatch(
      jobSeekerData.experienceLevelId, 
      jobData.job_experience_level_id
    );
    totalScore += experienceScore * weights.experienceLevel;
    applicableWeights += weights.experienceLevel;
  }

  // Calculate raw score sum without weighting
  const rawScore = categoryScore + experienceScore + fieldScore;
  
  // Return final score clamped between 0-100
  return Math.min(Math.max(Math.round(rawScore), 0), 100);
}

// Experience level compatibility matrix
function calculateExperienceLevelMatch(jobSeekerLevelId, jobRequiredLevelId) {
  // Experience level hierarchy (from SQL schema):
  // 1: Entry Level, 2: Mid Level, 3: Senior Level, 4: Managerial Level, 5: Executive Level
  
  const jobSeekerLevel = parseInt(jobSeekerLevelId);
  const requiredLevel = parseInt(jobRequiredLevelId);
  
  if (jobSeekerLevel === requiredLevel) {
    return 30; // Full 30% for exact match
  }
  
  const levelDiff = Math.abs(jobSeekerLevel - requiredLevel);
  return Math.max(0, 30 - (levelDiff * 10)); // Deduct 10% per level
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
