// Enhanced job matching algorithm
// Considers multiple factors with weighted scoring based on user preferences

export function calculateJobMatch(jobSeekerData, jobData) {
  if (!jobSeekerData || !jobData) {
    return 0;
  }

  const weights = {
    categoryMatch: 0.50,    // 50% - Job category similarity
    fieldMatch: 0.20,       // 20% - Field similarity
    experienceLevel: 0.30   // 30% - Experience level match
  };

  let totalScore = 0;

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
      categoryScore = 50; // Full 50% for any category match
    }
  }

  // 2. Field Matching (20%)
  // A job's field is determined by its first category. If that field is in the user's
  // preferred list, it's a match.
  let fieldScore = 0;
  const jobFieldId = jobData.job_category_list?.[0]?.job_category?.category_field?.category_field_id;
  
  if (jobSeekerData.preferredFields?.length > 0 && jobFieldId) {
    if (jobSeekerData.preferredFields.includes(jobFieldId)) {
      fieldScore = 20; // Full 20% for field match
    }
  }

  // 3. Experience Level Matching (30%)
  let experienceScore = 0;
  if (jobSeekerData.experienceLevelId && jobData.job_experience_level_id) {
    const jobSeekerLevel = parseInt(jobSeekerData.experienceLevelId);
    const jobLevel = parseInt(jobData.job_experience_level_id);
    
    if (jobSeekerLevel === jobLevel) {
      experienceScore = 30; // Full 30% for exact match
    } else {
      // Deduct 10% for each level difference (up or down)
      const levelDiff = Math.abs(jobSeekerLevel - jobLevel);
      experienceScore = Math.max(0, 30 - (levelDiff * 10));
    }
  }

  // Calculate total score
  totalScore = categoryScore + fieldScore + experienceScore;
  
  // Return final score clamped between 0-100
  return Math.min(Math.max(Math.round(totalScore), 0), 100);
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
