import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  GraduationCap,
  MessageCircleQuestion,
  Quote,
  CheckCircle,
  XCircle,
  Send,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Star,
  Copy,
  Sparkles,
  ThumbsUp,
} from 'lucide-react';

const INVITE_LINK_PREFIX = 'https://t.me/tezbarakatbot/shoppp?startapp=';

export default function Scripts() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showAllBest, setShowAllBest] = useState(false);

  // Best scripts - shown first, most effective
  const bestScripts = [
    { id: 1, text: t('scripts.bestScript1'), emoji: '🎁' },
    { id: 2, text: t('scripts.bestScript2'), emoji: '💰' },
    { id: 3, text: t('scripts.bestScript3'), emoji: '📱' },
  ];

  const categories = [
    { 
      id: 'family', 
      icon: <Users className="w-6 h-6" />, 
      label: t('scripts.categories.family'),
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      scripts: [
        t('scripts.family.script1'),
        t('scripts.family.script2'),
        t('scripts.family.script3'),
        t('scripts.family.script4'),
      ]
    },
    { 
      id: 'friends', 
      icon: <UserPlus className="w-6 h-6" />, 
      label: t('scripts.categories.friends'),
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      scripts: [
        t('scripts.friends.script1'),
        t('scripts.friends.script2'),
        t('scripts.friends.script3'),
        t('scripts.friends.script4'),
      ]
    },
    { 
      id: 'students', 
      icon: <GraduationCap className="w-6 h-6" />, 
      label: t('scripts.categories.students'),
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      scripts: [
        t('scripts.students.script1'),
        t('scripts.students.script2'),
        t('scripts.students.script3'),
        t('scripts.students.script4'),
      ]
    },
    { 
      id: 'workplace', 
      icon: <Briefcase className="w-6 h-6" />, 
      label: t('scripts.categories.workplace'),
      color: 'bg-teal-500',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      scripts: [
        t('scripts.workplace.script1'),
        t('scripts.workplace.script2'),
        t('scripts.workplace.script3'),
      ]
    },
    { 
      id: 'telegram', 
      icon: <Send className="w-6 h-6" />, 
      label: t('scripts.categories.telegram'),
      color: 'bg-sky-500',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
      scripts: [
        t('scripts.telegram.script1'),
        t('scripts.telegram.script2'),
        t('scripts.telegram.script3'),
      ]
    },
    { 
      id: 'subsidy', 
      icon: <Sparkles className="w-6 h-6" />, 
      label: t('scripts.categories.subsidy'),
      color: 'bg-[#D4AF37]',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-300',
      scripts: [
        t('scripts.subsidy.script1'),
        t('scripts.subsidy.script2'),
        t('scripts.subsidy.script3'),
        t('scripts.subsidy.script4'),
      ]
    },
  ];

  const objections = [
    { q: t('scripts.objections.q1'), a: t('scripts.objections.a1') },
    { q: t('scripts.objections.q2'), a: t('scripts.objections.a2') },
    { q: t('scripts.objections.q3'), a: t('scripts.objections.a3') },
    { q: t('scripts.objections.q4'), a: t('scripts.objections.a4') },
    { q: t('scripts.objections.q5'), a: t('scripts.objections.a5') },
    { q: t('scripts.objections.q6'), a: t('scripts.objections.a6') },
  ];

  const handleCopyWithLink = async (text: string) => {
    const fullText = text + INVITE_LINK_PREFIX + 'YOUR_CODE';
    await navigator.clipboard.writeText(fullText);
    toast.success(t('common.copied'));
  };

  const ScriptCard = ({ script, index, showCopyWithLink = false }: { script: string; index: number; showCopyWithLink?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="border-2 border-gray-100 hover:border-[#0D7C66]/30 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 bg-[#0D7C66]/10 rounded-full flex items-center justify-center shrink-0">
              <Quote className="w-4 h-4 text-[#0D7C66]" />
            </div>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line flex-1">{script}</p>
          </div>
          <div className="flex gap-2 justify-end">
            <CopyButton text={script} variant="outline" size="sm" />
            {showCopyWithLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyWithLink(script)}
                className="gap-1 text-[#0D7C66] border-[#0D7C66]/30 hover:bg-[#0D7C66]/10"
              >
                <Copy className="w-3 h-3" />
                + Link
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-gray-50 to-white">
      {/* Hero - Simple */}
      <section className="tez-gradient-green py-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-5 right-5 w-32 h-32 bg-[#D4AF37] rounded-full blur-3xl"></div>
        </div>
        <div className="container relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
              <span className="text-4xl">💬</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {t('scripts.heroTitle')}
            </h1>
            <p className="text-white/90">{t('scripts.heroDesc')}</p>
          </motion.div>
        </div>
      </section>

      <div className="container py-6">
        {/* BEST SCRIPTS - Most Important, Show First */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#D4AF37] rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('scripts.topScripts')}</h2>
              <p className="text-sm text-gray-500">{t('scripts.topScriptsDesc')}</p>
            </div>
          </div>

          <div className="space-y-3">
            {bestScripts.slice(0, showAllBest ? bestScripts.length : 2).map((script, index) => (
              <motion.div
                key={script.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-2 border-[#D4AF37]/30 bg-gradient-to-r from-[#D4AF37]/5 to-transparent">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">{script.emoji}</span>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line flex-1">
                        {script.text}
                      </p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <CopyButton text={script.text} className="bg-[#0D7C66] hover:bg-[#0a6b58] text-white" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const text = encodeURIComponent(script.text + INVITE_LINK_PREFIX + 'YOUR_CODE');
                          window.open(`https://t.me/share/url?text=${text}`, '_blank');
                        }}
                        className="gap-1"
                      >
                        <Send className="w-4 h-4" />
                        Telegram
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {bestScripts.length > 2 && (
            <Button
              variant="ghost"
              onClick={() => setShowAllBest(!showAllBest)}
              className="w-full mt-3 text-[#0D7C66]"
            >
              {showAllBest ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  {t('common.close')}
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  {t('common.viewMore')} ({bestScripts.length - 2})
                </>
              )}
            </Button>
          )}
        </section>

        {/* CATEGORY SCRIPTS - Expandable */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            {t('scripts.allScripts')}
          </h2>

          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.id}>
                <Card 
                  className={`cursor-pointer transition-all ${
                    activeCategory === category.id 
                      ? `${category.borderColor} border-2` 
                      : 'border hover:shadow-md'
                  }`}
                  onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 ${category.color} rounded-xl flex items-center justify-center text-white`}>
                          {category.icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{category.label}</h3>
                          <p className="text-sm text-gray-500">{category.scripts.length} {t('scripts.title').toLowerCase()}</p>
                        </div>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        activeCategory === category.id ? 'bg-[#0D7C66] text-white rotate-180' : 'bg-gray-100'
                      }`}>
                        <ChevronDown className="w-5 h-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <AnimatePresence>
                  {activeCategory === category.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`mt-2 p-4 rounded-xl ${category.bgColor} space-y-3`}>
                        {category.scripts.map((script, idx) => (
                          <ScriptCard 
                            key={idx} 
                            script={script} 
                            index={idx} 
                            showCopyWithLink={category.id === 'telegram'}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* OBJECTIONS - How to handle doubts */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center">
              <MessageCircleQuestion className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('scripts.objections.title')}</h2>
              <p className="text-sm text-gray-500">{t('scripts.categories.objections')}</p>
            </div>
          </div>

          <div className="space-y-4">
            {objections.map((obj, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden border-2 border-gray-100">
                  {/* Question */}
                  <div className="bg-red-50 p-4 border-b border-red-100">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                        <XCircle className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-gray-800 font-medium">{obj.q}</p>
                    </div>
                  </div>
                  {/* Answer */}
                  <div className="bg-green-50 p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{obj.a}</p>
                    </div>
                    <div className="flex justify-end">
                      <CopyButton text={obj.a} variant="outline" size="sm" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
