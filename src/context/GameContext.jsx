import React, { createContext, useContext, useState, useEffect } from 'react';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';

const GameContext = createContext();

export const AVATARS = [
  { id: 'monkey', name: 'Çılgın Maymun', icon: '🐵', color: '#f59e0b' },
  { id: 'robot', name: 'Cyber Robot', icon: '🤖', color: '#06b6d4' },
  { id: 'cat', name: 'Ninja Kedi', icon: '🐱', color: '#ec4899' },
  { id: 'fox', name: 'Hacker Tilki', icon: '🦊', color: '#f97316' },
  { id: 'alien', name: 'Uzaylı Alien', icon: '👽', color: '#10b981' },
  { id: 'bear', name: 'Gamer Ayı', icon: '🐻', color: '#8b5cf6' }
];

const QUESTION_BANK = [
  { id: 1, question: "İçinde 'A' harfi bulunmayan şehir hangisidir?", options: ["İzmir", "Ankara", "Bursa", "Adana"], correct: 0 },
  { id: 2, question: "Hangisi bir çizgi film karakteri DEĞİLDİR?", options: ["SüngerBob", "Pikachu", "Einstein", "Bugs Bunny"], correct: 2 },
  { id: 3, question: "Türkiye'nin başkenti neresidir?", options: ["İstanbul", "Ankara", "İzmir", "Antalya"], correct: 1 },
  { id: 4, question: "Hangisi bir asal sayı DEĞİLDİR?", options: ["2", "7", "9", "13"], correct: 2 },
  { id: 5, question: "Güneş sistemindeki en büyük gezegen hangisidir?", options: ["Mars", "Jüpiter", "Satürn", "Venüs"], correct: 1 },
  { id: 6, isMiniGame: true, type: 'CODE_BREAKER' },
  { id: 7, question: "Satrançta en güçlü taş hangisidir?", options: ["Kale", "Vezir", "At", "Şah"], correct: 1 },
  { id: 8, question: "Hangisi tatlı bir meyvedir?", options: ["Elma", "Tuz", "Biber", "Soğan"], correct: 0 },
  { id: 9, isMiniGame: true, type: 'REFLEX_TAP' },
  { id: 10, question: "Suyun kimyasal formülü nedir?", options: ["CO2", "H2O", "NaCl", "O2"], correct: 1 }
];

const CARD_TYPES = [
  { id: 'PASS', name: '🔀 BOMBAYI PASLA', desc: 'Bombayı sıradaki oyuncuya at!', color: '#f97316' },
  { id: 'REVERSE', name: '🔄 YÖNÜ TERS ÇEVİR', desc: 'Tur yönünü tersine döndür!', color: '#a855f7' },
  { id: 'CUT_WIRE', name: '✂️ KABLO KESTİR', desc: 'Bombadan 1 kablo kestir!', color: '#ef4444' },
  { id: 'SPEED_UP', name: '⚡ ZAMANI HIZLANDIR', desc: 'Bombanın süresini 5sn yap!', color: '#eab308' },
  { id: 'ADD_TIME', name: '⏳ +5 SANİYE EKLE', desc: 'Sürene ekstra 5 saniye ekle!', color: '#10b981' },
  { id: 'SHIELD', name: '🛡️ BOMBA KALKANI', desc: 'Patlamadan 1 defa korun!', color: '#3b82f6' },
  { id: 'RESET_WIRES', name: '🎲 KABLOLARI SIFIRLA', desc: 'Tüm kesik kabloları yenile!', color: '#06b6d4' },
  { id: 'STEAL', name: '🃏 RAKİPTEN KART ÇAL', desc: 'Desteden +1 aksiyon kartı çek!', color: '#ec4899' }
];

export function GameProvider({ children }) {
  const [gameState, setGameState] = useState('LOBBY');
  const [turnIndex, setTurnIndex] = useState(0); 
  const [turnDirection, setTurnDirection] = useState(1); 
  const [timeLeft, setTimeLeft] = useState(10);
  const [lastPlayedCard, setLastPlayedCard] = useState(null);
  const [wireEffect, setWireEffect] = useState(null);

  // Kaos Çarkı ve Tur Sayacı State'leri
  const [turnCount, setTurnCount] = useState(0);
  const [showChaosWheel, setShowChaosWheel] = useState(false);
  const [doubleWireCutNext, setDoubleWireCutNext] = useState(false);

  const [players, setPlayers] = useState([
    { id: 0, name: 'Çılgın Maymun', avatar: AVATARS[0], lives: 3, hand: [], hasShield: false },
    { id: 1, name: 'Cyber Robot', avatar: AVATARS[1], lives: 3, hand: [], hasShield: false },
    { id: 2, name: 'Ninja Kedi', avatar: AVATARS[2], lives: 3, hand: [], hasShield: false },
    { id: 3, name: 'Hacker Tilki', avatar: AVATARS[3], lives: 3, hand: [], hasShield: false }
  ]);

  const [wires, setWires] = useState([
    { id: 1, color: '#ef4444', isCut: false },
    { id: 2, color: '#3b82f6', isCut: false },
    { id: 3, color: '#eab308', isCut: false },
    { id: 4, color: '#22c55e', isCut: false },
    { id: 5, color: '#a855f7', isCut: false }
  ]);

  const [explodingWireId, setExplodingWireId] = useState(null); 
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [usedQuestionIds, setUsedQuestionIds] = useState([]);
  const [logs, setLogs] = useState([]);

  const getRandomCard = (existingHand = []) => {
    const existingIds = existingHand.map(c => c.id);
    let availableTypes = CARD_TYPES.filter(c => !existingIds.includes(c.id));
    if (availableTypes.length === 0) availableTypes = CARD_TYPES;

    const randomIndex = Math.floor(Math.random() * availableTypes.length);
    return { ...availableTypes[randomIndex], uniqueId: Math.random() };
  };

  const startGame = (customPlayerConfigs = []) => {
    sounds.init();
    setGameState('PLAYING');
    setTurnIndex(0);
    setTurnDirection(1);
    setTimeLeft(10);
    setTurnCount(0);
    setShowChaosWheel(false);
    setDoubleWireCutNext(false);
    setUsedQuestionIds([]);
    setLastPlayedCard(null);
    setWireEffect(null);

    resetWires();

    const defaultNames = ['Çılgın Maymun', 'Cyber Robot', 'Ninja Kedi', 'Hacker Tilki', 'Uzaylı Alien', 'Gamer Ayı'];

    const newPlayers = customPlayerConfigs.map((config, idx) => {
      const card1 = getRandomCard([]);
      const card2 = getRandomCard([card1]);
      return {
        id: idx,
        name: config.name?.trim() !== '' ? config.name : defaultNames[idx % defaultNames.length],
        avatar: config.avatar || AVATARS[idx % AVATARS.length],
        lives: 3,
        hand: [card1, card2],
        hasShield: false
      };
    });

    setPlayers(newPlayers);
    pickNewQuestion();
    addLog(`💣 Oyun Başladı! Bomba ${newPlayers[0].name}'in Önünde!`);
  };

  const resetWires = () => {
    setExplodingWireId(Math.floor(Math.random() * 5) + 1);
    setWires([
      { id: 1, color: '#ef4444', isCut: false },
      { id: 2, color: '#3b82f6', isCut: false },
      { id: 3, color: '#eab308', isCut: false },
      { id: 4, color: '#22c55e', isCut: false },
      { id: 5, color: '#a855f7', isCut: false }
    ]);
  };

  const pickNewQuestion = () => {
    let availableQuestions = QUESTION_BANK.filter(q => !usedQuestionIds.includes(q.id));
    if (availableQuestions.length === 0) {
      availableQuestions = QUESTION_BANK;
      setUsedQuestionIds([]);
    }
    const randomQ = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    setUsedQuestionIds(prev => [...prev, randomQ.id]);
    setCurrentQuestion(randomQ);
    setTimeLeft(10);
  };

  const addLog = (msg) => {
    setLogs(prev => [msg, ...prev.slice(0, 3)]);
  };

  useEffect(() => {
    let timerId;
    if (gameState === 'PLAYING' && timeLeft > 0 && !showChaosWheel) {
      timerId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeOut();
            return 0;
          }
          sounds.playBeep(prev < 4 ? 1000 : 500, 0.04);
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [gameState, timeLeft, showChaosWheel]);

  const handleTimeOut = () => {
    addLog(`⏰ ${players[turnIndex].name} yetişemedi!`);
    cutRandomWire();
  };

  const passTurn = () => {
    const total = players.length;
    let nextIdx = (turnIndex + turnDirection + total) % total;
    while (players[nextIdx].lives <= 0) {
      nextIdx = (nextIdx + turnDirection + total) % total;
    }
    
    const newTurnCount = turnCount + 1;
    setTurnCount(newTurnCount);
    setTurnIndex(nextIdx);

    // Her 3 Turda bir Kaos Çarkını Döndür!
    if (newTurnCount % 3 === 0) {
      setShowChaosWheel(true);
    } else {
      pickNewQuestion();
    }
    addLog(`👉 SIRA: ${players[nextIdx].name}'TA!`);
  };

  // Kaos Çarkı Efektini Uygula
  const applyChaosEvent = (event) => {
    setShowChaosWheel(false);
    if (!event) {
      pickNewQuestion();
      return;
    }

    switch (event.id) {
      case 'SWAP_LIVES': {
        const sorted = [...players].sort((a, b) => b.lives - a.lives);
        const highestId = sorted[0].id;
        const lowestId = sorted[sorted.length - 1].id;
        if (highestId !== lowestId) {
          const highLives = players[highestId].lives;
          const lowLives = players[lowestId].lives;
          setPlayers(prev => prev.map(p => {
            if (p.id === highestId) return { ...p, lives: lowLives };
            if (p.id === lowestId) return { ...p, lives: highLives };
            return p;
          }));
          addLog(`🔄 ${players[highestId].name} ve ${players[lowestId].name} CANLARI TAKAS ETTİ!`);
        }
        break;
      }
      case 'SPEED_TURNS':
        setTimeLeft(4);
        addLog(`⚡ KAOS: Bomba süresi 4 saniyeye düşürüldü!`);
        break;
      case 'CARD_RAIN':
        setPlayers(prev => prev.map(p => ({ ...p, hand: [...p.hand, getRandomCard(p.hand)] })));
        addLog(`🎁 KAOS: Herkese +1 Ekstra Aksiyon Kartı Dağıtıldı!`);
        break;
      case 'DOUBLE_WIRE':
        setDoubleWireCutNext(true);
        addLog(`💥 KAOS: Sıradaki yanlış cevapta 2 kablo kesilecek!`);
        break;
      default:
        break;
    }
    pickNewQuestion();
  };

  const answerQuestion = (optionIndex) => {
    if (gameState !== 'PLAYING') return;

    if (optionIndex === currentQuestion.correct) {
      sounds.playBeep(1200, 0.1);
      if (timeLeft > 7) {
        addLog(`⚡ HIZLI CEVAP! ${players[turnIndex].name} +1 Kart Kazandı! 🎁`);
        giveCardToPlayer(turnIndex);
      } else {
        addLog(`✅ ${players[turnIndex].name} doğru bildi!`);
      }
      passTurn();
    } else {
      addLog(`❌ Yanlış cevap! Kablo kesiliyor...`);
      cutRandomWire();
    }
  };

  const handleMiniGameResult = (isSuccess) => {
    if (isSuccess) {
      sounds.playBeep(1400, 0.15);
      addLog(`🎯 MİNİ OYUN BAŞARILI! Bomba imha edildi.`);
      passTurn();
    } else {
      addLog(`💥 MİNİ OYUN BAŞARISIZ! Kablo kesiliyor...`);
      cutRandomWire();
    }
  };

  const giveCardToPlayer = (playerIdx) => {
    setPlayers(prev => prev.map((p, idx) => {
      if (idx === playerIdx) {
        const newCard = getRandomCard(p.hand);
        return { ...p, hand: [...p.hand, newCard] };
      }
      return p;
    }));
  };

  const cutRandomWire = () => {
    sounds.playSnip();
    const uncutWires = wires.filter(w => !w.isCut);
    if (uncutWires.length === 0) return;

    const chosenWire = uncutWires[Math.floor(Math.random() * uncutWires.length)];
    setWires(prev => prev.map(w => w.id === chosenWire.id ? { ...w, isCut: true } : w));

    setWireEffect({ color: chosenWire.color, isExplosion: chosenWire.id === explodingWireId });
    setTimeout(() => setWireEffect(null), 600);

    if (doubleWireCutNext) {
      setDoubleWireCutNext(false);
      const remainingUncut = uncutWires.filter(w => w.id !== chosenWire.id);
      if (remainingUncut.length > 0) {
        const secondWire = remainingUncut[Math.floor(Math.random() * remainingUncut.length)];
        setWires(prev => prev.map(w => w.id === secondWire.id ? { ...w, isCut: true } : w));
      }
    }

    if (chosenWire.id === explodingWireId) {
      if (players[turnIndex].hasShield) {
        sounds.playBeep(1500, 0.3);
        addLog(`🛡️ KALKAN KORUDU! ${players[turnIndex].name} kurtuldu!`);
        setPlayers(prev => prev.map((p, idx) => idx === turnIndex ? { ...p, hasShield: false } : p));
        resetWires();
        passTurn();
      } else {
        triggerExplosionForPlayer(turnIndex);
      }
    } else {
      sounds.playBuzzer();
      addLog(`✂️ Güvenli kablo kesildi! Bomba patlamadı.`);
      passTurn();
    }
  };

  const triggerExplosionForPlayer = (playerIdx) => {
    sounds.playExplosion();
    const victim = players[playerIdx];
    addLog(`💥 GÜMM! Bomba ${victim.name}'in elinde patladı!`);

    const updatedPlayers = players.map((p, idx) => idx === playerIdx ? { ...p, lives: p.lives - 1 } : p);
    setPlayers(updatedPlayers);

    const alivePlayers = updatedPlayers.filter(p => p.lives > 0);
    if (alivePlayers.length === 1) {
      setGameState('GAME_OVER');
      confetti({ particleCount: 150, spread: 80 });
      addLog(`🏆 ŞAMPİYON: ${alivePlayers[0].name}! 🎉`);
    } else {
      resetWires();
      passTurn();
    }
  };

  const playCard = (card) => {
    if (gameState !== 'PLAYING') return;
    sounds.playBeep(1000, 0.1);

    setLastPlayedCard({ ...card, player: players[turnIndex].name });
    setTimeout(() => setLastPlayedCard(null), 800);

    setPlayers(prev => prev.map((p, idx) => idx === turnIndex ? { ...p, hand: p.hand.filter(c => c.uniqueId !== card.uniqueId) } : p));

    switch (card.id) {
      case 'PASS':
        addLog(`🔀 ${players[turnIndex].name} BOMBAYI PASLADI!`);
        passTurn();
        break;
      case 'REVERSE':
        addLog(`🔄 ${players[turnIndex].name} YÖNÜ TERS ÇEVİRDİ!`);
        setTurnDirection(prev => prev * -1);
        passTurn();
        break;
      case 'CUT_WIRE':
        addLog(`✂️ ${players[turnIndex].name} KABLO KESTİRDİ!`);
        cutRandomWire();
        break;
      case 'SPEED_UP':
        addLog(`⚡ ${players[turnIndex].name} ZAMANI HIZLANDIRDI!`);
        setTimeLeft(5);
        break;
      case 'ADD_TIME':
        addLog(`⏳ ${players[turnIndex].name} +5 SANİYE EKLEDİ!`);
        setTimeLeft(prev => prev + 5);
        break;
      case 'RESET_WIRES':
        addLog(`🎲 ${players[turnIndex].name} KABLOLARI SIFIRLADI!`);
        resetWires();
        break;
      case 'SHIELD':
        addLog(`🛡️ ${players[turnIndex].name} KALKAN TAKINDI!`);
        setPlayers(prev => prev.map((p, idx) => idx === turnIndex ? { ...p, hasShield: true } : p));
        break;
      case 'STEAL':
        addLog(`🃏 ${players[turnIndex].name} +1 KART ÇEKTİ!`);
        giveCardToPlayer(turnIndex);
        break;
      default:
        break;
    }
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        turnIndex,
        timeLeft,
        players,
        wires,
        currentQuestion,
        logs,
        lastPlayedCard,
        wireEffect,
        showChaosWheel,
        startGame,
        answerQuestion,
        handleMiniGameResult,
        applyChaosEvent,
        playCard
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);