// Enhanced job matching algorithm
// Considers multiple factors with weighted scoring based on user preferences

export function calculateJobMatch(jobSeekerData, jobData) {
  if (!jobSeekerData || !jobData) {
    return 0;
  }

  const weights = {
    categoryMatch: 0.60,    // 60% - Primary factor (category match)
    fieldMatch: 0.30,       // 30% - Secondary factor (field match)
    experienceLevel: 0.10   // 10% - Tertiary factor (experience level compatibility)
  };

  let totalScore = 0;
  let applicableWeights = 0;

  // 1. Category Matching (60%) - Highest priority
  // If job has 1 or more matching categories with user preferences, start with 75% base score
  let categoryScore = 0;
  if (jobSeekerData.preferredCategories && jobSeekerData.preferredCategories.length > 0) {
    const jobCategoryIds = jobData.job_category_list?.map(jcl => 
      jcl.job_category?.job_category_id
    ).filter(id => id) || [];

    if (jobCategoryIds.length > 0) {
      const matchingCategoriesCount = jobCategoryIds.filter(categoryId => 
        jobSeekerData.preferredCategories.includes(categoryId)
      ).length;
      
      if (matchingCategoriesCount > 0) {
        // Base score of 75% for any category match + bonus for multiple matches
        categoryScore = 75 + (matchingCategoriesCount / jobCategoryIds.length) * 25;
        categoryScore = Math.min(categoryScore, 100); // Cap at 100%
      }
      
      totalScore += categoryScore * weights.categoryMatch;
      applicableWeights += weights.categoryMatch;
    }
  }

  // 2. Field Matching (30%) - Only applies if no category match
  // If job belongs to same field as user's preferred fields but different categories
  let fieldScore = 0;
  if (categoryScore === 0 && jobSeekerData.preferredFields && jobSeekerData.preferredFields.length > 0) {
    const jobFields = jobData.job_category_list?.map(jcl => 
      jcl.job_category?.category_field?.category_field_id
    ).filter(id => id) || [];

    if (jobFields.length > 0) {
      const matchingFieldsCount = jobFields.filter(fieldId => 
        jobSeekerData.preferredFields.includes(fieldId)
      ).length;
      
      if (matchingFieldsCount > 0) {
        // Score based on field match proportion, max 60%
        fieldScore = 40 + (matchingFieldsCount / jobFields.length) * 20;
        fieldScore = Math.min(fieldScore, 60);
      }
      
      totalScore += fieldScore * weights.fieldMatch;
      applicableWeights += weights.fieldMatch;
    }
  }

  // 3. Experience Level Matching (10%)
  // Score based on level difference, -20% per level
  let experienceScore = 0;
  if (jobSeekerData.experienceLevelId && jobData.job_experience_level_id) {
    experienceScore = calculateExperienceLevelMatch(
      jobSeekerData.experienceLevelId, 
      jobData.job_experience_level_id
    );
    totalScore += experienceScore * weights.experienceLevel;
    applicableWeights += weights.experienceLevel;
  }

  // Calculate final percentage based on applicable weights
  let finalScore = applicableWeights > 0 ? Math.round(totalScore / applicableWeights) : 0;
  
  // Ensure score never exceeds 100%
  finalScore = Math.min(finalScore, 100);
  
  // Ensure minimum reasonable score for any job that has at least some matching criteria
  return Math.max(finalScore, (categoryScore > 0 || fieldScore > 0) ? 25 : 0);
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
  
  // Calculate level difference
  const levelDiff = Math.abs(jobSeekerLevel - requiredLevel);
  
  // Reduce score by 20% per level difference
  return Math.max(0, 100 - (levelDiff * 20));
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
