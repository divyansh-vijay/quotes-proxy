export const runtime = 'nodejs';

import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import fs from 'fs';
import path from 'path';

// Optional embedded font (recommended for consistent cross-platform rendering)
const fontPath = path.join(process.cwd(), 'public', 'OpenSans-Regular.ttf');
let interData = null;
try {
  interData = fs.readFileSync(fontPath);
} catch {
  // No font file found; will use system fallback fonts
}

const CONFIG = {
  width: 1000,
  paddingX: 80,
  paddingY: 120,
  lineHeight: 50,
  authorLineHeight: 42,
  bgColor: '#191919',
  quoteColor: '#ffffff',
  authorColor: '#ffffff',
  accentColor: '#6c5ce7',
  borderLeft: 8,
  spacingBetweenQuoteAndAuthor: 28,
  maxAuthorWidth: 800
};

const localFallback = [
  // { content: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
  // { content: 'The only way out is through.', author: 'Robert Frost' },
  // { content: 'Do or do not. There is no try.', author: 'Yoda' },
  { content: 'Make it work, make it right, make it fast.', author: 'Kent Beck' }
];

async function getQuote() {
  const providers = [
    // 1) ZenQuotes - FIXED: was "arr" should be "arr[0]"
    async () => {
      const r = await fetch('https://zenquotes.io/api/random', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (!r.ok) throw new Error('zen');
      const arr = await r.json();
      const q = Array.isArray(arr) && arr ? arr : null; // CORRECT
      if (!q[0]?.q) throw new Error('zen-shape');
      return { content: q[0].q, author: q[0].a || 'Unknown' };
    },
    // 2) FavQs QOTD
    async () => {
      const r = await fetch('https://favqs.com/api/qotd', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (!r.ok) throw new Error('favqs');
      const j = await r.json();

      const q = j?.quote;
      if (!q?.body) throw new Error('favqs-shape');
      return { content: q.body, author: q.author || 'Unknown' };
    },
    // 3) Programming Quotes
    async () => {
      const r = await fetch('https://programming-quotesapi.vercel.app/api/random', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (!r.ok) throw new Error('prog');
      const j = await r.json();
      if (!j?.quote) throw new Error('prog-shape');
      return { content: j.quote, author: j.author || 'Unknown' };
    },
    // 4) Quotable
    async () => {
      const r = await fetch('https://api.quotable.io/random', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (!r.ok) throw new Error('quotable');
      const j = await r.json();
      if (!j?.content) throw new Error('quotable-shape');
      return { content: j.content, author: j.author || 'Unknown' };
    }
  ];

  for (const p of providers) {
    try {
      return await p();
    } catch {
      // try next
    }
  }
  return localFallback[Math.floor(Math.random() * localFallback.length)];
}

// Helper to estimate text lines for height calculation
function estimateLines(text, maxWidth, fontSize) {
  const avgCharWidth = fontSize * 0.6; // rough estimation
  const charsPerLine = Math.floor(maxWidth / avgCharWidth);
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

function satoriTree({ content, author }) {
  const w = CONFIG.width;
  const textWidth = w - CONFIG.paddingX * 2 - CONFIG.borderLeft - 16;

  // Estimate height for proper rendering
  const quoteLines = estimateLines(content, textWidth, 36);
  const authorLines = estimateLines(`— ${author || 'Unknown'}`, CONFIG.maxAuthorWidth, 28);
  const estimatedHeight = CONFIG.paddingY * 2 +
    (quoteLines * CONFIG.lineHeight) +
    CONFIG.spacingBetweenQuoteAndAuthor +
    (authorLines * CONFIG.authorLineHeight);

  return {
    type: 'div',
    props: {
      style: {
        width: `${w}px`,
        height: `${estimatedHeight}px`,
        display: 'flex',
        background: CONFIG.bgColor,
        color: CONFIG.quoteColor,
        fontFamily: interData
          ? 'Inter'
          : "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        padding: `${CONFIG.paddingY}px ${CONFIG.paddingX}px`,
        position: 'relative'
      },
      children: [
        // {
        //   type: 'div',
        //   props: {
        //     style: {
        //       position: 'absolute',
        //       left: `${CONFIG.paddingX - 24}px`,
        //       top: `${CONFIG.paddingY - 8}px`,
        //       width: `${CONFIG.borderLeft}px`,
        //       bottom: `${CONFIG.paddingY - 8}px`,
        //       background: CONFIG.accentColor
        //     }
        //   }
        // },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              marginLeft: `${CONFIG.borderLeft + 16}px`,
              width: `${textWidth}px`
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '24px',
                    lineHeight: `${CONFIG.lineHeight}px`,
                    whiteSpace: 'pre-wrap',
                    color: CONFIG.quoteColor,
                    marginBottom: '24px' // Add space below quote
                  },
                  children: `"${content}"`
                }
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '16px',
                    lineHeight: `${CONFIG.authorLineHeight}px`,
                    color: CONFIG.authorColor,
                    textAlign: 'right',
                    width: 'max',
                    maxWidth: `${CONFIG.maxAuthorWidth}px`,
                    marginLeft: 'auto',
                    alignSelf: 'flex-end'
                  },
                  children: `— ${author || 'Unknown'}`
                }
              }

            ]
          }
        }
      ]
    }
  };
}


export async function GET() {
  try {
    const quote = await getQuote();

    // Use system fonts by omitting fonts entirely - but provide fallback if needed
    const satoriOptions = {
      width: CONFIG.width,
    };

    // Only add Inter font if it exists and is valid
    if (interData && interData.length > 1000) {
      satoriOptions.fonts = [{ name: 'Inter', data: interData, weight: 400, style: 'normal' }];
    }

    const svg = await satori(satoriTree(quote), satoriOptions);

    const resvg = new Resvg(svg, {
      background: CONFIG.bgColor,
    });
    const png = resvg.render().asPng();

    return new Response(png, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, max-age=0',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    console.error('Quote generation error:', e);

    const fallbackQuote = localFallback[0];
    const fallbackSvg = `
      <svg width="1200" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#191919"/>
        <rect x="56" y="72" width="8" height="156" fill="#6c5ce7"/>
        <text x="100" y="120" fill="white" font-family="Arial, sans-serif" font-size="32">"${fallbackQuote.content}"</text>
        <text x="1120" y="200" fill="white" font-family="Arial, sans-serif" font-size="24" text-anchor="end">- ${fallbackQuote.author}</text>
      </svg>
    `;

    const fallbackResvg = new Resvg(fallbackSvg, { background: '#191919' });
    const fallbackPng = fallbackResvg.render().asPng();

    return new Response(fallbackPng, {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }
    });
  }
}



