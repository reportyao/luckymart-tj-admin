import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import {
  HelpCircle,
  ChevronDown,
  Users,
  Coins,
  Phone,
  MessageCircle,
  MapPin,
  Star,
} from 'lucide-react';

export default function FAQ() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>('promoter');
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);

  const promoterQuestions = [
    { id: 1, q: t('faq.q1'), a: t('faq.a1') },
    { id: 2, q: t('faq.q2'), a: t('faq.a2') },
    { id: 3, q: t('faq.q3'), a: t('faq.a3') },
    { id: 4, q: t('faq.q4'), a: t('faq.a4') },
    { id: 5, q: t('faq.q5'), a: t('faq.a5') },
    { id: 6, q: t('faq.q6'), a: t('faq.a6') },
  ];

  const userQuestions = [
    { id: 7, q: t('faq.q7'), a: t('faq.a7') },
    { id: 8, q: t('faq.q8'), a: t('faq.a8') },
    { id: 9, q: t('faq.q9'), a: t('faq.a9') },
    { id: 10, q: t('faq.q10'), a: t('faq.a10') },
    { id: 11, q: t('faq.q11'), a: t('faq.a11') },
    { id: 12, q: t('faq.q12'), a: t('faq.a12') },
  ];

  const topQuestions = [
    { id: 'top1', q: t('faq.q12'), a: t('faq.a12'), emoji: '🎰' },
    { id: 'top2', q: t('faq.q1'), a: t('faq.a1'), emoji: '💰' },
    { id: 'top3', q: t('faq.q11'), a: t('faq.a11'), emoji: '🛒' },
  ];

  const currentQuestions = activeCategory === 'promoter' ? promoterQuestions : userQuestions;

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-gray-50 to-white">
      {/* Hero */}
      <section className="tez-gradient-green py-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-5 left-5 w-32 h-32 bg-[#D4AF37] rounded-full blur-3xl"></div>
        </div>
        <div className="container relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
              <span className="text-4xl">🤔</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {t('faq.heroTitle')}
            </h1>
            <p className="text-white/90">{t('faq.heroDesc')}</p>
          </motion.div>
        </div>
      </section>

      <div className="container py-6">
        {/* TOP QUESTIONS - Most Important */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#D4AF37] rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('faq.topQuestions')}</h2>
            </div>
          </div>

          <div className="space-y-3">
            {topQuestions.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-2 border-[#D4AF37]/30 bg-gradient-to-r from-[#D4AF37]/5 to-transparent overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-[#D4AF37]/10 p-4 border-b border-[#D4AF37]/20">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{item.emoji}</span>
                        <p className="font-bold text-gray-900">{item.q}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-gray-700 text-sm leading-relaxed">{item.a}</p>
                      <div className="mt-3 flex justify-end">
                        <CopyButton text={`${item.q}\n\n${item.a}`} variant="outline" size="sm" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ALL QUESTIONS */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#0D7C66] rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('faq.allQuestions')}</h2>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeCategory === 'promoter' ? 'default' : 'outline'}
              onClick={() => {
                setActiveCategory('promoter');
                setExpandedQuestion(null);
              }}
              className={`flex-1 ${activeCategory === 'promoter' ? 'bg-[#0D7C66] hover:bg-[#0a6b58]' : ''}`}
            >
              <Users className="w-4 h-4 mr-2" />
              {t('faq.promoterQuestions')}
            </Button>
            <Button
              variant={activeCategory === 'user' ? 'default' : 'outline'}
              onClick={() => {
                setActiveCategory('user');
                setExpandedQuestion(null);
              }}
              className={`flex-1 ${activeCategory === 'user' ? 'bg-[#0D7C66] hover:bg-[#0a6b58]' : ''}`}
            >
              <Coins className="w-4 h-4 mr-2" />
              {t('faq.userQuestions')}
            </Button>
          </div>

          {/* Questions List */}
          <div className="space-y-3">
            {currentQuestions.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card 
                  className={`cursor-pointer transition-all ${
                    expandedQuestion === item.id 
                      ? 'border-2 border-[#0D7C66] shadow-md' 
                      : 'border hover:shadow-sm'
                  }`}
                  onClick={() => setExpandedQuestion(expandedQuestion === item.id ? null : item.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          expandedQuestion === item.id 
                            ? 'bg-[#0D7C66] text-white' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <HelpCircle className="w-4 h-4" />
                        </div>
                        <p className="font-medium text-gray-900 pt-1">{item.q}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${
                        expandedQuestion === item.id ? 'rotate-180' : ''
                      }`}>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedQuestion === item.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="bg-green-50 rounded-xl p-4 mb-3">
                              <p className="text-gray-700 text-sm leading-relaxed">{item.a}</p>
                            </div>
                            <div className="flex justify-end">
                              <CopyButton text={item.a} variant="outline" size="sm" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CONTACT */}
        <section className="mt-8">
          <Card className="bg-gradient-to-r from-[#0D7C66] to-[#0a6b58] border-0 text-white">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <span className="text-4xl block mb-2">💬</span>
                <h3 className="font-bold text-xl">{t('faq.stillHaveQuestions')}</h3>
                <p className="text-white/80 text-sm mt-1">{t('faq.contactDesc')}</p>
              </div>

              <div className="space-y-3">
                <a 
                  href="https://t.me/tezbarakat" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-white/10 rounded-xl p-4 hover:bg-white/20 transition-colors"
                >
                  <MessageCircle className="w-6 h-6" />
                  <div>
                    <p className="font-bold">Telegram</p>
                    <p className="text-sm text-white/80">@Tezbarakat_Malika</p>
                  </div>
                </a>

                <a 
                  href="tel:+992770000611"
                  className="flex items-center gap-3 bg-white/10 rounded-xl p-4 hover:bg-white/20 transition-colors"
                >
                  <Phone className="w-6 h-6" />
                  <div>
                    <p className="font-bold">{t('faq.phone')}</p>
                    <p className="text-sm text-white/80">+992 770000611</p>
                  </div>
                </a>

                <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
                  <MapPin className="w-6 h-6" />
                  <div>
                    <p className="font-bold">{t('faq.address')}</p>
                    <p className="text-sm text-white/80">Душанбе, Бозори Зарафшон</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
