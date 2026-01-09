/**
 * Reconciliation Upload API
 *
 * Endpoint: POST /api/reconciliation/upload
 * Purpose: Upload and parse customer reconciliation Excel file
 */

import { NextRequest, NextResponse } from 'next/server';
import { ParserRegistry } from '@/lib/reconciliation/parsers/ParserRegistry';

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Reconciliation upload request received');

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const templateType = formData.get('templateType') as string | null;

    // Validation
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Check file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      );
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    console.log(`   File: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    console.log(`   Template type: ${templateType || 'auto-detect'}`);

    const registry = new ParserRegistry();

    // Auto-detect if no template type provided
    let detectedType: string;

    if (templateType && templateType !== 'auto') {
      // Validate provided template type
      const availableTypes = registry.getAllTemplateTypes();
      if (!availableTypes.includes(templateType)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid template type. Available types: ${availableTypes.join(', ')}`
          },
          { status: 400 }
        );
      }
      detectedType = templateType;
      console.log(`   Using provided template: ${detectedType}`);
    } else {
      // Auto-detect template type
      console.log('   Auto-detecting template type...');
      try {
        detectedType = await registry.autoDetectTemplate(file);
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: `Template auto-detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
          { status: 400 }
        );
      }
    }

    // Parse file
    console.log(`   Parsing file with ${detectedType} parser...`);
    const parser = registry.getParser(detectedType);
    const rows = await parser.parse(file);

    console.log(`✓ Successfully parsed ${rows.length} rows`);

    // Return parsed data
    return NextResponse.json({
      success: true,
      templateType: detectedType,
      rowCount: rows.length,
      rows,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        parsedAt: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('❌ Upload error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process upload',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for template info
 */
export async function GET(request: NextRequest) {
  try {
    const registry = new ParserRegistry();
    const availableTemplates = registry.getAllTemplateTypes();

    return NextResponse.json({
      success: true,
      templates: availableTemplates,
      description: 'Available reconciliation templates for upload',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
