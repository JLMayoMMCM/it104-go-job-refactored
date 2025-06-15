import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for database and storage operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    // Generate a unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${accountId}-${Date.now()}.${fileExtension}`;
    const filePath = `photos/${fileName}`;

    // Upload file to Supabase Storage using native Supabase method
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { data: uploadData, error: uploadError } = await supabase.storage
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
    const { data: publicUrlData } = supabase
      .storage
      .from('profile')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // Update account with profile photo URL
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
      message: 'Profile photo updated successfully'
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

    // First get the current profile photo URL to extract the file path
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
      // Extract the file path from the URL (last two segments which should be the subfolder and filename)
      const filePathSegments = url.split('/profile/')[1]?.split('?')[0];
      const filePath = filePathSegments || '';

      if (filePath) {
        const { error: deleteError } = await supabase.storage
          .from('profile')
          .remove([filePath]);

        if (deleteError) {
          console.error('Storage delete error:', deleteError);
          // Don't fail the request if storage deletion fails, just log the error
        }
      }
    }

    // Remove profile photo reference from database
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
