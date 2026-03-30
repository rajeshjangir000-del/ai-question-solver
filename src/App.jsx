import React, { useState, useRef, useEffect } from 'react';
import { Camera, UploadCloud, Sparkles, BookOpen, RefreshCw, ChevronRight, X, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const LEVELS = ['Class IX', 'Class X', 'Class XI', 'Class XII', 'IIT JEE', 'NEET'];
const SUBJECTS_MAP = {
  'Class IX': ['Physics', 'Chemistry', 'Maths', 'Biology'],
  'Class X': ['Physics', 'Chemistry', 'Maths', 'Biology'],
  'Class XI': ['Physics', 'Chemistry', 'Maths', 'Biology'],
  'Class XII': ['Physics', 'Chemistry', 'Maths', 'Biology'],
  'IIT JEE': ['Physics', 'Chemistry', 'Maths'],
  'NEET': ['Physics', 'Chemistry', 'Biology'],
};

export default function App() {
  const [level, setLevel] = useState('');
  const [subject, setSubject] = useState('');
  
  // Image states
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMimeType, setImageMimeType] = useState(null);
  
  // Cropper states
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  
  // App states
  const [isLoading, setIsLoading] = useState(false);
  const [solution, setSolution] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Refs
  const uploadInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const endRef = useRef(null);
  const imageRef = useRef(null);

  // Auto scroll to bottom when solution updates
  useEffect(() => {
    if (solution && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [solution]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        const base64str = reader.result.split(',')[1];
        setImageBase64(base64str);
        setImageMimeType(file.type);
        
        // Enter cropping flow
        setIsCropping(true);
        setCrop(undefined);
        setCompletedCrop(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImage = () => {
    if (!completedCrop || !imageRef.current || !completedCrop.width || !completedCrop.height) {
      return null;
    }
    const canvas = document.createElement('canvas');
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height;
    
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(
      imageRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );
    
    return canvas.toDataURL(imageMimeType || 'image/jpeg');
  };

  const applyCrop = () => {
    const croppedDataUrl = getCroppedImage();
    if (croppedDataUrl) {
      setImagePreview(croppedDataUrl);
      setImageBase64(croppedDataUrl.split(',')[1]);
      setIsCropping(false);
    }
  };

  const skipCropping = () => {
    setIsCropping(false);
  };

  const handleSolve = async () => {
    if (!level || !subject || !imageBase64) return;
    setIsLoading(true);
    setSolution('');
    setErrorMessage('');
    
    const prompt = `Act as an expert, encouraging tutor. First, automatically detect the language of the problem presented in this image (for example, English or Hindi). You must provide your entire step-by-step solution and explanation in that exact same language. Solve the problem specifically tailored for a student studying at the ${level} level in ${subject}. Break down complex concepts so they are easy to understand. Format math equations using standard markdown.`;
    
    try {
      const payload = {
        imageBase64: imageBase64,
        imageMimeType: imageMimeType,
        prompt: prompt
      };

      const response = await fetch('/api/solve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to solve problem on the backend.");
      }

      if (data.warning) {
        setErrorMessage(data.warning);
      }
      
      setSolution(data.solution);

    } catch (error) {
      console.error("Error connecting to solving API:", error);
      setErrorMessage(`Proxy Error: ${error.message}`);
      setSolution("Oops! Both the primary and fallback AI models failed or the server is down. Please verify your backend server is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetAll = () => {
    setLevel('');
    setSubject('');
    resetCapture();
  };

  const resetCapture = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
    setIsCropping(false);
    setCrop(undefined);
    setCompletedCrop(null);
    setSolution('');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex justify-center text-slate-800">
      <div className="max-w-3xl w-full p-4 md:p-6 space-y-5 md:space-y-6 pb-32">
        {/* Header */}
        <header className="text-center pt-2 pb-1">
          <div className="inline-flex items-center justify-center p-2 bg-indigo-100 rounded-full mb-2 ring-4 ring-indigo-50">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mb-1.5">
            AI Question Solver
          </h1>
          <p className="text-sm md:text-base text-slate-500 max-w-lg mx-auto">
            Snap a picture of your homework and get detailed, step-by-step explanations instantly.
          </p>
        </header>

        {/* Configuration Phase */}
        <section className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm rounded-3xl p-6 md:p-8 transition-all">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            1. Setup Your Profile
          </h2>
          
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Select Level</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {LEVELS.map(l => (
                  <button
                    key={l}
                    onClick={() => {
                      setLevel(l);
                      if (!SUBJECTS_MAP[l].includes(subject)) setSubject('');
                    }}
                    className={`px-4 py-3 rounded-xl border-2 transition-all font-medium text-sm sm:text-base ${
                      level === l 
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' 
                        : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {level && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <p className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Select Subject</p>
                <div className="grid grid-cols-2 gap-3">
                  {SUBJECTS_MAP[level].map(s => (
                    <button
                      key={s}
                      onClick={() => setSubject(s)}
                      className={`px-4 py-3 rounded-xl border-2 transition-all font-medium text-sm sm:text-base flex items-center justify-center gap-2 ${
                        subject === s 
                          ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' 
                          : 'border-slate-200 hover:border-purple-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Capture Phase */}
        {level && subject && (
          <section className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm rounded-3xl p-6 md:p-8 animate-in fade-in slide-in-from-top-8 duration-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-500" />
                2. Capture Problem
              </h2>
              {imagePreview && (
                <button 
                  onClick={resetCapture}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 rounded-full hover:bg-slate-100 text-sm font-medium"
                  title="Clear Image"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>

            {!imagePreview ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={uploadInputRef} 
                  onChange={handleImageChange}
                />
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                  ref={cameraInputRef} 
                  onChange={handleImageChange}
                />
                
                <button 
                  onClick={() => uploadInputRef.current?.click()}
                  className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-slate-500 hover:text-indigo-600"
                >
                  <UploadCloud className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">Upload Photo</span>
                  <span className="text-xs mt-1 text-slate-400">Browse your files</span>
                </button>

                <button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-slate-500 hover:text-indigo-600"
                >
                  <Camera className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">Use Camera</span>
                  <span className="text-xs mt-1 text-slate-400">Take a picture</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                
                {isCropping ? (
                  // Cropping Interface
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 px-4 py-3 rounded-xl flex items-center gap-3">
                      <div className="bg-white p-1.5 rounded-lg shadow-sm">
                        <Camera className="w-4 h-4 text-indigo-500" />
                      </div>
                      <p className="text-sm font-medium">Draw a box around the specific problem you want solved to help the AI focus.</p>
                    </div>
                    
                    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-200 p-2 flex justify-center items-center group relative min-h-[200px]">
                      <ReactCrop 
                        crop={crop} 
                        onChange={c => setCrop(c)} 
                        onComplete={c => setCompletedCrop(c)}
                        className="max-h-[60vh]"
                      >
                        <img 
                          ref={imageRef}
                          src={imagePreview} 
                          alt="Crop Preview" 
                          className="w-auto h-auto object-contain max-h-[60vh] rounded-md"
                          onLoad={(e) => { imageRef.current = e.currentTarget; }}
                        />
                      </ReactCrop>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-2">
                       <button 
                         onClick={applyCrop}
                         disabled={!completedCrop?.width || !completedCrop?.height}
                         className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 px-6 rounded-xl font-semibold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg flex justify-center items-center gap-2"
                       >
                         Apply Crop
                       </button>
                       <button 
                         onClick={skipCropping}
                         className="flex-1 bg-white hover:bg-slate-50 text-slate-700 py-3.5 px-6 rounded-xl font-medium transition-all shadow-sm border border-slate-200"
                       >
                         Skip Cropping (Use Original)
                       </button>
                    </div>
                  </div>
                ) : (
                  // Final Confirmation State
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <div className="relative rounded-2xl overflow-hidden shadow-inner border border-slate-200 bg-slate-100 group flex justify-center p-4">
                      <img 
                        src={imagePreview} 
                        alt="Problem Preview Final" 
                        className="w-auto h-auto max-h-[400px] object-contain rounded-lg shadow-sm bg-white"
                      />
                      {!isLoading && !solution && (
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            onClick={() => {
                              // If they want to retake, reset cropper and preview
                              setIsCropping(true);
                            }} 
                            className="bg-white/20 backdrop-blur-md text-white px-5 py-2.5 rounded-full font-medium hover:bg-white/30 transition-colors shadow-lg"
                          >
                            Recrop File
                          </button>
                        </div>
                      )}
                    </div>

                    {!solution && (
                      <button 
                        onClick={handleSolve}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white p-4.5 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-slate-900/20 hover:shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-6 h-6 animate-spin" />
                            Analyzing with AI...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-6 h-6" />
                            Solve with AI
                            <span className="absolute inset-0 bg-white/20 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500 ease-out" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Results Phase */}
        {solution && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-500">
            {errorMessage && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
                <div className="mt-0.5">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1 text-sm font-medium">
                  {errorMessage}
                </div>
              </div>
            )}
            
            <section className="bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-3xl p-6 md:p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                <Sparkles className="w-6 h-6 text-indigo-500" />
                Step-by-Step Solution
              </h2>
              
              <div className="prose prose-slate prose-lg max-w-none hover:prose-a:text-indigo-500">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {solution}
                </ReactMarkdown>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end" ref={endRef}>
                <button 
                  onClick={resetAll}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  Solve Another Question
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
