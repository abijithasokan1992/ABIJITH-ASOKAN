/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqData: FAQItem[] = [
    {
      question: 'How does the Media Vault protect our master films?',
      answer: 'All uploaded video and audio files are stored in secure cloud storage. Access is strictly controlled, ensuring only approved partners can view files.'
    },
    {
      question: 'How do watermarked screeners protect against leaks?',
      answer: "When a buyer requests access, the platform dynamically generates a text watermark over the video player with the buyer's unique email to prevent unauthorized sharing."
    },
    {
      question: 'How does the licensing negotiation workflow function?',
      answer: 'Buyers can propose a direct licensing offer. Creators can accept, decline, or issue a counterproposal. All contracts and rates are managed securely in one place.'
    },
    {
      question: 'Can I manage separate multi-region storage vaults?',
      answer: 'Yes, StreamVista automatically routes your uploaded media to secure storage regions close to your primary audience to ensure fast, responsive playback.'
    },
    {
      question: 'What happens once a licensing deal is finalized?',
      answer: 'Once signed by both parties, the film licensing deal is executed, allowing the buyer to securely watch or deploy the licensed media files.'
    }
  ];

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto mt-12 pt-10 border-t border-zinc-200" id="faq-section">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 border border-zinc-350 rounded-full">
          <HelpCircle className="h-3.5 w-3.5 text-zinc-650" />
          <span className="font-mono text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Common Questions</span>
        </div>
        <h3 className="text-xl font-bold text-zinc-900 tracking-tight font-sans">Storage & Licensing FAQ</h3>
        <p className="text-xs text-zinc-500 max-w-xl mx-auto">
          Learn how our platform safeguards content catalogs and automates digital distribution contracts.
        </p>
      </div>

      <div className="space-y-3">
        {faqData.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="border border-zinc-250 bg-white rounded-xl overflow-hidden transition-all duration-300"
              id={`faq-item-${index}`}
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full flex justify-between items-center p-4 text-left font-sans hover:bg-zinc-50 transition-colors"
                aria-expanded={isOpen}
              >
                <span className="font-semibold text-xs text-zinc-900 pr-4">{item.question}</span>
                <ChevronDown
                  className={`h-4 w-4 text-zinc-450 shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 text-zinc-950' : ''
                  }`}
                />
              </button>
              
              <div
                className={`transition-all duration-300 ease-in-out ${
                  isOpen ? 'max-h-56 opacity-100 border-t border-zinc-150' : 'max-h-0 opacity-0 pointer-events-none'
                }`}
              >
                <div className="p-4 bg-zinc-50 text-xs text-zinc-600 leading-relaxed font-sans">
                  {item.answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
