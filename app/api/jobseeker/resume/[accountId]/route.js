import { NextResponse } from 'next/server';
import { createStorageClient } from '../../../../lib/supabase';

export async function GET(request, { params }) {
  try {
    const accountId = params.accountId;

    if (!accountId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Account ID is required' 
      }, { status: 400 });
    }

    // Create storage client for file operations
    const storageClient = createStorageClient();

    // First get the resume URL from the database
    const { data: accountData, error: accountError } = await storageClient
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

    if (!accountData.account_resume) {
      return NextResponse.json({ 
        success: false, 
        error: 'No resume found for this account' 
      }, { status: 404 });
    }

    // Extract file path from URL
    const url = new URL(accountData.account_resume);
    const pathParts = url.pathname.split('/profile/')[1]?.split('?')[0];
    const filePath = pathParts || '';
    
    if (!filePath) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid resume file path' 
      }, { status: 400 });
    }

    // Download the file from storage
    const { data: fileData, error: fileError } = await storageClient.storage
      .from('profile')
      .download(filePath);

    if (fileError) {
      console.error('File download error:', fileError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to retrieve resume file' 
      }, { status: 500 });
    }

    // Determine content type based on file extension
    const fileExtension = filePath.split('.').pop().toLowerCase();
    let contentType = 'application/pdf';
    
    if (fileExtension === 'doc' || fileExtension === 'docx') {
      contentType = fileExtension === 'doc' ? 'application/msword' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    // Return the file as a response
    return new NextResponse(fileData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="resume.${fileExtension}"`,
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('Unexpected error retrieving resume:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}
