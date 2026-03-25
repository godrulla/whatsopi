/**
 * Input Validation & Sanitization System
 * Comprehensive protection against injection attacks and malicious input
 * 
 * Features:
 * - XSS prevention
 * - SQL injection prevention
 * - Command injection prevention
 * - File upload validation
 * - Dominican Republic specific validations
 * - Multi-language input handling
 * - Voice input validation
 */

import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Types
export interface ValidationResult {
  isValid: boolean;
  sanitized?: any;
  errors: string[];
  warnings: string[];
}

export interface FileValidationOptions {
  maxSize: number;
  allowedTypes: string[];
  allowedExtensions: string[];
  scanForMalware: boolean;
  stripMetadata: boolean;
}

export interface VoiceValidationOptions {
  maxDuration: number; // seconds
  maxSize: number; // bytes
  allowedFormats: string[];
  requireSpeakerVerification: boolean;
}

// Dominican Republic specific validation patterns
export const dominicanPatterns = {
  // Dominican phone numbers
  phoneNumber: /^\+1[8-9]\d{9}$/,
  
  // Dominican ID (Cédula)
  cedula: /^\d{3}-\d{7}-\d{1}$/,
  
  // RNC (Registro Nacional del Contribuyente)
  rnc: /^\d{9}$/,
  
  // Dominican postal codes
  postalCode: /^\d{5}$/,
  
  // Dominican bank account numbers (simplified)
  bankAccount: /^\d{10,20}$/,
  
  // Dominican license plate
  licensePlate: /^[A-Z]\d{6}$/
};

// Spanish/Creole language validation
export const languagePatterns = {
  // Spanish text (including accented characters)
  spanish: /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s.,!?¿¡0-9-]*$/,
  
  // Haitian Creole text
  creole: /^[a-zA-ZàèòÀÈÒ\s.,!?0-9-]*$/,
  
  // Mixed Spanish/Creole (common in DR)
  mixed: /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑàèòÀÈÒ\s.,!?¿¡0-9-]*$/
};

// XSS Prevention
export class XSSProtection {
  // Sanitize HTML content
  static sanitizeHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
      ALLOWED_ATTR: ['href'],
      ALLOWED_URI_REGEXP: /^https?:\/\//
    });
  }
  
  // Remove all HTML tags
  static stripHTML(input: string): string {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  }
  
  // Encode special characters for safe display
  static encodeForHTML(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  // Detect potential XSS patterns
  static detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*>/gi,
      /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  }
}

// SQL Injection Prevention
export class SQLInjectionProtection {
  // Detect SQL injection patterns
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(\b(UNION|OR|AND)\b.*\b(SELECT|INSERT|UPDATE|DELETE)\b)/gi,
      /(;|\-\-|\/\*|\*\/)/g,
      /(\b(OR|AND)\b.*[=<>].*['"])/gi,
      /('|(\\)|;|--|\||&|\*)/g
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }
  
  // Sanitize input for SQL usage (though parameterized queries are preferred)
  static sanitizeForSQL(input: string): string {
    return input
      .replace(/'/g, "''") // Escape single quotes
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/;/g, '') // Remove semicolons
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove multiline comment start
      .replace(/\*\//g, ''); // Remove multiline comment end
  }
}

// Command Injection Prevention
export class CommandInjectionProtection {
  // Detect command injection patterns
  static detectCommandInjection(input: string): boolean {
    const commandPatterns = [
      /[;&|`$(){}[\]<>]/g,
      /\b(cat|ls|pwd|whoami|id|uname|wget|curl|nc|netcat|bash|sh|zsh|csh|fish|python|perl|ruby|node|php)\b/gi,
      /(&&|\|\|)/g,
      /\$\(/g,
      /`[^`]*`/g
    ];
    
    return commandPatterns.some(pattern => pattern.test(input));
  }
  
  // Sanitize input to prevent command injection
  static sanitizeForCommand(input: string): string {
    return input
      .replace(/[;&|`$(){}[\]<>]/g, '') // Remove command injection characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}

// File Upload Validation
export class FileValidator {
  private static readonly defaultOptions: FileValidationOptions = {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf'],
    scanForMalware: true,
    stripMetadata: true
  };
  
  // Validate uploaded file
  static validateFile(
    file: File | Buffer,
    filename: string,
    options: Partial<FileValidationOptions> = {}
  ): ValidationResult {
    const opts = { ...this.defaultOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check file size
    const size = file instanceof File ? file.size : file.length;
    if (size > opts.maxSize) {
      errors.push(`File size ${size} exceeds maximum allowed size ${opts.maxSize}`);
    }
    
    // Check file extension
    const extension = this.getFileExtension(filename).toLowerCase();
    if (!opts.allowedExtensions.includes(extension)) {
      errors.push(`File extension ${extension} is not allowed`);
    }
    
    // Check MIME type (for File objects)
    if (file instanceof File && !opts.allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }
    
    // Check for suspicious filename patterns
    if (this.hasSuspiciousFilename(filename)) {
      errors.push('Filename contains suspicious patterns');
    }
    
    // Validate file header (magic bytes)
    if (file instanceof Buffer && !this.validateFileHeader(file, extension)) {
      errors.push('File header does not match extension');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private static getFileExtension(filename: string): string {
    return filename.substring(filename.lastIndexOf('.'));
  }
  
  private static hasSuspiciousFilename(filename: string): boolean {
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|jsp)$/i,
      /\.\./,
      /[<>"|*?]/,
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }
  
  private static validateFileHeader(buffer: Buffer, extension: string): boolean {
    const magicBytes: Record<string, Buffer[]> = {
      '.jpg': [Buffer.from([0xFF, 0xD8, 0xFF])],
      '.jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
      '.png': [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
      '.pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])]
    };
    
    const expectedHeaders = magicBytes[extension];
    if (!expectedHeaders) {
      return true; // No validation for this extension
    }
    
    return expectedHeaders.some(header => 
      buffer.subarray(0, header.length).equals(header)
    );
  }
}

// Voice Input Validation
export class VoiceValidator {
  private static readonly defaultOptions: VoiceValidationOptions = {
    maxDuration: 60, // 60 seconds
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm'],
    requireSpeakerVerification: false
  };
  
  // Validate voice recording
  static validateVoiceRecording(
    audioBuffer: Buffer,
    metadata: any,
    options: Partial<VoiceValidationOptions> = {}
  ): ValidationResult {
    const opts = { ...this.defaultOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check file size
    if (audioBuffer.length > opts.maxSize) {
      errors.push(`Audio file size ${audioBuffer.length} exceeds maximum ${opts.maxSize}`);
    }
    
    // Check duration
    if (metadata.duration > opts.maxDuration) {
      errors.push(`Audio duration ${metadata.duration}s exceeds maximum ${opts.maxDuration}s`);
    }
    
    // Check format
    if (!opts.allowedFormats.includes(metadata.format)) {
      errors.push(`Audio format ${metadata.format} is not allowed`);
    }
    
    // Validate audio header
    if (!this.validateAudioHeader(audioBuffer, metadata.format)) {
      errors.push('Audio file header is invalid');
    }
    
    // Check for suspicious patterns in audio data
    if (this.detectSuspiciousAudioPatterns(audioBuffer)) {
      warnings.push('Audio file contains suspicious patterns');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private static validateAudioHeader(buffer: Buffer, format: string): boolean {
    const audioHeaders: Record<string, Buffer[]> = {
      'audio/wav': [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF
      'audio/mp3': [
        Buffer.from([0xFF, 0xFB]),
        Buffer.from([0xFF, 0xF3]),
        Buffer.from([0xFF, 0xF2])
      ],
      'audio/ogg': [Buffer.from([0x4F, 0x67, 0x67, 0x53])], // OggS
      'audio/webm': [Buffer.from([0x1A, 0x45, 0xDF, 0xA3])] // WebM
    };
    
    const expectedHeaders = audioHeaders[format];
    if (!expectedHeaders) {
      return true; // No validation for this format
    }
    
    return expectedHeaders.some(header => 
      buffer.subarray(0, header.length).equals(header)
    );
  }
  
  private static detectSuspiciousAudioPatterns(buffer: Buffer): boolean {
    // Check for embedded executables or scripts
    const suspiciousPatterns = [
      Buffer.from([0x4D, 0x5A]), // MZ (Windows executable)
      Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF (Linux executable)
      Buffer.from('javascript:', 'utf8'),
      Buffer.from('<script', 'utf8')
    ];
    
    return suspiciousPatterns.some(pattern => buffer.includes(pattern));
  }
}

// Dominican Republic specific validators
export class DominicanValidators {
  // Validate Dominican phone number
  static validatePhoneNumber(phone: string): ValidationResult {
    const cleaned = phone.replace(/\D/g, '');
    const errors: string[] = [];
    
    if (!dominicanPatterns.phoneNumber.test(phone)) {
      errors.push('Invalid Dominican Republic phone number format');
    }
    
    // Check if it's a valid mobile number (8xx or 9xx)
    if (cleaned.length === 12 && !['18', '19'].includes(cleaned.substring(2, 4))) {
      errors.push('Phone number must be a Dominican mobile number (18xx or 19xx)');
    }
    
    return {
      isValid: errors.length === 0,
      sanitized: phone,
      errors,
      warnings: []
    };
  }
  
  // Validate Dominican ID (Cédula)
  static validateCedula(cedula: string): ValidationResult {
    const errors: string[] = [];
    
    if (!dominicanPatterns.cedula.test(cedula)) {
      errors.push('Invalid cédula format (should be XXX-XXXXXXX-X)');
    } else {
      // Validate check digit
      const digits = cedula.replace(/\D/g, '');
      if (!this.validateCedulaCheckDigit(digits)) {
        errors.push('Invalid cédula check digit');
      }
    }
    
    return {
      isValid: errors.length === 0,
      sanitized: cedula,
      errors,
      warnings: []
    };
  }
  
  private static validateCedulaCheckDigit(digits: string): boolean {
    // Simplified cédula validation algorithm
    const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;
    
    for (let i = 0; i < 10; i++) {
      let product = parseInt(digits[i]) * weights[i];
      if (product > 9) {
        product = Math.floor(product / 10) + (product % 10);
      }
      sum += product;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(digits[10]);
  }
  
  // Validate RNC (business tax ID)
  static validateRNC(rnc: string): ValidationResult {
    const errors: string[] = [];
    
    if (!dominicanPatterns.rnc.test(rnc)) {
      errors.push('Invalid RNC format (should be 9 digits)');
    }
    
    return {
      isValid: errors.length === 0,
      sanitized: rnc,
      errors,
      warnings: []
    };
  }
}

// Multi-language text validator
export class LanguageValidator {
  // Validate Spanish text
  static validateSpanishText(text: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!languagePatterns.spanish.test(text)) {
      errors.push('Text contains invalid characters for Spanish');
    }
    
    // Check for common profanity (basic filter)
    if (this.containsProfanity(text, 'spanish')) {
      warnings.push('Text may contain inappropriate language');
    }
    
    return {
      isValid: errors.length === 0,
      sanitized: text.trim(),
      errors,
      warnings
    };
  }
  
  // Validate Creole text
  static validateCreoleText(text: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!languagePatterns.creole.test(text)) {
      errors.push('Text contains invalid characters for Creole');
    }
    
    if (this.containsProfanity(text, 'creole')) {
      warnings.push('Text may contain inappropriate language');
    }
    
    return {
      isValid: errors.length === 0,
      sanitized: text.trim(),
      errors,
      warnings
    };
  }
  
  private static containsProfanity(text: string, language: string): boolean {
    // Basic profanity filter - in production, use a comprehensive filter
    const spanishProfanity = ['carajo', 'joder', 'mierda'];
    const creoleProfanity = ['bouda', 'bouzen'];
    
    const words = language === 'spanish' ? spanishProfanity : creoleProfanity;
    const lowerText = text.toLowerCase();
    
    return words.some(word => lowerText.includes(word));
  }
}

// Main validator class
export class InputValidator {
  // Comprehensive input validation
  static validate(input: any, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitized = input;
    
    for (const rule of rules) {
      const result = this.applyRule(sanitized, rule);
      
      if (!result.isValid) {
        errors.push(...result.errors);
      }
      
      warnings.push(...result.warnings);
      
      if (result.sanitized !== undefined) {
        sanitized = result.sanitized;
      }
    }
    
    return {
      isValid: errors.length === 0,
      sanitized,
      errors,
      warnings
    };
  }
  
  private static applyRule(input: any, rule: ValidationRule): ValidationResult {
    switch (rule.type) {
      case 'xss':
        return {
          isValid: !XSSProtection.detectXSS(String(input)),
          sanitized: XSSProtection.sanitizeHTML(String(input)),
          errors: XSSProtection.detectXSS(String(input)) ? ['XSS detected'] : [],
          warnings: []
        };
        
      case 'sql':
        return {
          isValid: !SQLInjectionProtection.detectSQLInjection(String(input)),
          sanitized: SQLInjectionProtection.sanitizeForSQL(String(input)),
          errors: SQLInjectionProtection.detectSQLInjection(String(input)) ? ['SQL injection detected'] : [],
          warnings: []
        };
        
      case 'command':
        return {
          isValid: !CommandInjectionProtection.detectCommandInjection(String(input)),
          sanitized: CommandInjectionProtection.sanitizeForCommand(String(input)),
          errors: CommandInjectionProtection.detectCommandInjection(String(input)) ? ['Command injection detected'] : [],
          warnings: []
        };
        
      case 'dominican_phone':
        return DominicanValidators.validatePhoneNumber(String(input));
        
      case 'dominican_cedula':
        return DominicanValidators.validateCedula(String(input));
        
      case 'spanish_text':
        return LanguageValidator.validateSpanishText(String(input));
        
      case 'creole_text':
        return LanguageValidator.validateCreoleText(String(input));
        
      default:
        return {
          isValid: true,
          sanitized: input,
          errors: [],
          warnings: []
        };
    }
  }
}

export interface ValidationRule {
  type: 'xss' | 'sql' | 'command' | 'dominican_phone' | 'dominican_cedula' | 'spanish_text' | 'creole_text';
  options?: any;
}

// Predefined validation rule sets
export const validationRuleSets = {
  // Basic security validation
  basic: [
    { type: 'xss' as const },
    { type: 'sql' as const },
    { type: 'command' as const }
  ],
  
  // Dominican user input
  dominicanUser: [
    { type: 'xss' as const },
    { type: 'sql' as const },
    { type: 'spanish_text' as const }
  ],
  
  // Phone number input
  phoneNumber: [
    { type: 'dominican_phone' as const }
  ],
  
  // Identity document input
  identity: [
    { type: 'dominican_cedula' as const }
  ]
};