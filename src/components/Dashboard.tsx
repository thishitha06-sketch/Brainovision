import React, { useState, useEffect, useRef } from 'react';
import {
  User, Plus, Edit3, LogOut, FileText, Upload, Brain, Activity,
  MessageSquare, History, Sparkles, AlertCircle, CheckCircle2,
  TrendingUp, Calendar, Heart, ArrowRight, BookOpen, UserCheck, ChevronDown, Trash2, Shield, Leaf
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Profile, Report, Analysis, TimelineEvent, NutrientItem, ChatMessage } from '../types';

interface DashboardProps {
  user: { id: number; email: string };
  initialProfile: Profile;
  token: string;
  onLogout: () => void;
  onEditProfile: (profile: Profile) => void;
  onAddProfile: () => void;
}

type TabType = 'overview' | 'analyzer' | 'chat' | 'nutrients' | 'timeline';

export default function Dashboard({
  user,
  initialProfile,
  token,
  onLogout,
  onEditProfile,
  onAddProfile
}: DashboardProps) {
  // Navigation & State
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [profiles, setProfiles] = useState<Profile[]>([initialProfile]);
  const [activeProfile, setActiveProfile] = useState<Profile>(initialProfile);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Loaded History Package
  const [reports, setReports] = useState<Report[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [nutrients, setNutrients] = useState<NutrientItem[]>([]);
  const [healthScores, setHealthScores] = useState<{ score: number; calculated_at: string }[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Interactivity States
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  
  // Selected Report for Details view
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);

  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch all profiles for dropdown
  const loadProfiles = async () => {
    try {
      const res = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.profiles) {
        setProfiles(data.profiles);
        // Sync active profile with fresh database data
        const currentActive = data.profiles.find((p: Profile) => p.id === activeProfile.id);
        if (currentActive) {
          setActiveProfile(currentActive);
        }
      }
    } catch (err) {
      console.error('Error fetching profiles', err);
    }
  };

  // Fetch full records history package
  const loadHistoryPackage = async (profileId: number) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/history?profileId=${profileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setReports(data.reports || []);
        setAnalyses(data.analyses || []);
        setTimeline(data.timeline || []);
        setNutrients(data.dailyNutrients || []);
        setHealthScores(data.healthScores || []);
        setChatHistory(data.chatHistory || []);

        // Auto-select latest analysis if any exists
        if (data.analyses && data.analyses.length > 0) {
          setSelectedAnalysis(data.analyses[0]);
        } else {
          setSelectedAnalysis(null);
        }
      }
    } catch (err) {
      console.error('Error compiling history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadProfiles();
    loadHistoryPackage(activeProfile.id);
  }, [activeProfile.id]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleProfileSwitch = (prof: Profile) => {
    setActiveProfile(prof);
    setShowProfileDropdown(false);
    setActiveTab('overview');
  };

  // Multer Report File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadSuccess('');
    setUploadError('');

    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('profileId', activeProfile.id.toString());

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setUploadSuccess(`"${files[0].name}" uploaded successfully! You can now analyze it.`);
      loadHistoryPackage(activeProfile.id);
      
      // Select analyzer tab
      setActiveTab('analyzer');
    } catch (err: any) {
      setUploadError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  // AI Gemini Clinical Analysis Handler
  const handleAnalyzeReport = async (reportId: number) => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/report/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reportId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');

      // Refresh data
      await loadHistoryPackage(activeProfile.id);
      setUploadSuccess('Clinical AI analysis compiled successfully!');
    } catch (err: any) {
      alert(err.message || 'Gemini analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  // AI Health Chat Session Handler
  const handleSendChatMessage = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const msg = customMsg || chatInput;
    if (!msg.trim()) return;

    const userMsg: ChatMessage = { role: 'user', message: msg };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          profileId: activeProfile.id,
          message: msg
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to chat');

      setChatHistory(prev => [...prev, { role: 'assistant', message: data.reply }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: 'assistant', message: 'Error: ' + err.message }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper: BMI color coding
  const getBmiStatus = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-amber-600 bg-amber-50' };
    if (bmi < 24.9) return { label: 'Healthy', color: 'text-emerald-700 bg-emerald-50 border border-emerald-200' };
    if (bmi < 29.9) return { label: 'Overweight', color: 'text-amber-600 bg-amber-50' };
    return { label: 'Obese', color: 'text-rose-600 bg-rose-50' };
  };

  // Extract critical biomarker alerts
  const activeAlerts = analyses.flatMap(a => a.biomarkers).filter(b => b.status === 'Critical' || b.status === 'High' || b.status === 'Low');

  // Chart data matching
  const scoreTrendData = healthScores.map(hs => ({
    date: hs.calculated_at ? hs.calculated_at.split('T')[0] : 'N/A',
    Score: hs.score
  }));

  return (
    <div className="min-h-screen bg-[#FBF9F6] flex flex-col md:flex-row text-stone-800">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-white border-r border-stone-200/60 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-900 rounded-full flex items-center justify-center text-white">
              <Leaf className="w-4 h-4" />
            </div>
            <span className="text-xl font-medium tracking-tight text-emerald-950">Nirva Portal</span>
          </div>

          {/* User Email & Profile Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="w-full bg-[#FBF9F6] border border-stone-200 rounded-2xl p-4 text-left flex items-center justify-between hover:border-emerald-800 transition-all cursor-pointer"
              id="profile-dropdown-trigger"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-900/10 text-emerald-900 rounded-full flex items-center justify-center font-bold text-sm">
                  {activeProfile.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs text-stone-500 font-medium">Active Member</p>
                  <p className="font-semibold text-stone-800 text-sm truncate">{activeProfile.name}</p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-stone-400" />
            </button>

            {showProfileDropdown && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl border border-stone-200 shadow-xl z-30 p-2 space-y-1">
                <p className="text-[10px] text-stone-400 font-semibold px-3 py-1 uppercase tracking-wider">Switch Family Member</p>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {profiles.map(prof => (
                    <button
                      key={prof.id}
                      onClick={() => handleProfileSwitch(prof)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between hover:bg-stone-50 cursor-pointer ${prof.id === activeProfile.id ? 'text-emerald-900 bg-emerald-50/50' : 'text-stone-600'}`}
                    >
                      <span className="truncate">{prof.name}</span>
                      {prof.id === activeProfile.id && <UserCheck className="w-4 h-4 text-emerald-900" />}
                    </button>
                  ))}
                </div>
                <div className="border-t border-stone-100 pt-1.5 mt-1.5 space-y-0.5">
                  <button
                    onClick={() => { onEditProfile(activeProfile); setShowProfileDropdown(false); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                    id="edit-profile-btn"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Biometrics
                  </button>
                  <button
                    onClick={() => { onAddProfile(); setShowProfileDropdown(false); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-emerald-900 hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                    id="add-family-btn"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Family Member
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Nav Tabs */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all text-sm cursor-pointer ${activeTab === 'overview' ? 'bg-emerald-900 text-[#FBF9F6]' : 'text-stone-600 hover:bg-stone-50'}`}
              id="nav-overview"
            >
              <TrendingUp className="w-4 h-4" /> Overview &amp; Trends
            </button>
            <button
              onClick={() => setActiveTab('analyzer')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all text-sm cursor-pointer ${activeTab === 'analyzer' ? 'bg-emerald-900 text-[#FBF9F6]' : 'text-stone-600 hover:bg-stone-50'}`}
              id="nav-analyzer"
            >
              <FileText className="w-4 h-4" /> AI Report Analyzer
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all text-sm cursor-pointer ${activeTab === 'chat' ? 'bg-emerald-900 text-[#FBF9F6]' : 'text-stone-600 hover:bg-stone-50'}`}
              id="nav-chat"
            >
              <MessageSquare className="w-4 h-4" /> AI Health Chat
            </button>
            <button
              onClick={() => setActiveTab('nutrients')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all text-sm cursor-pointer ${activeTab === 'nutrients' ? 'bg-emerald-900 text-[#FBF9F6]' : 'text-stone-600 hover:bg-stone-50'}`}
              id="nav-nutrients"
            >
              <Activity className="w-4 h-4" /> Personal Nutrients
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all text-sm cursor-pointer ${activeTab === 'timeline' ? 'bg-emerald-900 text-[#FBF9F6]' : 'text-stone-600 hover:bg-stone-50'}`}
              id="nav-timeline"
            >
              <History className="w-4 h-4" /> History &amp; Timeline
            </button>
          </nav>
        </div>

        {/* Bottom logout section */}
        <div className="pt-6 border-t border-stone-200/60">
          <p className="text-xs text-stone-400 font-medium truncate mb-2">{user.email}</p>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            id="nav-logout"
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
      </aside>

      {/* MAIN BODY WORKSPACE */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-h-screen">
        
        {/* Banner notification block */}
        {(uploadSuccess || uploadError) && (
          <div className={`p-4 mb-6 rounded-2xl border flex items-center justify-between text-sm ${uploadError ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`} id="system-notif">
            <span>{uploadError || uploadSuccess}</span>
            <button onClick={() => { setUploadSuccess(''); setUploadError(''); }} className="text-stone-400 hover:text-stone-800 font-bold ml-4">✕</button>
          </div>
        )}

        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-900/30 border-t-emerald-900 rounded-full animate-spin"></div>
            <p className="text-stone-500 font-medium">Syncing clinical records from SQLite...</p>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-8" id="tab-overview-content">
                
                {/* Header Welcome Card */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-white p-8 rounded-3xl border border-stone-200/50 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-2xl opacity-60"></div>
                  <div>
                    <h1 className="text-3xl font-serif text-emerald-950 font-medium">Welcome back, {activeProfile.name}</h1>
                    <p className="text-stone-500 mt-1 max-w-xl">
                      Your diagnostic tracking console is hydrated from SQLite database. Below are your dynamic overall scores, alerts, and nutrient guidelines.
                    </p>
                    <div className="flex flex-wrap gap-4 mt-4">
                      <div className="px-3.5 py-1.5 bg-[#FBF9F6] border border-stone-200/80 rounded-xl text-xs font-semibold text-stone-600">
                        Age: <span className="text-stone-800 font-bold">{activeProfile.age}y</span>
                      </div>
                      <div className="px-3.5 py-1.5 bg-[#FBF9F6] border border-stone-200/80 rounded-xl text-xs font-semibold text-stone-600">
                        Height: <span className="text-stone-800 font-bold">{activeProfile.height}cm</span>
                      </div>
                      <div className="px-3.5 py-1.5 bg-[#FBF9F6] border border-stone-200/80 rounded-xl text-xs font-semibold text-stone-600">
                        Weight: <span className="text-stone-800 font-bold">{activeProfile.weight}kg</span>
                      </div>
                      {activeProfile.pregnancy_status !== 'none' && (
                        <div className="px-3.5 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 capitalize">
                          Status: <span className="font-bold">{activeProfile.pregnancy_status}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Quick Access */}
                  <div className="shrink-0 flex flex-col items-center p-4 border border-emerald-900/10 bg-emerald-50/20 rounded-2xl w-full lg:w-64">
                    <p className="text-xs text-stone-500 font-medium mb-3">Upload Medical Report (PDF/Image)</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".pdf,.png,.jpg,.jpeg,.txt"
                      className="hidden"
                      id="upload-file-picker"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full bg-emerald-900 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-800 flex items-center justify-center gap-2 text-sm shadow-md cursor-pointer"
                      id="upload-file-btn"
                    >
                      <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Report'}
                    </button>
                  </div>
                </div>

                {/* Score & Alert Grid */}
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Health Score Gauge */}
                  <div className="bg-white p-8 rounded-3xl border border-stone-200/50 shadow-sm flex flex-col items-center justify-center text-center">
                    <p className="text-sm text-stone-500 font-medium uppercase tracking-wider mb-4">Overall Health Score</p>
                    
                    <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                      {/* Radial indicator */}
                      <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="80" cy="80" r="70" className="stroke-stone-100 fill-none" strokeWidth="12" />
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          className="stroke-emerald-800 fill-none transition-all duration-1000"
                          strokeWidth="12"
                          strokeDasharray="440"
                          strokeDashoffset={440 - (440 * (healthScores[healthScores.length - 1]?.score || 80)) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="text-5xl font-serif font-bold text-emerald-950">
                        {healthScores[healthScores.length - 1]?.score || 80}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-emerald-900">
                      {healthScores[healthScores.length - 1]?.notes || 'Profile baseline score.'}
                    </p>
                  </div>

                  {/* BMI Widget */}
                  <div className="bg-white p-8 rounded-3xl border border-stone-200/50 shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="text-sm text-stone-500 font-medium uppercase tracking-wider mb-2">Body Mass Index (BMI)</p>
                      {activeProfile.height && activeProfile.weight ? (
                        (() => {
                          const hM = activeProfile.height / 100;
                          const bmiVal = Number((activeProfile.weight / (hM * hM)).toFixed(1));
                          const stat = getBmiStatus(bmiVal);
                          return (
                            <div className="space-y-4">
                              <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-serif font-semibold text-stone-800">{bmiVal}</span>
                                <span className="text-sm text-stone-500">kg/m²</span>
                              </div>
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${stat.color}`}>
                                {stat.label}
                              </span>
                              <p className="text-xs text-stone-500 leading-relaxed pt-2">
                                Healthy weight parameters range between 18.5 and 24.9. Adjust metrics under profile details if out of date.
                              </p>
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-sm text-stone-500">Incomplete parameters.</p>
                      )}
                    </div>
                  </div>

                  {/* Active Alerts Widget */}
                  <div className="bg-white p-8 rounded-3xl border border-stone-200/50 shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="text-sm text-stone-500 font-medium uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-500" /> Active Biomarker Alerts
                      </p>
                      
                      {activeAlerts.length > 0 ? (
                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                          {activeAlerts.slice(0, 5).map((alert, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                              <span className="text-xs font-semibold text-stone-800 truncate">{alert.name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${alert.status === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                {alert.value} ({alert.status})
                              </span>
                            </div>
                          ))}
                          {activeAlerts.length > 5 && (
                            <p className="text-[11px] text-stone-400 text-center font-medium mt-1">
                              + {activeAlerts.length - 5} more alert(s). See Report Analyzer tab.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center py-6">
                          <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-2" />
                          <p className="text-xs text-stone-600 font-medium">All biomarkers within normal bounds.</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setActiveTab('analyzer')}
                      className="text-xs font-semibold text-emerald-900 hover:underline flex items-center gap-1 mt-4"
                    >
                      View analyzer dossiers <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* History Score Chart Recharts & Timeline Split */}
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Historical Trends Recharts */}
                  <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-stone-200/50 shadow-sm">
                    <p className="text-sm text-stone-500 font-medium uppercase tracking-wider mb-6">Historical Health Score Trends</p>
                    
                    <div className="h-64 w-full">
                      {scoreTrendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={scoreTrendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                            <XAxis dataKey="date" stroke="#a8a29e" fontSize={10} />
                            <YAxis domain={[50, 100]} stroke="#a8a29e" fontSize={10} />
                            <Tooltip contentStyle={{ background: '#FBF9F6', borderRadius: '12px', border: '1px solid #e7e5e4' }} />
                            <Line type="monotone" dataKey="Score" stroke="#064e3b" strokeWidth={3} activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-stone-400 text-sm">
                          Insufficient timeline scores to map. Upload a report to start charting.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick timeline recap */}
                  <div className="bg-white p-8 rounded-3xl border border-stone-200/50 shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="text-sm text-stone-500 font-medium uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-emerald-800" /> Recent Timeline
                      </p>
                      
                      <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
                        {timeline.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="relative pl-4 border-l-2 border-stone-200 space-y-1">
                            <span className="text-[10px] text-stone-400 font-medium">{item.event_date}</span>
                            <h4 className="text-xs font-semibold text-stone-800">{item.title}</h4>
                            <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">{item.description}</p>
                          </div>
                        ))}
                        {timeline.length === 0 && (
                          <p className="text-xs text-stone-400 text-center py-6">Timeline is clear.</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab('timeline')}
                      className="text-xs font-semibold text-emerald-900 hover:underline flex items-center gap-1 mt-4"
                    >
                      Browse full logs <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* AI REPORT ANALYZER TAB */}
            {activeTab === 'analyzer' && (
              <div className="space-y-8" id="tab-analyzer-content">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-serif text-emerald-950 font-medium">Diagnostic Report Analyzer</h2>
                    <p className="text-stone-500 text-sm mt-1">
                      Upload lab tests (scanned PDF, image, blood reports) to perform deep OCR extraction and clinical lifestyle recommendations.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".pdf,.png,.jpg,.jpeg,.txt"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="bg-emerald-900 text-[#FBF9F6] py-3 px-6 rounded-full font-medium hover:bg-emerald-800 transition-all flex items-center gap-2 cursor-pointer shadow"
                    >
                      <Upload className="w-4 h-4" /> Upload Document
                    </button>
                  </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                  {/* LEFT: Uploaded Reports Catalog */}
                  <div className="bg-white p-6 rounded-3xl border border-stone-200/50 shadow-sm space-y-4">
                    <h3 className="font-serif font-medium text-stone-800 text-lg border-b border-stone-100 pb-2">Uploaded Files ({reports.length})</h3>
                    
                    {reports.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {reports.map((rep) => {
                          const isAnalyzed = analyses.some(a => a.report_id === rep.id);
                          const reportAnalysis = analyses.find(a => a.report_id === rep.id);
                          return (
                            <div
                              key={rep.id}
                              onClick={() => {
                                if (isAnalyzed && reportAnalysis) setSelectedAnalysis(reportAnalysis);
                              }}
                              className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${selectedAnalysis?.report_id === rep.id ? 'border-emerald-800 bg-emerald-50/20' : 'border-stone-200/60 hover:bg-stone-50'}`}
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="w-8 h-8 text-stone-400 shrink-0" />
                                <div className="truncate flex-1">
                                  <p className="text-xs text-stone-500">{rep.uploaded_at.split('T')[0]}</p>
                                  <p className="text-sm font-semibold text-stone-800 truncate">{rep.file_name}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-stone-100/50">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAnalyzed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {isAnalyzed ? 'AI Analyzed' : 'Awaiting Analysis'}
                                </span>
                                
                                {!isAnalyzed && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAnalyzeReport(rep.id);
                                    }}
                                    disabled={analyzing}
                                    className="text-xs bg-emerald-900 text-white font-semibold py-1 px-3 rounded-lg hover:bg-emerald-800 cursor-pointer"
                                  >
                                    {analyzing ? 'AI Parsing...' : 'Run Analysis'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-stone-400">
                        <Upload className="w-10 h-10 mx-auto stroke-1 mb-2 text-stone-300" />
                        <p className="text-xs">No reports uploaded yet. Select files above.</p>
                      </div>
                    )}
                  </div>

                  {/* RIGHT / MAIN: Analysis Dossier details */}
                  <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-stone-200/50 shadow-sm min-h-[500px]">
                    {analyzing ? (
                      <div className="flex flex-col items-center justify-center h-full min-h-[350px] space-y-4">
                        <div className="w-16 h-16 border-4 border-emerald-900/20 border-t-emerald-900 rounded-full animate-spin"></div>
                        <p className="text-emerald-950 font-serif font-medium text-lg">Nirva Clinical AI is running OCR &amp; Diagnostic Analysis...</p>
                        <p className="text-stone-500 text-xs text-center max-w-sm leading-relaxed">
                          We are parsing the PDF text, processing imagery with Gemini, evaluating organ systems, and compiling medical advice. Please do not close the window.
                        </p>
                      </div>
                    ) : selectedAnalysis ? (
                      <div className="space-y-8 animate-fade-in">
                        
                        {/* Dossier Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-6 gap-4">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/50 border border-emerald-200/50 px-2.5 py-1 rounded-full uppercase tracking-wider">Clinical Analysis Dossier</span>
                            <h3 className="text-2xl font-serif text-emerald-950 font-medium mt-2">Overall Health Score: {selectedAnalysis.health_score}/100</h3>
                            <p className="text-xs text-stone-400 mt-1">Dossier generated on {selectedAnalysis.created_at.split('T')[0]}</p>
                          </div>
                          <div className="flex gap-2">
                            {selectedAnalysis.diagnoses.map((diag, i) => (
                              <span key={i} className="bg-stone-100 border border-stone-200 text-stone-700 font-semibold px-2.5 py-1 rounded-lg text-xs capitalize">
                                {diag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Clinical Summary & Specialist Advice */}
                        <div className="grid md:grid-cols-2 gap-6 bg-stone-50/50 p-6 rounded-2xl border border-stone-200/40">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Clinical Summary</h4>
                            <p className="text-sm text-stone-600 leading-relaxed italic">{selectedAnalysis.clinical_notes || 'No notes available.'}</p>
                          </div>
                          
                          <div className="border-t md:border-t-0 md:border-l border-stone-200/60 pt-4 md:pt-0 md:pl-6">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Recommended Specialists</h4>
                            {selectedAnalysis.specialist && selectedAnalysis.specialist.length > 0 ? (
                              <div className="space-y-2">
                                {selectedAnalysis.specialist.map((spec, i) => (
                                  <div key={i} className="text-xs leading-relaxed text-stone-600">
                                    <span className="font-bold text-emerald-950">{spec.name}</span>: {spec.why}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-stone-500">No specialist review triggered.</p>
                            )}
                          </div>
                        </div>

                        {/* ORGAN HEALTH RADAR GRID */}
                        <div className="space-y-4">
                          <h4 className="font-serif text-stone-800 text-lg border-b border-stone-100 pb-2">Organ Health Assessment Matrix</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {Object.entries(selectedAnalysis.organ_health || {}).map(([organ, item]: [string, any], idx) => {
                              let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-100';
                              if (item.status === 'Needs Monitoring') statusColor = 'text-amber-700 bg-amber-50 border-amber-100';
                              else if (item.status === 'Potentially Affected') statusColor = 'text-rose-700 bg-rose-50 border-rose-100';

                              return (
                                <div key={idx} className="p-4 bg-[#FBF9F6] border border-stone-200/60 rounded-2xl flex flex-col justify-between hover:border-emerald-800/20 hover:bg-white transition-all group">
                                  <div className="space-y-1">
                                    <p className="text-xs font-bold uppercase tracking-wider text-stone-400 capitalize">{organ.replace('_', ' ')}</p>
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusColor}`}>
                                      {item.status}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-stone-500 leading-relaxed mt-3 pt-2 border-t border-stone-100 font-medium line-clamp-3 group-hover:line-clamp-none transition-all">
                                    {item.explanation}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* BIOMARKER DETAILED BREAKDOWN */}
                        <div className="space-y-4">
                          <h4 className="font-serif text-stone-800 text-lg border-b border-stone-100 pb-2">Biomarker Findings Breakdown</h4>
                          
                          {selectedAnalysis.biomarkers && selectedAnalysis.biomarkers.length > 0 ? (
                            <div className="space-y-3">
                              {selectedAnalysis.biomarkers.map((bio, idx) => {
                                let statusColor = 'text-emerald-700 bg-emerald-50';
                                if (bio.status === 'High' || bio.status === 'Low') statusColor = 'text-amber-700 bg-amber-50';
                                else if (bio.status === 'Critical') statusColor = 'text-rose-700 bg-rose-50 border border-rose-200 animate-pulse';

                                return (
                                  <div key={idx} className="p-5 border border-stone-200/60 rounded-2xl bg-[#FBF9F6] hover:bg-white transition-all">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
                                      <div className="flex items-center gap-3">
                                        <span className="font-bold text-stone-800 text-base">{bio.name}</span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColor}`}>{bio.status}</span>
                                      </div>
                                      <div className="text-sm font-semibold text-stone-600">
                                        Value: <span className="text-stone-800 font-bold">{bio.value} {bio.unit}</span> (Ref: {bio.reference_range})
                                      </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4 mt-3 pt-1 text-xs text-stone-600 leading-relaxed">
                                      <div className="space-y-2">
                                        <p><span className="font-bold text-stone-800">Interpretation:</span> {bio.meaning}</p>
                                        <p><span className="font-bold text-stone-800">Short-Term Effects:</span> {bio.short_term}</p>
                                        <p><span className="font-bold text-stone-800">Long-Term Effects:</span> {bio.long_term}</p>
                                      </div>
                                      <div className="space-y-1 bg-white p-3.5 rounded-xl border border-stone-100">
                                        <p className="font-bold text-emerald-950 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider">
                                          <Sparkles className="w-3.5 h-3.5" /> Nirva Lifestyle Medicine Advice
                                        </p>
                                        <p><span className="font-semibold text-stone-700">Dietary (Increase):</span> {bio.foods_to_increase}</p>
                                        <p><span className="font-semibold text-stone-700">Dietary (Reduce):</span> {bio.foods_to_reduce}</p>
                                        <p><span className="font-semibold text-stone-700">Lifestyle/Sleep/Stress:</span> {bio.lifestyle} (Sleep: {bio.sleep}, Stress: {bio.stress})</p>
                                        <p><span className="font-semibold text-stone-700">Exercise:</span> {bio.exercise}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-stone-400">No structured biomarkers mapped in this report.</p>
                          )}
                        </div>

                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-center p-6 text-stone-400">
                        <FileText className="w-16 h-16 stroke-1 mb-4 text-stone-300" />
                        <h3 className="text-lg font-serif font-medium text-stone-600">No Report Selected</h3>
                        <p className="text-xs max-w-sm mt-1 leading-relaxed">
                          Please select an analyzed report dossier from the catalog panel on the left, or upload a fresh medical report to compile clinical metrics.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* AI HEALTH CHAT TAB */}
            {activeTab === 'chat' && (
              <div className="h-[75vh] flex flex-col bg-white rounded-3xl border border-stone-200/50 shadow-sm overflow-hidden" id="tab-chat-content">
                {/* Chat header */}
                <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-[#FBF9F6]/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-900 rounded-2xl flex items-center justify-center text-white">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif font-semibold text-emerald-950 text-lg">Consult Nirva AI</h3>
                      <p className="text-[11px] text-stone-500 font-medium">Context-aware, clinical guide hydrated with active biometrics &amp; report logs.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setChatHistory([]);
                      // timeline or history re-seed is done by server
                    }}
                    className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear Chat Thread
                  </button>
                </div>

                {/* Messages pane */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#FBF9F6]/20">
                  {chatHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-6">
                      <Sparkles className="w-12 h-12 text-emerald-900 stroke-1 animate-pulse" />
                      <div>
                        <h4 className="font-serif text-emerald-950 text-xl font-medium">Your Personal AI Clinician Guide</h4>
                        <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                          Ask anything about your blood biomarkers, dietary calories, vitamin benchmarks, or clinical organ assessments. I have direct context of all SQLite diagnostic archives.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 w-full">
                        <button
                          onClick={() => handleSendChatMessage(undefined, 'What does my current organ health assessment say about my liver?')}
                          className="p-3 text-left bg-white border border-stone-200/60 rounded-xl text-xs hover:border-emerald-800 text-stone-700 font-semibold cursor-pointer transition-all"
                        >
                          "What does my current organ health assessment say about my liver?"
                        </button>
                        <button
                          onClick={() => handleSendChatMessage(undefined, 'How should I tailor my diet to resolve abnormal cholesterol/lipid scores?')}
                          className="p-3 text-left bg-white border border-stone-200/60 rounded-xl text-xs hover:border-emerald-800 text-stone-700 font-semibold cursor-pointer transition-all"
                        >
                          "How should I tailor my diet to resolve abnormal cholesterol/lipid scores?"
                        </button>
                        <button
                          onClick={() => handleSendChatMessage(undefined, 'Calculate my BMI and let me know if my daily calorie budget is correct')}
                          className="p-3 text-left bg-white border border-stone-200/60 rounded-xl text-xs hover:border-emerald-800 text-stone-700 font-semibold cursor-pointer transition-all"
                        >
                          "Calculate my BMI and let me know if my daily calorie budget is correct"
                        </button>
                      </div>
                    </div>
                  )}

                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-4 rounded-2xl max-w-xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-emerald-900 text-white rounded-br-none' : 'bg-stone-100 text-stone-800 rounded-bl-none'}`}>
                        {msg.message}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="p-4 rounded-2xl bg-stone-100 text-stone-800 flex items-center gap-2">
                        <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat input form */}
                <form onSubmit={handleSendChatMessage} className="p-4 border-t border-stone-100 bg-[#FBF9F6]/50 flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask Nirva AI about your biomarkers, organ health, or nutrition..."
                    className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all placeholder:text-stone-400"
                    id="chat-input-field"
                  />
                  <button
                    type="submit"
                    className="bg-emerald-900 text-white px-5 py-3 rounded-xl hover:bg-emerald-800 font-medium transition-all text-sm shrink-0 flex items-center gap-1.5 cursor-pointer"
                    id="chat-send-btn"
                  >
                    Consult <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* DAILY NUTRIENTS TAB */}
            {activeTab === 'nutrients' && (
              <div className="space-y-8" id="tab-nutrients-content">
                <div>
                  <h2 className="text-3xl font-serif text-emerald-950 font-medium">Personalized Dietary &amp; Micronutrient Targets</h2>
                  <p className="text-stone-500 text-sm mt-1">
                    Calculated dynamically based on age ({activeProfile.age}), weight ({activeProfile.weight}kg), height ({activeProfile.height}cm), gender ({activeProfile.gender}), and activity level ({activeProfile.activity_level.replace('_', ' ')}).
                  </p>
                </div>

                {/* Macro summary strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {nutrients.filter(n => n.category === 'Macro').slice(0, 4).map((mac, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-3xl border border-stone-200/50 shadow-sm flex flex-col justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{mac.name}</p>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-3xl font-serif font-bold text-stone-800">{mac.value}</span>
                        <span className="text-xs text-stone-500">{mac.unit}</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 mt-3 w-max font-bold">
                        Calculated Daily Target
                      </span>
                    </div>
                  ))}
                </div>

                {/* Grid separating micro categories */}
                <div className="grid md:grid-cols-2 gap-8">
                  {/* VITAMINS MATRIX */}
                  <div className="bg-white p-8 rounded-[2rem] border border-stone-200/50 shadow-sm">
                    <h3 className="font-serif font-medium text-emerald-950 text-xl border-b border-stone-100 pb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-700" /> Essential Vitamins
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      {nutrients.filter(n => n.category === 'Vitamins').map((vit, idx) => (
                        <div key={idx} className="p-4 bg-[#FBF9F6] border border-stone-200/40 rounded-2xl flex flex-col justify-between">
                          <p className="text-xs text-stone-500 font-bold">{vit.name}</p>
                          <div className="flex items-baseline gap-1 mt-2.5">
                            <span className="text-2xl font-serif font-bold text-stone-800">{vit.value}</span>
                            <span className="text-xs text-stone-400">{vit.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* MINERALS & EXTRAS MATRIX */}
                  <div className="bg-white p-8 rounded-[2rem] border border-stone-200/50 shadow-sm">
                    <h3 className="font-serif font-medium text-emerald-950 text-xl border-b border-stone-100 pb-3 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-rose-500" /> Vital Minerals &amp; Extras
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      {nutrients.filter(n => n.category === 'Minerals' || (n.category === 'Macro' && !['Calories', 'Protein', 'Carbohydrates', 'Fat'].includes(n.name))).map((min, idx) => (
                        <div key={idx} className="p-4 bg-[#FBF9F6] border border-stone-200/40 rounded-2xl flex flex-col justify-between">
                          <p className="text-xs text-stone-500 font-bold">{min.name}</p>
                          <div className="flex items-baseline gap-1 mt-2.5">
                            <span className="text-2xl font-serif font-bold text-stone-800">{min.value}</span>
                            <span className="text-xs text-stone-400">{min.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-emerald-50/20 border border-emerald-900/10 rounded-3xl flex items-start gap-4">
                  <BookOpen className="w-6 h-6 text-emerald-800 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-emerald-950 text-sm">Clinical Nutrient Modeling</h4>
                    <p className="text-xs text-stone-600 leading-relaxed mt-1">
                      Nutrient calculations follow the Mifflin-St Jeor basal metabolic equation, scaled based on your activity coefficient and adjusted for pregnancy demands. These values represent baseline metabolic needs; refer to AI report analysis for diagnostic adjustments (e.g. iron supplements if anemic).
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* HISTORY & TIMELINE TAB */}
            {activeTab === 'timeline' && (
              <div className="space-y-8" id="tab-timeline-content">
                <div>
                  <h2 className="text-3xl font-serif text-emerald-950 font-medium">Clinical Timeline &amp; Archives</h2>
                  <p className="text-stone-500 text-sm mt-1">
                    Complete history of biomarker uploads, health score variations, and timeline milestones saved permanently in the database.
                  </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Left Column: Vertical Timeline Track */}
                  <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-stone-200/50 shadow-sm space-y-6">
                    <h3 className="font-serif font-medium text-stone-800 text-xl border-b border-stone-100 pb-3">Dossier Activity Timeline</h3>
                    
                    <div className="relative border-l border-stone-200 pl-6 ml-2 space-y-8">
                      {timeline.map((event) => {
                        let iconBg = 'bg-stone-100 text-stone-500';
                        if (event.event_type === 'report_upload') iconBg = 'bg-blue-100 text-blue-800';
                        else if (event.event_type === 'analysis') iconBg = 'bg-emerald-100 text-emerald-800';
                        else if (event.event_type === 'alert') iconBg = 'bg-red-100 text-red-800 border border-red-200';

                        return (
                          <div key={event.id} className="relative">
                            {/* Dot */}
                            <span className={`absolute -left-[38px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${iconBg}`}>
                              {event.event_type.charAt(0).toUpperCase()}
                            </span>
                            <div className="space-y-1">
                              <span className="text-xs text-stone-400 font-semibold">{event.event_date}</span>
                              <h4 className="font-bold text-stone-800 text-sm">{event.title}</h4>
                              <p className="text-xs text-stone-500 leading-relaxed max-w-xl">{event.description}</p>
                            </div>
                          </div>
                        );
                      })}
                      {timeline.length === 0 && (
                        <p className="text-xs text-stone-400">Activity timeline is empty.</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Historical Documents list */}
                  <div className="bg-white p-8 rounded-[2rem] border border-stone-200/50 shadow-sm space-y-4">
                    <h3 className="font-serif font-medium text-stone-800 text-xl border-b border-stone-100 pb-3">Archived Reports</h3>
                    
                    {reports.length > 0 ? (
                      <div className="space-y-3">
                        {reports.map((rep) => (
                          <div key={rep.id} className="p-4 bg-[#FBF9F6] border border-stone-200/60 rounded-2xl flex items-center justify-between gap-3 hover:border-emerald-800/20">
                            <div className="flex items-center gap-2.5 truncate">
                              <FileText className="w-5 h-5 text-stone-400 shrink-0" />
                              <div className="truncate">
                                <p className="text-[10px] text-stone-400">{rep.uploaded_at.split('T')[0]}</p>
                                <a
                                  href={`/api/reports/download/${rep.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-semibold text-stone-800 hover:text-emerald-900 hover:underline truncate block"
                                >
                                  {rep.file_name}
                                </a>
                              </div>
                            </div>
                            <span className="text-[10px] text-stone-400 shrink-0 font-medium capitalize">{rep.file_type.split('/')[1] || 'PDF'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400 text-center py-6">Archive is currently empty.</p>
                    )}
                  </div>
                </div>

              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}
