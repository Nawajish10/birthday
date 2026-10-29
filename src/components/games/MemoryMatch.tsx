"use client";

import React, { useState, useCallback, useEffect } from "react";

export interface Couplet {
  urdu: string;
  english: string;
}

const COUPLETS: Record<string, Couplet> = {
  "🌷": {
    urdu: "تیرے دم سے ہے میرے دل کا گلستان آباد",
    english: "Because of you, the garden of my heart is forever in bloom.",
  },
  "🎂": {
    urdu: "تم سلامت رہو ہزار برس، ہر برس کے ہوں دن پچاس ہزار",
    english: "May you live in bliss for thousands of years with endless laughter.",
  },
  "✿": {
    urdu: "مسکراہٹ تیری جیسے صبح کا اجالا ہو",
    english: "Your gentle smile is like the luminous dawn of morning.",
  },
  "🎁": {
    urdu: "خوشبو کی طرح ساتھ رہے تیرا پیارا خیال",
    english: "Like sweet fragrance, your gentle thought stays with me always.",
  },
  "♡": {
    urdu: "روشنی بن کے جو دل میں اترتی ہے، وہ تم ہو",
    english: "The light that gently descends into my heart—that is you.",
  },
  "🌙": {
    urdu: "ہر دعا میں ہے بس تیری خوشی اور مسرت کی دعا",
    english: "In every prayer, there is only the wish for your radiant happiness.",
  },
};

const SYMBOLS = ["🌷", "🎂", "✿", "🎁", "♡", "🌙", "☀", "🦋", "🌸", "💌", "🎵", "🌺"];

interface Tile {
  id: number;
  symbol: string;
  couplet?: Couplet;
  flipped: boolean;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(count = 6): Tile[] {
  const symbols = SYMBOLS.slice(0, count);
  const deckItems: { symbol: string; couplet?: Couplet }[] = [];
  symbols.forEach((symbol) => {
    const couplet = COUPLETS[symbol];
    deckItems.push({ symbol, couplet });
    deckItems.push({ symbol, couplet });
  });

  return shuffle(
    deckItems.map((item, id) => ({
      id,
      symbol: item.symbol,
      couplet: item.couplet,
      flipped: false,
      matched: false,
    }))
  );
}

export interface MemoryMatchProps {
  onComplete?: () => void;
  onRestart?: () => void;
}

export function MemoryMatch({ onComplete, onRestart }: MemoryMatchProps = {}) {
  const [tiles, setTiles] = useState<Tile[]>(() => buildDeck(6));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [moves, setMoves] = useState(0);
  const [latestCouplet, setLatestCouplet] = useState<Couplet | null>(null);

  const won = tiles.length > 0 && tiles.every((t) => t.matched);
  const matched = tiles.filter((t) => t.matched).length / 2;
  const total = tiles.length / 2;

  useEffect(() => {
    if (won) {
      onComplete?.();
    }
  }, [won, onComplete]);

  const reset = useCallback(() => {
    setTiles(buildDeck(6));
    setFlipped([]);
    setLocked(false);
    setMoves(0);
    setLatestCouplet(null);
    onRestart?.();
  }, [onRestart]);

  function flip(id: number) {
    if (locked) return;
    const tile = tiles.find((t) => t.id === id);
    if (!tile || tile.flipped || tile.matched) return;
    if (flipped.length === 1 && flipped[0] === id) return;

    const newFlipped = [...flipped, id];
    setTiles((prev) =>
      prev.map((t) => (t.id === id ? { ...t, flipped: true } : t))
    );
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = newFlipped.map((fid) => tiles.find((t) => t.id === fid)!);
      if (a.symbol === b.symbol) {
        setTiles((prev) =>
          prev.map((t) => (newFlipped.includes(t.id) ? { ...t, matched: true } : t))
        );
        setFlipped([]);
        if (a.couplet) {
          setLatestCouplet(a.couplet);
        }
      } else {
        setLocked(true);
        setTimeout(() => {
          setTiles((prev) =>
            prev.map((t) =>
              newFlipped.includes(t.id) ? { ...t, flipped: false } : t
            )
          );
          setFlipped([]);
          setLocked(false);
        }, 900);
      }
    }
  }

  return (
    <div className="memoryMatch" aria-label="Birthday Couplet Memory Cards">
      <div className="memoryMatchHeader">
        <div>
          <span className="kicker">Memory Match · یادوں اور اشعار کا کھیل</span>
          <h3>Birthday Couplet Cards</h3>
          <p>
            Flip and match poetic card pairs to reveal romantic Urdu couplets for Meerah. ♡
          </p>
        </div>
        <div className="memoryMatchStats">
          <span className="chip">
            {matched}/{total} pairs
          </span>
          <span className="chip">{moves} moves</span>
          <button
            className="button secondary"
            onClick={reset}
            style={{ padding: "4px 10px", fontSize: "11px" }}
          >
            Reset ↺
          </button>
        </div>
      </div>

      {/* Revealed Couplet Banner */}
      {latestCouplet && (
        <div className="revealedCoupletCard" aria-live="polite">
          <span className="coupletIcon">📜</span>
          <div className="coupletTextGroup">
            <p className="coupletUrdu" dir="rtl">
              {latestCouplet.urdu}
            </p>
            <p className="coupletEnglish">{latestCouplet.english}</p>
          </div>
        </div>
      )}

      {won && (
        <div className="reward" style={{ marginBottom: "16px" }}>
          <span>🎉</span>
          <h3>All Couplets & Memories Matched!</h3>
          <p>
            You unlocked every poetic couplet for Meerah in {moves} moves. Some
            things are always worth finding twice. ♡
          </p>
        </div>
      )}

      <div className="memoryGrid">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            className={`memoryTile ${
              tile.flipped || tile.matched ? "isFlipped" : ""
            } ${tile.matched ? "isMatched" : ""}`}
            onClick={() => flip(tile.id)}
            aria-label={
              tile.flipped || tile.matched
                ? `${tile.symbol} card`
                : "Hidden memory card"
            }
            aria-pressed={tile.flipped || tile.matched}
            disabled={tile.matched}
          >
            <div className="memoryTileFront">
              <span className="tileSymbolIcon">{tile.symbol}</span>
              <span className="tileCoupletHint">✿ شعر</span>
            </div>
            <div className="memoryTileBack">
              <span className="tileBackIcon">✿</span>
              <span className="tileBackRibbon">یاد</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default MemoryMatch;
