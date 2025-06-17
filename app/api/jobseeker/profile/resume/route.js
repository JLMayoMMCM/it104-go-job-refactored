import { NextResponse } from 'next/server';
import { createStorageClient, supabase } from '../../../../lib/supabase';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume');
    const accountId = formData.get('accountId');

    if (!file || !accountId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Resume file and account ID are required' 
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (15MB limit)
    const maxSize = 15 * 1024 * 1024; // 15MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: 'File size too large. Maximum size is 15MB.' 
      }, { status: 400 });
    }

    // Create storage client for file operations
    const storageClient = createStorageClient();

    // Check if user exists and get job_seeker_id (using anon key for database)
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id')
      .eq('account_id', accountId)
      .single();

    if (jobSeekerError || !jobSeekerData) {
      return NextResponse.json({ 
        success: false, 
        error: 'Job seeker not found' 
      }, { status: 404 });
    }

    // Check if there's an existing resume to delete
    const { data: accountData, error: accountError } = await supabase
      .from('account')
      .select('account_resume')
      .eq('account_id', accountId)
      .single();

    if (accountError) {
      console.error('Error fetching account data:', accountError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to verify existing resume' 
      }, { status: 500 });
    }

    // If there's an existing resume, delete it from storage
    if (accountData && accountData.account_resume) {
      try {
        const url = new URL(accountData.account_resume);
        const pathParts = url.pathname.split('/profile/')[1]?.split('?')[0];
        const filePath = pathParts || '';
        
        if (filePath) {
          const { error: deleteError } = await storageClient.storage
            .from('profile')
            .remove([filePath]);
            
          if (deleteError) {
            console.warn('Failed to delete old resume file:', deleteError.message);
            // Continue anyway, as the file might have been deleted already
          }
        }
      } catch (deleteErr) {
        console.warn('Error attempting to delete old resume:', deleteErr.message);
        // Continue with upload even if deletion fails
      }
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `resume_${accountId}_${Date.now()}.${fileExtension}`;
    const filePath = `resume/${fileName}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload file to Supabase Storage using storage client
    const { data: uploadData, error: uploadError } = await storageClient.storage
      .from('profile')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to upload file to storage' 
      }, { status: 500 });
    }

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = storageClient.storage
      .from('profile')
      .getPublicUrl(filePath);

    // Update account table with resume URL using anon key (database operations)
    const { error: updateError } = await supabase
      .from('account')
      .update({ account_resume: publicUrl })
      .eq('account_id', accountId);

    if (updateError) {
      console.error('Database update error:', updateError);
      // Try to delete the uploaded file if database update fails
      await storageClient.storage.from('profile').remove([filePath]);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update profile with resume URL' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        resume_url: publicUrl,
        file_name: file.name,
        file_size: file.size
      }
    });

  } catch (error) {
    console.error('Unexpected error uploading resume:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Account ID is required' 
      }, { status: 400 });
    }

    // Create storage client for file operations
    const storageClient = createStorageClient();

    // Get current resume URL (using anon key for database)
    const { data: accountData, error: accountError } = await supabase
      .from('account')
      .select('account_resume')
      .eq('account_id', accountId)
      .single();

    if (accountError || !accountData) {
      return NextResponse.json({ 
        success: false, 
        error: 'Account not found' 
      }, { status: 404 });
    }

    // Remove resume URL from database using anon key
    const { error: updateError } = await supabase
      .from('account')
      .update({ account_resume: null })
      .eq('account_id', accountId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to remove resume from profile' 
      }, { status: 500 });
    }

    // If there was a resume URL, try to delete the file from storage
    if (accountData.account_resume) {
      try {
        // Extract file path from URL
        const url = new URL(accountData.account_resume);
        const pathParts = url.pathname.split('/profile/')[1]?.split('?')[0];
        const filePath = pathParts || '';
        
        if (filePath) {
          await storageClient.storage.from('profile').remove([filePath]);
        }
      } catch (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
        // Don't fail the request if storage deletion fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Resume removed successfully'
    });

  } catch (error) {
    console.error('Unexpected error removing resume:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}
