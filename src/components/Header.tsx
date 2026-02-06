/**
 * Header Component
 * Navigation bar with branding and user actions
 */

import React from 'react';
import { Zap, Github, Twitter, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50',
      'bg-slate-950/80 backdrop-blur-xl',
      'border-b border-slate-800/50',
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Zap size={20} className="text-white" fill="currentColor" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">FlipFoundry</span>
              <Badge 
                variant="outline" 
                className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hidden sm:inline-flex"
              >
                BETA
              </Badge>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a 
              href="#features" 
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              How It Works
            </a>
            <a 
              href="#pricing" 
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Pricing
            </a>
          </nav>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={() => window.open('https://github.com', '_blank', 'noopener,noreferrer')}
            >
              <Github size={18} />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={() => window.open('https://twitter.com', '_blank', 'noopener,noreferrer')}
            >
              <Twitter size={18} />
            </Button>
            
            <Button
              variant="default"
              size="sm"
              className="hidden sm:flex bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Get Started
            </Button>
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-slate-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-800">
          <div className="px-4 py-4 space-y-3">
            <a 
              href="#features" 
              className="block py-2 text-slate-400 hover:text-white transition-colors"
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              className="block py-2 text-slate-400 hover:text-white transition-colors"
            >
              How It Works
            </a>
            <a 
              href="#pricing" 
              className="block py-2 text-slate-400 hover:text-white transition-colors"
            >
              Pricing
            </a>
            <Button
              variant="default"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-4"
            >
              Get Started
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
