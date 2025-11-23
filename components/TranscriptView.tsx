import React, { useRef, useEffect } from 'react';
import { TranscriptItem } from '../types';

interface TranscriptViewProps {
  items: TranscriptItem[];
}

const TranscriptView: React.FC<TranscriptViewProps> = ({ items }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
        <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <p className="text-sm">Start the conversation to see the transcript here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 p-4 h-full overflow-y-auto scrollbar-hide">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex w-full ${
            item.sender === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
              item.sender === 'user'
                ? 'bg-blue-600 text-white rounded-tr-none'
                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
            }`}
          >
            <p>{item.text}</p>
            <span
              className={`text-[10px] mt-1 block ${
                item.sender === 'user' ? 'text-blue-200' : 'text-gray-400'
              }`}
            >
              {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default TranscriptView;
