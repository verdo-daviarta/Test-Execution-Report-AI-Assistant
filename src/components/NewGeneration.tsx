import React, { useState, useRef } from 'react';
import { Upload, HelpCircle, Lightbulb, Sparkles, Check, Image as ImageIcon, Trash2, BookOpen, Layers } from 'lucide-react';

interface NewGenerationProps {
  onGenerate: (data: {
    moduleName: string;
    provider: 'openai' | 'gemini';
    requirement: string;
    businessRules: string;
    coverages: string[];
    screenshot: string | null;
  }) => void;
}

export default function NewGeneration({ onGenerate }: NewGenerationProps) {
  const [moduleName, setModuleName] = useState('');
  const [provider, setProvider] = useState<'openai' | 'gemini'>('openai');
  const [requirement, setRequirement] = useState('');
  const [businessRules, setBusinessRules] = useState('');
  const [coverages, setCoverages] = useState<string[]>(['Positive', 'Negative']);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCoverage = (type: string) => {
    if (coverages.includes(type)) {
      setCoverages(coverages.filter((c) => c !== type));
    } else {
      setCoverages([...coverages, type]);
    }
  };

  // Convert and resize files before sending them to the server.
  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('File must be an image (PNG or JPG).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Max image size is 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const source = e.target?.result;
      if (!source) return;
      const image = new Image();
      image.onload = () => {
        const maxWidth = 1600;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        setScreenshot(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = source as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const removeScreenshot = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScreenshot(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const loadTemplate = () => {
    setModuleName('Checkout API Payment Gateway');
    setRequirement('User completes the purchase by adding cart items, selecting standard shipping, entering Stripe trial credit card credentials, and submitting. Secure webhook processing updates status field to "paid" and triggers an automatic invoice email.');
    setBusinessRules('1. Standard shipping is free for orders > $50.\n2. Decline payment if Stripe returns error_code: card_declined.\n3. Keep connection timeouts under 5 seconds.');
    setCoverages(['Positive', 'Negative', 'Validation', 'Boundary']);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleName.trim()) {
      setErrorStatus('Please fulfill the Module Name field.');
      return;
    }
    setErrorStatus(null);
    onGenerate({
      moduleName,
      provider,
      requirement,
      businessRules,
      coverages,
      screenshot,
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-10 py-10">
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="font-sans font-bold text-3xl text-slate-900 leading-tight flex items-center gap-2">
          Generate SIT Test Case
        </h1>
        <p className="font-sans text-slate-500 text-sm mt-1">
          Upload screenshots and define requirements to generate structured test procedures effortlessly using advanced AI testing models.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-8">
        {/* Left Column: Form Fields */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">
            
            {/* Error alerts */}
            {errorStatus && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 font-semibold font-sans">
                {errorStatus}
              </div>
            )}

            {/* Module Name */}
            <div className="space-y-1.5 bg-white">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Module Name</label>
              <input
                type="text"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 text-sm font-medium bg-slate-50/30"
                placeholder="e.g. User Authentication, Payment Gateway"
              />
            </div>

            {/* AI Provider */}
            <div className="space-y-1.5">
              <label htmlFor="ai-provider" className="block text-xs font-bold text-slate-500 uppercase tracking-widest">AI Provider</label>
              <select
                id="ai-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as 'openai' | 'gemini')}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 text-sm font-medium bg-slate-50/30"
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
              </select>
              <p className="text-[11px] text-slate-400">Pilih provider yang memiliki kuota/API key aktif.</p>
            </div>

            {/* Requirement */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Requirement</label>
              <textarea
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 text-sm font-medium resize-none bg-slate-50/30"
                placeholder="Paste the functional specifications, requirements or user stories here..."
              />
            </div>

            {/* Business Rules */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Business Rules</label>
              <textarea
                value={businessRules}
                onChange={(e) => setBusinessRules(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 text-sm font-medium resize-none bg-slate-50/30"
                placeholder="Specific constraints, error codes, limits or validation logic..."
              />
            </div>

            {/* Coverage Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Coverage Selection</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['Positive', 'Negative', 'Validation', 'Boundary'].map((item) => {
                  const isChecked = coverages.includes(item);
                  return (
                    <label
                      key={item}
                      onClick={() => toggleCoverage(item)}
                      className={`flex items-center gap-3 p-3.5 border rounded-lg cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'border-blue-500 bg-blue-50/50 text-blue-700 font-semibold shadow-sm shadow-blue-50'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border text-white transition-all ${
                          isChecked
                            ? 'border-blue-600 bg-blue-600 shadow-sm'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check size={12} className="stroke-[3]" />}
                      </div>
                      <span className="text-xs">{item}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Trigger button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-sm shadow-blue-100 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Sparkles size={16} className="fill-white" />
              <span>Generate Test Scenarios</span>
            </button>
          </div>
        </div>

        {/* Right Column: Upload screen and tips */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          
          {/* Drop Zone Box */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer group relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[300px] ${
              dragActive
                ? 'border-blue-500 bg-blue-50/40'
                : screenshot
                ? 'border-slate-200 bg-white hover:border-blue-400'
                : 'border-slate-200 bg-slate-50/50 hover:border-blue-500 hover:bg-blue-50/20'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            {screenshot ? (
              <div className="space-y-4 w-full">
                <div className="relative mx-auto max-w-[200px] max-h-[160px] rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                  <img src={screenshot} alt="Visual Screenshot Upload" className="w-full h-full object-contain" />
                  <button
                    onClick={removeScreenshot}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-colors z-20"
                    title="Remove Image"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div>
                  <h3 className="font-sans text-xs font-bold text-slate-800">Screenshot successfully attached</h3>
                  <p className="font-sans text-[11px] text-slate-500 mt-1">Click or drop another layout to substitute</p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 mb-4 bg-white rounded-xl shadow-xs border border-slate-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform duration-300">
                  <Upload size={24} />
                </div>
                <h3 className="font-sans font-bold text-slate-800 text-sm mb-1">Drop your UI screenshot here</h3>
                <p className="font-sans text-xs text-slate-500 mb-6 max-w-xs mx-auto leading-relaxed">
                  Provide a page layout mockup or system interface to help our AI analyze labels, values, and flow hierarchy.
                </p>
                <span className="bg-white border border-slate-200 hover:bg-slate-50 text-xs text-slate-800 px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm cursor-pointer">
                  Browse Files
                </span>
                
                <div className="mt-6 pt-5 border-t border-slate-100 w-full flex justify-center gap-6 text-slate-400 text-[10px] font-mono">
                  <span className="flex items-center gap-1"><Check size={12} className="text-green-600" /> PNG, JPG</span>
                  <span className="flex items-center gap-1"><Check size={12} className="text-green-600" /> Max 10MB</span>
                </div>
              </>
            )}
          </div>

          {/* Tips box */}
          <div className="bg-slate-100/80 rounded-xl p-5 border border-slate-200 relative overflow-hidden">
            <h4 className="font-sans font-bold text-xs text-slate-900 mb-4 flex items-center gap-2">
              <Lightbulb size={16} className="text-blue-600" />
              <span>Pro Tips for Generation</span>
            </h4>
            <ul className="space-y-3 font-sans text-xs text-slate-600 leading-relaxed">
              <li className="flex gap-2">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-[10px] text-blue-700 font-bold shrink-0">1</div>
                <p>High-resolution screenshots with visible labels index significantly better.</p>
              </li>
              <li className="flex gap-2">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-[10px] text-blue-700 font-bold shrink-0">2</div>
                <p>Specifying failure criteria under Business Rules automatically enhances Negative scenario cases.</p>
              </li>
              <li className="flex gap-2">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-[10px] text-blue-700 font-bold shrink-0">3</div>
                <p>Include multi-browser constraints if responsive scaling tests are necessary.</p>
              </li>
            </ul>
          </div>

          {/* Quick Shortcuts */}
          <div className="space-y-3">
            <h4 className="font-sans text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Shortcuts</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={loadTemplate}
                className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-xs hover:border-blue-400 transition-all text-left flex flex-col gap-2 group cursor-pointer"
              >
                <BookOpen size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                <span className="text-xs font-bold text-slate-800">Load Template</span>
                <span className="text-[10px] text-slate-400">Checkout Flow specs</span>
              </button>
              
              <button
                type="button"
                onClick={() => alert(`SIT Export Guide:\n- Download Scenarios in CSV / Excel format using the Result Editor.\n- Share details with team developers directly.`)}
                className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-xs hover:border-blue-400 transition-all text-left flex flex-col gap-2 group cursor-pointer"
              >
                <Layers size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                <span className="text-xs font-bold text-slate-800">Export Guide</span>
                <span className="text-[10px] text-slate-400">Format specifications</span>
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
