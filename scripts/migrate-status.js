// Migration script to update 'denied' status to 'rejected' in job_requests table
const { createClient } = require('../app/lib/supabase');

async function migrateStatus() {
  const supabase = createClient();
  
  try {
    console.log('Starting migration: updating "denied" status to "rejected"...');
    
    // Check how many records need to be updated
    const { data: checkData, error: checkError } = await supabase
      .from('job_requests')
      .select('request_id')
      .eq('request_status', 'denied');
    
    if (checkError) {
      console.error('Error checking records:', checkError);
      return;
    }
    
    console.log(`Found ${checkData?.length || 0} records with "denied" status`);
    
    if (checkData && checkData.length > 0) {
      // Update all denied records to rejected
      const { data: updateData, error: updateError } = await supabase
        .from('job_requests')
        .update({ request_status: 'rejected' })
        .eq('request_status', 'denied');
      
      if (updateError) {
        console.error('Error updating records:', updateError);
        return;
      }
      
      console.log(`Successfully updated ${checkData.length} records from "denied" to "rejected"`);
    } else {
      console.log('No records need updating');
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
migrateStatus();
