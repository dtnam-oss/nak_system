/**
 * Parser Registry
 *
 * Central registry for all customer template parsers.
 * Provides auto-detection and parser lookup functionality.
 */

import * as XLSX from 'xlsx';
import { BaseParser } from './BaseParser';
import { JnTRouteParser } from './JnT_Route_Parser';
import { JnTShiftParser } from './JnT_Shift_Parser';
import { GHNParser } from './GHN_Parser';
import { TemplateDetectionResult } from './types';

export class ParserRegistry {
  private parsers: Map<string, BaseParser> = new Map();

  constructor() {
    // Register all available parsers
    this.register(new JnTRouteParser());
    this.register(new JnTShiftParser());
    this.register(new GHNParser());
  }

  /**
   * Register a parser
   */
  register(parser: BaseParser): void {
    this.parsers.set(parser.templateType, parser);
    console.log(`✓ Registered parser: ${parser.templateType}`);
  }

  /**
   * Get parser by template type
   */
  getParser(templateType: string): BaseParser {
    const parser = this.parsers.get(templateType);
    if (!parser) {
      throw new Error(`Parser not found for template: ${templateType}`);
    }
    return parser;
  }

  /**
   * Get all available template types
   */
  getAllTemplateTypes(): string[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * Auto-detect template type from Excel file
   */
  async autoDetectTemplate(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: '',
      });

      if (!data || data.length === 0) {
        throw new Error('Empty Excel file');
      }

      const firstRow = data[0];
      if (!firstRow || typeof firstRow !== 'object') {
        throw new Error('Invalid Excel data format');
      }

      const columns = Object.keys(firstRow);
      console.log('📋 Detected columns:', columns);

      // Try to match columns with each parser
      const detectionResults: TemplateDetectionResult[] = [];

      for (const [templateType, parser] of this.parsers) {
        const matchedColumns = parser.expectedColumns.filter(col =>
          columns.includes(col)
        );

        const missingColumns = parser.expectedColumns.filter(col =>
          !columns.includes(col)
        );

        const confidence = (matchedColumns.length / parser.expectedColumns.length) * 100;

        detectionResults.push({
          templateType,
          confidence,
          matchedColumns,
          missingColumns,
        });

        console.log(`🔍 ${templateType}: ${confidence.toFixed(0)}% match (${matchedColumns.length}/${parser.expectedColumns.length} columns)`);
      }

      // Sort by confidence (highest first)
      detectionResults.sort((a, b) => b.confidence - a.confidence);

      const bestMatch = detectionResults[0];

      // Require at least 100% match for auto-detection
      if (bestMatch.confidence === 100) {
        console.log(`✓ Auto-detected template: ${bestMatch.templateType}`);
        return bestMatch.templateType;
      }

      // If no perfect match, show detailed error
      throw new Error(
        `Could not auto-detect template type. Best match: ${bestMatch.templateType} (${bestMatch.confidence.toFixed(0)}%).\n` +
        `Missing columns: ${bestMatch.missingColumns.join(', ')}`
      );

    } catch (error) {
      throw new Error(`Auto-detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect template with detailed results
   */
  async detectTemplateWithDetails(file: File): Promise<TemplateDetectionResult[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: '',
    });

    if (!data || data.length === 0) {
      throw new Error('Empty Excel file');
    }

    const firstRow = data[0];
    if (!firstRow || typeof firstRow !== 'object') {
      throw new Error('Invalid Excel data format');
    }

    const columns = Object.keys(firstRow);
    const detectionResults: TemplateDetectionResult[] = [];

    for (const [templateType, parser] of this.parsers) {
      const matchedColumns = parser.expectedColumns.filter(col =>
        columns.includes(col)
      );

      const missingColumns = parser.expectedColumns.filter(col =>
        !columns.includes(col)
      );

      const confidence = (matchedColumns.length / parser.expectedColumns.length) * 100;

      detectionResults.push({
        templateType,
        confidence,
        matchedColumns,
        missingColumns,
      });
    }

    return detectionResults.sort((a, b) => b.confidence - a.confidence);
  }
}
