
import React, { useState } from 'react';
import { analyzeResume } from './services/geminiService';
import { AnalysisResult, JobDetails } from './types';
import AnalysisDashboard from './components/AnalysisDashboard';

const App: React.FC = () => {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumePreview, setResumePreview] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<JobDetails>({
    title: '',
    company: '',
    description: '',
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Updated limit to 100MB
      if (file.size > 100 * 1024 * 1024) {
        setError("File size exceeds 100MB limit.");
        return;
      }
      
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError("Please upload a PDF or an image file.");
        return;
      }

      setResumeFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setResumePreview(reader.result as string);
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setJobDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleAnalyze = async () => {
    if (!resumePreview || !jobDetails.title || !jobDetails.description) {
      setError("Please complete all steps before analyzing.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const match = resumePreview.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new Error("Invalid file content format.");
      
      const mimeType = match[1];
      const base64Data = match[2];
      
      const result = await analyzeResume(base64Data, mimeType, jobDetails);
      setAnalysisResult(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setResumeFile(null);
    setResumePreview(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">R</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">ResumeAI</h1>
          </div>
          <span className="text-sm text-slate-400 font-medium hidden sm:inline">Advanced ATS Auditor</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-12">
        {!analysisResult ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl font-black text-slate-900 leading-tight">
                  Optimize your career path with <span className="text-blue-600 italic">AI precision</span>.
                </h2>
                <p className="text-lg text-slate-500">
                  Upload your resume and target job details to get instant feedback and high-impact suggestions.
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">01. Upload Document</label>
                  <div className={`relative border-2 border-dashed rounded-2xl p-10 transition-all flex flex-col items-center justify-center text-center ${resumeFile ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
                    <input type="file" accept="application/pdf, image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {resumeFile ? (
                      <div className="space-y-1">
                        <p className="font-bold text-blue-600 text-lg truncate max-w-md">{resumeFile.name}</p>
                        <p className="text-xs text-blue-400 font-bold uppercase">{(resumeFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-slate-600 font-bold">Select Resume (PDF or Image)</p>
                        <p className="text-slate-400 text-xs">Max size: 100MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">02. Targeting Details</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" name="title" placeholder="Target Job Title" value={jobDetails.title} onChange={handleInputChange} className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all" />
                    <input type="text" name="company" placeholder="Company" value={jobDetails.company} onChange={handleInputChange} className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                  <textarea name="description" rows={5} placeholder="Paste Job Description..." value={jobDetails.description} onChange={handleInputChange} className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all resize-none"></textarea>
                </div>

                {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">{error}</div>}

                <button onClick={handleAnalyze} disabled={isAnalyzing} className={`w-full py-5 rounded-2xl font-black text-white uppercase tracking-widest transition-all shadow-xl ${isAnalyzing ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200 active:scale-[0.98]'}`}>
                  {isAnalyzing ? "AI Processing..." : "Analyze Now"}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white h-fit">
                <h3 className="text-xl font-bold mb-6">Expert Feedback</h3>
                <div className="space-y-6 text-sm text-slate-400">
                  <div className="flex space-x-4">
                    <span className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center text-blue-400 font-bold shrink-0">1</span>
                    <p>Get an overall ATS compatibility score calculated by Gemini 3 Flash.</p>
                  </div>
                  <div className="flex space-x-4">
                    <span className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center text-blue-400 font-bold shrink-0">2</span>
                    <p>Identify missing industry keywords and specific role misalignments.</p>
                  </div>
                  <div className="flex space-x-4">
                    <span className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center text-blue-400 font-bold shrink-0">3</span>
                    <p>Receive an actionable improvement plan categorized by impact level.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <AnalysisDashboard result={analysisResult} onReset={resetAnalysis} />
        )}
      </main>
    </div>
  );
};

export default App;
