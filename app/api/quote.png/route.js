export const runtime = 'nodejs';

import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

// If you bundle a font, load it once at module scope
// Place a font in /public/Inter-Regular.ttf or adjust the path
import fs from 'fs';
import path from 'path';
const fontPath = path.join(process.cwd(), 'public', 'Inter-Regular.ttf');
let interData = null;
try {
  interData = fs.readFileSync(fontPath);
} catch {
  // If no font file, Satori will fallback to system fonts (still fine)
}

const CONFIG = {
  width: 1200,
  paddingX: 80,
  paddingY: 80,
  lineHeight: 50,
  authorLineHeight: 42,
  bgColor: '#191919',
  quoteColor: '#ffffff',
  authorColor: '#ffffff',
  accentColor: '#6c5ce7',
  borderLeft: 8,
  spacingBetweenQuoteAndAuthor: 28,
  maxQuoteLines: 10,
  maxAuthorWidth: 980
};

const localFallback = [
  { content: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { content: "The only way out is through.", author: "Robert Frost" },
  { content: "Do or do not. There is no try.", author: "Yoda" },
  { content: "Make it work, make it right, make it fast.", author: "Kent Beck" }
];

async function getQuote() {
  const providers = [
    async () => {
      const r = await fetch('https://zenquotes.io/api/random', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!r.ok) throw new Error(`ZenQuotes ${r.status}`);
      const arr = await r.json();
      const q = Array.isArray(arr) && arr[0] ? arr : null;
      if (!q || !q.q) throw new Error('ZenQuotes malformed');
      return { content: q.q, author: q.a || 'Unknown' };
    },
    async () => {
      const r = await fetch('https://favqs.com/api/qotd', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!r.ok) throw new Error(`FavQs ${r.status}`);
      const j = await r.json();
      const q = j && j.quote;
      if (!q || !q.body) throw new Error('FavQs malformed');
      return { content: q.body, author: q.author || 'Unknown' };
    },
    async () => {
      const r = await fetch('https://programming-quotesapi.vercel.app/api/random', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!r.ok) throw new Error(`ProgrammingQuotes ${r.status}`);
      const j = await r.json();
      if (!j || !j.quote) throw new Error('ProgrammingQuotes malformed');
      return { content: j.quote, author: j.author || 'Unknown' };
    },
    async () => {
      const r = await fetch('https://api.quotable.io/random', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!r.ok) throw new Error(`Quotable ${r.status}`);
      const j = await r.json();
      if (!j || !j.content) throw new Error('Quotable malformed');
      return { content: j.content, author: j.author || 'Unknown' };
    }
  ];

  for (const p of providers) {
    try {
      return await p();
    } catch {}
  }
  return localFallback[Math.floor(Math.random() * localFallback.length)];
}

function svgTemplate({ content, author }) {
  const {
    width, paddingX, paddingY, lineHeight,
    authorLineHeight, bgColor, quoteColor, authorColor,
    accentColor, borderLeft, spacingBetweenQuoteAndAuthor, maxAuthorWidth
  } = CONFIG;

  // We’ll let Satori do wrapping using flex/width constraints
  return {
    type: 'div',
    props: {
      style: {
        width: width + 'px',
        height: 'auto',
        display: 'flex',
        background: bgColor,
        color: quoteColor,
        fontFamily: interData ? 'Inter' : 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        padding: `${paddingY}px ${paddingX}px`,
        position: 'relative',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              left: paddingX - 24 + 'px',
              top: paddingY - 8 + 'px',
              width: borderLeft + 'px',
              bottom: paddingY - 8 + 'px',
              background: accentColor,
            },
            children: null
          }
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              marginLeft: (borderLeft + 16) + 'px',
              width: (width - paddingX * 2 - borderLeft - 16) + 'px'
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '36px',
                    lineHeight: lineHeight + 'px',
                    color: quoteColor,
                    whiteSpace: 'pre-wrap'
                  },
                  children: `“${content}”`
                }
              },
              {
                type: 'div',
                props: {
                  style: {
                    marginTop: (spacingBetweenQuoteAndAuthor - lineHeight) + 'px',
                    fontSize: '28px',
                    lineHeight: authorLineHeight + 'px',
                    color: authorColor,
                    textAlign: 'right',
                    width: Math.min(width - paddingX * 2 - borderLeft - 16, maxAuthorWidth) + 'px',
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

    const svg = await satori(svgTemplate(quote), {
      width: CONFIG.width,
      fonts: interData ? [{ name: 'Inter', data: interData, weight: 400, style: 'normal' }] : []
    });

    // Render SVG to PNG with Resvg
    const resvg = new Resvg(svg, {
      background: CONFIG.bgColor,
      fitTo: { mode: 'width', value: CONFIG.width }
    });
    const pngData = resvg.render().asPng();

    return new Response(pngData, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, max-age=0',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    // Return 1x1 PNG on failure
    const blank = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,10,73,68,65,84,120,156,99,96,0,0,0,2,0,1,229,39,190,126,0,0,0,0,73,69,78,68,174,66,96,130]);
    return new Response(blank, {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
