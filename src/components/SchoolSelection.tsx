import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, ArrowLeft, Check, Compass, MapPin } from 'lucide-react';

export interface School {
  id: string;
  name: string;
  acronym: string;
  locationsCount: number;
  mapImage: string;
  accentColor: string;
  brandColor: string;
  stops: { id: string; name: string }[];
  logoText: string;
  logoImage: string;
  bannerImage: string;
}

export const UNIVERSITIES: School[] = [
  {
    id: 'run',
    name: "Redeemer's University",
    acronym: 'RUN',
    locationsCount: 26,
    mapImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBFf8Ynl_a5V5MjIUSy7jPFq6l93wbIfzj-exNibt_LXLUh8GWNuh6KFAFWDpEXHOfiQF7pQanp0nvupSTAhFyJbZ6E9MZSPYwROimnSHmxAWlwq42FLTHUZSvCOvDwYSwowjvtr3yw86A2A_Zf5oQWW54K32vb3_6DoBUtR7nySxsmx9iwMwY9IHWFatEpt86iaCiizyjVEAKliRZJVanLhGSvehnH_F0s9lbkiokfvqH0LL8iXGwZUA2F_u3Brjb9erGTOXcGyVA', 
    accentColor: '#10b981', // Emerald green
    brandColor: 'emerald',
    logoText: 'RUN',
    logoImage: 'https://run.edu.ng/wp-content/uploads/2021/04/run-logo.png',
    bannerImage: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&w=600&q=80',
    stops: [
      { id: 'run-stop-1', name: "Redeemer's Univ Gate" },
      { id: 'run-stop-2', name: 'Senate Building' },
      { id: 'run-stop-3', name: 'BOOC (Lecture Theater)' },
      { id: 'run-stop-4', name: 'College of Humanities' },
      { id: 'run-stop-5', name: 'College of Natural Sciences' },
      { id: 'run-stop-6', name: 'Redemption Hall (Male Hostel)' },
      { id: 'run-stop-7', name: 'Queen Esthers Hall (Female Hostel)' },
      { id: 'run-stop-8', name: 'University Library' },
      { id: 'run-stop-9', name: 'University Health Centre' },
      { id: 'run-stop-10', name: 'RUN Cafeteria' },
    ]
  },
  {
    id: 'ui',
    name: "University of Ibadan",
    acronym: 'UI',
    locationsCount: 42,
    mapImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGdqITs0V8FtUmIn9Pu3Nw4ljHuKsmyTM0eN5MsW7oT07CkaHebJsd_0nGZOxRdMs16uZ5-TntRrLnVT3ujgum12N_fj1BmKcyalqv1BinQBI79B1JjTsZw35KIlCNaEwqeQwVzH3zH3DPDlDLMtysTsBJ4WNept0gDL43eV-g_7lu1Msgynw5zUyRrCfJ4UAjPg1TaCiGesLwL9I1LwgADC5WD2jFWZi3EUSdUenTv8p_RwjpUP1rcix1tajYsLRnxQBmYJivQW8',
    accentColor: '#004ac6', // Blue
    brandColor: 'indigo',
    logoText: 'UI',
    logoImage: 'https://upload.wikimedia.org/wikipedia/commons/0/00/University_of_Ibadan_logo.png',
    bannerImage: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
    stops: [
      { id: 'ui-stop-1', name: 'UI Main Gate' },
      { id: 'ui-stop-2', name: 'Kenneth Dike Library' },
      { id: 'ui-stop-3', name: 'Trenchard Hall' },
      { id: 'ui-stop-4', name: 'Sultan Bello Hall' },
      { id: 'ui-stop-5', name: 'Tedder Hall' },
      { id: 'ui-stop-6', name: 'Queen Elizabeth Hall (Female)' },
      { id: 'ui-stop-7', name: 'Faculty of Technology' },
      { id: 'ui-stop-8', name: 'Faculty of Science' },
      { id: 'ui-stop-9', name: 'UI Cafeteria (Love Garden)' },
      { id: 'ui-stop-10', name: 'Jaja Clinic Health post' }
    ]
  },
  {
    id: 'cu',
    name: "Covenant University",
    acronym: 'CU',
    locationsCount: 35,
    mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80', // Custom abstract tech map
    accentColor: '#962d2d', // Crimson Maroon
    brandColor: 'crimson',
    logoText: 'CU',
    logoImage: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Covenant_University_logo.png',
    bannerImage: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80',
    stops: [
      { id: 'cu-stop-1', name: 'CU Main Gate' },
      { id: 'cu-stop-2', name: 'Covenant University Library (CL)' },
      { id: 'cu-stop-3', name: 'ALDC Hall' },
      { id: 'cu-stop-4', name: 'PG Hall' },
      { id: 'cu-stop-5', name: 'Daniel Hall (Male)' },
      { id: 'cu-stop-6', name: 'Esther Hall (Female)' },
      { id: 'cu-stop-7', name: 'Deans Office / Senate' },
      { id: 'cu-stop-8', name: 'CU Cafeteria 1' },
      { id: 'cu-stop-9', name: 'CU Cafeteria 2' },
      { id: 'cu-stop-10', name: 'Sports Complex Main Stand' }
    ]
  }
];

interface SchoolSelectionProps {
  onSelectSchool: (schoolId: string) => void;
  onBack: () => void;
}

export const SchoolSelection: React.FC<SchoolSelectionProps> = ({ onSelectSchool, onBack }) => {
  const [selectedId, setSelectedId] = useState<string>('run');

  const handleContinue = () => {
    onSelectSchool(selectedId);
  };

  return (
    <div className="min-h-screen bg-[#f3faf7] flex flex-col justify-between py-8 px-4 sm:px-6 relative overflow-hidden">
      
      {/* Background Decorative Shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-100/40 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-50/40 blur-3xl pointer-events-none"></div>

      {/* Top Bar with elegant back button */}
      <div className="max-w-xl mx-auto w-full flex items-center justify-start z-10">
        <button 
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-600 rounded-full border border-gray-100 shadow-sm transition duration-250 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Main Form Box */}
      <div className="flex-1 flex flex-col justify-center items-center py-6 px-2 sm:px-0">
        <div className="max-w-xl w-full text-center space-y-8 z-10">
          
          {/* Main Logo & Title */}
          <div className="space-y-3 flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-600/10 border-4 border-white">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight">
              Select Your University
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              Choose your campus to get started
            </p>
          </div>

          {/* Cards Options Grid/List */}
          <div className="space-y-4">
            {UNIVERSITIES.map((school) => {
              const isSelected = selectedId === school.id;
              
              return (
                <div
                  key={school.id}
                  onClick={() => setSelectedId(school.id)}
                  className={`relative p-5 bg-white rounded-3xl border-2 text-left cursor-pointer transition-all duration-300 flex items-center justify-between ${
                    isSelected 
                      ? 'border-emerald-500 bg-white shadow-lg shadow-emerald-500/5' 
                      : 'border-white hover:border-gray-100 bg-white hover:bg-[#fafafc] shadow-xs'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Circle Logo/Image Badge */}
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gray-50 border border-gray-100 p-2.5 shadow-inner">
                      <img 
                        referrerPolicy="no-referrer"
                        src={school.logoImage} 
                        alt={`${school.name} Logo`} 
                        className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
                      />
                    </div>

                    <div>
                      <h3 className="font-extrabold text-gray-900 text-sm sm:text-base pr-2 select-none">
                        {school.name}
                      </h3>
                      <div className="flex items-center space-x-2.5 mt-1.5">
                        <span 
                          className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase font-mono tracking-wider border"
                          style={{
                            color: school.id === 'run' ? '#059669' : school.id === 'ui' ? '#0254db' : '#b22d2d',
                            borderColor: school.id === 'run' ? '#a7f3d0' : school.id === 'ui' ? '#bfdbfe' : '#fca5a5',
                            backgroundColor: school.id === 'run' ? '#ecfdf5' : school.id === 'ui' ? '#eff6ff' : '#fef2f2',
                          }}
                        >
                          {school.acronym}
                        </span>
                        <span className="text-xs text-gray-400 font-medium flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-gray-350" />
                          {school.locationsCount} locations
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side tick indicator or continue visual */}
                  <div className="flex items-center justify-center pr-1 select-none">
                    <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center transition-all duration-300 ${
                      isSelected ? 'bg-emerald-500 text-white shadow-sm' : 'bg-transparent border border-gray-200'
                    }`}>
                      {isSelected ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-transparent"></div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action button triggers transition */}
          <div className="pt-3">
            <button
              onClick={handleContinue}
              className="w-full bg-[#0b1c30] hover:bg-emerald-600 text-white font-bold py-4 px-6 rounded-2xl shadow-md transition-colors duration-250 cursor-pointer text-sm"
            >
              Tap to continue with {UNIVERSITIES.find(u => u.id === selectedId)?.name}
            </button>
          </div>

        </div>
      </div>

      {/* Footer Text */}
      <p className="text-[12px] text-gray-400 text-center z-10 select-none">
        Campus maps help drivers navigate and find you quickly
      </p>

    </div>
  );
};
