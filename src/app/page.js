// src/app/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // For redirection
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import ReactMarkdown from 'react-markdown';
import { 
  Upload, Send, FileText, Loader2, Sparkles, Bot, 
  CheckCircle, AlertCircle, Trash2, Copy, ChevronRight, LogOut
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // --- Auth Check ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        setLoadingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // ... (Keep your existing state variables: input, file, response, etc.) ...
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('text');
  
  // ... (Keep your samplePrompts and other helper functions exactly as they were) ...
  const samplePrompts = [
    "Analyze my resume and provide feedback",
    "Find mistakes and issues in my resume",
    "Suggest improvements to make my resume stronger",
    "Rate my resume out of 10 and explain why",
  ];

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true); setError(''); setResponse('');
    
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input })
      });
      const data = await res.json();
      if (data.success) setResponse(data.response);
      else setError(data.error);
    } catch (err) { setError('Failed to connect to server'); } 
    finally { setLoading(false); }
  };

  const handleFileSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true); setError(''); setResponse('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prompt', input || 'Analyze this resume'); // Send input as prompt if available
      
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) setResponse(data.response);
      else setError(data.error);
    } catch (err) { setError('Failed to upload file'); } 
    finally { setLoading(false); }
  };

  if (loadingAuth) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400"/></div>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-black rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">ResumeLens</h1>
            </div>
            
            <div className="flex items-center gap-4">
               <span className="text-sm text-gray-500 hidden md:block">{user?.email}</span>
               <button onClick={handleLogout} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" title="Sign Out">
                 <LogOut className="w-5 h-5" />
               </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Side: Input */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Tabs */}
            <div className="inline-flex p-1 bg-slate-100 rounded-lg">
              <button onClick={() => setActiveTab('text')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'text' ? 'bg-white text-black shadow-sm' : 'text-slate-500'}`}>Text Input</button>
              <button onClick={() => setActiveTab('file')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'file' ? 'bg-white text-black shadow-sm' : 'text-slate-500'}`}>Upload PDF</button>
            </div>

            {/* Input Area */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              {activeTab === 'text' ? (
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter job description or any other prompt..."
                  className="w-full h-64 p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-black/5 resize-none"
                />
              ) : (
                 <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center bg-slate-50/50">
                    <input type="file" id="file" className="hidden" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />
                    <label htmlFor="file" className="cursor-pointer flex flex-col items-center">
                      <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                        {file ? <CheckCircle className="text-green-500"/> : <Upload className="text-slate-400"/>}
                      </div>
                      <span className="font-medium text-slate-700">{file ? file.name : "Click to upload PDF"}</span>
                    </label>
                 </div>
              )}
              
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={activeTab === 'text' ? handleTextSubmit : handleFileSubmit}
                  disabled={loading}
                  className="bg-black text-white px-6 py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin"/>}
                  {loading ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
            </div>
            
            {/* Sample Prompts */}
            <div className="grid grid-cols-2 gap-3">
               {samplePrompts.map((p, i) => (
                 <button key={i} onClick={() => {setInput(p); setActiveTab('text')}} className="text-left p-3 text-sm bg-white border border-slate-200 rounded-xl hover:border-black/20 transition-colors text-slate-600">
                   {p}
                 </button>
               ))}
            </div>
          </div>

          {/* Right Side: Output */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[500px] flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-semibold flex items-center gap-2"><Bot className="w-5 h-5"/> Analysis</h2>
                {response && <button onClick={() => navigator.clipboard.writeText(response)}><Copy className="w-4 h-4 text-slate-400"/></button>}
              </div>
              <div className="p-6 flex-1 overflow-y-auto max-h-[600px] prose prose-sm prose-slate">
                {error ? <div className="text-red-500 bg-red-50 p-4 rounded-lg">{error}</div> : 
                 response ? <ReactMarkdown>{response}</ReactMarkdown> : 
                 <div className="h-full flex flex-col items-center justify-center text-slate-300">
                   <FileText className="w-12 h-12 mb-2"/>
                   <p>Results appear here</p>
                 </div>
                }
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}