import React from 'react';
import { Shield, Award, Globe, Headphones, Lock, Users } from 'lucide-react';

const TrustBadges = () => {
  const badges = [
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Verified Agencies",
      description: "All agencies undergo rigorous verification and background checks"
    },
    {
      icon: <Award className="h-8 w-8" />,
      title: "Best Price Guarantee",
      description: "We guarantee the best prices or we'll match the difference"
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Global Network",
      description: "Partners in 20+ countries serving pilgrims worldwide"
    },
    {
      icon: <Headphones className="h-8 w-8" />,
      title: "24/7 Support",
      description: "Round-the-clock assistance in multiple languages"
    },
    {
      icon: <Lock className="h-8 w-8" />,
      title: "Secure Booking",
      description: "SSL encrypted payments and data protection"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Community Trusted",
      description: "Rated 4.8/5 by over 10,000 pilgrims"
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-gray-900 to-emerald-900 text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Why Pilgrims Trust Umrah Market
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            We've built our reputation on transparency, reliability, and exceptional service
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {badges.map((badge, index) => (
            <div 
              key={index}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-green-400 mb-4">
                {badge.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{badge.title}</h3>
              <p className="text-gray-300">{badge.description}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-green-400 mb-2">10K+</div>
            <div className="text-gray-300">Happy Pilgrims</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-green-400 mb-2">200+</div>
            <div className="text-gray-300">Partners</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-green-400 mb-2">4.8★</div>
            <div className="text-gray-300">Average Rating</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-green-400 mb-2">98%</div>
            <div className="text-gray-300">Success Rate</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;