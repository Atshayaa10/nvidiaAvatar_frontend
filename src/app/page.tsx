'use client';

import { useEffect, useState } from 'react';
import { Power, Lock, CloudUpload } from "lucide-react";

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop',
    title: 'Cloud IT Solutions.',
    subtitle: 'Work Securely. Anywhere. Anytime.'
  },
  {
    image: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=2069&auto=format&fit=crop',
    title: 'Managed IT Services',
    subtitle: 'Connecting People and Technology'
  }
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex-1 flex flex-col bg-white w-full">
      
      {/* Hero Section */}
      <section className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-[#001a2c]">
        {/* Slide Backgrounds */}
        {slides.map((slide, index) => (
          <div 
            key={index}
            className={`absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${slide.image}")` }}
            />
            {/* Dark Overlay to make text readable */}
            <div className="absolute inset-0 bg-[#001a2c]/60 backdrop-blur-[1px]" />
          </div>
        ))}

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full -mt-20">
          <h1 
            key={`title-${currentSlide}`} 
            className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight drop-shadow-md animate-fade-in"
          >
            {slides[currentSlide].title}
          </h1>
          <p 
            key={`subtitle-${currentSlide}`}
            className="text-xl md:text-2xl text-white/90 mb-10 font-medium tracking-wide drop-shadow animate-fade-in"
            style={{ animationDelay: '0.1s' }}
          >
            {slides[currentSlide].subtitle}
          </p>
          
          <button className="bg-[#008b8b] hover:bg-[#007070] text-white px-8 py-3 font-semibold transition-all shadow-lg text-sm uppercase tracking-wide">
            Read More
          </button>
        </div>
      </section>

      {/* Services Overlapping Boxes */}
      <section className="relative z-20 w-full max-w-[1200px] mx-auto px-4 -mt-28 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Box 1 */}
          <div className="bg-[#242323] text-white px-8 py-14 flex flex-col items-center text-center shadow-xl">
            <Power size={64} className="mb-6 stroke-[1.5]" />
            <h3 className="text-3xl font-normal leading-tight mb-4">
              Managed IT<br/>Services
            </h3>
            <p className="text-sm font-semibold mb-3 tracking-wide">
              Maximize Business Efficiency
            </p>
            <p className="text-[13px] leading-relaxed text-zinc-300 px-2">
              We keep your IT up-to-date, and deliver uptime<br/>giving you peace of mind.
            </p>
          </div>

          {/* Box 2 */}
          <div className="bg-[#242323] text-white px-8 py-14 flex flex-col items-center text-center shadow-xl">
            <Lock size={64} className="mb-6 stroke-[1.5]" />
            <h3 className="text-3xl font-normal leading-tight mb-4">
              Cybersecurity<br/>Services
            </h3>
            <p className="text-sm font-semibold mb-3 tracking-wide">
              Protect Your Business from Threats
            </p>
            <p className="text-[13px] leading-relaxed text-zinc-300 px-2">
              All businesses are a target for cybercriminals - keep<br/>your data safe from their efforts.
            </p>
          </div>

          {/* Box 3 */}
          <div className="bg-[#242323] text-white px-8 py-14 flex flex-col items-center text-center shadow-xl">
            <CloudUpload size={64} className="mb-6 stroke-[1.5]" />
            <h3 className="text-3xl font-normal leading-tight mb-4">
              Cloud IT<br/>Solutions
            </h3>
            <p className="text-sm font-semibold mb-3 tracking-wide">
              The Next Stage for Your Business
            </p>
            <p className="text-[13px] leading-relaxed text-zinc-300 px-2">
              The cloud increases the capabilities of businesses<br/>of all sizes.
            </p>
          </div>

        </div>
      </section>

    </main>
  );
}
