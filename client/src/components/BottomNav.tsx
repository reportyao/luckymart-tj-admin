import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, Link } from 'wouter';
import { Home, Info, BookOpen, MessageSquare, Image, HelpCircle } from 'lucide-react';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  labelKey: string;
}

const navItems: NavItem[] = [
  { path: '/', icon: <Home className="w-5 h-5" />, labelKey: 'nav.home' },
  { path: '/platform', icon: <Info className="w-5 h-5" />, labelKey: 'nav.platform' },
  { path: '/guide', icon: <BookOpen className="w-5 h-5" />, labelKey: 'nav.guide' },
  { path: '/scripts', icon: <MessageSquare className="w-5 h-5" />, labelKey: 'nav.scripts' },
  { path: '/materials', icon: <Image className="w-5 h-5" />, labelKey: 'nav.materials' },
  { path: '/faq', icon: <HelpCircle className="w-5 h-5" />, labelKey: 'nav.faq' },
];

export const BottomNav: React.FC = () => {
  const { t } = useTranslation();
  const [location] = useLocation();

  return (
    <nav className="bottom-nav">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              >
                <div className={`transition-colors ${isActive ? 'text-[#0D5C3D]' : 'text-gray-500'}`}>
                  {item.icon}
                </div>
                <span className={`text-[10px] mt-1 ${isActive ? 'text-[#0D5C3D] font-medium' : 'text-gray-500'}`}>
                  {t(item.labelKey)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
