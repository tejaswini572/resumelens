// src/app/api/analyze/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY );

// Use 1.5-flash (Standard for Resume analysis)
const MODEL_NAME = process.env.NEXT_PUBLIC_MODEL_NAME || 'gemini-1.5-flash';

// Supported file types
const SUPPORTED_TYPES = {
  'application/pdf': 'PDF',
  'text/plain': 'TXT',
  'text/markdown': 'Markdown',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/csv': 'CSV',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'application/json': 'JSON'
};

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    // Check if it's a form data (file upload)
    if (contentType.includes('multipart/form-data')) {
      return await handleFileUpload(request);
    }
    
    // Otherwise handle JSON request
    return await handleTextRequest(request);
    
  } catch (error) {
    console.error('❌ Route error:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Server error: ${error.message}`,
      details: error.stack
    }, { status: 500 });
  }
}

// Handle text-only requests
async function handleTextRequest(request) {
  try {
    const body = await request.json();
    const { prompt, timestamp } = body;
    
    if (!prompt?.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Prompt is required' 
      }, { status: 400 });
    }
    
    console.log('📝 Text request received:', {
      prompt: prompt.substring(0, 100) + '...',
      length: prompt.length,
      timestamp,
      model: MODEL_NAME
    });
    
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Text analysis complete:', {
      promptLength: prompt.length,
      responseLength: text.length,
      model: MODEL_NAME
    });
    
    return NextResponse.json({
      success: true,
      response: text,
      metadata: {
        model: MODEL_NAME,
        promptLength: prompt.length,
        responseLength: text.length,
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ Text analysis error:', error);
    
    if (error.message?.includes('API key') || error.message?.includes('API_KEY_INVALID')) {
      return NextResponse.json({
        success: false,
        error: 'Gemini API key is invalid or missing. Please check your GOOGLE_API_KEY in .env.local file.',
        details: error.message
      }, { status: 401 });
    }
    
    if (error.message?.includes('quota') || error.message?.includes('QUOTA')) {
      return NextResponse.json({
        success: false,
        error: 'API quota exceeded. Please check your Google Cloud billing or wait until quota resets.',
        details: error.message
      }, { status: 429 });
    }
    
    return NextResponse.json({
      success: false,
      error: `Text analysis failed: ${error.message}`,
      details: error.stack
    }, { status: 500 });
  }
}

// Handle file uploads
async function handleFileUpload(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const prompt = formData.get('prompt') || 'Please analyze this file content and provide key insights';
    const instruction = formData.get('instruction') || 'Extract key information, summarize content, and provide analysis';
    
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: 'No file provided' 
      }, { status: 400 });
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        success: false, 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 413 });
    }
    
    // Validate file type
    const fileType = file.type;
    const supportedType = SUPPORTED_TYPES[fileType];
    
    if (!supportedType) {
      return NextResponse.json({ 
        success: false, 
        error: `Unsupported file type: ${fileType}. Supported types: ${Object.values(SUPPORTED_TYPES).join(', ')}` 
      }, { status: 400 });
    }
    
    console.log('📁 File upload received:', {
      name: file.name,
      size: file.size,
      type: fileType,
      prompt: prompt.substring(0, 100) + '...',
      model: MODEL_NAME
    });
    
    // Read file content
    const fileBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(fileBuffer);
    
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096,
      }
    });
    
    let analysis = '';
    
    // --- CRITICAL FIX: Treat PDFs as Binary (Inline Data) like Images ---
    if (fileType.startsWith('image/') || fileType === 'application/pdf') {
      console.log('🖼️ Processing binary file (Image/PDF) with Gemini vision');
      
      // Convert to base64
      const base64Data = fileContent.toString('base64');
      
      // Create content array for multimodal input
      const content = [
        {
          text: `${instruction}\n\nFile: ${file.name}\nType: ${supportedType}\nSize: ${(file.size / 1024).toFixed(1)} KB\n\nPrompt: ${prompt}\n\nPlease analyze this document:`
        },
        {
          inlineData: {
            mimeType: fileType,
            data: base64Data
          }
        }
      ];
      
      const result = await model.generateContent(content);
      const response = await result.response;
      analysis = response.text();
      
    } else {
      // For text-based files (TXT, CSV, JSON, Markdown)
      console.log('📄 Processing text-based file');
      
      let extractedText = '';
      try {
        extractedText = new TextDecoder('utf-8').decode(fileBuffer).substring(0, 15000);
      } catch (err) {
        extractedText = `[Binary ${supportedType} file. File name: ${file.name}]`;
      }
      
      const fullPrompt = `${instruction}\n\nFile: ${file.name}\nType: ${supportedType}\nSize: ${(file.size / 1024).toFixed(1)} KB\n\nPrompt: ${prompt}\n\nFile Content:\n${extractedText}`;
      
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      analysis = response.text();
    }
    
    console.log('✅ File analysis complete:', {
      fileName: file.name,
      fileType: supportedType,
      analysisLength: analysis.length,
      model: MODEL_NAME
    });
    
    return NextResponse.json({
      success: true,
      response: analysis,
      metadata: {
        model: MODEL_NAME,
        fileName: file.name,
        fileType: supportedType,
        fileSize: file.size,
        analysisLength: analysis.length,
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ File upload error:', error);
    
    // Keep your exact error handling logic
    if (error.message?.includes('API key') || error.message?.includes('API_KEY_INVALID')) {
      return NextResponse.json({
        success: false,
        error: 'Gemini API key is invalid or missing. Please check your GOOGLE_API_KEY in .env.local file.',
        details: error.message
      }, { status: 401 });
    }
    
    if (error.message?.includes('quota') || error.message?.includes('QUOTA')) {
      return NextResponse.json({
        success: false,
        error: 'API quota exceeded. Please check your Google Cloud billing or wait until quota resets.',
        details: error.message
      }, { status: 429 });
    }
    
    if (error.message?.includes('invalid') && error.message?.includes('file')) {
      return NextResponse.json({
        success: false,
        error: 'File format may not be supported by Gemini. Try converting to a different format.',
        details: error.message
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: `File analysis failed: ${error.message}`,
      details: error.stack
    }, { status: 500 });
  }
}

// Handle GET requests (Kept exactly as requested)
export async function GET(request) {
  return NextResponse.json({ 
    message: 'Gemini AI Analysis API',
    status: 'active',
    model: MODEL_NAME,
    supportedFileTypes: Object.values(SUPPORTED_TYPES),
    maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
    endpoints: {
      textAnalysis: 'POST /api/analyze with JSON body {prompt: "your text"}',
      fileAnalysis: 'POST /api/analyze with multipart/form-data (file and optional prompt)'
    },
    exampleUsage: {
      curlText: 'curl -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d \'{"prompt":"Hello Gemini"}\'',
      curlFile: 'curl -X POST http://localhost:3000/api/analyze -F "file=@document.pdf" -F "prompt=Analyze this"'
    }
  }, { status: 200 });
}

// Handle OPTIONS for CORS (Kept exactly as requested)
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
}