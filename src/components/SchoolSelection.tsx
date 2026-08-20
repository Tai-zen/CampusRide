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
  stops: { id: string; name: string; lat: number; lng: number }[];
  center: { lat: number; lng: number };
  zoom: number;
  logoText: string;
  logoImage: string;
  bannerImage: string;
}

export const UNIVERSITIES: School[] = [
  {
    id: 'run',
    name: "Redeemer's University",
    acronym: 'RUN',
    locationsCount: 3,
    mapImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBFf8Ynl_a5V5MjIUSy7jPFq6l93wbIfzj-exNibt_LXLUh8GWNuh6KFAFWDpEXHOfiQF7pQanp0nvupSTAhFyJbZ6E9MZSPYwROimnSHmxAWlwq42FLTHUZSvCOvDwYSwowjvtr3yw86A2A_Zf5oQWW54K32vb3_6DoBUtR7nySxsmx9iwMwY9IHWFatEpt86iaCiizyjVEAKliRZJVanLhGSvehnH_F0s9lbkiokfvqH0LL8iXGwZUA2F_u3Brjb9erGTOXcGyVA', 
    accentColor: '#46C96B', // Emerald green
    brandColor: 'emerald',
    logoText: 'RUN',
    logoImage: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Redeemer%27s_University_logo.png',
    bannerImage: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&w=600&q=80',
    center: { lat: 7.6781, lng: 4.4600 },
    zoom: 15,
    stops: [
      { id: 'run-stop-1', name: "Redeemer's Univ Gate", lat: 7.6842234, lng: 4.4665215 },
      { id: 'run-stop-2', name: 'Senate Building', lat: 7.6781633, lng: 4.4600885 },
      { id: 'run-stop-3', name: 'Student Hostel', lat: 7.6778910, lng: 4.4494392 }
    ]
  },
  {
    id: 'ui',
    name: "University of Ibadan",
    acronym: 'UI',
    locationsCount: 42,
    mapImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGdqITs0V8FtUmIn9Pu3Nw4ljHuKsmyTM0eN5MsW7oT07CkaHebJsd_0nGZOxRdMs16uZ5-TntRrLnVT3ujgum12N_fj1BmKcyalqv1BinQBI79B1JjTsZw35KIlCNaEwqeQwVzH3zH3DPDlDLMtysTsBJ4WNept0gDL43eV-g_7lu1Msgynw5zUyRrCfJ4UAjPg1TaCiGesLwL9I1LwgADC5WD2jFWZi3EUSdUenTv8p_RwjpUP1rcix1tajYsLRnxQBmYJivQW8',
    accentColor: '#46C96B', // Emerald Green
    brandColor: 'indigo',
    logoText: 'UI',
    logoImage: 'https://upload.wikimedia.org/wikipedia/commons/0/00/University_of_Ibadan_logo.png',
    bannerImage: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
    center: { lat: 7.4444, lng: 3.9000 },
    zoom: 15,
    stops: [
      { id: 'ui-stop-1', name: 'UI Main Gate', lat: 7.4395000, lng: 3.8995000 },
      { id: 'ui-stop-2', name: 'Kenneth Dike Library', lat: 7.4435000, lng: 3.8998000 },
      { id: 'ui-stop-3', name: 'UI Campus Cab Terminus', lat: 7.4416532, lng: 3.9062510 },
      { id: 'ui-stop-4', name: 'Sultan Bello Hall', lat: 7.4465000, lng: 3.8990000 },
      { id: 'ui-stop-5', name: 'Tedder Hall Foodcourt', lat: 7.4456153, lng: 3.8988405 },
      { id: 'ui-stop-6', name: 'Mellanby Foodcourt', lat: 7.4455596, lng: 3.9001255 },
      { id: 'ui-stop-7', name: 'Faculty of Technology', lat: 7.4420000, lng: 3.9030000 },
      { id: 'ui-stop-8', name: 'Faculty of Science', lat: 7.4450000, lng: 3.9025000 },
      { id: 'ui-stop-9', name: 'University Bookshop', lat: 7.4451827, lng: 3.9005424 },
      { id: 'ui-stop-10', name: 'Jaja Clinic (Health Service)', lat: 7.4425946, lng: 3.9007560 }
    ]
  },
  {
    id: 'cu',
    name: "Covenant University",
    acronym: 'CU',
    locationsCount: 35,
    mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80', // Custom abstract tech map
    accentColor: '#46C96B', // Crimson Maroon
    brandColor: 'crimson',
    logoText: 'CU',
    logoImage: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Covenant_University_logo.png',
    bannerImage: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80',
    center: { lat: 6.6718, lng: 3.1583 },
    zoom: 15,
    stops: [
      { id: 'cu-stop-1', name: 'CU Chapel', lat: 6.6699431, lng: 3.1582986 },
      { id: 'cu-stop-2', name: 'Daniel Hall', lat: 6.6718015, lng: 3.1525739 },
      { id: 'cu-stop-3', name: 'Esther Hall', lat: 6.6696074, lng: 3.1555174 },
      { id: 'cu-stop-4', name: 'Peter Hall', lat: 6.6684352, lng: 3.1545196 },
      { id: 'cu-stop-5', name: 'Joseph Hall', lat: 6.6706883, lng: 3.1530596 },
      { id: 'cu-stop-6', name: 'Lydia Hall', lat: 6.6722004, lng: 3.1555907 },
      { id: 'cu-stop-7', name: 'Dorcas Hall', lat: 6.6718757, lng: 3.1569450 },
      { id: 'cu-stop-8', name: 'Cafeteria 1', lat: 6.6694081, lng: 3.1540869 },
      { id: 'cu-stop-9', name: 'Cafeteria 2', lat: 6.6725437, lng: 3.1619045 },
      { id: 'cu-stop-10', name: 'CU Guest House', lat: 6.6714760, lng: 3.1626496 }
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
    <div className="min-h-screen bg-[#F2F2F2] flex flex-col justify-between py-8 px-4 sm:px-6 relative overflow-hidden">
      
      {/* Background Decorative Shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#46C96B]/20/40 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#46C96B]/10/40 blur-3xl pointer-events-none"></div>

      {/* Top Bar with elegant back button */}
      <div className="max-w-xl mx-auto w-full flex items-center justify-start z-10">
        <button 
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 bg-white hover:bg-[#46C96B]/10 text-gray-700 hover:text-[#46C96B] rounded-full border border-gray-100 shadow-sm transition duration-250 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Main Form Box */}
      <div className="flex-1 flex flex-col justify-center items-center py-6 px-2 sm:px-0">
        <div className="max-w-xl w-full text-center space-y-8 z-10">
          
          {/* Main Logo & Title */}
          <div className="space-y-3 flex flex-col items-center">
            <div className="w-16 h-16 bg-[#46C96B] rounded-full flex items-center justify-center text-white shadow-xl shadow-sage-medium/10 border-4 border-white">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#46C96B] tracking-tight">
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
                      ? 'border-[#46C96B] bg-white shadow-lg shadow-sage-medium/100/5' 
                      : 'border-white hover:border-gray-100 bg-white hover:bg-[#F2F2F2] shadow-xs'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Circle Logo/Image Badge */}
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-transparent p-0 overflow-hidden shrink-0">
                      <img 
                        referrerPolicy="no-referrer"
                        src={school.logoImage} 
                        alt={`${school.name} Logo`} 
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105 rounded-2xl"
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
                            color: school.id === 'run' ? '#46C96B' : school.id === 'ui' ? '#0254db' : '#46C96B',
                            borderColor: school.id === 'run' ? '#F2F2F2' : school.id === 'ui' ? '#F2F2F2' : '#F2F2F2',
                            backgroundColor: school.id === 'run' ? '#F2F2F2' : school.id === 'ui' ? '#F2F2F2' : '#F2F2F2',
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
                      isSelected ? 'bg-[#46C96B] text-white shadow-sm' : 'bg-transparent border border-gray-200'
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
              className="w-full bg-[#46C96B] hover:bg-[#46C96B] text-white font-bold py-4 px-6 rounded-2xl shadow-md transition-colors duration-250 cursor-pointer text-sm"
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
