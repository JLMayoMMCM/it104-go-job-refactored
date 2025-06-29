import { NextResponse } from 'next/server';
import { createStorageClient, supabase } from '../../../../lib/supabase';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo');
    const accountId = formData.get('accountId');

    if (!file || !accountId) {
      return NextResponse.json({ error: 'Photo and account ID are required' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' }, { status: 400 });
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size too large. Maximum 5MB allowed.' }, { status: 400 });
    }

    // Fetch last_name from the database
    let lastName = '';
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('person_id')
      .eq('account_id', accountId)
      .single();

    if (!jobSeekerError && jobSeekerData) {
      const { data: personData, error: personError } = await supabase
        .from('person')
        .select('last_name')
        .eq('person_id', jobSeekerData.person_id)
        .single();
      
      if (!personError && personData) {
        lastName = personData.last_name || '';
      }
    }

    // Sanitize last_name for filename (replace spaces with underscores, remove special characters)
    const sanitizedLastName = lastName
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'user';

    // Generate filename with account_id, sanitized last_name, and 'picture'
    const fileExtension = file.name.split('.').pop();
    const fileName = `${accountId}_${sanitizedLastName}_picture.${fileExtension}`;
    const filePath = `photos/${fileName}`;

    // Create storage client for file operations
    const storageClient = createStorageClient();

    // Upload file to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { data: uploadData, error: uploadError } = await storageClient.storage
      .from('profile')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload profile photo to storage: ' + uploadError.message }, { status: 500 });
    }

    // Generate a public URL for the uploaded file
    const { data: publicUrlData } = storageClient
      .storage
      .from('profile')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // Update account with profile photo URL using anon key (database operations)
    const { error: updateError } = await supabase
      .from('account')
      .update({
        account_profile_photo: publicUrl
      })
      .eq('account_id', accountId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ error: 'Failed to update profile photo' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile photo updated successfully',
      data: {
        profile_photo_url: publicUrl
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Create storage client for file operations
    const storageClient = createStorageClient();

    // First get the current profile photo URL to extract the file path (using anon key for database)
    const { data: accountData, error: fetchError } = await supabase
      .from('account')
      .select('account_profile_photo')
      .eq('account_id', accountId)
      .single();

    if (fetchError) {
      console.error('Database fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch current profile photo' }, { status: 500 });
    }

    // If there's a photo, extract the file path and delete it from storage
    if (accountData && accountData.account_profile_photo) {
      const url = accountData.account_profile_photo;
      // Extract the file path from the URL
      const filePathSegments = url.split('/profile/')[1]?.split('?')[0];
      const filePath = filePathSegments || '';

      if (filePath) {
        const { error: deleteError } = await storageClient.storage
          .from('profile')
          .remove([filePath]);

        if (deleteError) {
          console.error('Storage delete error:', deleteError);
          // Don't fail the request if storage deletion fails, just log the error
        }
      }
    }

    // Remove profile photo reference from database using anon key
    const { error: updateError } = await supabase
      .from('account')
      .update({
        account_profile_photo: null
      })
      .eq('account_id', accountId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ error: 'Failed to remove profile photo' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile photo removed successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
