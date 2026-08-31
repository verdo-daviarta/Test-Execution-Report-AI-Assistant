import React, { useState, useEffect } from 'react';
import { Bolt, CheckCircle, Circle, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface LoadingScreenProps {
  moduleName: string;
  hasScreenshot: boolean;
  onCancel: () => void;
}

export default function LoadingScreen({ moduleName, hasScreenshot, onCancel }: LoadingScreenProps) {
  const [progress, setProgress] = useState(15);
  const [currentStep, setCurrentStep] = useState(hasScreenshot ? 0 : 1); // 0: Analyze, 1: Detect, 2: Understand, 3: Scenarios, 4: Cases
  const [branchesFound, setBranchesFound] = useState(12);

  // Smoothly increment progress
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) return 98;
        // Slower increment near the end
        const step = prev < 50 ? 5 : prev < 80 ? 2 : 0.5;
        return prev + step;
      });
    }, 400);

    return () => clearInterval(progressInterval);
  }, []);

  // Cycle the steps dynamically to show continuous progress achievements
  useEffect(() => {
    const limits = [25, 45, 65, 85, 100];
    const stepInterval = setInterval(() => {
      setCurrentStep((prevStep) => {
        if (prevStep >= 4) return 4;
        return prevStep + 1;
      });
      // Increment mock branch states
      setBranchesFound((prev) => prev + Math.floor(Math.random() * 8) + 4);
    }, 2800);

    return () => clearInterval(stepInterval);
  }, []);

  // Formatted steps
  const steps = [
    { id: 0, label: 'Analyzing Screenshot', requireImage: true },
    { id: 1, label: 'Detecting UI Components', requireImage: false },
    { id: 2, label: 'Understanding Business Flow', requireImage: false },
    { id: 3, label: 'Generating Test Scenarios', requireImage: false },
    { id: 4, label: 'Generating Test Cases', requireImage: false },
  ];

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      
      {/* Centered card */}
      <div className="relative z-10 w-full max-w-[580px] p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center">
          
          {/* Animated Hero Spiner */}
          <div className="mb-6 relative">
            <div className="w-20 h-20 rounded-full border-4 border-slate-100 flex items-center justify-center bg-slate-50/50">
              <Sparkles className="text-blue-600 animate-pulse stroke-[2.5]" size={36} />
            </div>
            <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>

          {/* Titles */}
          <div className="text-center mb-6">
            <h2 className="font-sans font-bold text-xl text-slate-900 mb-1">
              Generating Test Execution Report
            </h2>
            <p className="text-xs text-slate-500 font-medium max-w-sm">
              Analyzing specification structure for <span className="text-blue-600 font-bold">"{moduleName}"</span> to design optimized system verification cases...
            </p>
          </div>

          {/* Main Progress Bar */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full mb-6 overflow-hidden relative">
            <div
              className="absolute left-0 top-0 h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]"></div>
            </div>
          </div>

          {/* Steps list rendering */}
          <div className="w-full space-y-3">
            {steps.map((step) => {
              // Skip screenshot step if no image was provided
              if (step.requireImage && !hasScreenshot) return null;

              const isCompleted = step.id < currentStep;
              const isActive = step.id === currentStep;

              let bgClass = 'bg-slate-50 border-slate-200/40 opacity-60';
              let textClass = 'text-slate-500 font-medium';
              let iconWidget = <Circle className="text-slate-400 stroke-[2]" size={18} />;
              let statusLabel = 'Pending';
              let statusColor = 'text-slate-400';

              if (isCompleted) {
                bgClass = 'bg-green-50 border-green-200/50';
                textClass = 'text-slate-900 font-bold';
                iconWidget = <CheckCircle className="text-green-600 fill-green-50" size={18} />;
                statusLabel = 'Complete';
                statusColor = 'text-green-600';
              } else if (isActive) {
                bgClass = 'bg-blue-50 border-blue-200/60 shadow-sm';
                textClass = 'text-blue-700 font-bold';
                iconWidget = <Loader2 className="text-blue-600 animate-spin" size={18} />;
                statusLabel = 'In Progress';
                statusColor = 'text-blue-600 animate-pulse';
              }

              return (
                <div
                  key={step.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${bgClass}`}
                >
                  <div className="flex items-center gap-3">
                    {iconWidget}
                    <span className={`text-xs ${textClass}`}>{step.label}</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>{statusLabel}</span>
                </div>
              );
            })}
          </div>

          {/* Time and cancel */}
          <div className="mt-6 pt-5 border-t border-slate-200 w-full flex items-center justify-center gap-4 text-xs font-semibold">
            <div className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Bolt size={14} className="animate-spin text-blue-600" />
              <span>Est. remaining: ~{Math.max(10, 35 - Math.floor(progress / 3))}s</span>
            </div>
            <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
            <button
              onClick={onCancel}
              className="text-red-600 hover:text-red-700 hover:underline cursor-pointer font-bold animate-pulse"
            >
              Cancel Process
            </button>
          </div>

        </div>
      </div>

      {/* Slide-in Float Status Indicator Toast, bottom-right */}
      <div className="fixed bottom-6 right-6 bg-white border border-slate-200 shadow-sm rounded-xl py-3 px-4 flex items-center gap-3 animate-bounce shrink-0 z-50">
        <div className="flex -space-x-1.5">
          <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] text-blue-600 font-bold ring-2 ring-white">AI</div>
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-white">✓</div>
        </div>
        <p className="font-sans text-xs text-slate-800 font-semibold">{branchesFound} logic branches mapped...</p>
      </div>

    </div>
  );
}
